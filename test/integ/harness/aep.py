# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Keep machine identity out of the committed .aep test projects.

AE records two things about the saving machine in each project:

* its name, as ``"server_name":"<host>"``;
* absolute paths, e.g. an output folder ``"fullpath":"/Users/<user>/..."``, which
  carry the local username.

The projects are committed to a public repository and are re-saved by every harness
drive, so both would leak on any careless commit. :func:`scrub_project` replaces the
host name and the username segment of home-directory paths with placeholders of the
same length — the project is a RIFX file whose chunk sizes must not change.

``test/unit/test_integ_asset_hygiene.py`` fails if a committed project still carries
either.
"""

from __future__ import annotations

import re
from pathlib import Path

PLACEHOLDER = "AE-BUILD-HOST"
USER_PLACEHOLDER = "aeuser"

_SERVER_NAME_RE = re.compile(rb'("server_name":")([^"]+)(")')

# A JSON string value that starts with a home directory: "/Users/<u>", "/home/<u>",
# or "C:\\Users\\<u>" (JSON-escaped backslashes). Group 3 is the username.
_SEP = rb"(?:/|(?:\\\\){1,2})"
_HOME_PATH_RE = re.compile(
    rb'("[A-Za-z_]+":")((?:[A-Za-z]:)?'
    + _SEP
    + rb"(?:Users|home)"
    + _SEP
    + rb')([^"/\\]+)'
)


def _fill(placeholder: str, length: int) -> bytes:
    """``placeholder`` padded or trimmed to ``length`` bytes."""
    return (placeholder + "-" * length)[:length].encode("ascii")


def placeholder_for(length: int) -> bytes:
    """The host-name placeholder at ``length`` bytes."""
    return _fill(PLACEHOLDER, length)


def is_placeholder(value: bytes) -> bool:
    return value == placeholder_for(len(value))


def is_user_placeholder(value: bytes) -> bool:
    return value == _fill(USER_PLACEHOLDER, len(value))


def scrub_project(path: Path) -> bool:
    """Scrub the host name and home-dir usernames in one .aep. True if it changed."""
    data = path.read_bytes()
    scrubbed = _SERVER_NAME_RE.sub(
        lambda m: m.group(1) + placeholder_for(len(m.group(2))) + m.group(3), data
    )
    scrubbed = _HOME_PATH_RE.sub(
        lambda m: m.group(1) + m.group(2) + _fill(USER_PLACEHOLDER, len(m.group(3))),
        scrubbed,
    )
    if scrubbed == data:
        return False
    path.write_bytes(scrubbed)
    return True


def scrub_tree(root: Path) -> int:
    """Scrub every .aep under ``root``. Returns the number of files changed."""
    return sum(scrub_project(p) for p in sorted(Path(root).rglob("*.aep")))


def server_names(path: Path) -> list[bytes]:
    """Every non-empty ``server_name`` value recorded in one .aep."""
    return [m.group(2) for m in _SERVER_NAME_RE.finditer(path.read_bytes())]


def home_usernames(path: Path) -> list[bytes]:
    """The username segment of every home-directory path recorded in one .aep."""
    return [m.group(3) for m in _HOME_PATH_RE.finditer(path.read_bytes())]
