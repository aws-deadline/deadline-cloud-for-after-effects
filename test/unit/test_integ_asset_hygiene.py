# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""The committed integration-test projects must not carry a machine name.

After Effects records the saving machine's name in each .aep, and these files are
public. Rebuilds and harness runs scrub it (test/integ/harness/aep.py); this guard
catches a project committed without that step.
"""

import sys
from pathlib import Path

import pytest

_INTEG = Path(__file__).resolve().parents[1] / "integ"
sys.path.insert(0, str(_INTEG))

from harness import aep  # noqa: E402

_PROJECTS = sorted((_INTEG / "aep_test_assets" / "projects").rglob("*.aep"))


@pytest.mark.parametrize("project", _PROJECTS, ids=lambda p: p.name)
def test_no_machine_name_in_project(project: Path):
    leaked = [v for v in aep.server_names(project) if not aep.is_placeholder(v)]
    assert not leaked, (
        f"{project.name} records machine name(s) {leaked!r}. Run "
        "harness.aep.scrub_tree on the projects folder before committing."
    )


def test_projects_found():
    assert _PROJECTS, "no .aep projects found under test/integ/aep_test_assets/projects"
