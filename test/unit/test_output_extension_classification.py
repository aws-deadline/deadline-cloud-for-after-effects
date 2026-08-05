# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""Regression guard: "gif" must not be in isImage()'s frameExtensions. If it is, a
.gif render-queue output is treated as an image sequence and chunked across tasks
that all overwrite the one file, silently losing frames."""

import re
from pathlib import Path

_SRC = Path(__file__).parent.parent.parent / "src" / "utils" / "Utils.jsx"
_DIST = Path(__file__).parent.parent.parent / "dist" / "DeadlineCloudSubmitter.jsx"


def _frame_extensions(path):
    source = path.read_text(encoding="utf-8")
    match = re.search(r"const frameExtensions = \[(.*?)\];", source, re.S)
    assert match, f"could not find frameExtensions array in {path.name}"
    # ExtendScript allows either quote style; accept both so a single-quoted
    # re-add of "gif" can't slip past this guard.
    return re.findall(r"""['"]([^'"]+)['"]""", match.group(1))


def test_gif_is_not_an_image_extension():
    assert "gif" not in _frame_extensions(_SRC)


def test_src_and_dist_frame_extensions_agree():
    assert _frame_extensions(_SRC) == _frame_extensions(_DIST)
