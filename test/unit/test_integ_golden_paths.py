# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Golden path rules match whole paths only, in realistic layouts (harness/golden.py)."""

import re
import sys
from pathlib import Path, PurePosixPath

import pytest

pytest.importorskip("deadline_test_fixtures")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integ"))

from harness import golden


def _apply(raw: str, paths: list[str], placeholder: str) -> str:
    # The same order golden._path_rules uses: longest form first.
    for p in sorted(paths, key=len, reverse=True):
        raw = re.sub(golden._path_regex(PurePosixPath(p)), placeholder, raw)
    return raw


def test_unresolved_and_resolved_macos_temp_both_normalize():
    # /var is a symlink to /private/var, and either form can reach a bundle.
    forms = ["/var/folders/x/T", "/private/var/folders/x/T"]
    for raw in (
        "/var/folders/x/T/tempFonts/a.otf",
        "/private/var/folders/x/T/tempFonts/a.otf",
    ):
        assert _apply(raw, forms, "<TEMP>") == "<TEMP>/tempFonts/a.otf", raw


def test_path_rule_has_a_left_anchor():
    assert _apply("/private/var/folders/x/T/a", ["/var/folders/x/T"], "<TEMP>") == (
        "/private/var/folders/x/T/a"
    )
    assert _apply("/Volumes/backup/Users/vik/x", ["/Users/vik"], "<HOME>") == (
        "/Volumes/backup/Users/vik/x"
    )


@pytest.mark.parametrize(
    "raw",
    [
        "C:\\Users\\vik\\AppData\\Local\\Temp\\tempFonts\\a.ttf",
        "c:/users/vik/appdata/local/temp/tempFonts/a.ttf",
    ],
)
def test_windows_path_literal(raw):
    assert _apply(raw, ["C:/Users/vik/AppData/Local/Temp"], "<TEMP>").startswith(
        "<TEMP>"
    )
