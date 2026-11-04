# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Known submitter defects stay narrow (test/integ/harness/known_defects.py).

A registered defect may only excuse its own case, check and comps. A new regression
elsewhere must fail, and a fixed defect must fail until its entry is removed.
"""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integ"))

from harness.known_defects import (
    FRAMES,
    OUTPUT_NAMES,
    AuthoredChecks,
    KnownDefect,
)

DEFECTS = (KnownDefect("T99", FRAMES, ("comp_a",), "frame defect"),)


def _checks(frames_a_ok: bool, frames_b_ok: bool = True, names_ok: bool = True):
    checks = AuthoredChecks("T99", defects=DEFECTS)
    checks.compare(FRAMES, "comp_a", "1010" if frames_a_ok else "1009", "1010", "start")
    checks.compare(FRAMES, "comp_b", "5" if frames_b_ok else "4", "5", "start")
    checks.compare(
        OUTPUT_NAMES, "comp_a", "a.tif" if names_ok else "b.tif", "a.tif", "name"
    )
    return checks


def test_known_defect_only_is_reported():
    assert _checks(frames_a_ok=False).settle() == "frame defect"


def test_known_defect_plus_new_regression_in_another_check_fails():
    with pytest.raises(AssertionError, match=r"\[output_names\] comp_a"):
        _checks(frames_a_ok=False, names_ok=False).settle()


def test_known_defect_plus_new_regression_on_another_comp_fails():
    with pytest.raises(AssertionError, match=r"\[frames\] comp_b"):
        _checks(frames_a_ok=False, frames_b_ok=False).settle()


def test_fixed_defect_with_new_regression_fails():
    with pytest.raises(AssertionError, match=r"\[output_names\] comp_a"):
        _checks(frames_a_ok=True, names_ok=False).settle()


def test_fixed_defect_fails_until_its_entry_is_removed():
    with pytest.raises(AssertionError, match="looks fixed"):
        _checks(frames_a_ok=True).settle()


def test_no_defects_and_no_mismatches_passes():
    checks = AuthoredChecks("T98", defects=DEFECTS)
    checks.compare(FRAMES, "comp_a", "1010", "1010", "start")
    assert checks.settle() is None


def test_unchecked_defect_comp_is_not_reported_fixed():
    # The render layer checks task frames only; a frames defect is not "fixed" there.
    checks = AuthoredChecks("T99", defects=DEFECTS)
    assert checks.settle() is None
