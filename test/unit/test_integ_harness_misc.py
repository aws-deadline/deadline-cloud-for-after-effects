# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Harness behaviour that needs no After Effects or farm (test/integ/harness)."""

import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integ"))

from harness import config, deadline_client, driver


def test_missing_cli_is_a_failed_result(monkeypatch, tmp_path):
    monkeypatch.setenv("DEADLINE_CLI", str(tmp_path / "no-such-deadline"))
    submitted = deadline_client.submit(tmp_path)
    assert not submitted.ok and submitted.returncode != 0
    waited = deadline_client.wait("job-" + "0" * 32, timeout=5)
    assert waited.returncode != 0 and waited.status != "SUCCEEDED"


def test_unpolled_jobs_are_cancelled(monkeypatch):
    cancelled = []
    monkeypatch.setattr(
        deadline_client, "cancel", lambda job_id: cancelled.append(job_id) or True
    )
    monkeypatch.setattr(deadline_client, "SUBMITTED", {"job-a", "job-b", "job-c"})
    monkeypatch.setattr(deadline_client, "HANDLED", {"job-b"})
    assert deadline_client.cancel_unhandled() == ["job-a", "job-c"]
    assert cancelled == ["job-a", "job-c"]


@pytest.mark.parametrize("value", ["26", "25.6", "twenty", "1999"])
def test_ae_version_must_be_a_release_year(monkeypatch, value):
    monkeypatch.setenv("AE_VERSION", value)
    with pytest.raises(ValueError, match="release year"):
        config.get_ae_year()


def test_ae_version_year(monkeypatch):
    monkeypatch.setenv("AE_VERSION", "2025")
    assert config.get_ae_year() == "2025" and config.get_ae_major() == "25"


def test_lint_lists_name_every_harness_unit_test():
    """hatch.toml lists files explicitly; a new test_integ_*.py must be added there."""
    root = Path(__file__).resolve().parents[2]
    hatch = (root / "hatch.toml").read_text(encoding="utf-8")
    lists = [m for m in hatch.split("{args:")[1:] if m.startswith("test/integ ")]
    assert len(lists) == 4, "expected four integ-lint commands"
    for name in sorted(
        p.name for p in (root / "test" / "unit").glob("test_integ_*.py")
    ):
        assert all(f"test/unit/{name}" in entry.split("}")[0] for entry in lists), name


def test_required_fonts_come_from_the_builder():
    assert driver.required_fonts() == ["Lato-Regular", "Komet-Regular"]
