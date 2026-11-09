# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""The .aep scrub replaces usernames byte for byte and nothing else (test/integ/harness/aep.py)."""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "integ"))

from harness import aep


def _scrub(tmp_path: Path, blob: bytes, monkeypatch, user: str = "viknith") -> bytes:
    monkeypatch.setattr("getpass.getuser", lambda: user)
    path = tmp_path / "p.aep"
    path.write_bytes(blob)
    aep.scrub_project(path)
    return path.read_bytes()


def test_raw_path_ending_at_the_username_keeps_the_next_chunk_tag(
    tmp_path, monkeypatch
):
    blob = b"\x00\x00\x00\x0e/Users/viknithLIST\x00\x00\x00\x04tdsb"
    out = _scrub(tmp_path, blob, monkeypatch)
    assert out == b"\x00\x00\x00\x0e/Users/aeuser-LIST\x00\x00\x00\x04tdsb"
    assert len(out) == len(blob)


def test_raw_windows_path_is_scrubbed(tmp_path, monkeypatch):
    blob = b"\x00D:\\Users\\viknith\\Documents\\Adobe\x00"
    assert (
        _scrub(tmp_path, blob, monkeypatch)
        == b"\x00D:\\Users\\aeuser-\\Documents\\Adobe\x00"
    )


def test_json_path_username_is_scrubbed_in_raw_fields_too(tmp_path, monkeypatch):
    # Another author's username, known from a JSON path in the same project.
    blob = b'{"fullpath":"/Users/someone/x"}\x00/Users/someone/Documents\x00'
    out = _scrub(tmp_path, blob, monkeypatch, user="builder")
    assert b"someone" not in out
    assert len(out) == len(blob)


def test_unrelated_bytes_are_untouched(tmp_path, monkeypatch):
    blob = b"\x00/Users/Shared/Adobe\x00LIST"
    assert _scrub(tmp_path, blob, monkeypatch) == blob
