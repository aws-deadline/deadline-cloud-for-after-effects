#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
macOS launcher for the Deadline Cloud GUI submitter.

The submitter's ExtendScript runs inside After Effects, which is launched from
the Dock or Finder and therefore inherits a minimal launchd PATH that does not
include the deadline CLI. This script is called by the submitter via
system.callSystem() using the system python3 (/usr/bin/python3 or
/usr/local/bin/python3), which IS on the launchd PATH.

It finds the deadline binary by its well-known installer path rather than by
PATH lookup, then launches gui-submit as a detached process. This avoids the
Terminal cold-start race entirely: no Terminal window is opened, no interactive
shell needs to initialize, and there is no timing dependency.
"""

import os
import shutil
import subprocess
import sys


def find_deadline_binary():
    """
    Locate the deadline executable without relying on PATH.

    The Deadline Cloud installer places a self-contained PyInstaller binary at
    ~/DeadlineCloudSubmitter/DeadlineClient/deadline. This is checked first.
    Falls back to shutil.which() for pip-installed or developer setups where
    deadline may be on the system PATH.
    """
    user_install = os.path.join(
        os.path.expanduser("~"),
        "DeadlineCloudSubmitter",
        "DeadlineClient",
        "deadline",
    )
    if os.path.isfile(user_install) and os.access(user_install, os.X_OK):
        return user_install

    return shutil.which("deadline")


def main():
    if len(sys.argv) < 2:
        print("Usage: launch_deadline.py <bundle_path>", file=sys.stderr)
        sys.exit(1)

    bundle_path = sys.argv[1]
    deadline = find_deadline_binary()

    if not deadline:
        print(
            "Error: Could not find the deadline executable.\n"
            "Ensure the Deadline Cloud submitter is installed at "
            "~/DeadlineCloudSubmitter/DeadlineClient/deadline, "
            "or that 'deadline' is on your PATH.",
            file=sys.stderr,
        )
        sys.exit(1)

    # Double-fork so the deadline GUI process is fully detached from the
    # python3 process that system.callSystem() is waiting on. Without this,
    # AE blocks until deadline exits because the child inherits the same
    # process group. The first fork lets python3 exit immediately; the
    # grandchild (deadline) is re-parented to launchd and runs independently.
    pid = os.fork()
    if pid == 0:
        # Child: start a new session to detach from AE's process group,
        # then exec deadline. os.setsid() is the key call — it prevents
        # the grandchild from receiving signals sent to AE's process group.
        os.setsid()
        subprocess.Popen(
            [
                deadline,
                "bundle",
                "gui-submit",
                bundle_path,
                "--output",
                "json",
                "--install-gui",
                "--submitter-info",
                "submitter_name=After Effects",
            ]
        )
        os._exit(0)


if __name__ == "__main__":
    main()
