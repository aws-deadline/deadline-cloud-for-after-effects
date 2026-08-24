#!/usr/bin/env python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
Script that uses aerender cmd to render composition. When it is an image output,
the script will have extra arguments: chunk-size and index passed in.
"""

import argparse
import json
import subprocess
import sys
import os


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
                f"[{JUNCTIONS_ENV_VAR}] Warning: the path mapping file {rules_path} is "
                "empty. Rendering with the original long paths.",
                file=sys.stderr,
                flush=True,
            )
            return []

        rules = []
        for rule in document["path_mapping_rules"]:
            source_path = rule["source_path"]
            destination_path = rule["destination_path"]
            if not isinstance(source_path, str) or not isinstance(destination_path, str):
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
                f"[{JUNCTIONS_ENV_VAR}] Warning: ignoring the rule for {assetroot} because "
                f"its junction {junction} does not exist.",
                file=sys.stderr,
                flush=True,
            )

    return valid


def _to_windows_path(path):
    """Square up separators so paths compare the way the Windows filesystem does."""
    return path.replace("/", "\\")


def apply_junction_rules(path, rules):
    """Rewrite path to go through its assetroot's junction.

    Paths outside every assetroot, such as shared storage, are returned
    unchanged.
    """
    windows_path = _to_windows_path(path)
    # Only ever compared, never sliced. Lower casing can change a string's
    # length, so slicing by the length of a lower cased root would cut the
    # wrong number of characters off the path.
    normalized = windows_path.rstrip("\\").lower()

    for assetroot, junction in rules:
        root = _to_windows_path(assetroot).rstrip("\\")
        if normalized == root.lower() or normalized.startswith(root.lower() + "\\"):
            return junction.rstrip("\\/") + windows_path[len(root):]

    return path


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
    parser.add_argument("--ignore-missing-dependencies", type=str, default="OFF", help="Missing dependencies checking")

    args = parser.parse_args()
    print(f"Args: {args}", flush=True)

    # Send the paths through the junctions to stay under the Windows 260 char
    # path limit. Something else, such as a queue environment, has to create the
    # junctions and set the environment variable. See
    # https://github.com/aws-deadline/deadline-cloud-samples/blob/mainline/queue_environments/README.md#short-path-mapping-junctions
    junctions_file = os.environ.get(JUNCTIONS_ENV_VAR)
    if sys.platform == "win32" and junctions_file:
        print(
            f"[{JUNCTIONS_ENV_VAR}] Detected junction path mapping file {JUNCTIONS_ENV_VAR}={junctions_file}.",
            flush=True,
        )
        junction_rules = filter_invalid_junctions(load_junction_rules(junctions_file))
        args.project = apply_junction_rules(args.project, junction_rules)
        # A multi output module comp arrives as a comma separated list of paths.
        args.outputpath = ",".join(
            apply_junction_rules(output, junction_rules)
            for output in args.outputpath.split(",")
        )
        print(
            f"[{JUNCTIONS_ENV_VAR}] Path mapped Project: {args.project}",
            flush=True,
        )
        print(
            f"[{JUNCTIONS_ENV_VAR}] Path mapped Output: {args.outputpath}",
            flush=True,
        )

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
    if args.ignore_missing_dependencies == "ON":
        render_args.append("-continueOnMissingFootage")

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
