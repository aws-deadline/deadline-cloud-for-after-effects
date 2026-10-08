# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Environment / path resolution for the After Effects integration harness.

Year-primary: the AE version is identified by its release year ("2025", "2026"),
which is what CI passes via ``AE_VERSION`` and what maps to the app bundle and the
asset project directory. The AE *preferences* directory is named by version
(e.g. ``26.0``), so that path is discovered by globbing on the major version.

All lookups are cross-platform (macOS today; Windows paths are wired so a Windows
runner can use the same harness).
"""

from __future__ import annotations

import os
import platform
from functools import lru_cache
from pathlib import Path

DEFAULT_AE_YEAR = "2026"

# The assets ship in-repo. AE resolves each .aep's footage relative to the project,
# so the absolute paths baked in at authoring time do not matter. Override the root
# with AE_TEST_ASSETS.
DEFAULT_ASSETS_ROOT = Path(__file__).resolve().parents[1] / "aep_test_assets"


def get_platform() -> str:
    return "windows" if platform.system() == "Windows" else "macos"


def get_ae_year() -> str:
    """AE release year, e.g. '2026'. From ``AE_VERSION`` env, default 2026."""
    return os.environ.get("AE_VERSION", DEFAULT_AE_YEAR).strip()


def get_ae_major() -> str:
    """AE major version number, e.g. '26' for year 2026."""
    return str(int(get_ae_year()) - 2000)


def get_ae_app_path() -> Path:
    """Filesystem path to the AE application / executable."""
    override = os.environ.get("AE_EXECUTABLE")
    if override:
        return Path(override)
    year = get_ae_year()
    if get_platform() == "macos":
        return Path(
            f"/Applications/Adobe After Effects {year}/Adobe After Effects {year}.app"
        )
    return Path(
        rf"C:\Program Files\Adobe\Adobe After Effects {year}\Support Files\AfterFX.exe"
    )


def get_ae_process_name() -> str:
    if os.environ.get("AE_PROCESS_NAME"):
        return os.environ["AE_PROCESS_NAME"]
    return "AfterFX.exe" if get_platform() == "windows" else "After Effects"


def _prefs_root() -> Path:
    if get_platform() == "macos":
        return Path.home() / "Library" / "Preferences" / "Adobe" / "After Effects"
    return Path(os.environ.get("APPDATA", "")) / "Adobe" / "After Effects"


def _version_sort_key(path: Path) -> tuple[int, ...]:
    """Numeric version key so ``26.10`` sorts above ``26.3`` (not string order)."""
    parts = []
    for piece in path.name.split("."):
        parts.append(int(piece) if piece.isdigit() else 0)
    return tuple(parts)


def _version_dirs(root: Path, major: str) -> list[Path]:
    """All ``<major>.*`` subdirs of ``root``, newest first (numeric-aware).

    AE's prefs/caches folder is versioned by an internal number that does *not*
    reliably track the app's display version — e.g. the 26.3.0 app has been seen
    using the ``26.0`` folder. We therefore never bet on a single guessed folder;
    callers install into / clean *every* candidate for the target major version.
    Falls back to ``[<major>.0]`` if none exist yet.
    """
    if root.is_dir():
        matches = [p for p in root.glob(f"{major}.*") if p.is_dir()]
        if matches:
            return sorted(matches, key=_version_sort_key, reverse=True)
    return [root / f"{major}.0"]


def get_ae_prefs_version_dirs() -> list[Path]:
    """Every candidate AE prefs dir for the target major (e.g. 26.3, 26.0)."""
    return _version_dirs(_prefs_root(), get_ae_major())


def get_ae_prefs_version_dir() -> Path:
    """Primary AE prefs dir — the newest candidate (see ``_version_dirs``)."""
    return get_ae_prefs_version_dirs()[0]


def _caches_root() -> Path:
    if get_platform() == "macos":
        return Path.home() / "Library" / "Caches" / "Adobe" / "After Effects"
    return Path(os.environ.get("LOCALAPPDATA", "")) / "Adobe" / "After Effects"


def get_ae_caches_version_dirs() -> list[Path]:
    """Every candidate AE caches dir for the target major.

    Each holds a crashpad ``SentryIO-db`` whose ``*.run``/``*.run.lock`` session
    markers, left by an unclean exit, trigger AE's "Crash Repair Options" dialog.
    """
    return _version_dirs(_caches_root(), get_ae_major())


def get_ae_caches_version_dir() -> Path:
    """Primary AE caches dir — the newest candidate."""
    return get_ae_caches_version_dirs()[0]


def get_startup_folders() -> list[Path]:
    """``Scripts/Startup`` under every candidate prefs dir — install into all."""
    return [d / "Scripts" / "Startup" for d in get_ae_prefs_version_dirs()]


def get_startup_folder() -> Path:
    return get_startup_folders()[0]


def get_submitter_path() -> Path:
    """Installed location of the real submitter under test.

    The installer's filename varies (``DeadlineCloudSubmitter.jsx`` or, for
    user-level installs, ``DeadlineCloudSubmitter(User).jsx``), so resolve by
    preferred names then glob across *all* candidate prefs dirs (the submitter may
    live in a different minor-version folder than the newest). Returns the
    canonical path as a fallback so the ``require_ae`` skip message is meaningful.
    """
    prefs_dirs = get_ae_prefs_version_dirs()
    for base in prefs_dirs:
        panels = base / "Scripts" / "ScriptUI Panels"
        for name in ("DeadlineCloudSubmitter.jsx", "DeadlineCloudSubmitter(User).jsx"):
            if (panels / name).exists():
                return panels / name
    for base in prefs_dirs:
        matches = sorted(
            (base / "Scripts" / "ScriptUI Panels").glob("DeadlineCloudSubmitter*.jsx")
        )
        if matches:
            return matches[0]
    return prefs_dirs[0] / "Scripts" / "ScriptUI Panels" / "DeadlineCloudSubmitter.jsx"


def get_config_path() -> Path:
    """Where the driver JSX looks for its headless config."""
    if get_platform() == "windows":
        base = Path(os.environ.get("USERPROFILE", str(Path.home())))
    else:
        base = Path.home()
    return base / ".deadline" / "headless_submit_config.json"


def get_result_path() -> Path:
    if get_platform() == "windows":
        return Path(os.environ.get("TEMP", "")) / "deadline_headless_result.json"
    return Path("/tmp/deadline_headless_result.json")


def get_assets_root() -> Path:
    """Root of the test artifact superset."""
    # Empty means unset: CI passes ``${{ vars.AE_TEST_ASSETS }}``, which is "" when
    # the repo variable is not configured.
    return Path(os.environ.get("AE_TEST_ASSETS") or str(DEFAULT_ASSETS_ROOT))


@lru_cache(maxsize=1)
def get_asset_version() -> str:
    """Read ``asset_version`` from the superset manifest (default 1.0.0)."""
    import json

    manifest = get_assets_root() / "manifest.json"
    try:
        return json.loads(manifest.read_text(encoding="utf-8")).get(
            "asset_version", "1.0.0"
        )
    except (OSError, ValueError):
        return "1.0.0"


def get_project_path(test_id: str, slug: str) -> Path:
    """Resolve a test's .aep, e.g. projects/ae2026/T05_submit_dockable_ae2026_v1.0.0.aep."""
    year = get_ae_year()
    ae = f"ae{year}"
    name = f"{test_id}_{slug}_{ae}_v{get_asset_version()}.aep"
    return get_assets_root() / "projects" / ae / name


def get_deadline_cli() -> str:
    """The ``deadline`` CLI to invoke. Override with ``DEADLINE_CLI``; else PATH."""
    return os.environ.get("DEADLINE_CLI", "deadline")
