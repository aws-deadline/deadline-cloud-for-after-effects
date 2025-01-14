#!/usr/bin/env python
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
    ]

    if "," not in args.outputpath:
        render_args.extend(["-output", f'"{args.outputpath}"'])

    aerender_exe = os.getenv("AERENDER_EXECUTABLE", "aerender.exe")

    try:
        process = subprocess.Popen(
            [aerender_exe] + render_args,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        for line in process.stdout:
            print(line, end="", flush=True)  # Print stdout line by line

            # Check for specific errors or warnings in stdout
            if "WARNING:After Effects warning" in line:
                print(f"After Effects Warning: {line.strip()}", file=sys.stderr)

        # Also handle stderr (errors)
        for line in process.stderr:
            print(line, end="", flush=True)  # Print stderr line by line

            # Check for specific error messages in stderr
            if "aerender ERROR" in line:
                print(f"Aerender Error: {line.strip()}", file=sys.stderr)

        process.wait()  # Wait for the process to finish

    except Exception as e:
        print(f"Error: {str(e)}")
        sys.exit(1)
    # Exit with the same code as aerender
    sys.exit(process.returncode)


if __name__ == "__main__":
    main()
