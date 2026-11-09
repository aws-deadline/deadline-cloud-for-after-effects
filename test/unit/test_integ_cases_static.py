# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Static checks on the integration cases (test/integ/test_cases). No After Effects needed."""

import dataclasses
import json
import re
import sys
from pathlib import Path

import pytest

_INTEG = Path(__file__).resolve().parents[1] / "integ"
sys.path.insert(0, str(_INTEG))

from harness import cases as cases_mod
from harness import known_defects as kd

_CASES = cases_mod.discover_cases()
_IDS = [c.id for c in _CASES]

# case.json keys: the Case fields a case may set, plus free-text notes.
_KEYS = {
    f.name
    for f in dataclasses.fields(cases_mod.Case)
    if f.name not in ("dir", "job_wait_timeout")
} | {"notes"}
_EXPECT = {"SUCCEEDED", "FAILED", "CANCELED", "SUSPENDED", "NOT_COMPATIBLE"}
_CHECKS = {kd.FRAMES, kd.TASK_FRAMES, kd.OUTPUT_NAMES, kd.REFUSAL}


def _driver_settings() -> set[str]:
    """Settings the driver JSX applies (`config.<name> !== undefined`)."""
    jsx = (_INTEG / "scripts" / "DeadlineCloudAutoSubmit.jsx").read_text(
        encoding="utf-8"
    )
    return set(re.findall(r"config\.(\w+) !== undefined", jsx))


def test_cases_discovered():
    """A moved or empty test_cases/ must fail. The AE tests would just skip."""
    assert _CASES, f"no case.json found under {cases_mod.TEST_CASES_DIR}"


@pytest.mark.parametrize("case", _CASES, ids=_IDS)
def test_case_json_schema(case):
    """A typo in a key, a setting or ``expect`` would otherwise switch a check off."""
    data = json.loads((case.dir / "case.json").read_text(encoding="utf-8"))
    assert (
        not set(data) - _KEYS
    ), f"unknown keys {sorted(set(data) - _KEYS)}; known {sorted(_KEYS)}"
    settings = _driver_settings()
    assert settings, "found no settings in the driver JSX"
    unknown = set(data.get("settings", {})) - settings
    assert not unknown, f"settings the driver does not apply: {sorted(unknown)}"
    assert case.expect in _EXPECT, f"expect {case.expect!r} is not a job status"
    assert case.dir.name.startswith(f"{case.id}_{case.aep_slug}"), case.dir.name


def test_cases_documented():
    """Every case has a section in test_cases/README.md naming its golden's steps."""
    readme = (cases_mod.TEST_CASES_DIR / "README.md").read_text(encoding="utf-8")
    sections = dict(
        re.findall(r'<a id="(t\d+)"></a>(.*?)</details>', readme, flags=re.DOTALL)
    )
    missing = [c.id for c in _CASES if c.id.lower() not in sections]
    assert not missing, f"cases missing from test_cases/README.md: {missing}"
    for case in _CASES:
        template = case.dir / "expected" / "job_bundle" / "template.json"
        if not template.exists():
            continue
        steps = [
            s["name"] for s in json.loads(template.read_text(encoding="utf-8"))["steps"]
        ]
        absent = [s for s in steps if s not in sections[case.id.lower()]]
        assert not absent, f"{case.id}'s README section does not list steps {absent}"


def test_known_defects_are_checkable():
    """A known defect that is never checked would never be reported, or retired."""
    by_id = {c.id: c for c in _CASES}
    for d in kd.KNOWN_DEFECTS:
        assert d.case in by_id, f"known defect for unknown case {d.case}"
        assert d.check in _CHECKS, f"{d.case}: unknown check {d.check!r}"
        case = by_id[d.case]
        if d.check in (kd.FRAMES, kd.TASK_FRAMES):
            assert case.expect_frames, f"{d.case}: {d.check} needs expect_frames"
        if d.check == kd.TASK_FRAMES:
            assert case.render, f"{d.case}: {d.check} needs a rendering case"
        if d.check == kd.REFUSAL:
            assert case.expect_refusal, f"{d.case}: {d.check} needs expect_refusal"
        assert d.comps, f"{d.case}: a known defect must name its comps"
