# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""End-to-end tests for the Deadline Cloud After Effects submitter.

Five layers per discovered case, sharing a single (cached) AE drive:

* **bundle generation** (``test_bundle_generation``): re-drive the *real* submitter
  headlessly and assert the OpenJD job bundle it produces is valid and well-formed.
  Always runs when AE is installed.
* **golden** (``test_bundle_matches_golden``): the bundle matches the committed golden
  after normalization. Offline.
* **job settings** (``test_job_settings``): the case's ``settings`` reached the bundle,
  and unset settings produced the submitter's defaults. Offline.
* **render** (``test_render``): submit that bundle to Deadline Cloud and poll the job to
  its expected terminal state. Runs only with ``--render`` / ``AE_RUN_RENDER=1``.
* **render outputs** (``test_render_outputs``): the job wrote every expected file, and
  a sample of them decodes to real, distinct images. ``--render`` only.

All are parametrised over every ``test_cases/<name>/case.json``.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
from deadline_test_fixtures.job_bundle.compare import assert_valid_job_bundle
from harness import bundle as bundle_mod
from harness import cases as cases_mod
from harness import config, deadline_client, golden
from harness import known_defects as kd
from harness import outputs as outputs_mod

_CASES = cases_mod.discover_cases()


def _case_id(case: cases_mod.Case) -> str:
    return case.slug


@pytest.fixture(params=_CASES, ids=[_case_id(c) for c in _CASES])
def case(request: pytest.FixtureRequest) -> cases_mod.Case:
    param = request.param
    reason = cases_mod.SKIP_CASES.get(param.id)
    if reason:
        pytest.skip(f"{param.id} skipped: {reason}")
    return param


def test_bundle_generation(case, case_run, case_dir):
    """The real submitter builds a well-formed OpenJD bundle for the case.

    A case with ``expect_refusal`` instead requires the submitter to refuse it.
    """
    run = case_run
    if case.expect_refusal:
        _check_refusal(case, run)
        return
    assert run.ok, f"Submitter did not produce a bundle: {run.error}"
    as_built = case_dir / "bundle-as-built"
    assert as_built.is_dir(), f"no as-built bundle snapshot at {as_built}"

    # The snapshot taken before the harness patches anything. The shared temp folder
    # (run.bundle_path) has already been edited for submission when --render is on.
    bundle = bundle_mod.Bundle.load(as_built)

    # --- OpenJD validation ----------------------------------------------------------
    # `openjd check` on the as-built template: the same model the farm uses to accept
    # the job. Catches schema errors the field-by-field checks below never look at.
    assert_valid_job_bundle(as_built / "template.json")

    project_file = bundle.param("ProjectFile")
    assert project_file, "ProjectFile parameter absent from the bundle"
    expected = config_project_name(case)
    assert expected in str(
        project_file
    ), f"ProjectFile {project_file!r} does not reference {expected}"

    # A host AE the submitter's conda channel does not list gets a warning prompt,
    # and the job falls back to the major version. Expected exactly then.
    assert run.ae_version, "the drive did not report the AE version"
    supported = config.get_supported_versions(config.get_submitter_path())
    unsupported = run.ae_version not in supported
    _assert_alerts(case, run, version_warning=unsupported)

    # Declared with a default and never given a value, so param() is always None here.
    conda = bundle.param_default("CondaPackages") or bundle.param("CondaPackages")
    assert conda, "CondaPackages is neither declared with a default nor given a value"
    version = int(run.ae_version) if unsupported else run.ae_version
    want_conda = f"aftereffects={version:g}"
    assert want_conda in str(conda).split(), (
        f"CondaPackages {conda!r} lacks {want_conda!r} (AE {run.ae_version}, "
        f"supported {supported})"
    )
    assert str(config.get_ae_major()) == str(
        int(run.ae_version)
    ), f"drove AE {run.ae_version}, expected the {config.get_ae_year()} release"

    assert bundle.steps, "Bundle template has no steps"

    # --- OpenJD template well-formedness -------------------------------------------
    spec = bundle.template.get("specificationVersion")
    assert isinstance(spec, str) and spec.startswith(
        "jobtemplate-"
    ), f"Unexpected/absent specificationVersion: {spec!r}"
    assert bundle.template.get("name"), "Template has no top-level name"

    # Every step must have a runnable onRun action that invokes the render script.
    for step, on_run in zip(bundle.steps, bundle.step_run_actions()):
        name = step.get("name")
        assert on_run.get("command"), f"Step {name!r} has no onRun.command"
        args = on_run.get("args") or []
        assert any(
            "call_aerender.py" in str(a) for a in args
        ), f"Step {name!r} onRun does not invoke call_aerender.py (args={args})"

    # --- One step per queued comp --------------------------------------------------
    # The drive reports the render-queue items the submitter selected; the bundle must
    # emit exactly one step per comp (would catch a submitter dropping/duplicating comps).
    rq_items = run.render_queue_items
    assert rq_items, "the drive reported no render-queue items"
    assert len(bundle.steps) == len(rq_items), (
        f"Bundle has {len(bundle.steps)} steps but the drive selected "
        f"{len(rq_items)} render-queue items: {rq_items}"
    )

    # --- Frame ranges: bundle vs. the drive's own measurement ----------------------
    # The driver JSX measures each queue item's range with its own copy of the
    # submitter's formula. Checking the bundle against itself would pass any
    # regression; this catches a change to the submitter's calculation.
    # Every step must resolve to an output, or the per-comp checks below would
    # silently cover fewer comps (they zip steps with queue items).
    assert len(bundle.step_outputs()) == len(bundle.steps), (
        f"only {len(bundle.step_outputs())} of {len(bundle.steps)} steps have an "
        "output arg the harness recognises"
    )
    drive_ranges = [str(item.get("frames")) for item in rq_items]
    bundle_ranges = [str(so.frames) for so in bundle.step_outputs()]
    # "unknown" means the drive could not measure the range; that must fail, never
    # switch the check off.
    assert (
        "unknown" not in drive_ranges
    ), f"the drive could not measure a frame range: {rq_items}"
    assert bundle_ranges == drive_ranges, (
        f"bundle frame ranges {bundle_ranges} do not match the ranges the drive "
        f"measured from the comps {drive_ranges}"
    )

    # --- Asset references: the project resolves to a real input --------------------
    inputs = bundle.input_filenames()
    assert any(
        expected in f for f in inputs
    ), f"ProjectFile {expected!r} absent from asset_references inputs: {inputs}"
    # Persistent inputs (the project + in-repo source assets) must exist on disk — a
    # regression that left footage unresolved would drop it from here. Transient temp
    # inputs (fonts collected into %TEMP%/tempFonts for the drive) are not checked.
    assets_root = str(config.get_assets_root().resolve()).replace("\\", "/").lower()
    for f in inputs:
        if f.replace("\\", "/").lower().startswith(assets_root):
            assert Path(f).exists(), f"Referenced input does not exist on disk: {f}"

    # --- Bundle vs. what was authored in AE ----------------------------------------
    # Last, so a known defect (harness/known_defects.py) cannot hide the checks above.
    comps = [str(item.get("comp")) for item in rq_items]
    checks = kd.AuthoredChecks(case.id)
    # Output names: the file each step writes must be the one AE's queue item names.
    # The oracle is required: an empty name must fail, never switch the check off.
    missing = [c for c, item in zip(comps, rq_items) if not item.get("outputName")]
    assert not missing, f"the drive reported no output file name for {missing}"
    for comp, item, so in zip(comps, rq_items, bundle.step_outputs()):
        checks.compare(
            kd.OUTPUT_NAMES, comp, so.leaf, item["outputName"], "output name"
        )
    # Frames: the drive's measurement copies the submitter's formula, so it agrees
    # with a wrong formula. Ranges written down when the comp was authored do not.
    if case.expect_frames:
        assert len(case.expect_frames) == len(
            comps
        ), f"expect_frames has {len(case.expect_frames)} ranges for {len(comps)} comps"
        for comp, got, want in zip(comps, bundle_ranges, case.expect_frames):
            checks.compare(kd.FRAMES, comp, got, want, "frame range")
    _settle(checks)


def test_bundle_matches_golden(case, case_run, case_dir, ae_version):
    """The as-built bundle matches the committed golden, after normalization.

    The structural and settings assertions check what we chose to check; the golden
    catches everything else (a renamed parameter, a changed step script, a dropped
    environment). Set ``AE_UPDATE_GOLDENS=1`` to rewrite the goldens from this run.
    See ``harness/golden.py``.
    """
    _require_bundle(case)
    assert case_run.ok, f"Submitter did not produce a bundle: {case_run.error}"
    actual = case_dir / "bundle-as-built"
    expected = golden.expected_dir(case.dir, ae_version)
    temp_root = case_run.temp_folder
    if golden.update_requested():
        golden.write_golden(actual, expected, temp_root)
    golden.assert_matches_golden(actual, expected, temp_root)


def test_job_settings(case, case_run, case_bundle_as_built):
    """Each case's ``settings`` actually reach the bundle the submitter produced.

    Without this, every case ran the *same* generic structural assertions and the
    settings were write-only: ``multiFrameRendering``, ``maxCpuUsagePercentage``,
    ``ignoreMissingDependencies``, ``taskRunTimeout*`` and ``framesPerTask`` were
    handed to the submitter and nothing ever checked what it did with them. A
    submitter that dropped a setting on the floor passed the suite.

    Reads the *as-built* snapshot, not the live bundle: the harness rewrites step
    timeouts on its way to the farm (see ``apply_job_metadata``).
    """
    _require_bundle(case)
    assert case_run.ok, f"Submitter did not produce a bundle: {case_run.error}"
    assert case_bundle_as_built is not None, "no as-built bundle snapshot was archived"
    bundle = case_bundle_as_built
    settings = case.settings

    # --- Job-wide render options ---------------------------------------------------
    # Asserted for every case, not just the ones that set them: a case with empty
    # settings pins the submitter's documented defaults, which is how we'd catch a
    # default silently changing.
    for name, want in bundle_mod.expected_job_parameters(settings).items():
        got = bundle.param(name)
        assert got == want, (
            f"job parameter {name} is {got!r}, expected {want!r} "
            f"for settings={settings}"
        )

    # --- Task-run timeout ----------------------------------------------------------
    # The submitter composes this from day/hour/minute fields that default
    # independently, so a case setting only minutes still inherits the 2-day default.
    want_timeout = bundle_mod.expected_task_timeout_s(settings)
    timeouts = bundle.step_run_timeouts()
    assert timeouts, "no steps carried an onRun.timeout"
    for step, got in zip(bundle.steps, timeouts):
        assert got == want_timeout, (
            f"step {step.get('name')!r} onRun.timeout is {got!r}, expected "
            f"{want_timeout}s for settings={settings}"
        )

    # --- Frames per task (image sequences only) ------------------------------------
    # The submitter declares ChunkSize only when the selection contains an image
    # sequence; for a video output module framesPerTask is inert by design ("img seq
    # only ... Has no effect on video output" — SubmitterUI.jsx). So a case that sets
    # framesPerTask only proves anything if it actually renders a sequence.
    if bundle.has_chunking():
        want_chunk = settings.get("framesPerTask", bundle_mod.DEFAULT_FRAMES_PER_TASK)
        assert bundle.param("ChunkSize") == want_chunk, (
            f"ChunkSize is {bundle.param('ChunkSize')!r}, expected {want_chunk} "
            f"for settings={settings}"
        )
        # ...and that it actually drives the task space. A ChunkSize that is declared
        # and valued but absent from the step's range would render the whole frame
        # range in one task while passing the check above.
        ranges = bundle.step_task_ranges()
        assert any("{{Param.ChunkSize}}" in r for r in ranges), (
            "ChunkSize is declared but no step's task range references it, so the "
            f"step would not chunk: ranges={ranges}"
        )
    else:
        assert "framesPerTask" not in settings, (
            f"{case.id} sets framesPerTask={settings['framesPerTask']} but the "
            "submitter emitted no ChunkSize parameter, meaning this selection has no "
            "image-sequence output — the setting is inert and the case proves nothing "
            "about chunking. Re-author the comp's output module to an image sequence, "
            "or drop the setting. See KNOWN_ISSUES.md #4."
        )

    # --- Output references ---------------------------------------------------------
    # One output path per step, each parameterised through that step's OutputDir —
    # previously output_directories()/output paths were never asserted at all.
    outputs = bundle.output_filenames()
    assert len(outputs) == len(bundle.steps), (
        f"{len(outputs)} parameterised output paths for {len(bundle.steps)} steps: "
        f"{outputs}"
    )
    assert bundle.output_directories(), "bundle declares no output directories"


def test_render(
    case, case_run, case_submission, case_dir, render, ae_version, unavailable
):
    """Poll the farm job submitted during the per-case drive to a terminal state.

    The submission happens in ``case_run`` (see conftest) so each case uploads its own
    bundle+fonts before the next drive overwrites the shared temp dir; here we only wait.
    """
    _skip_unless_rendering(case, render)

    run = case_run
    assert run.ok, f"No bundle to submit: {run.error}"

    submitted = case_submission
    assert submitted is not None, "no farm submission was recorded for this case"
    assert submitted.ok, (
        f"bundle submit failed (rc={submitted.returncode}): "
        f"{submitted.stderr or submitted.stdout}"
    )

    deadline_client.HANDLED.add(submitted.job_id)
    waited = deadline_client.wait(submitted.job_id, timeout=case.job_wait_timeout)

    # Reconcile against the real farm state. A local wait can report the wrong thing
    # for reasons unrelated to the job: the poll's credentials expired mid-run
    # (POLL_ERROR) or the local wait budget elapsed while the job was still finishing
    # (TIMEOUT). In those cases consult taskRunStatusCounts and believe the farm, in
    # either direction. A clean terminal exit code is already the farm's answer.
    effective = waited.status
    counts = {}
    if effective in ("POLL_ERROR", "TIMEOUT", "UNKNOWN"):
        counts = deadline_client.job_status_counts(submitted.job_id)
        effective = deadline_client.terminal_status_from_counts(counts) or effective

    # Anything other than the expected outcome: cancel, so a timed-out or wedged job
    # does not keep running on the default farm. A no-op for a job already finished.
    canceled = effective != case.expect and deadline_client.cancel(submitted.job_id)

    (case_dir / "wait.json").write_text(
        json.dumps(
            {
                "jobId": submitted.job_id,
                "returncode": waited.returncode,
                "status": waited.status,
                "effectiveStatus": effective,
                "taskRunStatusCounts": counts,
                "canceledByHarness": canceled,
                "stdout": waited.stdout,
                "stderr": waited.stderr,
            },
            indent=2,
        )
    )
    try:
        (case_dir / "job.json").write_text(
            json.dumps(deadline_client.get_job(submitted.job_id), indent=2, default=str)
        )
    except deadline_client.DeadlineError:
        pass

    if effective in ("POLL_ERROR", "TIMEOUT", "UNKNOWN") and not counts:
        unavailable(
            f"Could not poll job {submitted.job_id} (credentials/endpoint) and the "
            f"farm state was unreadable — refresh credentials and re-run. "
            f"{waited.stderr.strip()[:300]}"
        )

    assert effective == case.expect, (
        f"Job {submitted.job_id} ended {effective} (wait reported {waited.status}), "
        f"expected {case.expect}. counts={counts} {waited.stdout or waited.stderr}"
    )

    # An expected failure must fail for the expected reason. T12 expects FAILED from
    # its task timeout; a CLI error or a project that will not load also ends FAILED.
    if case.expect_failure_message:
        messages = deadline_client.task_failure_messages(submitted.job_id)
        if messages is None:
            unavailable(f"could not read task failures for {submitted.job_id}")
        assert any(case.expect_failure_message in m for m in messages), (
            f"Job {submitted.job_id} failed, but no failed task mentions "
            f"{case.expect_failure_message!r}: {messages}"
        )


def test_render_outputs(
    case, case_run, case_submission, case_dir, render, ae_version, unavailable
):
    """The job's *outputs* are complete, and a sample of them is a valid image.

    A job can succeed while writing the wrong thing: H.264 under a filename claiming
    a TIFF sequence, or a chunking bug that drops a frame at a task seam. Two tiers,
    because the cheap one covers most of it:

    * **Completeness** from the output manifest listing, which transfers no file bytes.
      Every filename the bundle says the step should write must be present. For T08
      that is all 300 frames, verified for free.
    * **Content** from a sampled download — the chunk seams plus the range ends (see
      ``outputs.chunk_boundary_sample``). Only those frames move, so a 300-frame case
      costs ~50 MB rather than ~2.4 GB.

    Skips rather than fails when the farm is unreachable: an expired credential is not
    a product defect, the same reasoning as ``test_render``'s POLL_ERROR skip. Under
    ``--strict-environment`` that skip is a failure.
    """
    _skip_unless_rendering(case, render)
    if case.expect != "SUCCEEDED":
        pytest.skip(
            f"{case.id} expects {case.expect}, so it has no complete output to check"
        )

    submitted = case_submission
    assert submitted is not None and submitted.ok, "no successful submission to check"

    # Only a finished job has a complete output manifest. test_render records the
    # outcome; if it did not succeed, it has already failed and said why.
    wait_file = case_dir / "wait.json"
    waited = (
        json.loads(wait_file.read_text(encoding="utf-8")) if wait_file.exists() else {}
    )
    if waited.get("jobId") != submitted.job_id:
        unavailable(
            f"no test_render result for job {submitted.job_id}; run the render layer "
            "in the same invocation"
        )
    if waited.get("effectiveStatus") != "SUCCEEDED":
        pytest.skip(f"job {submitted.job_id} did not succeed (see test_render)")

    # The archived as-submitted copy, never case_run.bundle_path: that is the shared
    # temp dir, which by now holds the last-driven case's bundle (KNOWN_ISSUES.md #1).
    bundle = bundle_mod.Bundle.load(case_dir / "bundle")
    step_outputs = bundle.step_outputs()
    assert len(step_outputs) == len(bundle.steps), (
        f"resolved {len(step_outputs)} step outputs for {len(bundle.steps)} steps; an "
        "unrecognised output arg would drop that step out of output verification"
    )

    try:
        produced = outputs_mod.output_leaf_names(submitted.job_id)
    except outputs_mod.OutputsUnavailable as exc:
        unavailable(f"farm outputs unreadable for {submitted.job_id}: {exc}")

    # --- Tier 1: completeness, zero bytes transferred -------------------------------
    report: dict[str, object] = {"jobId": submitted.job_id, "steps": []}
    sampled: list[str] = []
    for so in step_outputs:
        expected = so.expected_filenames()
        assert expected, (
            f"step {so.step!r} output {so.leaf!r} resolved to no expected filenames "
            f"(frames={so.frames!r}) — the harness cannot verify it"
        )
        missing = [name for name in expected if name not in produced]
        assert not missing, (
            f"step {so.step!r} was expected to write {len(expected)} file(s) but "
            f"{len(missing)} are absent from the job's outputs. "
            f"First missing: {missing[:5]}. Produced: {sorted(produced)[:5]}..."
        )

        if so.is_sequence:
            rng = so.frame_range()
            frames = outputs_mod.chunk_boundary_sample(rng[0], rng[1], so.chunk_size)
            names = [so.frame_filename(f) for f in frames]
        else:
            frames, names = [], [so.leaf]
        sampled.extend(names)
        report["steps"].append(
            {
                "step": so.step,
                "leaf": so.leaf,
                "frames": so.frames,
                "chunkSize": so.chunk_size,
                "isSequence": so.is_sequence,
                "expectedCount": len(expected),
                "sampledFrames": frames,
                "sampled": names,
            }
        )

    # --- Tier 2: content of the sample ----------------------------------------------
    # Clear first: a kept output/ from a previous failing run would otherwise satisfy
    # the per-frame checks below without anything being downloaded now.
    out_dir = case_dir / "output"
    if out_dir.exists():
        shutil.rmtree(out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)
    try:
        outputs_mod.download_outputs(submitted.job_id, leaf_names=sampled)
    except outputs_mod.OutputsUnavailable as exc:
        unavailable(f"could not download sampled output for {submitted.job_id}: {exc}")

    checked_images = 0
    for so in step_outputs:
        if so.is_sequence:
            rng = so.frame_range()
            frames = outputs_mod.chunk_boundary_sample(rng[0], rng[1], so.chunk_size)
            names = [so.frame_filename(f) for f in frames]
            seen_digests = {}
            for frame, name in zip(frames, names):
                path = out_dir / name
                assert path.exists(), f"sampled frame not downloaded: {path}"
                size, digest = _verify_image(path)
                seen_digests[name] = digest
                checked_images += 1
                # The file named for frame N must hold AE's frame N.
                if case.frame_code:
                    shown = outputs_mod.read_frame_code(path)
                    assert (
                        shown == frame
                    ), f"{name} holds AE frame {shown}, not frame {frame}"
            # Sampled frames must differ in pixels. Every sequence comp burns in a
            # frame counter (addFrameCounter in build_test_projects.jsx), so two
            # identical frames mean a task rendered the wrong slice or the same frame
            # twice — the failure mode chunking is most likely to have.
            dupes = [
                (a, b)
                for i, a in enumerate(names)
                for b in names[i + 1 :]
                if seen_digests[a] == seen_digests[b]
            ]
            assert not dupes, (
                f"step {so.step!r} rendered pixel-identical frames, so a task rendered "
                f"the wrong frame(s): {dupes}"
            )
        else:
            path = out_dir / so.leaf
            assert path.exists(), f"output not downloaded: {path}"
            # Video/audio are not decoded (no ffmpeg by design — see
            # requirements-integ.txt), so assert only that the file is non-trivial.
            size = path.stat().st_size
            assert (
                size > 1024
            ), f"output {path.name} is implausibly small ({size} bytes)"

    report["imagesChecked"] = checked_images

    # --- The farm's tasks cover exactly the frames authored in AE ------------------
    if case.expect_frames:
        task_frames = deadline_client.task_frames(submitted.job_id)
        if task_frames is None:
            unavailable(f"tasks unreadable for {submitted.job_id}")
        report["taskFrames"] = task_frames
    (case_dir / "outputs.json").write_text(json.dumps(report, indent=2))
    # A chunked task's frame parameter is its first frame, so the authored range split
    # by ChunkSize gives the task frames to expect.
    chunk = int(bundle.param("ChunkSize")) if bundle.has_chunking() else 1
    comps = [str(item.get("comp")) for item in case_run.render_queue_items]
    checks = kd.AuthoredChecks(case.id)
    for comp, step, so, want in zip(
        comps, bundle.steps, bundle.step_outputs(), case.expect_frames
    ):
        got = task_frames.get(step.get("name")) or []
        # A movie renders in one task with no frame parameter; a sequence is split
        # into chunks that start every ChunkSize frames.
        expected = (
            deadline_client.expand_frames(want)[::chunk] if so.is_sequence else []
        )
        checks.compare(kd.TASK_FRAMES, comp, got, expected, "task start frames")
    _settle(checks)


def _settle(checks: kd.AuthoredChecks) -> None:
    """Fail on any unexpected mismatch or fixed defect; xfail on a known defect."""
    reason = checks.settle()
    if reason:
        pytest.xfail(reason)


def _require_bundle(case) -> None:
    if case.expect_refusal:
        pytest.skip(f"{case.id} expects the submitter to refuse, so it has no bundle")


def _check_refusal(case, run) -> None:
    """The submitter refused the case, for the expected reason.

    It refuses after it has started writing the bundle, so this is also the
    partial-bundle case: the drive must report it as a failure, not a success.
    """
    comps = [str(item.get("comp")) for item in run.render_queue_items] or [case.id]
    checks = kd.AuthoredChecks(case.id)
    checks.compare(kd.REFUSAL, comps[0], run.ok, False, "bundle built")
    if not run.ok:
        assert any(case.expect_refusal in a for a in run.alerts), (
            f"the submitter refused, but without an alert containing "
            f"{case.expect_refusal!r}: {run.alerts}"
        )
        others = [a for a in run.alerts if case.expect_refusal not in a]
        assert not others, f"unexpected alerts besides the refusal: {others}"
        assert "Bundle incomplete" in (
            run.error or ""
        ), f"the drive should report the partial bundle, got: {run.error!r}"
    _settle(checks)


# The submitter's confirm() for a host AE its conda channel does not list.
VERSION_WARNING = "is not officially supported in the deadline-cloud conda channel"


def _assert_alerts(case, run, version_warning: bool = False) -> None:
    """The submitter raised exactly the alerts the case expects.

    The driver stubs adcAlert, so the submitter's non-fatal warnings (missing
    footage, missing fonts) would otherwise vanish and the bundle would look clean.
    A case declares the ones it expects; anything else is a regression.
    """
    unexpected = [
        a for a in run.alerts if not any(want in a for want in case.expect_alerts)
    ]
    assert not unexpected, (
        f"submitter raised unexpected alerts: {unexpected} "
        f"(expected substrings: {case.expect_alerts})"
    )
    for want in case.expect_alerts:
        assert any(
            want in a for a in run.alerts
        ), f"expected a submitter alert containing {want!r}, got {run.alerts}"
    # The same for confirm() prompts. The unsupported-version warning depends on the
    # host's AE version, so it is expected exactly when that version is unsupported.
    wanted = list(case.expect_confirms) + ([VERSION_WARNING] if version_warning else [])
    unexpected = [c for c in run.confirms if not any(want in c for want in wanted)]
    assert (
        not unexpected
    ), f"submitter asked to confirm: {unexpected} (expected substrings: {wanted})"
    for want in wanted:
        assert any(
            want in c for c in run.confirms
        ), f"expected a confirm prompt containing {want!r}, got {run.confirms}"


def _verify_image(path: Path) -> tuple[tuple[int, int], str]:
    """Open a rendered frame, assert it is a decodable non-blank image, return (size, digest).

    ``verify()`` alone would catch a truncated file but not a correct-looking black
    frame, which is what a missing-footage or failed-font render actually produces — so
    the pixel extrema are checked too.

    The digest is of the decoded pixels, not the file. TIFF headers carry per-file
    metadata, so byte-identical checks would call two identical images distinct.
    """
    import hashlib

    from PIL import Image

    with Image.open(path) as im:
        im.load()
        size = im.size
        rgb = im.convert("RGB")
        bands = rgb.getextrema()
        digest = hashlib.sha256(rgb.tobytes()).hexdigest()
    assert size[0] > 0 and size[1] > 0, f"{path.name} decoded to an empty image"
    assert any(
        lo != hi for lo, hi in bands
    ), f"{path.name} is a single flat colour ({bands}) — the render produced no content"
    return size, digest


def _skip_unless_rendering(case, render) -> None:
    """Skip the render layers, saying why: the run did not ask for it, or the case is
    bundle-only (``"render": false`` in its case.json)."""
    if not render:
        pytest.skip(
            "render layer disabled (pass --render / AE_RUN_RENDER=1 to submit + poll)"
        )
    if not case.render:
        pytest.skip(f"{case.id} is bundle-only (render: false in its case.json)")


def config_project_name(case) -> str:
    """The .aep filename the bundle's ProjectFile should reference for this case."""
    from harness import config

    return config.get_project_path(case.id, case.aep_slug).name
