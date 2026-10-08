# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Drive the real submitter headlessly and hand back the produced bundle.

The driver JSX (``scripts/DeadlineCloudAutoSubmit.jsx``) is installed into AE's
``Scripts/Startup`` folder. On launch it reads ``headless_submit_config.json``,
``eval``s the real submitter (UI stripped), overrides ``system.callSystem`` to block
the GUI shell-out, calls ``SubmitSelection`` and writes a result JSON. We run in
*bundle-only* mode (``submitAfterBundle: false``) — Python owns submission + polling.
"""

from __future__ import annotations

import json
import shutil
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

from . import ae_launcher, config

_DRIVER_JSX = (
    Path(__file__).resolve().parent.parent / "scripts" / "DeadlineCloudAutoSubmit.jsx"
)


@dataclass
class SubmitterRun:
    """Outcome of driving the submitter for one test case."""

    status: str
    bundle_path: Path | None
    error: str | None
    render_queue_items: list[dict[str, Any]] = field(default_factory=list)
    # Messages the submitter raised through adcAlert (stubbed by the driver JSX).
    alerts: list[str] = field(default_factory=list)
    timed_out: bool = False
    elapsed_s: float = 0.0
    raw: dict[str, Any] = field(default_factory=dict)

    @property
    def ok(self) -> bool:
        return self.status == "success" and self.bundle_path is not None


def install_driver() -> Path:
    """Copy the driver JSX into *every* candidate AE Startup folder.

    AE's active prefs folder isn't reliably the newest ``<major>.*`` dir (the app
    version can differ from the folder version), so we install into all candidates
    for the target major and let AE pick up whichever it actually loads. Returns
    the path in the primary (newest) folder.
    """
    primary = None
    for startup in config.get_startup_folders():
        startup.mkdir(parents=True, exist_ok=True)
        dest = startup / _DRIVER_JSX.name
        shutil.copy2(_DRIVER_JSX, dest)
        if primary is None:
            primary = dest
    return primary  # type: ignore[return-value]


def uninstall_driver() -> None:
    for startup in config.get_startup_folders():
        dest = startup / _DRIVER_JSX.name
        if dest.exists():
            dest.unlink()


def _clean_state() -> None:
    result = config.get_result_path()
    if result.exists():
        result.unlink()
    cfg = config.get_config_path()
    for p in (cfg, cfg.with_name(cfg.name + ".done")):
        if p.exists():
            p.unlink()


def _write_config(project_file: Path, settings: dict[str, Any]) -> None:
    cfg = config.get_config_path()
    cfg.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "projectFile": str(project_file),
        # Resolve the exact installed submitter here so the JSX doesn't have to
        # guess between DeadlineCloudSubmitter.jsx and DeadlineCloudSubmitter(User).jsx.
        "submitterPath": str(config.get_submitter_path()),
        # Bundle-only: the JSX builds the bundle and stops. Python submits + polls.
        "submitAfterBundle": False,
        "quitAfterSubmit": True,
        **settings,
    }
    cfg.write_text(json.dumps(payload, indent=4), encoding="utf-8")


def _read_result() -> dict[str, Any]:
    path = config.get_result_path()
    if not path.exists():
        return {
            "status": "failure",
            "error": "No result file written by AE (driver may have crashed or not run)",
            "bundlePath": None,
        }
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError) as exc:
        return {
            "status": "failure",
            "error": f"Unreadable result: {exc}",
            "bundlePath": None,
        }


def _done_marker() -> Path:
    cfg = config.get_config_path()
    return cfg.with_name(cfg.name + ".done")


def _wait_for_completion(timeout: int, start_timeout: int = 90) -> bool:
    """Wait for the driver JSX to finish and signal completion.

    The JSX writes the result file and then renames its config to ``*.done`` as
    the last step before ``app.quit()``. We treat that rename as the definitive
    "fully written" signal and don't rely on AE self-quitting — ``app.quit()``
    called from a Startup script is unreliable, so the driver stops AE itself.
    """
    marker = _done_marker()
    start = time.time()
    while not ae_launcher.is_ae_running():
        if marker.exists():  # very fast run may finish before we observe the process
            return True
        if time.time() - start > start_timeout:
            return False
        time.sleep(2)

    start = time.time()
    while time.time() - start < timeout:
        if marker.exists():
            return True
        # Defence-in-depth: if a "Crash Repair Options" dialog slipped past the
        # pre-launch state cleanup, dismiss it into normal mode so the Startup
        # driver JSX actually runs (never Safe Mode, which skips scripts). AE draws
        # that dialog with its own toolkit, so it is invisible to the a11y-click
        # path (dismiss_crash_dialog) and only the keystroke path clears it; we run
        # both since a genuinely a11y-visible dialog is cheaper to click.
        ae_launcher.dismiss_crash_dialog()
        ae_launcher.dismiss_crash_dialog_key()
        time.sleep(2)
    return False


def warmup(timeout: int = 480) -> bool:
    """Absorb AE's one-time cold-launch cost before any case is timed.

    A *cold* AE launch (from a fully quit app) can take minutes to reach the point
    where Startup scripts execute: it must complete the licensing handshake and clear
    a startup dialog first. Until that finishes, the driver JSX never runs. Once AE has
    fully initialised once, later launches reach the JSX in seconds. Without this warm-
    up the *first* case's per-drive timeout races that cold init and fails spuriously —
    the submitter is fine, AE just wasn't ready (observed: a first drive stuck at its
    300s budget with the JSX never firing, while every later case drove in ~15s).

    We reproduce the *working* launch conditions here, untimed against any case: stage a
    project-less config so the Startup JSX reaches its "started" breadcrumb (line ~30 of
    DeadlineCloudAutoSubmit.jsx) and then bails harmlessly ("projectFile is required"),
    while dismissing the startup dialog on a loop — exactly what unblocks a cold launch.
    Waiting for that breadcrumb proves AE fully initialised. Then quit, leaving the first
    real drive to start warm. Returns False on timeout (best-effort: the per-drive
    timeout remains the backstop).
    """
    if ae_launcher.is_ae_running():
        ae_launcher.stop_ae()
        time.sleep(5)
    _clean_state()

    # A project-less config: the JSX writes its breadcrumb (proof it reached execution)
    # then returns early without opening a project or building a bundle.
    config.get_config_path().parent.mkdir(parents=True, exist_ok=True)
    config.get_config_path().write_text("{}", encoding="utf-8")

    breadcrumb = Path("/tmp/deadline_driver_started.txt")
    if config.get_platform() != "macos":
        import tempfile

        breadcrumb = Path(tempfile.gettempdir()) / "deadline_driver_started.txt"
    before = breadcrumb.stat().st_mtime if breadcrumb.exists() else 0.0

    start = time.time()
    ae_launcher.launch_ae()
    warmed = False
    while time.time() - start < timeout:
        # Clearing the startup dialog is what lets a cold launch reach the JSX.
        ae_launcher.dismiss_crash_dialog()
        ae_launcher.dismiss_crash_dialog_key()
        if breadcrumb.exists() and breadcrumb.stat().st_mtime > before:
            warmed = True
            break
        time.sleep(2)

    ae_launcher.stop_ae()
    _clean_state()
    time.sleep(5)
    return warmed


def _drive_once(
    project_file: Path, settings: dict[str, Any], timeout: int
) -> SubmitterRun:
    """One AE launch → bundle attempt (no retry)."""
    if ae_launcher.is_ae_running():
        ae_launcher.stop_ae()
        time.sleep(5)

    _clean_state()
    _write_config(project_file, settings)

    start = time.time()
    ae_launcher.launch_ae()
    completed = _wait_for_completion(timeout=timeout)
    elapsed = time.time() - start

    # The submitter has finished (or timed out); AE may not self-quit from a
    # Startup script, so always stop it before reading the result.
    ae_launcher.stop_ae()

    raw = _read_result()
    bundle = raw.get("bundlePath")
    status = raw.get("status", "failure")
    error = raw.get("error")
    if not completed:
        status = "failure"
        error = error or f"AE did not finish within {timeout}s (no completion marker)"

    return SubmitterRun(
        status=status,
        bundle_path=Path(bundle) if bundle else None,
        error=error,
        render_queue_items=raw.get("renderQueueItems", []) or [],
        alerts=raw.get("alerts", []) or [],
        timed_out=not completed,
        elapsed_s=round(elapsed, 1),
        raw=raw,
    )


def run_submitter(
    project_file: Path,
    settings: dict[str, Any],
    timeout: int = 300,
    retries: int = 2,
) -> SubmitterRun:
    """Drive AE to build a bundle for ``project_file``, retrying a flaky drive.

    A drive that *times out* (JSX never fires / no completion marker) is the known
    flake after an unclean AE exit — AE came up in a bad state (lingering crash
    recovery, an unclean prior quit) and never reached the Startup driver. It is
    the same failure the session ``warmup`` exists to absorb, so on retry we re-run
    the *full* ``warmup`` (force-quit → ``clear_crash_state`` → untimed cold-launch
    absorption while dismissing dialogs on a loop) rather than the lighter
    ``_clean_state`` + relaunch a plain ``_drive_once`` does — that heavier reset is
    the proven recovery. A crashed/hung AE also surfaces as ``timed_out`` (no
    completion marker), so this covers crashes too. We retry only that failure mode,
    not a legitimate submitter error (deterministic — it would just fail again). The
    JSX writes the marker on its failure paths too, so those are not ``timed_out``.
    ``retries`` extra attempts (default 2).
    """
    run = _drive_once(project_file, settings, timeout)
    attempts = 0
    while run.timed_out and attempts < retries:
        attempts += 1
        # Re-absorb the bad AE state exactly as the session warmup does, untimed,
        # before the next timed attempt. warmup force-quits, clears crash markers,
        # and waits for AE to reach the driver breadcrumb once.
        warmup()
        run = _drive_once(project_file, settings, timeout)
    return run
