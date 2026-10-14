# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Pytest fixtures for the After Effects submitter integration tests.

Execution model (two tests per case, sharing one AE drive):

  1. ``driver_installed`` (session)  — install the Startup driver JSX; remove after.
  2. ``case_run``                    — drive AE once per case (cached) to build a
                                        bundle; consumed by both test layers. With
                                        ``--render`` on, it *also* submits the bundle
                                        to the farm right here — see ``case_submission``.
  3. tests in the test module        — bundle generation always; render (poll only)
                                        only with ``--render`` and when the case opts in.

Two snapshots of the bundle are archived per case, and the difference matters:
``bundle-as-built`` is what the submitter wrote, ``bundle`` is what we submitted
after ``apply_job_metadata`` stamped a description and task timeout into it.
Assertions about the *submitter's* behaviour must read the former.

Why submit inside ``case_run`` and not in ``test_render``: the submitter overwrites
the shared temp dir (``~/.deadline/DeadlineCloudAETemp/`` — bundle *and* ``tempFonts/``)
on every AE drive. pytest runs *all* ``test_bundle_generation`` before *any*
``test_render``, so deferring the submit would upload the last-generated case's bundle
and fonts for every render. Submitting during the per-case drive captures each case's
own bundle+fonts while they are still on disk; ``test_render`` only polls the job.

Environment / options:
  ``AE_VERSION``      release year to drive (default 2026); or ``--ae-version``.
  ``AE_TEST_ASSETS``  asset root (default: the in-repo test/integ/aep_test_assets).
  ``DEADLINE_CLI``    deadline CLI path (default: PATH).
  ``--render`` / ``AE_RUN_RENDER=1``  enable live submit + poll (needs AE license + farm).
"""

from __future__ import annotations

import json
import shutil
import time
from pathlib import Path

import pytest
from harness import ae_launcher, aep, config, deadline_client, driver
from harness import bundle as bundle_mod
from harness import cases as cases_mod

_ARTIFACT_ROOT = Path(__file__).resolve().parents[2] / "build" / "integ-artifacts"


def _recopy(src: Path, dest: Path) -> None:
    """Replace ``dest`` with a fresh copy of ``src``."""
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(src, dest)


# --------------------------------------------------------------------------- CLI options
def pytest_addoption(parser: pytest.Parser) -> None:
    group = parser.getgroup("after-effects-integ")
    group.addoption(
        "--render",
        action="store_true",
        default=None,
        help="Run the live submit+poll render layer. Needs a licensed AE and a farm. "
        "Also enabled by AE_RUN_RENDER=1.",
    )
    group.addoption(
        "--ae-version",
        action="store",
        default=None,
        help="AE release year to drive, e.g. 2025 or 2026. Overrides AE_VERSION.",
    )
    group.addoption(
        "--strict-environment",
        action="store_true",
        default=None,
        help="Fail instead of skipping when the environment is incomplete (no AE, no "
        "submitter, no project asset). Without it a host missing After Effects exits "
        "0 having tested nothing. Also enabled by AE_STRICT_ENVIRONMENT=1.",
    )


def _strict_environment(pytestconfig: pytest.Config) -> bool:
    import os

    if pytestconfig.getoption("--strict-environment"):
        return True
    return os.environ.get("AE_STRICT_ENVIRONMENT", "").strip() in ("1", "true", "yes")


def _absent(pytestconfig: pytest.Config, reason: str) -> None:
    """Skip, or fail under ``--strict-environment``, for a missing prerequisite."""
    if _strict_environment(pytestconfig):
        pytest.fail(f"{reason} (--strict-environment)")
    pytest.skip(reason)


@pytest.fixture
def unavailable(pytestconfig: pytest.Config):
    """Skip for an unreachable farm (expired credentials, no outputs readable).

    Fails instead under ``--strict-environment``, so a CI run whose credentials
    expire mid-suite cannot pass having tested nothing.
    """
    return lambda reason: _absent(pytestconfig, reason)


def _render_enabled(pytestconfig: pytest.Config) -> bool:
    import os

    if pytestconfig.getoption("--render"):
        return True
    return os.environ.get("AE_RUN_RENDER", "").strip() in ("1", "true", "yes")


# --------------------------------------------------------------------------- fixtures
@pytest.fixture(scope="session", autouse=True)
def _apply_ae_version(pytestconfig: pytest.Config) -> None:
    import os

    override = pytestconfig.getoption("--ae-version")
    if override:
        os.environ["AE_VERSION"] = override


@pytest.fixture(scope="session")
def ae_version() -> str:
    return config.get_ae_year()


@pytest.fixture(scope="session")
def render(pytestconfig: pytest.Config) -> bool:
    return _render_enabled(pytestconfig)


@pytest.fixture(scope="session")
def suite_stamp() -> str:
    """Timestamp of the suite start, ``YYMMDDHHMM`` — one value for the whole run.

    Used to name every job ``<case-id>_<stamp>`` so all jobs from a single suite
    invocation share the stamp and sort together in the console.
    """
    return time.strftime("%y%m%d%H%M")


@pytest.fixture(scope="session")
def require_ae(pytestconfig: pytest.Config) -> None:
    """Skip the whole run cleanly if the target AE isn't installed on this host.

    Pass ``--strict-environment`` (CI should) to turn these skips into failures: a
    run that skips every case still exits 0, so an AE install that silently moved,
    or a submitter that was never installed, otherwise reads as a green suite.
    """
    app = config.get_ae_app_path()
    if not app.exists():
        _absent(
            pytestconfig,
            f"After Effects not found at {app} (set AE_EXECUTABLE / AE_VERSION)",
        )
    if not config.get_submitter_path().exists():
        _absent(
            pytestconfig,
            "Deadline Cloud submitter not installed at "
            f"{config.get_submitter_path()} — install the submitter first",
        )


@pytest.fixture(scope="session")
def driver_installed(require_ae: None) -> Path:
    installed = driver.install_driver()
    try:
        yield installed
    finally:
        driver.uninstall_driver()
        if ae_launcher.is_ae_running():
            ae_launcher.stop_ae()


@pytest.fixture(scope="session", autouse=True)
def _ae_warmup(driver_installed: Path) -> None:
    """Prime AE once before any case is timed, absorbing the cold-launch penalty.

    The first launch on an idle host is pathologically slow (licensing/init); doing
    it here — untimed — keeps the first case's per-drive timeout from racing it. See
    ``driver.warmup``. Best-effort: a warmup miss just leaves the drive timeout as the
    backstop, exactly as before.
    """
    driver.warmup()


@pytest.fixture
def case_dir(case) -> Path:
    """Per-case dir under build/integ-artifacts for the bundle, result, and logs.

    Keyed by the case slug (not the test node) so all test layers for the same
    case share one directory — the AE drive that produced the bundle happens once.
    """
    safe = case.slug.replace("/", "_")
    d = _ARTIFACT_ROOT / safe
    d.mkdir(parents=True, exist_ok=True)
    return d


@pytest.fixture
def case_output_dir(case_dir: Path) -> Path:
    """Where this case's render output is written on the farm and downloaded back to.

    Chosen over the asset tree's ``renders/`` (where the builder's baked-in
    ``RENDERBASE`` would otherwise send it) for three reasons: ``build/`` is already
    gitignored and already the wipe-me directory; the frames end up beside the
    ``bundle``/``submit.json``/``wait.json`` that produced them, so a failed case's
    evidence is one directory; and output stops living inside the tree that gets
    uploaded as job *input*.
    """
    return case_dir / "output"


# The AE drive is expensive (~1 min) and its result is the input to all test layers,
# so we do it once per case and cache it for the pytest process lifetime. When render
# is on, the farm submission happens during that same drive (shared temp is still the
# case's) and its result is cached alongside for ``test_render`` to poll.
_RUN_CACHE: dict[str, driver.SubmitterRun] = {}
_SUBMIT_CACHE: dict[str, deadline_client.SubmitResult] = {}


@pytest.fixture
def case_run(
    case,
    driver_installed: Path,
    case_dir: Path,
    case_output_dir: Path,
    render: bool,
    ae_version: str,
    suite_stamp: str,
    pytestconfig: pytest.Config,
) -> driver.SubmitterRun:
    """Drive AE once for ``case`` (cached), collecting artifacts. Skips if no asset.

    With ``--render`` on, also submits the freshly built bundle to the farm before the
    next case's drive can overwrite the shared temp dir; the submission is cached in
    ``_SUBMIT_CACHE`` for ``case_submission`` / ``test_render`` to poll.
    """
    project = config.get_project_path(case.id, case.aep_slug)
    if not project.exists():
        _absent(
            pytestconfig, f"Project not found for {config.get_ae_year()}: {project}"
        )

    cached = _RUN_CACHE.get(case.slug)
    if cached is not None:
        return cached

    result = driver.run_submitter(project, case.settings, timeout=case.ae_run_timeout)
    # The drive may have re-saved the project, recording this machine's name and
    # home-directory paths in it.
    aep.scrub_project(project)

    # Archive the bundle *exactly as the submitter built it*, before any harness
    # patching. This is the only copy that can be asserted against the case's
    # settings: apply_job_metadata below rewrites every step's onRun.timeout, so
    # reading the post-patch bundle would test the harness, not the submitter.
    if result.bundle_path and result.bundle_path.exists():
        _recopy(result.bundle_path, case_dir / "bundle-as-built")

    # Before we archive or submit, stamp the render job's metadata into the bundle
    # template: a description that identifies the test case, and a per-task timeout
    # (the CLI can set neither). Only relevant when we're going to submit.
    if render and case.render and result.ok and result.bundle_path:
        description = (
            f"integ {case.id} · {case.aep_slug} · ae{ae_version} · "
            f"expect {case.expect} · {case.name}"
        )
        # Only impose the harness's blanket task timeout on cases that don't pin one
        # themselves. Overriding a case's own taskRunTimeout* would destroy the very
        # behaviour it exists to test — T12 asks for a 1-minute timeout and expects
        # the job to FAIL, which a blanket 3600s rewrite would quietly prevent.
        task_timeout = (
            None
            if bundle_mod.specifies_task_timeout(case.settings)
            else cases_mod.JOB_TASK_TIMEOUT_S
        )
        deadline_client.apply_job_metadata(
            result.bundle_path,
            description=description,
            task_run_timeout_s=task_timeout,
        )
        # Redirect the render output into this case's artifact dir. Must happen before
        # the "bundle" snapshot and before submit() calls known_asset_paths, which
        # reads the patched asset_references.json to allowlist the new location.
        deadline_client.redirect_output_dir(result.bundle_path, case_output_dir)

    # Collect artifacts for debugging / CI upload.
    res_path = config.get_result_path()
    if res_path.exists():
        shutil.copy2(res_path, case_dir / "result.json")
    if result.bundle_path and result.bundle_path.exists():
        # "bundle" is the as-submitted copy; compare it against "bundle-as-built"
        # to see exactly what the harness changed before upload.
        _recopy(result.bundle_path, case_dir / "bundle")
    (case_dir / "submitter_run.json").write_text(
        json.dumps(
            {
                "status": result.status,
                "bundlePath": str(result.bundle_path) if result.bundle_path else None,
                "error": result.error,
                "renderQueueItems": result.render_queue_items,
                "timedOut": result.timed_out,
                "elapsed_s": result.elapsed_s,
            },
            indent=2,
        )
    )
    _RUN_CACHE[case.slug] = result

    # Interleaved submit: upload *this* case's bundle+fonts now, while they are the
    # ones on disk. A farm hiccup must not fail bundle generation, so any submit
    # outcome (including a bad return code) is just recorded for test_render to assert.
    if render and case.render and result.ok:
        submitted = deadline_client.submit(
            result.bundle_path,
            name=f"{case.id}_{suite_stamp}",
            max_retries_per_task=case.max_retries,
        )
        (case_dir / "submit.json").write_text(
            json.dumps(
                {
                    "jobId": submitted.job_id,
                    "returncode": submitted.returncode,
                    "stdout": submitted.stdout,
                    "stderr": submitted.stderr,
                },
                indent=2,
            )
        )
        _SUBMIT_CACHE[case.slug] = submitted

    return result


@pytest.fixture
def case_submission(
    case, case_run: driver.SubmitterRun
) -> deadline_client.SubmitResult:
    """The farm submission produced during ``case_run`` (None if render was off)."""
    return _SUBMIT_CACHE.get(case.slug)
