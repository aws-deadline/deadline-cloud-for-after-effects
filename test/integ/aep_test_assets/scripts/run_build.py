# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Regenerate the .aep test projects by driving After Effects headlessly.

``build_test_projects.jsx`` was originally run by hand from AE's File > Scripts
menu on the authoring mac, which made regenerating an asset a manual ritual and
left no way to do it on a test host. This drives it the same way the pytest
harness drives the submitter: install the script into AE's Startup folders so it
runs on launch, wait for the completion marker it writes, then stop AE and
uninstall.

    # rebuild only the projects whose output modules changed
    hatch run integ:python test/integ/aep_test_assets/scripts/run_build.py T07 T08 T19

    # rebuild everything for the AE version in AE_VERSION
    hatch run integ:python test/integ/aep_test_assets/scripts/run_build.py

Writes into the in-repo asset tree (``test/integ/aep_test_assets``) by default;
set ``AE_TEST_ASSETS`` to target the superset root instead. Note that AE rewrites
every .aep it saves, so pass the test ids you actually changed — a full rebuild
produces a 16-file diff.
"""

from __future__ import annotations

import json
import os
import shutil
import sys
import tempfile
import time
from pathlib import Path

_SCRIPTS = Path(__file__).resolve().parent
_ASSETS = _SCRIPTS.parent
_INTEG = _ASSETS.parent

sys.path.insert(0, str(_INTEG))

from harness import ae_launcher, aep, config

JSX = _SCRIPTS / "build_test_projects.jsx"
MARKER = Path(tempfile.gettempdir()) / "ae_build_projects.done"
# Settings handed to the JSX. A file, because on macOS AE is launched with `open -a`,
# which does not pass this process's environment through.
BUILD_CONFIG = Path(tempfile.gettempdir()) / "ae_build_projects.config.json"
LAUNCH_TIMEOUT_S = int(os.environ.get("AE_BUILD_TIMEOUT", "900"))


def main(argv: list[str]) -> int:
    only = ",".join(a.strip().upper() for a in argv if a.strip())

    # Empty means unset, matching harness/config.py.
    root = os.environ.get("AE_TEST_ASSETS") or str(_ASSETS)
    print(f"root      = {root}")
    print(f"builds    = {only or '(all)'}")
    print(f"ae        = {config.get_ae_app_path()}")

    if not config.get_ae_app_path().exists():
        print("ERROR: After Effects not found (set AE_VERSION / AE_EXECUTABLE)")
        return 2

    BUILD_CONFIG.write_text(json.dumps({"root": root, "only": only}))
    if MARKER.exists():
        MARKER.unlink()

    installed: list[Path] = []
    for startup in config.get_startup_folders():
        startup.mkdir(parents=True, exist_ok=True)
        dest = startup / JSX.name
        shutil.copy2(JSX, dest)
        installed.append(dest)
    print(f"installed into {len(installed)} startup folder(s)")

    ok = False
    try:
        if ae_launcher.is_ae_running():
            ae_launcher.stop_ae()
            time.sleep(5)
        ae_launcher.launch_ae()
        start = time.time()
        while time.time() - start < LAUNCH_TIMEOUT_S:
            if MARKER.exists():
                print(f"build finished after {time.time() - start:.0f}s")
                ok = True
                break
            # AE can come up with a crash-recovery or compatibility modal, which
            # would otherwise block the Startup script forever.
            ae_launcher.dismiss_crash_dialog()
            ae_launcher.dismiss_crash_dialog_key()
            time.sleep(2)
        else:
            print(f"TIMEOUT: no completion marker after {LAUNCH_TIMEOUT_S}s")
    finally:
        # Always stop AE and remove the Startup script: leaving it installed would
        # rebuild the assets on every subsequent AE launch, including the harness's.
        ae_launcher.stop_ae()
        for dest in installed:
            if dest.exists():
                dest.unlink()
        BUILD_CONFIG.unlink(missing_ok=True)
        print("uninstalled build script")

    if ok:
        # AE records the saving machine's name; these files are public.
        scrubbed = aep.scrub_tree(Path(root) / "projects")
        if scrubbed:
            print(f"scrubbed machine name from {scrubbed} .aep file(s)")
        print("--- build log ---")
        print(MARKER.read_text(errors="replace"))
        # A builder that threw logs "FAIL <id>" and keeps going, so a zero exit
        # code would otherwise hide a project that was never regenerated.
        if "FAIL " in MARKER.read_text(errors="replace"):
            print("ERROR: at least one builder failed (see FAIL lines above)")
            return 1
    return 0 if ok else 1


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
