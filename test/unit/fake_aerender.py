#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
Test stub that mimics Adobe's `aerender` CLI output for call_aerender.py tests.

It reads -s/-e from argv and env vars to decide what to emit, then replays
canned stdout lines shaped like real "-v ERRORS_AND_PROGRESS" output.

Env controls:
    FAKE_AE_MODE   seq (default) | mfr | movie | strong_error | read_source_error | bare_read_source_error | error_then_read_source | full_render_then_read_source | benign_source_read_name | benign_error | partial | bad_bytes
    FAKE_AE_EXIT   integer exit code to return (default "0")
"""

import os
import sys


def parse_range(argv):
    start = end = None
    for i, a in enumerate(argv):
        if a == "-s" and i + 1 < len(argv):
            start = int(argv[i + 1])
        elif a == "-e" and i + 1 < len(argv):
            end = int(argv[i + 1])
    if start is None or end is None:
        start, end = 0, 0
    return start, end


def frame_line(frame_index):
    # Mimic: "PROGRESS:  0:00:00:00 (1): 0 Seconds"
    return f"PROGRESS:  0:00:00:{frame_index:02d} ({frame_index}): 0 Seconds"


def main():
    argv = sys.argv[1:]
    start, end = parse_range(argv)
    mode = os.getenv("FAKE_AE_MODE", "seq")
    exit_code = int(os.getenv("FAKE_AE_EXIT", "0"))

    print("aerender version 26.0", flush=True)
    print(
        f"PROGRESS: Rendering 0:00:00:00 to 0:00:00:{max(0, end - start):02d}",
        flush=True,
    )

    # Real -v ERRORS_AND_PROGRESS output carries header lines that ALSO have a
    # parenthesised integer but are NOT frames. A frame-count regex must ignore
    # these; emitting them here pins call_aerender.PROGRESS_FRAME_PATTERN so it
    # can't miscount them (which would inflate progress past the frame count).
    print(f"PROGRESS:  Duration: 0:00:02:00 ({max(1, end - start + 1)})", flush=True)
    print("PROGRESS:  Frame Rate: 24.00 (comp)", flush=True)

    frames = list(range(start, end + 1))

    if mode == "movie":
        # Single movie output: aerender may not print per-frame PROGRESS lines.
        print("PROGRESS: Rendering movie...", flush=True)
    elif mode == "mfr":
        # Multi-frame rendering: frames complete out of order.
        order = frames[1::2] + frames[0::2]
        for f in order:
            print(frame_line(f), flush=True)
    elif mode == "partial":
        # Render stops partway through.
        for f in frames[: max(1, len(frames) // 2)]:
            print(frame_line(f), flush=True)
    elif mode == "strong_error":
        for f in frames[: max(1, len(frames) // 2)]:
            print(frame_line(f), flush=True)
        # Well-formed AE error line.
        print("After Effects error: Unable to open project file.", flush=True)
    elif mode == "read_source_error":
        # The HEVC-on-CPU symptom: aerender prints the AE error and (as observed
        # on real workers) still exits 0, so STRONG_ERROR_PATTERNS is what fails it.
        print(
            "aerender Error: After Effects error: Could not read from source. "
            "Please check the settings and try again.",
            flush=True,
        )
    elif mode == "bare_read_source_error":
        # AE also logs the source-read failure BARE -- no "After Effects error:" or
        # "aerender ERROR:" prefix -- and still exits 0. STRONG_ERROR_PATTERNS misses
        # this spelling, so only COULD_NOT_READ_SOURCE_PATTERN can fail it.
        print(
            "Could not read from source. Please check the settings and try again. "
            "( 86 :: 2 )",
            flush=True,
        )
    elif mode == "error_then_read_source":
        # An unrelated AE error appears BEFORE the source-read one, so the first
        # captured error line is not the source-read line.
        print("After Effects error: Unable to open project file.", flush=True)
        print(
            "aerender Error: After Effects error: Could not read from source. "
            "Please check the settings and try again.",
            flush=True,
        )
    elif mode == "full_render_then_read_source":
        # AE renders EVERY frame (progress reaches 100%) and only THEN logs the bare
        # source-read failure -- the "ships black frames as success" case. Exercises the
        # real ordering: progress is emitted before the verdict, so 100% is reported and
        # the task must still fail afterwards.
        for f in frames:
            print(frame_line(f), flush=True)
        print(
            "Could not read from source. Please check the settings and try again. "
            "( 86 :: 2 )",
            flush=True,
        )
    elif mode == "benign_source_read_name":
        # A footage name that merely CONTAINS the phrase, with no AE prefix and no error
        # code -- must NOT fail an otherwise healthy render.
        print("Loading footage: could not read from source_FIX.mov", flush=True)
        for f in frames:
            print(frame_line(f), flush=True)
    elif mode == "benign_error":
        # Lines that contain "error" but are NOT failures.
        print("Loading footage: error_analysis_final.mov", flush=True)
        for f in frames:
            print(frame_line(f), flush=True)
        print("Render finished with 0 errors.", flush=True)
    elif mode == "bad_bytes":
        # Emit the normal frame lines but interleave a raw, undecodable byte
        # sequence directly on stdout. Strict UTF-8 decoding would raise
        # UnicodeDecodeError in the parent's readline(); errors="replace" must
        # let the healthy render continue and still reach 100%.
        for f in frames:
            print(frame_line(f), flush=True)
            sys.stdout.flush()
            sys.stdout.buffer.write(b"\xff\xfe garbage\n")
            sys.stdout.buffer.flush()
    else:  # "seq"
        for f in frames:
            print(frame_line(f), flush=True)

    print("PROGRESS: Total Time Elapsed: 1 Second", flush=True)
    return exit_code


if __name__ == "__main__":
    sys.exit(main())
