# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Discover test cases from ``test_cases/<name>/case.json``.

Each case declares the artifact it drives (``id`` + ``aep_slug``), the submitter
settings to apply, and its expectations. Adding a new test = adding a directory;
no Python change needed. Schema::

    {
      "id": "T05",                      # case id; with aep_slug, names the .aep
      "name": "Basic submit (single comp, default settings)",
      "aep_slug": "submit_dockable",    # matches the .aep filename slug
      "settings": {},                   # submitter settings (see driver JSX)
      "expect": "SUCCEEDED",            # expected terminal job status for the render layer
      "render": true,                   # run live submit + poll
      "max_retries": 3,                 # optional; farm retries per task
      "expect_failure_message": "TIMEOUT", # optional; why an expected failure failed
      "expect_alerts": ["Missing fonts"], # optional; submitter warnings this case expects
      "expect_confirms": ["..."],       # optional; confirm() prompts this case expects
      "ae_run_timeout": 300,            # optional; per-drive budget in seconds
      "expect_frames": ["1010-1033"],   # optional; per-step AE frame ranges, authored by hand
      "frame_code": false,              # optional; frames carry a pixel-encoded frame number
      "expect_refusal": "..."           # optional; the submitter must refuse, with this alert
    }

``settings`` are applied by the driver JSX before the submitter builds the bundle.
``test_job_settings`` asserts each setting's effect on that bundle, and the
submitter's defaults for any setting a case leaves unset.

The per-render wait budget is a single tunable (``JOB_WAIT_TIMEOUT_S``), not a
per-case field — every render gets the same timeout.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

TEST_CASES_DIR = Path(__file__).resolve().parent.parent / "test_cases"

# --- Tunables (single source of truth; env-overridable) ---------------------
# Per-render wait budget, applied to *every* case. 20 min covers a cold queue plus
# three renders; a hung job (a worker session that never exits) still fails rather
# than waiting indefinitely. Override with AE_JOB_WAIT_TIMEOUT (seconds).
JOB_WAIT_TIMEOUT_S = int(os.environ.get("AE_JOB_WAIT_TIMEOUT", "1200"))

# Per-task run timeout baked into every submitted job's OpenJD template
# (steps[].script.actions.onRun.timeout). Bounds a hung task on the farm so it is
# killed and retried rather than running indefinitely. Override with
# AE_JOB_TASK_TIMEOUT (seconds). Default 1 hour.
JOB_TASK_TIMEOUT_S = int(os.environ.get("AE_JOB_TASK_TIMEOUT", "3600"))

# Max retries per task on the farm (deadline bundle submit --max-retries-per-task).
# Override with AE_JOB_MAX_RETRIES.
JOB_MAX_RETRIES = int(os.environ.get("AE_JOB_MAX_RETRIES", "3"))

# Cases skipped entirely (id -> reason shown in the pytest skip message).
SKIP_CASES: dict[str, str] = {}


@dataclass(frozen=True)
class Case:
    id: str
    name: str
    aep_slug: str
    dir: Path
    settings: dict[str, Any] = field(default_factory=dict)
    expect: str = "SUCCEEDED"
    render: bool = True
    job_wait_timeout: int = JOB_WAIT_TIMEOUT_S
    ae_run_timeout: int = 300
    # Farm retries for this case's tasks. Overridable per case because a case that
    # *expects* failure must not retry: at JOB_MAX_RETRIES every attempt would burn
    # its full task timeout before the job settles, so the local wait budget would
    # elapse first and the run would report TIMEOUT instead of the expected FAILED.
    max_retries: int = JOB_MAX_RETRIES
    # For an expected failure: text a failed task's progress message must contain
    # (e.g. "TIMEOUT"). Without it any failure, for any reason, would satisfy
    # ``expect: FAILED``.
    expect_failure_message: str | None = None
    # Substrings of submitter alerts (adcAlert) this case expects. Any alert that
    # matches none of them fails the bundle layer, so a new warning cannot pass
    # unnoticed. T06 expects its deliberately-missing font to be reported.
    expect_alerts: list[str] = field(default_factory=list)
    # Substrings of confirm() prompts this case expects (e.g. the unsupported-version
    # warning). Any other prompt fails, like an unexpected alert.
    expect_confirms: list[str] = field(default_factory=list)
    # Per-step frame ranges as authored in AE, e.g. ["1010-1033"]. An oracle that is
    # independent of the submitter's frame formula, which the driver JSX copies.
    expect_frames: list[str] = field(default_factory=list)
    # The comps burn their frame number into the pixels (addFrameCode in
    # build_test_projects.jsx), so the output layer can check each file's content.
    frame_code: bool = False
    # The submitter must refuse this case with an alert containing this text. Known
    # defects in the authored-in-AE checks live in known_defects.py.
    expect_refusal: str | None = None

    @property
    def slug(self) -> str:
        """Stable pytest id, e.g. ``T05-submit_dockable``."""
        return f"{self.id}-{self.aep_slug}"


def _load_case(case_dir: Path) -> Case:
    data = json.loads((case_dir / "case.json").read_text(encoding="utf-8"))
    return Case(
        id=data["id"],
        name=data.get("name", data["id"]),
        aep_slug=data["aep_slug"],
        dir=case_dir,
        settings=data.get("settings", {}),
        expect=data.get("expect", "SUCCEEDED"),
        render=data.get("render", True),
        # Single knob for all cases; any per-case JSON value is intentionally ignored.
        job_wait_timeout=JOB_WAIT_TIMEOUT_S,
        ae_run_timeout=data.get("ae_run_timeout", 300),
        max_retries=data.get("max_retries", JOB_MAX_RETRIES),
        expect_failure_message=data.get("expect_failure_message"),
        expect_alerts=data.get("expect_alerts", []),
        expect_confirms=data.get("expect_confirms", []),
        expect_frames=data.get("expect_frames", []),
        frame_code=data.get("frame_code", False),
        expect_refusal=data.get("expect_refusal"),
    )


def discover_cases() -> list[Case]:
    if not TEST_CASES_DIR.is_dir():
        return []
    cases = [
        _load_case(d)
        for d in sorted(TEST_CASES_DIR.iterdir())
        if d.is_dir() and (d / "case.json").exists()
    ]
    return cases
