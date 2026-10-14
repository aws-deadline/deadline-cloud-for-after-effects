# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""End-to-end tests for the Deadline Cloud After Effects submitter.

Two layers per discovered case, sharing a single (cached) AE drive:

* **bundle generation** (``test_bundle_generation``): re-drive the *real* submitter
  headlessly and assert the OpenJD job bundle it produces is valid and well-formed.
  Always runs when AE is installed.
* **render** (``test_render``): submit that bundle to Deadline Cloud and poll the job to
  its expected terminal state. Runs only with ``--render`` / ``AE_RUN_RENDER=1``.

Both are parametrised over every ``test_cases/<name>/case.json``.
"""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from deadline_test_fixtures.job_bundle.compare import assert_valid_job_bundle
from harness import bundle as bundle_mod
from harness import cases as cases_mod
from harness import config, deadline_client

_CASES = cases_mod.discover_cases()


def test_cases_discovered():
    """A moved or empty test_cases/ must fail. Parametrised tests would just skip."""
    assert _CASES, f"no case.json found under {cases_mod.TEST_CASES_DIR}"


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
    """The real submitter builds a well-formed OpenJD bundle for the case."""
    run = case_run
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

    # The driver stubs adcAlert, so the submitter's non-fatal warnings (missing
    # footage, missing fonts) would otherwise vanish and the bundle would look clean.
    # A case declares the ones it expects; anything else is a regression.
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

    # Declared with a default and never given a value, so param() is always None here.
    conda = bundle.param_default("CondaPackages") or bundle.param("CondaPackages")
    assert conda, "CondaPackages is neither declared with a default nor given a value"
    want_conda = f"aftereffects={config.get_ae_major()}"
    assert want_conda in str(conda), f"CondaPackages {conda!r} lacks {want_conda!r}"

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
    drive_ranges = [str(item.get("frames")) for item in rq_items]
    bundle_ranges = [str(so.frames) for so in bundle.step_outputs()]
    if "unknown" not in drive_ranges:
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


def test_render(
    case, case_run, case_submission, case_dir, render, ae_version, unavailable
):
    """Poll the farm job submitted during the per-case drive to a terminal state.

    The submission happens in ``case_run`` (see conftest) so each case uploads its own
    bundle+fonts before the next drive overwrites the shared temp dir; here we only wait.
    """
    if not (render and case.render):
        pytest.skip(
            "render layer disabled (pass --render / AE_RUN_RENDER=1 to submit + poll)"
        )

    run = case_run
    assert run.ok, f"No bundle to submit: {run.error}"

    submitted = case_submission
    assert submitted is not None, "no farm submission was recorded for this case"
    assert submitted.ok, (
        f"bundle submit failed (rc={submitted.returncode}): "
        f"{submitted.stderr or submitted.stdout}"
    )

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


def config_project_name(case) -> str:
    """The .aep filename the bundle's ProjectFile should reference for this case."""
    from harness import config

    return config.get_project_path(case.id, case.aep_slug).name
