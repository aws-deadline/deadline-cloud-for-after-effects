# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""Golden normalization is host-independent (test/integ/harness/golden.py)."""

import sys
from pathlib import Path, PurePosixPath

import pytest

pytest.importorskip("deadline_test_fixtures")
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integ"))

from harness import golden


def _norm(value, temp_root):
    return golden._normalize(value, golden.normalization(temp_root))


def test_submitter_temp_folder_becomes_temp_on_each_os(tmp_path):
    # Windows uses %TEMP%; macOS falls back to ~/.deadline/DeadlineCloudAETemp.
    for temp in (tmp_path / "Temp", Path.home() / ".deadline" / "DeadlineCloudAETemp"):
        font = f"{temp}/tempFonts/Komet-Regular.otf"
        assert _norm(font, temp) == "<TEMP>/tempFonts/Komet-Regular"


def test_font_extension_is_dropped(tmp_path):
    for leaf in ("Lato-Regular.ttf", "Lato-Regular.otf", "Lato-Regular"):
        assert (
            _norm(f"{tmp_path}/tempFonts/{leaf}", tmp_path)
            == "<TEMP>/tempFonts/Lato-Regular"
        )


def test_path_rule_stops_at_a_separator():
    rule = golden._path_regex(PurePosixPath("/Users/vik"))
    import re

    assert re.sub(rule, "<HOME>", "/Users/viknith/x") == "/Users/viknith/x"
    assert re.sub(rule, "<HOME>", "/Users/vik/x") == "<HOME>/x"
    assert re.sub(rule, "<HOME>", "/Users/vik") == "<HOME>"


def test_asset_lists_are_compared_unordered():
    refs = {
        "assetReferences": {
            "inputs": {"filenames": ["b", "a"], "directories": ["d", "c"]},
            "outputs": {"directories": ["z", "y"]},
            "referencedPaths": ["q", "p"],
        }
    }
    out = golden._canonical("asset_references.json", refs)["assetReferences"]
    assert out["inputs"]["filenames"] == ["a", "b"]
    assert out["inputs"]["directories"] == ["c", "d"]
    assert out["outputs"]["directories"] == ["y", "z"]
    assert out["referencedPaths"] == ["p", "q"]
    # Step order is meaningful; templates are left alone.
    assert golden._canonical("template.json", {"steps": ["b", "a"]}) == {
        "steps": ["b", "a"]
    }
