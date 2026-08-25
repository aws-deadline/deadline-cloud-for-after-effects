# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
Tests for the hardened call_aerender.py progress-reporting script.

Layers:
  * pure-function unit tests (frame range / chunk / render args / error match)
  * end-to-end run() tests driving a fake aerender stub via AERENDER_EXECUTABLE
  * an openjd-sessions CONTRACT test that feeds the emitted stdout back through
    the real ActionMonitoringFilter to prove PROGRESS/STATUS/FAIL callbacks fire
    exactly as Deadline Cloud's worker would parse them.
"""

import importlib.util
import json
import locale
import logging
import sys
from pathlib import Path

import pytest

# --- import the script under test (it lives under the JobTemplate scripts dir) ---
_SCRIPTS_DIR = (
    Path(__file__).resolve().parents[2]
    / "dist"
    / "DeadlineCloudSubmitter_Assets"
    / "JobTemplate"
    / "scripts"
)
_SPEC = importlib.util.spec_from_file_location(
    "call_aerender", _SCRIPTS_DIR / "call_aerender.py"
)
call_aerender = importlib.util.module_from_spec(_SPEC)
_SPEC.loader.exec_module(call_aerender)

_FAKE_AERENDER = str(Path(__file__).resolve().parent / "fake_aerender.py")


# ----------------------------------------------------------------------------
# Pure-function unit tests
# ----------------------------------------------------------------------------
class TestFrameRange:
    def test_basic(self):
        assert call_aerender.parse_frame_range("0-100") == (0, 100)

    def test_single(self):
        assert call_aerender.parse_frame_range("5-5") == (5, 5)

    @pytest.mark.parametrize("bad", ["100", "0-", "-", "a-b", "10-5", "0-1-2"])
    def test_invalid(self, bad):
        with pytest.raises(ValueError):
            call_aerender.parse_frame_range(bad)


class TestResolveChunk:
    def test_no_chunk_passthrough(self):
        assert call_aerender.resolve_chunk(0, 100, None, None) == (0, 100)

    def test_chunk_size_one(self):
        assert call_aerender.resolve_chunk(0, 100, 1, 42) == (42, 42)

    def test_chunk_clamped_to_end(self):
        # index 98, chunk 10 -> would be 98..107 but end is 100
        assert call_aerender.resolve_chunk(0, 100, 10, 98) == (98, 100)

    def test_chunk_interior(self):
        assert call_aerender.resolve_chunk(0, 100, 10, 20) == (20, 29)

    def test_index_above_end_raises(self):
        # index 150 is past end 100 -> would yield end < start; must fail loud.
        with pytest.raises(ValueError):
            call_aerender.resolve_chunk(0, 100, 1, 150)

    def test_index_below_start_raises(self):
        # index 10 is below start 50 -> out of range; must fail loud.
        with pytest.raises(ValueError):
            call_aerender.resolve_chunk(50, 100, 10, 10)


class TestStrongError:
    @pytest.mark.parametrize(
        "line",
        [
            "After Effects error: Unable to open project file.",
            "aerender ERROR: something went wrong",
            "After Effects error: Unable to render frame 5",
        ],
    )
    def test_matches_real_errors(self, line):
        assert call_aerender.is_strong_error(line) is True

    @pytest.mark.parametrize(
        "line",
        [
            "Loading footage: error_analysis_final.mov",
            "Render finished with 0 errors.",
            "PROGRESS:  0:00:00:00 (1): 0 Seconds",
            # A bare "Unable to ..." line is a common NON-fatal AE warning (e.g.
            # a missing font/plug-in) and must no longer fail the task; genuinely
            # fatal cases arrive AE-prefixed ("After Effects error: ...").
            "Unable to load font: Helvetica",
        ],
    )
    def test_ignores_benign_lines(self, line):
        assert call_aerender.is_strong_error(line) is False

    def test_no_duplicate_case_variant_patterns(self):
        # IGNORECASE makes "aerender ERROR:" and "aerender Error:" identical, so
        # only the AE-prefix and one aerender-prefix entry should remain.
        assert len(call_aerender.STRONG_ERROR_PATTERNS) == 2
        # Both case spellings still match (proving the dedupe kept coverage).
        assert call_aerender.is_strong_error("aerender ERROR: boom") is True
        assert call_aerender.is_strong_error("aerender Error: boom") is True


class TestProgressFramePattern:
    """The frame-count regex must match per-frame timecode lines only, never the
    header lines that also carry a parenthesised integer (which would inflate
    progress)."""

    @pytest.mark.parametrize(
        "line,frame",
        [
            ("PROGRESS:  0:00:00:00 (1): 0 Seconds", "1"),
            ("PROGRESS:  0:00:00:09 (10): 2 Seconds", "10"),
        ],
    )
    def test_matches_frame_lines(self, line, frame):
        m = call_aerender.PROGRESS_FRAME_PATTERN.search(line)
        assert m is not None and m.group(1) == frame

    @pytest.mark.parametrize(
        "line",
        [
            "PROGRESS:  Duration: 0:00:02:00 (49)",
            "PROGRESS:  Frame Rate: 24.00 (comp)",
            "PROGRESS: Rendering 0:00:00:00 to 0:00:00:09",
        ],
    )
    def test_ignores_header_lines(self, line):
        assert call_aerender.PROGRESS_FRAME_PATTERN.search(line) is None


class TestApplyJunctionRules:
    RULES = [("C:\\assetroot", "J:\\j")]

    def test_maps_path_under_root(self):
        assert (
            call_aerender.apply_junction_rules("C:\\assetroot\\a\\out.png", self.RULES)
            == "J:\\j\\a\\out.png"
        )

    def test_passthrough_outside_every_root(self):
        assert (
            call_aerender.apply_junction_rules("D:\\other\\x.png", self.RULES)
            == "D:\\other\\x.png"
        )

    def test_forward_slash_junction_has_no_doubled_separator(self):
        # A junction written with a trailing "/" must not leave a doubled
        # separator when the remainder is re-joined.
        rules = [("C:\\assetroot", "J:/j/")]
        assert (
            call_aerender.apply_junction_rules("C:\\assetroot\\a.png", rules)
            == "J:/j\\a.png"
        )

    def test_slice_uses_unlowered_root_length(self):
        # "İ" (U+0130) lower-cases to two code points, so slicing by the length
        # of the lower-cased root would drop characters. The remainder must be
        # sliced by the un-lowered root's length.
        rules = [("C:\\\u0130", "J:\\j")]
        assert (
            call_aerender.apply_junction_rules("C:\\\u0130\\out.png", rules)
            == "J:\\j\\out.png"
        )

    def test_nfd_path_matches_nfc_root(self):
        # A macOS-authored NFD path ("cafe" + combining acute U+0301) must match
        # an NFC assetroot ("café" U+00E9). NFC-normalizing both the path and the
        # root keeps the slice offset correct even though the two forms differ in
        # code-point count.
        rules = [("C:\\caf\u00e9", "J:\\j")]
        assert (
            call_aerender.apply_junction_rules("C:\\cafe\u0301\\out.png", rules)
            == "J:\\j\\out.png"
        )

    def test_most_specific_root_wins(self):
        # With overlapping roots the deepest junction must win regardless of the
        # rules file's order (here the least-specific rule is listed first).
        rules = [("C:\\a", "J:\\ja"), ("C:\\a\\b", "J:\\jb")]
        assert (
            call_aerender.apply_junction_rules("C:\\a\\b\\x.png", rules)
            == "J:\\jb\\x.png"
        )

    def test_nfd_remainder_below_root_is_preserved(self):
        # An NFD directory name BELOW the assetroot must reach aerender with its
        # original code points. Windows/NTFS does not normalize file names, so
        # rewriting the remainder to NFC would name a file that doesn't exist.
        rules = [("C:\\assetroot", "J:\\j")]
        nfd = "cafe\u0301"  # "cafe" + combining acute accent (decomposed)
        result = call_aerender.apply_junction_rules(
            f"C:\\assetroot\\{nfd}\\out.png", rules
        )
        assert result == f"J:\\j\\{nfd}\\out.png"
        assert "\u0301" in result  # still decomposed, not collapsed to U+00E9

    def test_prefix_segment_is_not_a_partial_match(self):
        # "C:\asset" must not match a path under "C:\assetroot" -- segment
        # comparison, not string prefix, prevents the false hit.
        rules = [("C:\\asset", "J:\\j")]
        assert (
            call_aerender.apply_junction_rules("C:\\assetroot\\x.png", rules)
            == "C:\\assetroot\\x.png"
        )


def test_apply_junctions_maps_each_output_in_comma_list(monkeypatch, tmp_path):
    """A multi-output-module comp arrives as a comma-separated list; every
    element must be routed through its junction, not just the first."""
    junction = tmp_path / "j1"
    junction.mkdir()
    rules_file = tmp_path / "rules.json"
    rules_file.write_text(
        json.dumps(
            {
                "path_mapping_rules": [
                    {"source_path": "C:\\assetroot", "destination_path": str(junction)}
                ]
            }
        )
    )
    monkeypatch.setattr(call_aerender.sys, "platform", "win32")
    monkeypatch.setenv(call_aerender.JUNCTIONS_ENV_VAR, str(rules_file))

    class _Args:
        project = "C:\\assetroot\\proj.aep"
        outputpath = "C:\\assetroot\\a\\o1.png,C:\\assetroot\\b\\o2.png"

    args = _Args()
    call_aerender.apply_junctions(args)

    mapped = args.outputpath.split(",")
    assert len(mapped) == 2
    # Both elements were shortened through the junction (the bug left the 2nd
    # element with its original long assetroot prefix).
    assert all(p.startswith(str(junction)) for p in mapped), mapped


# ----------------------------------------------------------------------------
# End-to-end run() tests using the fake aerender stub
# ----------------------------------------------------------------------------
def _parse_openjd(stdout):
    """Extract (progress[], status[], fail[]) from emitted stdout."""
    progress, status, fail = [], [], []
    for line in stdout.splitlines():
        if line.startswith("openjd_progress: "):
            progress.append(float(line[len("openjd_progress: ") :]))
        elif line.startswith("openjd_status: "):
            status.append(line[len("openjd_status: ") :])
        elif line.startswith("openjd_fail: "):
            fail.append(line[len("openjd_fail: ") :])
    return progress, status, fail


@pytest.fixture
def run_render(monkeypatch, capsys):
    """Run call_aerender.run() against the fake aerender, return (rc, progress, status, fail)."""

    def _invoke(
        frames="0-9", chunk_size=None, index=None, mode="seq", exit_code=0, env=None
    ):
        monkeypatch.setenv("FAKE_AE_MODE", mode)
        monkeypatch.setenv("FAKE_AE_EXIT", str(exit_code))
        # aerender executable = current python; make the fake script the first arg
        # by monkeypatching build_render_args to prepend it.
        monkeypatch.setenv("AERENDER_EXECUTABLE", sys.executable)
        orig = call_aerender.build_render_args

        def patched(args, s, e):
            return [_FAKE_AERENDER] + orig(args, s, e)

        monkeypatch.setattr(call_aerender, "build_render_args", patched)
        for k, v in (env or {}).items():
            monkeypatch.setenv(k, v)

        argv = ["proj.aep", "0", "/out/frame_[####].png", frames]
        if chunk_size is not None:
            argv += ["--chunk-size", str(chunk_size)]
        if index is not None:
            argv += ["--index", str(index)]
        rc = call_aerender.run(argv)
        out = capsys.readouterr().out
        progress, status, fail = _parse_openjd(out)
        return rc, progress, status, fail, out

    return _invoke


class TestEndToEnd:
    def test_happy_path_monotonic_to_100(self, run_render):
        rc, progress, status, fail, _ = run_render(frames="0-9", mode="seq")
        assert rc == 0
        assert fail == []
        assert progress == sorted(progress)  # monotonic non-decreasing
        assert progress[0] == 0
        assert progress[-1] == 100
        assert all(0.0 <= p <= 100.0 for p in progress)

    def test_progress_denoised_no_duplicates_below_100(self, run_render):
        rc, progress, status, fail, _ = run_render(frames="0-9", mode="seq")
        # each intermediate integer percent should be emitted at most once
        assert len(progress) == len(set(progress))

    def test_mfr_out_of_order_still_monotonic(self, run_render):
        rc, progress, status, fail, _ = run_render(frames="0-9", mode="mfr")
        assert rc == 0
        assert progress == sorted(progress)
        assert progress[-1] == 100

    def test_movie_mode_no_frames_reports_100_on_success(self, run_render):
        rc, progress, status, fail, out = run_render(frames="0-9", mode="movie")
        assert rc == 0
        assert progress[-1] == 100
        assert "No per-frame PROGRESS lines" in out

    def test_nonzero_exit_fails_and_no_false_100(self, run_render):
        rc, progress, status, fail, _ = run_render(
            frames="0-9", mode="partial", exit_code=1
        )
        assert rc == 1
        assert 100 not in progress  # never claim done on failure
        assert fail  # a failure reason was emitted

    def test_strong_error_fails_even_on_exit_0(self, run_render):
        rc, progress, status, fail, _ = run_render(
            frames="0-9", mode="strong_error", exit_code=0
        )
        assert rc == 1
        assert 100 not in progress
        assert any("error" in f.lower() for f in fail)

    def test_benign_error_lines_do_not_fail(self, run_render):
        rc, progress, status, fail, _ = run_render(
            frames="0-9", mode="benign_error", exit_code=0
        )
        assert rc == 0
        assert fail == []
        assert progress[-1] == 100

    def test_strict_scan_opt_in_fails_on_benign(self, run_render):
        rc, progress, status, fail, _ = run_render(
            frames="0-9",
            mode="benign_error",
            exit_code=0,
            env={"AE_STRICT_ERROR_SCAN": "1"},
        )
        assert rc == 1  # aggressive mode trips on "error" substring

    def test_chunk_size_one_single_frame(self, run_render):
        rc, progress, status, fail, _ = run_render(
            frames="0-100", chunk_size=1, index=50, mode="seq"
        )
        assert rc == 0
        assert progress[-1] == 100
        assert "Rendered 1 of 1 frames" in status[-1]

    def test_bad_frame_range_fails_cleanly(self, run_render):
        rc, progress, status, fail, _ = run_render(frames="notarange", mode="seq")
        assert rc == 1
        assert fail

    def test_undecodable_bytes_do_not_fail_render(self, run_render):
        # A single non-UTF-8 byte in aerender's stdout must not kill an otherwise
        # healthy render: errors="replace" keeps the stream readable so we still
        # count every frame and reach 100%.
        rc, progress, status, fail, _ = run_render(frames="0-9", mode="bad_bytes")
        assert rc == 0
        assert fail == []
        assert progress[-1] == 100

    def test_frame_lines_are_echoed_to_log(self, run_render):
        # Per-frame PROGRESS lines must still reach the log (prefixed "[STDOUT] ")
        # in addition to being counted -- their timing is the signal for
        # diagnosing a slow/stalled render, and on long chunks most frame lines
        # don't bump the percent, so without the echo the log goes silent.
        rc, progress, status, fail, out = run_render(frames="0-9", mode="seq")
        assert rc == 0
        echoed_frames = [
            ln
            for ln in out.splitlines()
            if ln.startswith("[STDOUT] PROGRESS:") and "Seconds" in ln
        ]
        assert len(echoed_frames) == 10  # every frame line echoed, none swallowed

    def test_nonzero_exit_collapses_to_one(self, run_render):
        # run() must return exactly 1 for any non-zero aerender exit, not the raw
        # code: main() does sys.exit(run(...)) and sys.exit truncates to code &
        # 0xFF, so a raw code that is a multiple of 256 would exit 0 on POSIX.
        # Using 42 (not 1) proves the collapse rather than a pass-through.
        rc, progress, status, fail, _ = run_render(
            frames="0-9", mode="seq", exit_code=42
        )
        assert rc == 1
        assert fail

    def test_under_render_exit_zero_warns(self, run_render):
        # aerender can exit 0 having rendered fewer frames than asked (e.g.
        # -continueOnMissingFootage). The task still succeeds by exit code, but
        # the shortfall must be surfaced in the log rather than hidden behind 100%.
        rc, progress, status, fail, out = run_render(
            frames="0-9", mode="partial", exit_code=0
        )
        assert rc == 0
        assert fail == []
        assert progress[-1] == 100
        assert "reported only 5 of 10 frames" in out


# ----------------------------------------------------------------------------
# openjd-sessions CONTRACT test: prove the worker would parse what we emit
# ----------------------------------------------------------------------------
class TestOpenJDContract:
    def _drive_filter(self, emitted_stdout):
        """Feed each emitted line through the real ActionMonitoringFilter."""
        # ActionMonitoringFilter / ActionMessageKind live in the PRIVATE
        # openjd.sessions._action_filter module -- not part of the package's
        # public API, so a patch release could rename or move them. We pin
        # openjd-sessions to a minor in requirements-testing.txt to keep that
        # coupling diagnosable, and skip (rather than error at collection) if the
        # dependency isn't installed at all.
        pytest.importorskip("openjd.sessions")
        from openjd.sessions._action_filter import (
            ActionMonitoringFilter,
            ActionMessageKind,
        )

        session_id = "session-test"
        events = []

        def callback(kind, value, cancel):
            events.append((kind, value, cancel))

        filt = ActionMonitoringFilter(session_id=session_id, callback=callback)

        logger = logging.getLogger("call_aerender_contract_test")
        for line in emitted_stdout.splitlines():
            record = logging.LogRecord(
                name=logger.name,
                level=logging.INFO,
                pathname=__file__,
                lineno=1,
                msg=line,
                args=(),
                exc_info=None,
            )
            record.session_id = session_id
            filt.filter(record)
        return events, ActionMessageKind

    def test_progress_and_status_callbacks_fire(self, run_render):
        _, _, _, _, out = run_render(frames="0-9", mode="seq")
        events, Kind = self._drive_filter(out)

        progress_events = [v for (k, v, _c) in events if k == Kind.PROGRESS]
        status_events = [v for (k, v, _c) in events if k == Kind.STATUS]

        assert progress_events, "worker parsed no PROGRESS updates"
        assert status_events, "worker parsed no STATUS updates"
        # openjd hands progress back as floats in [0, 100], monotonic here.
        assert all(isinstance(p, float) for p in progress_events)
        assert all(0.0 <= p <= 100.0 for p in progress_events)
        assert progress_events == sorted(progress_events)
        assert progress_events[-1] == 100.0

    def test_failure_emits_fail_callback(self, run_render):
        _, _, _, _, out = run_render(frames="0-9", mode="strong_error", exit_code=0)
        events, Kind = self._drive_filter(out)
        fail_events = [v for (k, v, _c) in events if k == Kind.FAIL]
        assert fail_events, "worker parsed no FAIL message on a failing render"


class TestEnsureUtf8Output:
    def test_reconfigures_when_supported(self, monkeypatch):
        seen = []

        class _Stream:
            def reconfigure(self, **kw):
                seen.append(kw)

        monkeypatch.setattr(call_aerender.sys, "stdout", _Stream())
        monkeypatch.setattr(call_aerender.sys, "stderr", _Stream())
        call_aerender._ensure_utf8_output()
        assert seen == [
            {"encoding": "utf-8", "errors": "replace"},
            {"encoding": "utf-8", "errors": "replace"},
        ]

    def test_noop_when_reconfigure_absent(self, monkeypatch):
        # A stream without reconfigure() (e.g. pytest capture) must not raise.
        monkeypatch.setattr(call_aerender.sys, "stdout", object())
        monkeypatch.setattr(call_aerender.sys, "stderr", object())
        call_aerender._ensure_utf8_output()


class TestControlChannelSanitization:
    """A value carrying an embedded newline must never inject a second line into
    the OpenJD control channel (the runtime dispatches on any line starting with
    a reserved prefix)."""

    def test_emit_fail_collapses_newlines(self, capsys):
        call_aerender.emit_fail("boom\nopenjd_progress: 100")
        out = capsys.readouterr().out.splitlines()
        assert out == [
            "openjd_fail: boom openjd_progress: 100"
        ]  # one line, no forged progress
        assert not any(ln.startswith("openjd_progress:") for ln in out)

    def test_emit_status_collapses_crlf_and_env_injection(self, capsys):
        call_aerender.emit_status("stage\r\nopenjd_env: FOO=bar")
        out = capsys.readouterr().out.splitlines()
        assert len(out) == 1
        assert not any(ln.startswith("openjd_env:") for ln in out)

    def test_emit_progress_coerces_int(self, capsys):
        call_aerender.emit_progress(42)
        assert capsys.readouterr().out.strip() == "openjd_progress: 42"


class _FakeProc:
    def __init__(self, wait_exc=None):
        self.pid = 4321
        self.killed = False
        self.wait_timeout = "unset"
        self._wait_exc = wait_exc

    def kill(self):
        self.killed = True

    def wait(self, timeout=None):
        self.wait_timeout = timeout
        if self._wait_exc is not None:
            raise self._wait_exc
        return 0


class TestReapProcess:
    def test_posix_kills_child_with_bounded_wait(self, monkeypatch):
        monkeypatch.setattr(call_aerender.sys, "platform", "linux")
        proc = _FakeProc()
        call_aerender.reap_process(proc)
        assert proc.killed is True
        assert proc.wait_timeout == call_aerender._REAP_TIMEOUT_SECONDS

    def test_windows_kills_whole_tree_via_taskkill(self, monkeypatch):
        monkeypatch.setattr(call_aerender.sys, "platform", "win32")
        calls = []

        def fake_run(cmd, **kwargs):
            calls.append((cmd, kwargs))
            return None

        monkeypatch.setattr(call_aerender.subprocess, "run", fake_run)
        proc = _FakeProc()
        call_aerender.reap_process(proc)
        assert len(calls) == 1
        cmd, kwargs = calls[0]
        # /T reaps the tree (aerender.exe -> AfterFX.exe); PID targets our child.
        assert cmd[0] == "taskkill" and "/T" in cmd and str(proc.pid) in cmd
        assert kwargs.get("timeout") == call_aerender._REAP_TIMEOUT_SECONDS
        assert proc.killed is False  # taskkill handled it; no fallback kill
        assert proc.wait_timeout == call_aerender._REAP_TIMEOUT_SECONDS

    def test_windows_falls_back_to_kill_when_taskkill_unavailable(self, monkeypatch):
        monkeypatch.setattr(call_aerender.sys, "platform", "win32")

        def boom(cmd, **kwargs):
            raise FileNotFoundError("taskkill missing")

        monkeypatch.setattr(call_aerender.subprocess, "run", boom)
        proc = _FakeProc()
        call_aerender.reap_process(proc)
        assert proc.killed is True  # fell back to reaping the direct child

    def test_bounded_wait_swallows_timeout(self, monkeypatch):
        # A wedged child that never exits must not hang cleanup.
        monkeypatch.setattr(call_aerender.sys, "platform", "linux")
        wedged = _FakeProc(
            wait_exc=call_aerender.subprocess.TimeoutExpired(cmd="aerender", timeout=30)
        )
        call_aerender.reap_process(wedged)  # must not raise


class TestSubprocessDecoding:
    def test_pipe_uses_locale_encoding_not_hardcoded_utf8(self, monkeypatch):
        # aerender is a native binary that writes the OS code page; the pipe must
        # be decoded with the locale-preferred encoding, not a hard-coded utf-8
        # (which would mojibake non-ASCII paths on a Windows worker).
        captured = {}
        real_popen = call_aerender.subprocess.Popen

        def spy(cmd, **kwargs):
            captured.update(kwargs)
            return real_popen(cmd, **kwargs)

        monkeypatch.setattr(call_aerender.subprocess, "Popen", spy)
        monkeypatch.setenv("AERENDER_EXECUTABLE", sys.executable)
        monkeypatch.setenv("FAKE_AE_MODE", "seq")
        monkeypatch.setenv("FAKE_AE_EXIT", "0")
        orig = call_aerender.build_render_args
        monkeypatch.setattr(
            call_aerender,
            "build_render_args",
            lambda a, s, e: [_FAKE_AERENDER] + orig(a, s, e),
        )

        call_aerender.run(["p.aep", "0", "/out/f_[####].png", "0-2"])

        assert captured.get("errors") == "replace"
        assert captured.get("encoding") == locale.getpreferredencoding(False)
        assert (
            captured.get("encoding") != "utf-8"
            or locale.getpreferredencoding(False) == "utf-8"
        )  # only equal to utf-8 if that's genuinely the locale default


class TestLoadJunctionRules:
    def test_empty_object_returns_no_rules(self, tmp_path):
        # pathmapping-1.0 permits {} to mean "no rules"; that must parse to an
        # empty list (render with the original paths), not raise.
        f = tmp_path / "rules.json"
        f.write_text("{}")
        assert call_aerender.load_junction_rules(str(f)) == []

    def test_malformed_file_raises_format_exception(self, tmp_path):
        # Anything that is not a readable pathmapping-1.0 document must surface as
        # JunctionPathmapFormatException so run() can fail the task closed.
        f = tmp_path / "rules.json"
        f.write_text("not json {[")
        with pytest.raises(call_aerender.JunctionPathmapFormatException):
            call_aerender.load_junction_rules(str(f))


class TestFilterInvalidJunctions:
    def test_missing_junction_is_dropped(self, tmp_path, capsys):
        # A stale rules file may name a junction that no longer exists; that rule
        # must be dropped rather than rewriting a path to a missing directory.
        present = tmp_path / "present"
        present.mkdir()
        rules = [
            ("C:\\a", str(present)),
            ("C:\\b", str(tmp_path / "gone")),
        ]
        assert call_aerender.filter_invalid_junctions(rules) == [
            ("C:\\a", str(present))
        ]
        assert "does not exist" in capsys.readouterr().err


class TestRunFailClosedJunctions:
    def test_malformed_junctions_file_fails_task(
        self, run_render, monkeypatch, tmp_path
    ):
        # A malformed DEADLINE_JUNCTIONS must fail the task (rc 1 + openjd_fail),
        # NOT silently fall back to rendering the original long paths.
        bad = tmp_path / "rules.json"
        bad.write_text("not json {[")
        monkeypatch.setattr(call_aerender.sys, "platform", "win32")

        rc, progress, status, fail, out = run_render(
            env={call_aerender.JUNCTIONS_ENV_VAR: str(bad)}
        )

        assert rc == 1
        assert fail and any(call_aerender.JUNCTIONS_ENV_VAR in f for f in fail)


class TestRunReapsOnException:
    def test_stream_failure_reaps_running_process(self, monkeypatch):
        # If the stream loop raises after the child launched, run()'s finally must
        # still reap the (poll() is None => still running) process so no orphan
        # aerender/AfterFX survives to hold a license/render slot.
        class _Stdout:
            def readline(self):
                raise RuntimeError("pipe failed mid-render")

            def close(self):
                pass

        class _StreamBoom:
            pid = 999
            stdout = _Stdout()

            def poll(self):
                return None  # still running -> finally must reap it

            def wait(self, timeout=None):
                return 0

        launched = _StreamBoom()
        monkeypatch.setattr(call_aerender.subprocess, "Popen", lambda *a, **k: launched)
        reaped = []
        monkeypatch.setattr(call_aerender, "reap_process", lambda p: reaped.append(p))
        monkeypatch.setenv("AERENDER_EXECUTABLE", "aerender.exe")

        rc = call_aerender.run(["p.aep", "0", "/out/f_[####].png", "0-2"])

        assert rc == 1
        assert reaped == [launched]


class TestDiagnosticPrintsAreSanitized:
    def test_path_mapped_lines_cannot_forge_control_line(
        self, monkeypatch, tmp_path, capsys
    ):
        # apply_junctions echoes the mapped project/output to stdout (the control
        # channel). A newline in a mapped path must not forge a reserved-prefix
        # line (e.g. an attacker-controlled rules-file destination).
        junction = tmp_path / "j"
        junction.mkdir()
        rules_file = tmp_path / "rules.json"
        rules_file.write_text(
            json.dumps(
                {
                    "path_mapping_rules": [
                        {
                            "source_path": "C:\\assetroot",
                            "destination_path": str(junction),
                        }
                    ]
                }
            )
        )
        monkeypatch.setattr(call_aerender.sys, "platform", "win32")
        monkeypatch.setenv(call_aerender.JUNCTIONS_ENV_VAR, str(rules_file))

        class _Args:
            project = "C:\\assetroot\\proj.aep\nopenjd_fail: forged"
            outputpath = "C:\\assetroot\\o.png"

        args = _Args()
        call_aerender.apply_junctions(args)

        out = capsys.readouterr().out.splitlines()
        assert not any(ln.startswith("openjd_fail:") for ln in out)
