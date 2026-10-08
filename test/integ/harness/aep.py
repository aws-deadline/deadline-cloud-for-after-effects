# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Keep machine names out of the committed .aep test projects.

AE records the saving machine's name in each project (``"server_name":"<host>"``).
The projects are committed to a public repository and are resaved by both the asset
builder and every harness drive, so the name would leak on any rebuild or careless
commit. :func:`scrub_server_names` replaces each recorded name with a placeholder of
the same length — the project is a RIFX file whose chunk sizes must not change, and a
patched project was verified to open and render.

``test/unit/test_integ_asset_hygiene.py`` fails if a committed project still carries a
real name.
"""

from __future__ import annotations

import re
from pathlib import Path

PLACEHOLDER = "AE-BUILD-HOST"

_SERVER_NAME_RE = re.compile(rb'("server_name":")([^"]+)(")')


def placeholder_for(length: int) -> bytes:
    """The placeholder padded or trimmed to ``length`` bytes."""
    text = (PLACEHOLDER + "-" * length)[:length]
    return text.encode("ascii")


def is_placeholder(value: bytes) -> bool:
    return value == placeholder_for(len(value))


def scrub_server_names(path: Path) -> bool:
    """Replace every recorded machine name in one .aep. Returns True if it changed."""
    data = path.read_bytes()

    def _sub(m: re.Match[bytes]) -> bytes:
        return m.group(1) + placeholder_for(len(m.group(2))) + m.group(3)

    scrubbed = _SERVER_NAME_RE.sub(_sub, data)
    if scrubbed == data:
        return False
    path.write_bytes(scrubbed)
    return True


def scrub_tree(root: Path) -> int:
    """Scrub every .aep under ``root``. Returns the number of files changed."""
    return sum(scrub_server_names(p) for p in sorted(Path(root).rglob("*.aep")))


def server_names(path: Path) -> list[bytes]:
    """Every non-empty ``server_name`` value recorded in one .aep."""
    return [m.group(2) for m in _SERVER_NAME_RE.finditer(path.read_bytes())]
