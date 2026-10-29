# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Golden job bundles: compare what the submitter built against a committed copy.

The structural and settings assertions in ``test_submitter.py`` check what we thought
to check. A golden catches everything else — a renamed parameter, a changed step
script, a dropped environment — the way the Nuke, Cinema 4D, Maya and KeyShot suites do.

Goldens live at ``test_cases/<case>/expected/job_bundle/``, one set for every AE
version and host. Machine- and version-specific text is replaced with placeholders
both when a golden is written and when bundles are compared, so committed goldens
never contain local paths:

* an output dir           -> ``<RENDERS>/ae<YEAR>/<case>``
* the asset root          -> ``<ASSETS>``
* the submitter's temp dir -> ``<TEMP>`` (as the drive reports it; it differs per OS)
* a collected font's extension is dropped (``.ttf``/``.otf`` differ per host)
* the user's home         -> ``<HOME>``
* ``ae2025`` / ``ae2026`` -> ``ae<YEAR>``
* ``aftereffects=26``     -> ``aftereffects=<VER>``

If a version really does produce a different bundle, add
``expected/job_bundle-ae<YEAR>/`` and that copy wins for that version.

Asset-reference lists are compared as sorted lists: their order comes from
filesystem enumeration, which differs per host.

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
    """Case-insensitive regex for ``path`` written with either separator.

    Not preceded by a path-name character, and ends at a separator or the end, so ``/var`` does not match inside ``/private/var`` and
    ``/Users/vik`` does not match inside ``/Users/viknith``.
    """
    parts = [re.escape(p) for p in re.split(r"[\\/]+", str(path)) if p]
    body = r"[\\/]+".join(parts)
    lead = r"[\\/]+" if str(path)[:1] in "\\/" else ""
    return r"(?i)(?<![A-Za-z0-9._-])" + lead + body + r"(?=[\\/]|$)"


# Asset-reference lists whose order is filesystem enumeration order.
_UNORDERED = (
    ("assetReferences", "inputs", "filenames"),
    ("assetReferences", "inputs", "directories"),
    ("assetReferences", "outputs", "directories"),
    ("assetReferences", "referencedPaths"),
)


def _canonical(name: str, data: Any) -> Any:
    """Sort the unordered lists of an asset_references document, in place."""
    if name != "asset_references.json":
        return data
    for keys in _UNORDERED:
        node = data
        for key in keys[:-1]:
            node = node.get(key) if isinstance(node, dict) else None
        if isinstance(node, dict) and isinstance(node.get(keys[-1]), list):
            node[keys[-1]].sort(key=str)
    return data


def _path_rules(path: Path, placeholder: str) -> tuple[tuple[str, str], ...]:
    """Rules for ``path`` as given and as resolved (macOS: /var vs /private/var)."""
    forms = sorted({str(path), str(path.resolve())}, key=len, reverse=True)
    return tuple((_path_regex(Path(p)), placeholder) for p in forms)


def normalization(temp_root: Path | None = None) -> BundleNormalization:
    """Placeholders for this host. ``temp_root`` is the submitter's temp folder."""
    temp = Path(temp_root) if temp_root else Path(tempfile.gettempdir())
    return BundleNormalization(
        regex_replacements=(
            # First: output dirs are absolute paths baked in where the project was
            # built, which AE may relink, so only the tail is stable.
            (
                r"(?i)^(?:[A-Za-z]:)?[\\/].*?[\\/]renders(?=[\\/]ae20\d\d[\\/])",
                "<RENDERS>",
            ),
            *_path_rules(config.get_assets_root(), "<ASSETS>"),
            *_path_rules(temp, "<TEMP>"),
            # Collected fonts: the file name is the PostScript name, but the extension
            # depends on the host's font file (or is absent for Creative Cloud fonts).
            (r"(?i)^(<TEMP>[\\/]tempFonts[\\/][^\\/]+?)\.(?:ttf|otf|ttc)$", r"\1"),
            # Last of the paths: assets and temp both live under home.
            *_path_rules(Path.home(), "<HOME>"),
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


def _write_canonical(src: Path, dst: Path, policy: BundleNormalization | None) -> None:
    """Write ``src``'s bundle files to ``dst``: normalized (if ``policy``) and sorted."""
    dst.mkdir(parents=True, exist_ok=True)
    for name in GOLDEN_FILES:
        data = json.loads((src / name).read_text(encoding="utf-8"))
        if policy is not None:
            data = _normalize(data, policy)
        (dst / name).write_text(
            json.dumps(_canonical(name, data), indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )


def write_golden(actual_dir: Path, target: Path, temp_root: Path | None = None) -> None:
    """Write the normalized bundle files from ``actual_dir`` into ``target``."""
    _write_canonical(actual_dir, target, normalization(temp_root))


def assert_matches_golden(
    actual_dir: Path, expected: Path, temp_root: Path | None = None
) -> None:
    missing = [n for n in GOLDEN_FILES if not (expected / n).is_file()]
    if missing:
        raise AssertionError(
            f"no golden bundle at {expected} (missing {missing}). Generate it with "
            "AE_UPDATE_GOLDENS=1, review the diff, and commit it."
        )
    policy = normalization(temp_root)
    with tempfile.TemporaryDirectory() as tmp:
        want, got = Path(tmp) / "expected", Path(tmp) / "actual"
        _write_canonical(expected, want, None)
        _write_canonical(actual_dir, got, policy)
        assert_job_bundles_equal(want, got, normalization=policy)
