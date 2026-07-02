"""Console-script shim for the deprecated ``deadline-cloud-for-after-effects``
PyPI package.

This module exposes a single entry point (``afterfx-openjd``) that prints a
deprecation notice to stderr and exits with a non-zero status. It replaces
the real adaptor CLI that used to ship with 0.1.2 so that:

* customer scripts that still invoke ``afterfx-openjd`` do not silently no-op;
* the failure message tells them exactly what to do next.

The message text is deliberately identical to the ``DeprecationWarning`` raised
on ``import deadline.ae_adaptor`` so both channels give the same guidance.
"""

import sys

_MESSAGE = (
    "The 'deadline-cloud-for-after-effects' PyPI package is deprecated. "
    "AWS Deadline Cloud for After Effects is now delivered by the shared "
    "Deadline Cloud submitter installer; a separate PyPI adaptor package "
    "is no longer required. Uninstall this package and follow the AWS "
    "Deadline Cloud User Guide: "
    "https://docs.aws.amazon.com/deadline-cloud/latest/userguide/submitter.html"
)


def main() -> int:
    """Entry-point body for the ``afterfx-openjd`` console script.

    Prints the deprecation notice to stderr and returns a non-zero exit
    code. Any command-line arguments are ignored.
    """
    print(_MESSAGE, file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main())
