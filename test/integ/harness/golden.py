# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Golden job bundles: compare what the submitter built against a committed copy.

The structural and settings assertions in ``test_submitter.py`` check what we thought
to check. A golden catches everything else — a renamed parameter, a changed step
script, a dropped environment — the way the Nuke, Cinema 4D, Maya and KeyShot suites do.

Goldens live at ``test_cases/<case>/expected/job_bundle/``, one set for every AE
version and host. Machine- and version-specific text is replaced with placeholders
both when a golden is written and when bundles are compared, so committed goldens
never contain local paths:

* the asset root          -> ``<ASSETS>``
* the temp dir (fonts)    -> ``<TEMP>``
* the user's home         -> ``<HOME>``
* ``ae2025`` / ``ae2026`` -> ``ae<YEAR>``
* ``aftereffects=26``     -> ``aftereffects=<VER>``

If a version really does produce a different bundle, add
``expected/job_bundle-ae<YEAR>/`` and that copy wins for that version.

Regenerate with ``AE_UPDATE_GOLDENS=1``. The test still compares after writing, so a
golden that doesn't survive its own normalization fails immediately.
"""

from __future__ import annotations

import json
import os
import re
import tempfile
from pathlib import Path
from typing import Any

from deadline_test_fixtures.job_bundle.compare import (
    BundleNormalization,
    assert_job_bundles_equal,
)

from . import config

GOLDEN_FILES = ("template.json", "parameter_values.json", "asset_references.json")


def update_requested() -> bool:
    return os.environ.get("AE_UPDATE_GOLDENS", "").strip() in ("1", "true", "yes")


def _path_regex(path: Path) -> str:
    """Case-insensitive regex for ``path`` written with either separator."""
    parts = [re.escape(p) for p in re.split(r"[\\/]+", str(path)) if p]
    body = r"[\\/]+".join(parts)
    lead = r"[\\/]+" if str(path)[:1] in "\\/" else ""
    return r"(?i)" + lead + body


def normalization() -> BundleNormalization:
    return BundleNormalization(
        regex_replacements=(
            (_path_regex(config.get_assets_root().resolve()), "<ASSETS>"),
            (_path_regex(Path(tempfile.gettempdir()).resolve()), "<TEMP>"),
            # Last of the paths: assets and temp both live under home. Some projects
            # record mac-authored output dirs that AE relinks under the user's home.
            (_path_regex(Path.home().resolve()), "<HOME>"),
            # Not \b: "_ae2026_" has no word boundary (underscore is a word char).
            (r"(?<![A-Za-z0-9])ae20\d\d(?![0-9])", "ae<YEAR>"),
            (r"aftereffects=\d+(?:\.\d+)*", "aftereffects=<VER>"),
        ),
        files=GOLDEN_FILES,
    )


def _normalize(value: Any, policy: BundleNormalization) -> Any:
    """Apply ``policy`` the way the fixtures' comparison does."""
    if isinstance(value, str):
        for old, new in policy.replacements.items():
            value = value.replace(old, new)
        for pattern, new in policy.regex_replacements:
            value = re.sub(pattern, new, value)
        return value.replace("\\", "/") if policy.normalize_path_separators else value
    if isinstance(value, list):
        return [_normalize(v, policy) for v in value]
    if isinstance(value, dict):
        return {k: _normalize(v, policy) for k, v in value.items()}
    return value


def expected_dir(case_dir: Path, ae_year: str) -> Path:
    """The golden directory for this case and AE version."""
    specific = case_dir / "expected" / f"job_bundle-ae{ae_year}"
    return specific if specific.is_dir() else case_dir / "expected" / "job_bundle"


def write_golden(actual_dir: Path, target: Path) -> None:
    """Write the normalized bundle files from ``actual_dir`` into ``target``."""
    policy = normalization()
    target.mkdir(parents=True, exist_ok=True)
    for name in GOLDEN_FILES:
        data = json.loads((actual_dir / name).read_text(encoding="utf-8"))
        (target / name).write_text(
            json.dumps(_normalize(data, policy), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )


def assert_matches_golden(actual_dir: Path, expected: Path) -> None:
    missing = [n for n in GOLDEN_FILES if not (expected / n).is_file()]
    if missing:
        raise AssertionError(
            f"no golden bundle at {expected} (missing {missing}). Generate it with "
            "AE_UPDATE_GOLDENS=1, review the diff, and commit it."
        )
    assert_job_bundles_equal(expected, actual_dir, normalization=normalization())
