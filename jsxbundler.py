# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

import argparse
import os
import logging

logging.basicConfig(level=logging.DEBUG)

_l = logging.getLogger(__name__)


def cli_entry():
    parser = argparse.ArgumentParser(
        prog="jsxbundler",
        description="Bundle js and jsx files into one script.",
        epilog="",
    )
    parser.add_argument(
        "--source",
        "-src",
        "-s",
        default="src/deadline/ae_submitter/OpenAESubmitter.jsx",
        help='''Source entry file to scan for files to bundle. Defaults to 
        "src/deadline/ae_submitter/OpenAESubmitter.jsx"''',
    )
    parser.add_argument(
        "--destination",
        "-dest",
        "-d",
        default="dist/jsxbundle/DeadlineCloudSubmitter.jsx",
        help="""Destination file. Defaults to 
        "dist/jsxbundle/DeadlineCloudSubmitter.jsx". Alternatively you could 
        use "C:/Program Files/Adobe/Adobe After Effects 2023/Support Files/Scripts/DeadlineCloudSubmitter.jsx"
        or equivalent.""",
    )
    args = parser.parse_args()
    _bundle(src_file=args.source, dest_file=args.destination)


_HEADER = """
// THIS FILE HAS BEEN AUTO-GENERATED.
// Manual changes in this file may be overwritten by a new installation.
// Please change the source files and regenerate this file instead.\n
""".lstrip()  # Two newlines at ending


def _bundle(src_file, dest_file):
    src_file = os.path.normpath(src_file)
    dest_file = os.path.normpath(dest_file)
    os.makedirs(os.path.dirname(dest_file), exist_ok=True)
    processed_files = list()
    with open(dest_file, "wt", encoding="utf-8") as wf:
        wf.write(_HEADER)
        _bundle_file(src_file, target_fh=wf, processed_files=processed_files)


def _bundle_file(src_file, target_fh, processed_files):
    _l.info(f"Bundling file: {src_file}")
    with open(src_file, "rt", encoding="utf-8") as rf:
        lines = rf.readlines()
    for line in lines:
        if line.strip().startswith("#include"):
            # Included files need to be imported ahead of other material
            import_file = _resolve_include_path(src_file, line)
            if import_file in processed_files:
                _l.debug(f"Skipping include for {import_file}, already imported.")
                continue  # Already imported, no need to write again.
            _bundle_file(import_file, target_fh, processed_files=processed_files)
            processed_files.append(import_file)
            continue
        target_fh.write(line)
    target_fh.write("\n\n")


def _resolve_include_path(src_file, line):
    target_relpath = line.split('"')[1]
    target_file = os.path.join(os.path.dirname(src_file), target_relpath)
    return os.path.abspath(os.path.normpath(target_file))


if __name__ == "__main__":
    cli_entry()
