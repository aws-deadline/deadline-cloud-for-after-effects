#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
Script that uses aerender cmd to render composition. When it is an image output,
the script will have extra arguments: chunk-size and index passed in.
"""

import argparse
import subprocess
import sys
import os


def main():
    parser = argparse.ArgumentParser(description="After Effects Render Script")
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
        help="Specifies the desired maximum CPU percentage power to use during rendering. Value is ignored if MFR is OFF",
    )

    args = parser.parse_args()
    print(f"Args: {args}", flush=True)
    # Determine if second parameter is a Python script or a range
    range_value = args.frames
    range_list = range_value.split("-")
    start_frame, end_frame = int(range_list[0]), int(range_list[1])

    if args.chunk_size is not None and args.index is not None:
        try:
            # if there is only 1 frame in the chunk
            if args.chunk_size == 1:
                start_frame = args.index
                end_frame = args.index
            else:
                chunk_start = args.index
                chunk_end = min(
                    args.index + args.chunk_size - 1,
                    end_frame,
                )
                start_frame = chunk_start
                end_frame = chunk_end
            print(f"Start frame: {start_frame}, End frame: {end_frame}", flush=True)
        except Exception as e:
            print(
                f"Failed to get the valid start frame and end frame for the chunk: {str(e)}",
                file=sys.stderr,
            )
            sys.exit(1)
    else:
        print("No chunk_size and index passed in, this is not an image output.")

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

    if "," not in args.outputpath:
        render_args.extend(["-output", f'"{args.outputpath}"'])

    aerender_exe = os.getenv("AERENDER_EXECUTABLE", "aerender.exe")

    print(
        f"[DEBUG] Starting aerender process with command: {aerender_exe} {' '.join(render_args)}",
        flush=True,
    )

    error_found = False

    try:
        process = subprocess.Popen(
            [aerender_exe] + render_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            bufsize=1,
        )
        stdout, stderr = process.communicate()

        print(
            f"[DEBUG] Process finished with return code: {process.returncode}",
            flush=True,
        )

        # Process stdout line by line
        for line in stdout.splitlines():
            print(f"[STDOUT] {line}", flush=True)

            # Check for errors in stdout (case insensitive)
            line_lower = line.lower()
            if "error" in line_lower:
                print(
                    f"[ERROR DETECTED] in stdout: {line}", file=sys.stderr, flush=True
                )
                error_found = True

        # Process stderr line by line
        for line in stderr.splitlines():
            print(f"[STDERR] {line}", file=sys.stderr, flush=True)

            # Only consider stderr as error if it contains "error" (case insensitive)
            if line.strip():
                line_lower = line.lower()
                if "error" in line_lower:
                    print(
                        f"[ERROR DETECTED] in stderr: {line}", file=sys.stderr, flush=True
                    )
                    error_found = True

        # If process returned non-zero code, that's also an error
        if process.returncode != 0:
            print(
                f"[ERROR] Process returned non-zero exit code: {process.returncode}",
                file=sys.stderr,
                flush=True,
            )
            error_found = True

        # Exit with error if any errors were found
        if error_found:
            print("[DEBUG] Errors were detected, exiting with code 1", flush=True)
            sys.exit(1)

    except Exception as e:
        print(
            f"[ERROR] Exception during aerender execution: {str(e)}",
            file=sys.stderr,
            flush=True,
        )
        sys.exit(1)

    # Exit with the same code as aerender
    print(
        f"[DEBUG] No errors detected, exiting with process return code: {process.returncode}",
        flush=True,
    )
    sys.exit(process.returncode)


if __name__ == "__main__":
    main()
