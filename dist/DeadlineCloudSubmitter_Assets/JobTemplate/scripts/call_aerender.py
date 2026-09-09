#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
Script that uses the aerender cmd to render a composition and emits OpenJD task
status (progress + status message) so it surfaces in Deadline Cloud Monitor.

Progress reporting contract
---------------------------
The openjd-sessions runtime on the worker scans this process's stdout for lines
that START with one of its reserved prefixes and parses the rest:

    openjd_progress: <float 0-100>     -> task progress percentage
    openjd_status: <string>            -> task status message
    openjd_fail: <string>              -> records a failure message

No job-template configuration is required; this is a runtime convention. Any
other stdout line is passed through untouched and ignored by the runtime.

Progress estimation
--------------------
aerender's frame numbering under "-v ERRORS_AND_PROGRESS" is version- and
MFR-dependent (a "(N)" token may be absolute or chunk-relative), so we do NOT
derive a percentage from the frame index. Instead we count the number of
DISTINCT frames aerender reports finishing and divide by the number of frames
this task was asked to render. This is monotonic, never negative, and correct
regardless of the numbering scheme.

Junction path mapping (Windows)
-------------------------------
Windows caps paths at 260 characters, which long After Effects project and
output paths can exceed. When a queue environment creates a junction for each
asset root and points DEADLINE_JUNCTIONS at a file compatible with the OpenJD
pathmapping-1.0 format, this script reroutes the project and output paths
through those junctions to stay under the limit. When DEADLINE_JUNCTIONS is
unset the paths render as given; when it is set but the file it names cannot be
read as pathmapping-1.0, the task fails (emitting openjd_fail) instead of
quietly rendering the original long paths.
"""

import argparse
import json
import locale
import os
import re
import subprocess
import sys
import unicodedata


def _one_line(message):
    """Flatten whitespace/newlines to single spaces: an embedded newline in an
    untrusted value could otherwise forge a second openjd_* control line."""
    return " ".join(str(message).split())


def emit_progress(progress_int):
    """Emit an OpenJD progress update (integer percent, 0-100)."""
    print(f"openjd_progress: {int(progress_int)}", flush=True)


def emit_status(message):
    """Emit an OpenJD status message."""
    print(f"openjd_status: {_one_line(message)}", flush=True)


def emit_fail(message):
    """Emit an OpenJD failure message (does not itself fail the task)."""
    print(f"openjd_fail: {_one_line(message)}", flush=True)


# Names a pathmapping-1.0 compatible file mapping each assetroot directory to its junction.
JUNCTIONS_ENV_VAR = "DEADLINE_JUNCTIONS"


class JunctionPathmapFormatException(Exception):
    """Raised when DEADLINE_JUNCTIONS does not name a pathmapping-1.0 compatible file."""


def load_junction_rules(rules_path):
    """Read the assetroot -> junction pairs from an OpenJD pathmapping-1.0 compatible file."""
    try:
        with open(rules_path, encoding="utf-8") as handle:
            document = json.load(handle)

        # pathmapping-1.0 allows the empty object when there are no rules.
        if document == {}:
            print(
                f"[{JUNCTIONS_ENV_VAR}] Warning: the path mapping file {_one_line(rules_path)} "
                "is empty. Rendering with the original long paths.",
                file=sys.stderr,
                flush=True,
            )
            return []

        rules = []
        for rule in document["path_mapping_rules"]:
            source_path = rule["source_path"]
            destination_path = rule["destination_path"]
            if not isinstance(source_path, str) or not isinstance(
                destination_path, str
            ):
                raise TypeError(
                    "source_path and destination_path have to be strings, got "
                    f"{source_path!r} and {destination_path!r}"
                )
            rules.append((source_path, destination_path))

        return rules
    except Exception as error:
        raise JunctionPathmapFormatException(
            f"{JUNCTIONS_ENV_VAR} ({rules_path}) has to name a readable JSON file that is "
            "compatible with the OpenJD pathmapping-1.0 format, described at "
            "https://github.com/OpenJobDescription/openjd-specifications/wiki/"
            "How-Jobs-Are-Run#path-mapping. Reading it raised "
            f"{type(error).__name__}: {error}"
        ) from error


def filter_invalid_junctions(rules):
    """Drop rules whose junction is missing so that a stale rules file cannot
    rewrite a path to somewhere that does not exist."""
    valid = []
    for assetroot, junction in rules:
        if os.path.isdir(junction):
            valid.append((assetroot, junction))
        else:
            print(
                f"[{JUNCTIONS_ENV_VAR}] Warning: ignoring the rule for {_one_line(assetroot)} "
                f"because its junction {_one_line(junction)} does not exist.",
                file=sys.stderr,
                flush=True,
            )

    return valid


def apply_junction_rules(path, rules):
    """Rewrite path to go through its assetroot's junction.

    Paths outside every assetroot, such as shared storage, are returned
    unchanged.
    """
    # Match per segment (NFC + case-fold) so an NFD/NFC or case difference still
    # matches, but rebuild the remainder from the ORIGINAL segments: NTFS stores
    # names verbatim, so an NFD name below the root must reach aerender unchanged.
    segments = path.replace("/", "\\").rstrip("\\").split("\\")

    def _fold(segment):
        return unicodedata.normalize("NFC", segment).lower()

    path_keys = [_fold(s) for s in segments]

    # Most-specific root first: with overlapping roots (C:\a and C:\a\b) the
    # deepest matching junction must win regardless of the rules file's order.
    def _depth(rule):
        return len(rule[0].replace("/", "\\").rstrip("\\").split("\\"))

    for assetroot, junction in sorted(rules, key=_depth, reverse=True):
        root_segments = assetroot.replace("/", "\\").rstrip("\\").split("\\")
        n = len(root_segments)
        if path_keys[:n] == [_fold(s) for s in root_segments]:
            remainder = segments[n:]
            # rstrip("\\/"): a junction with a trailing slash must not leave a
            # doubled separator when we re-join the (original) remainder.
            suffix = "\\" + "\\".join(remainder) if remainder else ""
            return junction.rstrip("\\/") + suffix

    return path


def apply_junctions(args):
    """Reroute args.project / args.outputpath through the DEADLINE_JUNCTIONS
    junctions so aerender gets paths under the Windows 260-char limit. No-ops off
    Windows or when the var is unset; raises JunctionPathmapFormatException (fail
    closed) when the file can't be read as pathmapping-1.0. Producer setup:
    https://github.com/aws-deadline/deadline-cloud-samples/blob/mainline/queue_environments/README.md#short-path-mapping-junctions
    """
    junctions_file = os.environ.get(JUNCTIONS_ENV_VAR)
    if sys.platform != "win32" or not junctions_file:
        return

    print(
        f"[{JUNCTIONS_ENV_VAR}] Detected junction path mapping file "
        f"{JUNCTIONS_ENV_VAR}={_one_line(junctions_file)}.",
        flush=True,
    )
    junction_rules = filter_invalid_junctions(load_junction_rules(junctions_file))
    args.project = apply_junction_rules(args.project, junction_rules)
    # A multi-output-module comp arrives as a comma-separated list of paths;
    # map each element individually so every one gets shortened (mapping the
    # joined string as a whole would only rewrite the first path's prefix).
    args.outputpath = ",".join(
        apply_junction_rules(output, junction_rules)
        for output in args.outputpath.split(",")
    )
    print(
        f"[{JUNCTIONS_ENV_VAR}] Path mapped Project: {_one_line(args.project)}",
        flush=True,
    )
    print(
        f"[{JUNCTIONS_ENV_VAR}] Path mapped Output: {_one_line(args.outputpath)}",
        flush=True,
    )


# Per-frame progress line, e.g. "PROGRESS:  0:00:00:00 (1): 0 Seconds"; used only
# to COUNT frames. The leading timecode is required so header lines that also
# carry a "(N)" -- "Duration: ... (49)", "Frame Rate: 24.00 (comp)" -- aren't counted.
PROGRESS_FRAME_PATTERN = re.compile(
    r"PROGRESS:\s+\d+:\d+:\d+:\d+\s+\((\d+)\)", re.IGNORECASE
)

# Low-false-positive markers for real AE/aerender failures; a match fails the task
# even on exit 0. Anchored to AE-/aerender-prefixed phrasings so benign lines with
# "error" (footage names, "0 errors") don't trip. A bare "Unable to ..." is a
# common NON-fatal AE warning, so it's not matched here; fatal cases are
# AE-prefixed or exit non-zero. Aggressive scan: AE_STRICT_ERROR_SCAN=1.
STRONG_ERROR_PATTERNS = [
    re.compile(r"After Effects error:", re.IGNORECASE),
    # IGNORECASE covers every case spelling of this prefix (one entry suffices); it
    # does NOT make "aerender " optional, so a bare "ERROR:" is caught only by exit code.
    re.compile(r"aerender ERROR:", re.IGNORECASE),
]

# Broad "any line containing 'error'" scan. Off by default (aerender prints benign
# "error" lines); AE_STRICT_ERROR_SCAN=1 restores the original fail-on-any behavior.
BARE_ERROR_PATTERN = re.compile(r"error", re.IGNORECASE)

# Fails the task even on exit 0: AE can log this bare (no STRONG_ERROR prefix) and
# still exit 0, which would otherwise ship black frames as success. Also drives the hint.
# Too loose to fail on alone -- pair it with is_source_read_failure().
COULD_NOT_READ_SOURCE_PATTERN = re.compile(r"could not read from source", re.IGNORECASE)

# AE stamps a genuine decode failure with its error-code suffix, e.g. "( 86 :: 2 )".
AE_ERROR_CODE_PATTERN = re.compile(r"\(\s*\d+\s*::\s*\d+\s*\)")

# Cap the GPU probe so a missing/wedged nvidia-smi can't stall failure reporting.
_GPU_PROBE_TIMEOUT_SECONDS = 5


def _resolve_nvidia_smi():
    """Windows-only path to nvidia-smi.exe under the OS system dir, or None."""
    # System dir via the OS, never PATH/%SystemRoot%/cwd -- all job-controllable.
    if sys.platform != "win32":
        return None
    try:
        import ctypes

        buffer = ctypes.create_unicode_buffer(260)  # MAX_PATH
        length = ctypes.windll.kernel32.GetSystemDirectoryW(buffer, len(buffer))
        # 0 means failure; >= buffer size means truncation (buffer left unfilled).
        if not length or length >= len(buffer):
            return None
        candidate = os.path.join(buffer.value, "nvidia-smi.exe")
        return candidate if os.path.isfile(candidate) else None
    except Exception:  # noqa: BLE001 - any resolution failure means "no GPU"
        # Keeps decode_failure_hint total: it runs before emit_fail and outside the
        # render try/finally, so a raising probe would swallow the openjd_fail line.
        return None


def worker_has_nvidia_gpu():
    # Necessary, not sufficient, for HEVC decode: AE can also use an Intel iGPU, so
    # callers word the hint loosely. Any probe failure counts as "no NVIDIA GPU".
    nvidia_smi = _resolve_nvidia_smi()
    if not nvidia_smi:
        return False
    try:
        result = subprocess.run(
            [nvidia_smi, "-L"],
            stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL,
            timeout=_GPU_PROBE_TIMEOUT_SECONDS,
            check=False,
            # Run from the resolved (system) dir, never the session cwd: Windows'
            # new-process DLL search order includes the current directory, and a job
            # drops attachments into the session cwd, so a delay-loaded dependency
            # nvidia-smi.exe needs but System32 lacks could otherwise load job content.
            cwd=os.path.dirname(nvidia_smi),
        )
    except (OSError, subprocess.SubprocessError):
        return False
    return result.returncode == 0 and b"GPU" in (result.stdout or b"")


def decode_failure_hint(saw_read_source_error):
    if not saw_read_source_error:
        return ""
    # A bad path is the common cause, so source-path advice always leads; the HEVC/GPU
    # clause is Windows-only and probes for a GPU only when it might apply.
    hint = (
        "aerender could not read a source clip. First confirm every source file "
        "exists and its path resolves on this worker."
    )
    if sys.platform == "win32" and not worker_has_nvidia_gpu():
        hint += (
            " If the sources are fine, a likely cause is a codec that needs a GPU "
            "hardware decoder -- e.g. HEVC/H.265 -- since no NVIDIA GPU was detected "
            "on this worker; render on a GPU-enabled fleet or transcode the "
            "source(s) to H.264 before submitting."
        )
    return hint


def _source_read_hint_anchored(reported_line, read_source_line):
    hint = decode_failure_hint(bool(read_source_line))
    # When an unrelated error is the headline, prefix the source-read line so the advice
    # stays tied to what justifies it (else the message reads as self-contradictory).
    if hint and read_source_line and read_source_line != reported_line:
        hint = f"Also saw: {read_source_line} {hint}"
    return hint


def build_failure_message(returncode, strong_error_line, read_source_line):
    """The (openjd_fail, log) message pair for a failed render, or None on success.

    Lines are "" when unseen. On exit 0 a strong error or a source-read line still fails
    -- the bare source-read spelling would otherwise ship black frames as success.
    """
    # Report the most specific evidence: a strong error, else the source-read line.
    reported_line = strong_error_line or read_source_line
    if returncode == 0 and not reported_line:
        return None

    hint = _source_read_hint_anchored(reported_line, read_source_line)
    suffix = f" {hint}" if hint else ""

    if returncode != 0:
        # Keep the exit code alongside the line: 137/-1073741819 (worker killed AE)
        # warrants a retry, not a resubmit, so it must not be replaced by the line.
        if reported_line:
            reason = f"{reported_line} (aerender exited with code {returncode}){suffix}"
        else:
            reason = f"aerender exited with code {returncode}{suffix}"
        return reason, reason

    return (
        f"aerender reported an error: {reported_line}{suffix}",
        f"aerender exited 0 but reported an error: {reported_line}{suffix}",
    )


def parse_frame_range(frames):
    """Parse "start-end" into (start, end). Raises ValueError on bad input."""
    parts = frames.split("-")
    if len(parts) != 2:
        raise ValueError(f"Invalid frame range {frames!r}; expected 'start-end'")
    start_frame, end_frame = int(parts[0]), int(parts[1])
    if end_frame < start_frame:
        raise ValueError(
            f"Invalid frame range {frames!r}; end ({end_frame}) < start ({start_frame})"
        )
    return start_frame, end_frame


def resolve_chunk(start_frame, end_frame, chunk_size, index):
    """Narrow (start, end) to the chunk this task owns, if chunking is used."""
    if chunk_size is None or index is None:
        return start_frame, end_frame
    if not (start_frame <= index <= end_frame):
        raise ValueError(
            f"Chunk index {index} is outside the frame range {start_frame}-{end_frame}"
        )
    if chunk_size == 1:
        return index, index
    chunk_start = index
    chunk_end = min(index + chunk_size - 1, end_frame)
    return chunk_start, chunk_end


def build_render_args(args, start_frame, end_frame):
    """Assemble the aerender argument list."""
    render_args = [
        "-project",
        f'"{args.project}"',
        "-rqindex",
        str(args.rqindex),
        "-s",
        str(start_frame),
        "-e",
        str(end_frame),
        "-v",
        "ERRORS_AND_PROGRESS",
        "-close",
        "DO_NOT_SAVE_CHANGES",
        "-sound",
        "OFF",
        "-mfr",
        args.multi_frame_rendering,
        str(args.max_cpu_usage_percentage),
    ]
    if args.ignore_missing_dependencies == "ON":
        render_args.append("-continueOnMissingFootage")
    if "," not in args.outputpath:
        render_args.extend(["-output", f'"{args.outputpath}"'])
    return render_args


def is_strong_error(line):
    return any(p.search(line) for p in STRONG_ERROR_PATTERNS)


def is_source_read_failure(line):
    # The bare phrase alone would fail a healthy render whose footage/output name merely
    # contains it (aerender echoes user-controlled names verbatim -- see is_strong_error).
    # Require AE's own signal too: a strong-error prefix or its error-code suffix, both of
    # which every real decode failure carries.
    return bool(COULD_NOT_READ_SOURCE_PATTERN.search(line)) and (
        is_strong_error(line) or bool(AE_ERROR_CODE_PATTERN.search(line))
    )


def build_render_env(base_env=None):
    """Set KMP_DUPLICATE_LIB_OK=TRUE so AE + duplicate-OpenMP plugins don't abort."""
    env = dict(os.environ if base_env is None else base_env)
    env.setdefault("KMP_DUPLICATE_LIB_OK", "TRUE")
    # Always announce the effective value so a maintainer can confirm whether the
    # OpenMP workaround was active on the task.
    if env["KMP_DUPLICATE_LIB_OK"].strip().upper() == "TRUE":
        print(
            "[DEBUG] KMP_DUPLICATE_LIB_OK=TRUE (duplicate-OpenMP workaround active).",
            flush=True,
        )
    else:
        print(
            f"[WARN] KMP_DUPLICATE_LIB_OK={env['KMP_DUPLICATE_LIB_OK']!r} (not TRUE); "
            "render may fail if multiple OpenMP runtimes load.",
            flush=True,
        )
    return env


# How long to wait for the aerender child to exit before giving up, so a wedged
# process can't hang cleanup indefinitely (the OpenJD session would then have to
# force-terminate this script, losing the rest of the cleanup).
_REAP_TIMEOUT_SECONDS = 30


def reap_process(process):
    """Best-effort terminate the aerender child and its tree, bounded so it can't
    hang. On Windows aerender.exe is a launcher that spawns AfterFX.exe as a
    SEPARATE process, so kill() would orphan AfterFX (holding a render slot / AE
    license); taskkill /T reaps the whole tree. POSIX kill() suffices.
    """
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(process.pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
                timeout=_REAP_TIMEOUT_SECONDS,
            )
        except (OSError, subprocess.SubprocessError):
            process.kill()  # fall back to reaping at least the direct child
    else:
        process.kill()
    try:
        process.wait(timeout=_REAP_TIMEOUT_SECONDS)
    except subprocess.TimeoutExpired:
        pass


def parse_args(argv):
    parser = argparse.ArgumentParser(
        description="After Effects Render Script with Progress"
    )
    parser.add_argument("project", type=str, help="Project file path")
    parser.add_argument("rqindex", type=int, help="Render queue index")
    parser.add_argument("outputpath", type=str, default="", help="Output path")
    parser.add_argument(
        "frames",
        type=str,
        default="0-100",
        help="The range of frames, the format is startFrame-endFrame",
    )
    parser.add_argument("--chunk-size", type=int, help="The number of frames per task")
    parser.add_argument("--index", type=int, help="The starting frame of the chunk")
    parser.add_argument(
        "--multi-frame-rendering",
        type=str,
        default="OFF",
        help="Multi-frame render (MFR)",
    )
    parser.add_argument(
        "--max-cpu-usage-percentage",
        type=int,
        default=90,
        help="Maximum CPU percentage to use during rendering. Ignored if MFR is OFF",
    )
    parser.add_argument(
        "--ignore-missing-dependencies",
        type=str,
        default="OFF",
        help="Missing dependencies checking",
    )
    return parser.parse_args(argv)


def run(argv):
    """Run a render. Returns a process exit code (0 = success)."""
    args = parse_args(argv)
    print(f"Args: {args}", flush=True)

    strict_error_scan = os.getenv("AE_STRICT_ERROR_SCAN", "").strip() in (
        "1",
        "true",
        "TRUE",
    )

    # Reroute the project/output paths through the junctions before we build the
    # aerender command. Fail closed: an unreadable/malformed junctions file fails
    # the task rather than silently rendering the original (too long) paths.
    try:
        apply_junctions(args)
    except JunctionPathmapFormatException as e:
        emit_fail(f"Invalid {JUNCTIONS_ENV_VAR} file: {e}")
        print(f"[ERROR] {_one_line(e)}", file=sys.stderr, flush=True)
        return 1

    try:
        start_frame, end_frame = parse_frame_range(args.frames)
    except ValueError as e:
        emit_fail(f"Could not parse frame range: {e}")
        print(f"[ERROR] {_one_line(e)}", file=sys.stderr, flush=True)
        return 1

    try:
        start_frame, end_frame = resolve_chunk(
            start_frame, end_frame, args.chunk_size, args.index
        )
        print(f"Start frame: {start_frame}, End frame: {end_frame}", flush=True)
    except Exception as e:  # noqa: BLE001 - surface any chunk math failure clearly
        emit_fail(f"Could not resolve chunk frame range: {e}")
        print(f"[ERROR] {_one_line(e)}", file=sys.stderr, flush=True)
        return 1

    # Number of frames this task is responsible for (inclusive range).
    total_frames = max(1, end_frame - start_frame + 1)

    render_args = build_render_args(args, start_frame, end_frame)
    aerender_exe = os.getenv("AERENDER_EXECUTABLE", "aerender.exe")

    print(
        "[DEBUG] Starting aerender process with command: "
        f"{_one_line(aerender_exe + ' ' + ' '.join(render_args))}",
        flush=True,
    )
    emit_status(f"Rendering frames {start_frame}-{end_frame}")
    emit_progress(0)

    frames_seen = set()
    last_reported_progress = 0
    # First matching line of each kind, or "" if unseen.
    strong_error_line = ""
    read_source_line = ""
    process = None

    try:
        print(
            f"[DEBUG] Starting render frames {start_frame} to {end_frame}", flush=True
        )

        process = subprocess.Popen(
            [aerender_exe] + render_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            # Decode with the OS code page, not hard-coded utf-8: aerender is a
            # native binary that writes the platform (ANSI) encoding, so utf-8
            # would mojibake non-ASCII paths. errors="replace" keeps a stray byte
            # from raising and aborting a healthy render.
            encoding=locale.getpreferredencoding(False),
            errors="replace",
            bufsize=1,
            env=build_render_env(),
        )

        for line in iter(process.stdout.readline, ""):
            line = line.rstrip("\n")

            # --- error detection ---------------------------------------------
            if is_strong_error(line):
                # Real, well-formed AE/aerender error. Remember the first one so
                # we can report it, and fail the task regardless of exit code.
                if not strong_error_line:
                    strong_error_line = line
                print(f"[ERROR DETECTED] {line}", file=sys.stderr, flush=True)
            elif strict_error_scan and BARE_ERROR_PATTERN.search(line):
                # Opt-in aggressive behavior: any "error" substring fails.
                if not strong_error_line:
                    strong_error_line = line
                print(f"[ERROR DETECTED strict] {line}", file=sys.stderr, flush=True)

            if not read_source_line and is_source_read_failure(line):
                read_source_line = line

            # --- progress counting -------------------------------------------
            match = PROGRESS_FRAME_PATTERN.search(line)
            if match:
                frames_seen.add(match.group(1))
                completed = min(len(frames_seen), total_frames)
                progress_int = int((completed / total_frames) * 100.0)
                if progress_int > last_reported_progress:
                    emit_status(f"Rendered {completed} of {total_frames} frames")
                    emit_progress(progress_int)
                    last_reported_progress = progress_int
                # Echo the frame line too: its per-frame timing is the main stall
                # signal, and on >100-frame chunks most lines don't bump progress.
                print(f"[STDOUT] {line}", flush=True)
                continue

            # Non-progress, non-error line: pass through for logs.
            print(f"[STDOUT] {line}", flush=True)

        process.stdout.close()
        returncode = process.wait()

        print(f"[DEBUG] Process finished with return code: {returncode}", flush=True)

    except Exception as e:  # noqa: BLE001 - any launch/stream failure is a task failure
        emit_fail(f"Exception during aerender execution: {e}")
        print(
            f"[ERROR] Exception during aerender execution: {_one_line(e)}",
            file=sys.stderr,
            flush=True,
        )
        return 1
    finally:
        # Reap the child/tree on EVERY exit path -- return, except, and a
        # propagating BaseException (cancellation: KeyboardInterrupt / signal) --
        # so no orphan holds an AE license/slot. Skipped once it has exited.
        if process is not None and process.poll() is None:
            reap_process(process)

    # --- final verdict ---------------------------------------------------
    failure = build_failure_message(returncode, strong_error_line, read_source_line)
    if failure is not None:
        openjd_message, log_message = failure
        emit_fail(openjd_message)
        print(f"[ERROR] {log_message}", file=sys.stderr, flush=True)
        # Collapse to 1: main() does sys.exit(code & 0xFF), so a multiple of 256 would
        # exit 0 and mark a failed render successful.
        return 1

    if not frames_seen:
        # No per-frame progress was seen. Common for single-movie output; not an
        # error on its own, but worth flagging in the log.
        print(
            "[WARN] No per-frame PROGRESS lines were parsed; "
            "reporting 100% based on successful exit code.",
            flush=True,
        )
    elif len(frames_seen) < total_frames:
        # Exit 0 with fewer frames than asked: -continueOnMissingFootage lets
        # aerender skip frames and still exit 0; warn so the shortfall is visible.
        print(
            f"[WARN] aerender exited 0 but reported only {len(frames_seen)} of "
            f"{total_frames} frames; output may be incomplete.",
            flush=True,
        )

    # Emit the terminal 100% only if the per-frame loop didn't already reach it,
    # so a fully-counted render doesn't double-report 100.
    if last_reported_progress < 100:
        emit_status(f"Rendered {total_frames} of {total_frames} frames")
        emit_progress(100)
    print(
        f"[DEBUG] No errors detected, exiting with return code: {returncode}",
        flush=True,
    )
    # returncode is guaranteed 0 on this path; return it explicitly so the exit
    # status can't be affected by the & 0xFF truncation noted above.
    return 0


def _ensure_utf8_output():
    """Force stdout/stderr to UTF-8 (lenient) so a non-ASCII path/log line can't
    raise UnicodeEncodeError mid-stream and fail an otherwise-successful render."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is not None:
            reconfigure(encoding="utf-8", errors="replace")


def main():
    _ensure_utf8_output()
    sys.exit(run(sys.argv[1:]))


if __name__ == "__main__":
    main()
