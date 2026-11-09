# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Keep machine identity out of the committed .aep test projects.

AE records two things about the saving machine in each project:

* its name, as ``"server_name":"<host>"``;
* absolute paths, e.g. an output folder ``"fullpath":"/Users/<user>/..."``, which
  carry the local username.

The projects are committed to a public repository and are saved by the asset
builder (``aep_test_assets/scripts/run_build.py``), which scrubs them. Harness drives
open a copy under ``build/``, never the committed files. :func:`scrub_project` replaces the
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
# The same paths stored raw (unescaped) in binary fields, e.g. AE's project-log
# folder "C:\Users\<u>\Documents\...". Raw fields have no closing quote, so the
# username's end is only known when the path continues with a separator, NUL or
# quote. Used to *detect* leftovers; scrubbing raw paths replaces known usernames
# only (see _scrub_raw_usernames), so it can never run into the next RIFX chunk.
_RAW_HOME_PREFIX = rb"((?:[A-Za-z]:)?[\\/](?:[Uu]sers|home)[\\/])"
_RAW_HOME_PATH_RE = re.compile(_RAW_HOME_PREFIX + rb'([^"/\\\x00-\x1f]+)(?=[\\/\x00"])')


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
    scrubbed = _scrub_raw_usernames(scrubbed, _known_usernames(data))
    if scrubbed == data:
        return False
    path.write_bytes(scrubbed)
    return True


def _known_usernames(data: bytes) -> set[bytes]:
    """This machine's user plus every username the project's JSON paths name."""
    import getpass

    names = {m.group(3) for m in _HOME_PATH_RE.finditer(data)}
    try:
        names.add(getpass.getuser().encode("utf-8"))
    except (OSError, KeyError):
        pass
    return {n for n in names if n and not is_user_placeholder(n)}


def _scrub_raw_usernames(data: bytes, usernames: set[bytes]) -> bytes:
    """Replace ``usernames`` after a raw home-directory prefix, byte for byte."""
    for name in sorted(usernames, key=len, reverse=True):
        pattern = re.compile(_RAW_HOME_PREFIX + re.escape(name))
        placeholder = _fill(USER_PLACEHOLDER, len(name))
        data = pattern.sub(lambda m, p=placeholder: m.group(1) + p, data)
    return data


def scrub_tree(root: Path) -> int:
    """Scrub every .aep under ``root``. Returns the number of files changed."""
    return sum(scrub_project(p) for p in sorted(Path(root).rglob("*.aep")))


def server_names(path: Path) -> list[bytes]:
    """Every non-empty ``server_name`` value recorded in one .aep."""
    return [m.group(2) for m in _SERVER_NAME_RE.finditer(path.read_bytes())]


def home_usernames(path: Path) -> list[bytes]:
    """The username segment of every home-directory path recorded in one .aep."""
    data = path.read_bytes()
    return [m.group(3) for m in _HOME_PATH_RE.finditer(data)] + [
        m.group(2) for m in _RAW_HOME_PATH_RE.finditer(data)
    ]
