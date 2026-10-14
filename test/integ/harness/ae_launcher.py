# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Launch / quit After Effects and wait for a headless driver run to finish.

Ported from an earlier internal harness. Cross-platform: macOS uses
``open``/``pgrep``/AppleScript; Windows uses the executable directly plus
``tasklist``/``taskkill``.
"""

from __future__ import annotations

import os
import re
import shutil
import subprocess
import time
from pathlib import Path

from . import config

# AE's "Debug Database.txt" feature flag that gates the "Crash Repair Options"
# dialog shown after an unclean shutdown. Lines are ``key\tvalue\tdefault``; we
# force the value column to ``false`` so a prior ``pkill -9`` never blocks the
# next launch's Startup driver. On macOS AE 26.3 the flag does *not* suppress the
# dialog; there the fix is clearing ``AppStates`` (see ``clear_app_states``).
_CRASH_WARNING_FLAG = "AE.DebugShowPreviousCrashWarning"


def is_ae_running() -> bool:
    """True if an AE process is alive.

    The process probe (``pgrep`` / ``tasklist``) is given a hard subprocess timeout:
    a wedged AE (e.g. a heavy comp hanging the render engine) can make the probe
    itself block, and without a timeout that stalls every wait/teardown loop that
    calls this — the per-drive budget stops being enforced and a drive can run for
    far longer than its timeout (observed: a 300s drive that ran ~1000s). On a probe
    timeout we conservatively assume AE *is* running so callers force-quit/kill it
    rather than leaving a zombie behind, and any wait loop stays bounded.
    """
    name = config.get_ae_process_name()
    try:
        if config.get_platform() == "macos":
            result = subprocess.run(
                ["pgrep", "-f", config.get_ae_process_pattern()],
                capture_output=True,
                text=True,
                timeout=15,
                check=False,
            )
            return result.returncode == 0 and bool(result.stdout.strip())
        result = subprocess.run(
            ["tasklist", "/FI", f"IMAGENAME eq {name}"],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        return name.lower() in result.stdout.lower()
    except subprocess.TimeoutExpired:
        return True


def clear_crash_state() -> None:
    """Remove AE crash markers so no "Crash Repair Options" dialog blocks launch.

    A forced kill (``pkill -9``) leaves AE looking crashed, so the next launch
    shows the "Crash Repair Options" dialog *before* Startup scripts run — the
    driver JSX never executes. We purge the dangling crashpad ``SentryIO-db``
    ``*.run`` / ``*.run.lock`` session markers left by an unclean exit, plus
    Auto-Save Recovery / ``*.aepcrash`` — only the dangling session markers, not
    the whole ``SentryIO-db``, so crashpad still functions. On macOS the dialog is
    actually driven by AE's ``AppStates`` defaults, cleared via ``clear_app_states``;
    marker deletion and the ``AE.DebugShowPreviousCrashWarning`` flag alone do not
    suppress it there.

    ``SCRPriorState.json`` is **not** crash state despite the earlier assumption:
    ``SCR`` is the *System Compatibility Report*, and this file records that the
    report (e.g. an unsupported-OS warning) was already acknowledged. On a Windows
    host below AE's supported OS, deleting it makes AE re-show the blocking "System
    Compatibility Report" dialog on the *next* launch — which halts Startup scripts
    with no auto-dismissal. So we purge it only on macOS (where it is inert), and
    preserve it on Windows so a once-acknowledged report stays acknowledged.
    """
    recovery_markers = ["Adobe After Effects Auto-Save Recovery", "CrashRecovery"]
    if config.get_platform() == "macos":
        recovery_markers.append("SCRPriorState.json")
    for prefs in config.get_ae_prefs_version_dirs():
        for rel in recovery_markers:
            p = prefs / rel
            if p.is_dir():
                shutil.rmtree(p, ignore_errors=True)
            elif p.exists():
                p.unlink(missing_ok=True)

    for caches in config.get_ae_caches_version_dirs():
        sentry = caches / "SentryIO-db"
        if not sentry.is_dir():
            continue
        for marker in list(sentry.glob("*.run")) + list(sentry.glob("*.run.lock")):
            if marker.is_dir():
                shutil.rmtree(marker, ignore_errors=True)
            else:
                marker.unlink(missing_ok=True)

    if config.get_platform() == "macos":
        for f in Path("/tmp").glob("*.aepcrash"):
            f.unlink(missing_ok=True)
        clear_app_states()


# macOS defaults domain where AE records one ``AppStates`` entry per launch. An entry
# whose session did not exit cleanly is what makes the next launch show "Crash Repair
# Options" (verified on AE 26.3: clearing only the SentryIO markers still showed the
# dialog; clearing only ``AppStates`` did not).
_APP_STATES_DOMAIN = "com.Adobe.After Effects"


def clear_app_states() -> None:
    """Drop AE's per-launch ``AppStates`` so a prior unclean exit is not seen as a crash.

    Must run while AE is not running. This is the state AE actually reads for its
    "Crash Repair Options" dialog on macOS; ``AE.DebugShowPreviousCrashWarning`` and
    the SentryIO markers do not suppress it. Goes through ``defaults`` so cfprefsd's
    cached copy is updated too. A missing key is not an error. No-op off macOS.
    """
    if config.get_platform() != "macos":
        return
    try:
        subprocess.run(
            ["defaults", "delete", _APP_STATES_DOMAIN, "AppStates"],
            capture_output=True,
            timeout=15,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError):
        pass


# Safe "proceed" buttons on the blocking dialogs AE can raise before/around the
# Startup driver: the post-crash "Crash Repair Options" ("Continue"), the missing-
# font "Resolve Fonts" warning ("OK"), and the "opened in a different version"
# prompt ("Open"). "Start in Safe Mode" must NEVER be clicked — it loads AE
# *without* scripts, so the driver JSX would never run.
_CRASH_DIALOG_BUTTONS = ("Continue", "OK", "Open", "Done")


def _dismiss_windows_ae_dialog() -> bool:
    """Windows dialog dismissal: press Enter on any AE-owned native (``#32770``)
    modal to trigger its *default* button, unblocking the Startup driver.

    On Windows the dialogs that stall the driver are native ``#32770`` frames
    (their content is AE-drawn, so their buttons are invisible to UI Automation —
    we can't click a named button; we key the default instead). Enter maps to the
    safe default on each: "OK"/accept on the missing-font **Resolve Fonts** prompt
    (verified: sending Enter lets ``SubmitSelection`` proceed, whereas Escape
    *cancels* it and wedges the submitter), and "Continue" on the "Crash Repair
    Options" / "System Compatibility Report" prompts. "Start in Safe Mode" is never
    a default, so the Startup driver still runs.

    The one ``#32770`` we must *not* key is AE's "Executing Script …" progress dialog
    (shown while our own JSX runs) — Enter there could cancel the script — so it is
    skipped by title. Returns True if a dialog was found and keyed. No-op off Windows.
    """
    if config.get_platform() != "windows":
        return False
    import ctypes
    from ctypes import wintypes

    user32 = ctypes.windll.user32
    # Explicit argtypes: without them ctypes marshals the 64-bit HWND as a 32-bit
    # int and truncates it, so GetClassNameW/SetForegroundWindow act on a bogus
    # handle and nothing is ever matched or focused.
    user32.IsWindowVisible.argtypes = [wintypes.HWND]
    user32.GetClassNameW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    user32.GetWindowTextW.argtypes = [wintypes.HWND, wintypes.LPWSTR, ctypes.c_int]
    user32.GetWindowThreadProcessId.argtypes = [
        wintypes.HWND,
        ctypes.POINTER(wintypes.DWORD),
    ]
    user32.SetForegroundWindow.argtypes = [wintypes.HWND]
    user32.SetForegroundWindow.restype = wintypes.BOOL
    user32.keybd_event.argtypes = [
        wintypes.BYTE,
        wintypes.BYTE,
        wintypes.DWORD,
        ctypes.c_void_p,
    ]

    ae_pids: set[int] = set()
    try:
        out = subprocess.run(
            [
                "tasklist",
                "/FI",
                f"IMAGENAME eq {config.get_ae_process_name()}",
                "/FO",
                "CSV",
                "/NH",
            ],
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        ).stdout
    except (subprocess.TimeoutExpired, OSError):
        return False
    for line in out.splitlines():
        fields = [f.strip('"') for f in line.split('","')]
        if len(fields) >= 2 and fields[1].isdigit():
            ae_pids.add(int(fields[1]))
    if not ae_pids:
        return False

    VK_RETURN, KEYEVENTF_KEYUP = 0x0D, 0x0002
    keyed = {"any": False}

    def _handle(hwnd: int) -> None:
        if not user32.IsWindowVisible(hwnd):
            return
        cls = ctypes.create_unicode_buffer(64)
        user32.GetClassNameW(hwnd, cls, 64)
        if cls.value != "#32770":
            return
        pid = wintypes.DWORD()
        user32.GetWindowThreadProcessId(hwnd, ctypes.byref(pid))
        if pid.value not in ae_pids:
            return
        title = ctypes.create_unicode_buffer(256)
        user32.GetWindowTextW(hwnd, title, 256)
        # Never key AE's own script-progress dialog — Enter could cancel the JSX.
        if "Executing Script" in title.value:
            return
        user32.SetForegroundWindow(hwnd)
        time.sleep(0.4)  # let focus settle before injecting the keystroke
        user32.keybd_event(VK_RETURN, 0, 0, 0)
        user32.keybd_event(VK_RETURN, 0, KEYEVENTF_KEYUP, 0)
        keyed["any"] = True

    enum_proc = ctypes.WINFUNCTYPE(wintypes.BOOL, wintypes.HWND, wintypes.LPARAM)

    def _cb(hwnd, _lparam):
        _handle(hwnd)
        return True

    try:
        user32.EnumWindows(enum_proc(_cb), 0)
    except OSError:
        return False
    return keyed["any"]


def dismiss_crash_dialog() -> bool:
    """Dismiss any blocking AE dialog into *normal* mode.

    On Windows, presses Enter on any AE-owned native ``#32770`` modal (Resolve
    Fonts, crash, compatibility) — see ``_dismiss_windows_ae_dialog``.

    On macOS (original behaviour below):

    Defence-in-depth behind ``clear_crash_state``: clicks the safe "proceed" button
    (see ``_CRASH_DIALOG_BUTTONS``) on any AE dialog that would otherwise block the
    Startup driver — the post-crash recovery prompt, the missing-font "Resolve Fonts"
    warning, and the version-mismatch open prompt. Scans both top-level windows and
    attached modal *sheets*. Never selects "Start in Safe Mode". Returns True if a
    button was clicked. Requires Accessibility (TCC) for the driving Python process.
    """
    if config.get_platform() == "windows":
        return _dismiss_windows_ae_dialog()
    if config.get_platform() != "macos":
        return False
    proc = config.get_ae_process_name()
    buttons = " or ".join(f'name of b is "{label}"' for label in _CRASH_DIALOG_BUTTONS)
    script = f"""
    tell application "System Events"
        if not (exists process "{proc}") then return "no-proc"
        tell process "{proc}"
            repeat with w in windows
                repeat with b in buttons of w
                    if ({buttons}) then
                        click b
                        return "clicked"
                    end if
                end repeat
                if (exists sheet 1 of w) then
                    repeat with b in buttons of sheet 1 of w
                        if ({buttons}) then
                            click b
                            return "clicked"
                        end if
                    end repeat
                end if
            end repeat
        end tell
    end tell
    return "none"
    """
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError):
        return False
    return result.stdout.strip() == "clicked"


def dismiss_crash_dialog_key() -> bool:
    """Dismiss AE's modal "Crash Repair Options" dialog with a keystroke (macOS).

    That dialog may not appear in the macOS accessibility tree, so
    ``dismiss_crash_dialog`` (which clicks a11y buttons) may not see it; a synthetic
    keystroke is delivered to the focused app regardless.

    Pre-launch cleanup (``clear_app_states``) normally prevents that dialog, so the
    driver only calls this after a launch stalls (see ``driver._ESCAPE_AFTER_STALL_S``).
    Requires AE to be frontmost and Accessibility permission. Returns True if the
    keystroke was delivered. No-op off macOS.
    """
    if config.get_platform() != "macos":
        return False
    proc = config.get_ae_process_name()
    # Focus the *existing* AE process (never `activate`, which would relaunch a
    # quit AE) and send Escape. No-op if AE isn't running.
    script = f"""
    tell application "System Events"
        if not (exists process "{proc}") then return "no-proc"
        set frontmost of process "{proc}" to true
        delay 0.3
        key code 53
    end tell
    """
    try:
        result = subprocess.run(
            ["osascript", "-e", script],
            capture_output=True,
            text=True,
            timeout=10,
            check=False,
        )
    except (subprocess.TimeoutExpired, OSError):
        return False
    # Fails without Accessibility permission (-10004); don't report that as sent.
    return result.returncode == 0 and result.stdout.strip() != "no-proc"


def disable_crash_dialog() -> None:
    """Set ``AE.DebugShowPreviousCrashWarning`` to ``false`` in every candidate
    prefs dir's ``Debug Database.txt`` so AE never shows the post-crash "Crash
    Repair Options" dialog (which blocks Startup scripts until dismissed).

    Must run while AE is *not* running — AE reads this file at launch. If the flag
    line already exists we force its value column to ``false``; if it is *absent*
    we append it; and if the whole file is *absent* from a prefs folder we create a
    minimal one carrying just the flag. Both the append and create cases matter on
    Windows: the file/line is not written until something toggles a debug flag, and
    AE reads the file from whichever version folder it actually runs from (observed:
    AE 2025 uses ``25.6`` while ``Debug Database.txt`` existed only under ``25.0``).
    Without landing the flag in the *active* folder, AE keeps showing the "Crash
    Repair Options" dialog after every unclean exit (the ``taskkill /F`` teardown
    fallback) — and, unlike macOS, there is no keystroke loop to dismiss it, so the
    Startup driver never runs. AE uses code defaults for any keys not present, so a
    minimal file is safe.
    """
    pattern = re.compile(
        rf"^({re.escape(_CRASH_WARNING_FLAG)})\t\S+(\t\S*)?\s*$", re.MULTILINE
    )
    # Minimal file: AE's version header then the flag line, CRLF-terminated.
    minimal = (
        b"AEDebugDatabaseVersion\t2\t0\r\n"
        + _CRASH_WARNING_FLAG.encode("utf-8")
        + b"\tfalse\tfalse\r\n"
    )
    for base in config.get_ae_prefs_version_dirs():
        dbg = base / "Debug Database.txt"
        if not dbg.exists():
            if base.is_dir():
                try:
                    dbg.write_bytes(minimal)
                except OSError:
                    pass
            continue
        try:
            raw = dbg.read_bytes()
        except OSError:
            continue
        text = raw.decode("utf-8", errors="replace")
        if pattern.search(text):
            new_text = pattern.sub(r"\1\tfalse\tfalse", text)
            if new_text != text:
                dbg.write_bytes(new_text.encode("utf-8"))
            continue
        # Flag line absent — append it, matching the file's existing newline style
        # and ensuring the previous content is newline-terminated first. Appended in
        # binary so the rest of AE's debug DB is left byte-for-byte untouched.
        newline = b"\r\n" if b"\r\n" in raw else b"\n"
        prefix = b"" if (not raw or raw.endswith((b"\n", b"\r"))) else newline
        addition = (
            prefix + _CRASH_WARNING_FLAG.encode("utf-8") + b"\tfalse\tfalse" + newline
        )
        try:
            with dbg.open("ab") as fh:
                fh.write(addition)
        except OSError:
            continue


def _feedback_dir() -> Path:
    """Adobe's Dunamis (Sonar) feedback state dir, which drives the NPS survey."""
    if config.get_platform() == "macos":
        base = Path.home() / "Library" / "Application Support"
    else:
        base = Path(os.environ.get("APPDATA", ""))
    return base / "com.adobe.dunamis" / "feedback" / "v1"


def disable_feedback_survey() -> None:
    """Keep Adobe's "Help improve Adobe Products" NPS survey from blocking a drive.

    The survey is a modal from Adobe's Dunamis framework, not AE, so the dialog
    dismissal above does not know about it. It is shown once
    ``feedback_policy.xml`` (server-managed, so we never edit it) says AE has been
    installed and used long enough and has not been cancelled recently. Per-version
    state lives in ``feedback_data_<guid>_<version>.xml``; for the target AE major
    we turn it off (``enabled="false"``) and record a cancel now, which also puts
    the survey in its post-cancel cooldown. Files that don't exist yet need nothing:
    a fresh install is not eligible. Must run while AE is not running.
    """
    folder = _feedback_dir()
    if not folder.is_dir():
        return
    now = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    major = config.get_ae_major()
    for path in folder.glob("feedback_data_*.xml"):
        if path.name == "feedback_data_shared.xml":
            continue
        try:
            text = path.read_text(encoding="utf-8")
        except OSError:
            continue
        if not re.search(rf'name="After Effects" version="{major}\.', text):
            continue
        new = re.sub(r'(<feedback\b[^>]*?)\s+enabled="[^"]*"', r"\1", text)
        new = re.sub(r"(<feedback\b[^>]*?)>", r'\1 enabled="false">', new, count=1)
        new = re.sub(
            r'<cancel last_time="[^"]*" count="(\d+)"',
            lambda m: f'<cancel last_time="{now}" count="{max(1, int(m.group(1)))}"',
            new,
        )
        if new != text:
            try:
                path.write_text(new, encoding="utf-8")
            except OSError:
                pass


def launch_ae() -> None:
    clear_crash_state()
    disable_crash_dialog()
    disable_feedback_survey()
    app = str(config.get_ae_app_path())
    if config.get_platform() == "macos":
        subprocess.Popen(["open", "-a", app])
    else:
        subprocess.Popen([app])


def quit_ae_gracefully(timeout: int = 15) -> bool:
    if config.get_platform() == "macos":
        app_name = f"Adobe After Effects {config.get_ae_year()}"
        try:
            subprocess.run(
                ["osascript", "-e", f'tell application "{app_name}" to quit'],
                capture_output=True,
                timeout=10,
                check=False,
            )
        except subprocess.TimeoutExpired:
            pass
    else:
        try:
            subprocess.run(
                ["taskkill", "/IM", config.get_ae_process_name()],
                capture_output=True,
                timeout=30,
                check=False,
            )
        except subprocess.TimeoutExpired:
            pass

    start = time.time()
    while is_ae_running() and (time.time() - start < timeout):
        time.sleep(2)
    return not is_ae_running()


def kill_ae() -> None:
    """Force-kill AE and its whole process tree. Last resort — triggers a crash
    dialog on the next launch (prevented by ``disable_crash_dialog``).

    On Windows we kill the *tree* (``/T``): a wedged AE drive can leave child
    processes behind — the submitter shells out to ``python`` (font discovery /
    ``get_user_fonts.py``) and ``cmd`` during ``SubmitSelection``, and a hung render
    engine parents further children. ``taskkill /IM`` alone reaps only the top
    ``AfterFX.exe`` and orphans the rest, which can hold file locks on the shared
    temp/bundle dir and wedge the next drive. ``/T`` reaps the entire tree. Bounded
    by a subprocess timeout so teardown itself can never hang.
    """
    name = config.get_ae_process_name()
    if config.get_platform() == "macos":
        try:
            subprocess.run(
                ["pkill", "-9", "-f", config.get_ae_process_pattern()],
                capture_output=True,
                timeout=30,
                check=False,
            )
        except subprocess.TimeoutExpired:
            pass
    else:
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/IM", name],
                capture_output=True,
                timeout=30,
                check=False,
            )
        except subprocess.TimeoutExpired:
            pass


def stop_ae() -> None:
    if not is_ae_running():
        return
    if not quit_ae_gracefully(timeout=15):
        kill_ae()


def wait_for_ae_quit(timeout: int = 300, start_timeout: int = 60) -> bool:
    """Wait for AE to start, then quit. True if it quit on its own within timeout."""
    start = time.time()
    while not is_ae_running():
        if time.time() - start > start_timeout:
            return False
        time.sleep(2)

    start = time.time()
    while is_ae_running():
        if time.time() - start > timeout:
            stop_ae()
            return False
        time.sleep(3)
    return True
