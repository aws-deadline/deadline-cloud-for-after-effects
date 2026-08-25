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
    strong_error_line = None
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
        )

        for line in iter(process.stdout.readline, ""):
            line = line.rstrip("\n")

            # --- error detection ---------------------------------------------
            if is_strong_error(line):
                # Real, well-formed AE/aerender error. Remember the first one so
                # we can report it, and fail the task regardless of exit code.
                if strong_error_line is None:
                    strong_error_line = line
                print(f"[ERROR DETECTED] {line}", file=sys.stderr, flush=True)
            elif strict_error_scan and BARE_ERROR_PATTERN.search(line):
                # Opt-in aggressive behavior: any "error" substring fails.
                if strong_error_line is None:
                    strong_error_line = line
                print(f"[ERROR DETECTED strict] {line}", file=sys.stderr, flush=True)

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
    # Exit code is authoritative; a strong error line fails even on exit 0.
    if returncode != 0:
        reason = (
            strong_error_line
            if strong_error_line is not None
            else f"aerender exited with code {returncode}"
        )
        emit_fail(reason)
        print(f"[ERROR] {reason}", file=sys.stderr, flush=True)
        # Collapse to 1, not the raw code: main() does sys.exit(code & 0xFF), so a
        # non-zero multiple of 256 would exit 0 and mark a failed render successful.
        return 1

    if strong_error_line is not None:
        emit_fail(f"aerender reported an error: {strong_error_line}")
        print(
            f"[ERROR] aerender exited 0 but reported an error: {strong_error_line}",
            file=sys.stderr,
            flush=True,
        )
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
