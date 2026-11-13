# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""A crashed After Effects fails its task, and the retries still render every frame.

Submits ``ae_crash/job_bundle`` with the CLI rather than through the submitter. It
renders the T08 project with the submitter's own ``call_aerender.py`` from ``dist/``,
while a job environment kills about half of the ``AfterFX.com`` runs. aerender reports
such a kill as "An existing connection was forcibly closed" and exits 0, so the test
needs both checks: at least one task failed for that reason, and every frame exists.

``--render`` only. Run it alone with ``-k ae_crash``. ``test_ae_crash_submit`` runs
first and ``test_ae_crash_render`` last (see ``pytest_collection_modifyitems`` in
conftest), so the job renders while the rest of the suite runs.
"""

from __future__ import annotations

import json
import shutil
from pathlib import Path

import pytest
from harness import cases as cases_mod
from harness import config, deadline_client
from harness import outputs as outputs_mod

_BUNDLE_SRC = Path(__file__).resolve().parent / "ae_crash" / "job_bundle"
_SCRIPTS_DIR = (
    Path(__file__).resolve().parents[2]
    / "dist"
    / "DeadlineCloudSubmitter_Assets"
    / "JobTemplate"
    / "scripts"
)
_ARTIFACT_DIR = (
    Path(__file__).resolve().parents[2] / "build" / "integ-artifacts" / "ae_crash"
)

FRAMES = range(1001)
CHUNK_SIZE = 100
MAX_RETRIES = 10
MAX_FAILED_TASKS = 1000
WAIT_TIMEOUT_S = max(cases_mod.JOB_WAIT_TIMEOUT_S, 3600)
CRASH_MESSAGE = "An existing connection was forcibly closed"


def _write_bundle(bundle_dir: Path, project: Path, output_dir: Path) -> None:
    if bundle_dir.exists():
        shutil.rmtree(bundle_dir)
    shutil.copytree(_BUNDLE_SRC, bundle_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    params = {
        "parameterValues": [
            {"name": "deadline:maxFailedTasksCount", "value": MAX_FAILED_TASKS},
            {"name": "ProjectFile", "value": str(project)},
            {"name": "JobScriptDir", "value": str(_SCRIPTS_DIR)},
            {"name": "CondaPackages", "value": f"aftereffects={config.get_ae_major()}"},
            {"name": "ChunkSize", "value": CHUNK_SIZE},
            {"name": "OutputDir", "value": str(output_dir)},
            {"name": "Frames", "value": f"{FRAMES[0]}-{FRAMES[-1]}"},
        ]
    }
    (bundle_dir / "parameter_values.json").write_text(json.dumps(params, indent=2))
    refs = {
        "assetReferences": {
            "inputs": {"directories": [str(_SCRIPTS_DIR)], "filenames": [str(project)]},
            "outputs": {"directories": [str(output_dir)]},
            "referencedPaths": [],
        }
    }
    (bundle_dir / "asset_references.json").write_text(json.dumps(refs, indent=2))
    deadline_client.apply_job_metadata(
        bundle_dir, conda_channels=cases_mod.JOB_CONDA_CHANNELS
    )


_SUBMISSION: dict[str, deadline_client.SubmitResult] = {}


def test_ae_crash_submit(render, run_assets, suite_stamp, unavailable):
    """Submit the crash job. Its result is checked by test_ae_crash_render, which
    conftest moves to the end of the session so the farm renders while the
    submitter cases drive AE."""
    if not render:
        pytest.skip("render layer disabled (pass --render or set AE_RUN_RENDER=1)")
    project = config.get_project_path("T08", "image_chunking_300f")
    if not project.exists():
        unavailable(f"Project not found for {config.get_ae_year()}: {project}")

    bundle_dir = _ARTIFACT_DIR / "bundle"
    _write_bundle(bundle_dir, project, _ARTIFACT_DIR / "output")

    submitted = deadline_client.submit(
        bundle_dir, name=f"AE_CRASH_{suite_stamp}", max_retries_per_task=MAX_RETRIES
    )
    assert submitted.ok, (
        f"bundle submit failed (rc={submitted.returncode}): "
        f"{submitted.stderr or submitted.stdout}"
    )
    _SUBMISSION["job"] = submitted


def test_ae_crash_render(render, unavailable):
    """A crash fails its task, and the retries still render every frame."""
    if not render:
        pytest.skip("render layer disabled (pass --render or set AE_RUN_RENDER=1)")
    submitted = _SUBMISSION.get("job")
    if submitted is None:
        pytest.skip("crash job not submitted (test_ae_crash_submit skipped or failed)")
    deadline_client.HANDLED.add(submitted.job_id)

    waited = deadline_client.wait(submitted.job_id, timeout=WAIT_TIMEOUT_S)
    effective = waited.status
    counts = {}
    if effective in ("POLL_ERROR", "TIMEOUT", "UNKNOWN"):
        counts = deadline_client.job_status_counts(submitted.job_id)
        effective = deadline_client.terminal_status_from_counts(counts) or effective
    if effective != "SUCCEEDED":
        deadline_client.cancel(submitted.job_id)
    if effective in ("POLL_ERROR", "TIMEOUT", "UNKNOWN") and not counts:
        unavailable(
            f"Could not poll job {submitted.job_id}: {waited.stderr.strip()[:300]}"
        )
    assert (
        effective == "SUCCEEDED"
    ), f"Job {submitted.job_id} ended {effective}, expected SUCCEEDED. counts={counts}"

    messages = deadline_client.task_failure_messages(submitted.job_id)
    if messages is None:
        unavailable(f"could not read task failures for {submitted.job_id}")
    crashes = [m for m in messages if CRASH_MESSAGE in m]
    assert crashes, (
        f"Job {submitted.job_id} has no failed task mentioning {CRASH_MESSAGE!r}, so "
        f"no crash was reported as a failure. Failed task messages: {messages}"
    )

    try:
        produced = outputs_mod.output_leaf_names(submitted.job_id)
    except outputs_mod.OutputsUnavailable as exc:
        unavailable(f"farm outputs unreadable for {submitted.job_id}: {exc}")
    expected = {f"T08_{n:05d}.tif" for n in FRAMES}
    missing = sorted(expected - produced)
    assert not missing, (
        f"Job {submitted.job_id} is missing {len(missing)} of {len(expected)} frames, "
        f"first {missing[:10]}"
    )
