# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Static checks on the integration cases (test/integ/test_cases). No After Effects needed."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integ"))

from harness import cases as cases_mod
from harness import known_defects as kd

_CASES = cases_mod.discover_cases()


def test_cases_discovered():
    """A moved or empty test_cases/ must fail. The AE tests would just skip."""
    assert _CASES, f"no case.json found under {cases_mod.TEST_CASES_DIR}"


def test_cases_documented():
    """Every case appears in test_cases/README.md, so the coverage table stays complete."""
    readme = (cases_mod.TEST_CASES_DIR / "README.md").read_text(encoding="utf-8")
    missing = [c.id for c in _CASES if f'<a id="{c.id.lower()}"></a>' not in readme]
    assert not missing, f"cases missing from test_cases/README.md: {missing}"


def test_known_defects_name_real_cases():
    """A known defect for a case that no longer exists would never be checked."""
    ids = {c.id for c in _CASES}
    stale = [d.case for d in kd.KNOWN_DEFECTS if d.case not in ids]
    assert not stale, f"known defects for unknown cases: {stale}"
