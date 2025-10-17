# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

import platform
import subprocess
import sys
from pathlib import Path

import pytest

# Cross-platform fonts
CROSS_PLATFORM_FONTS = ["ArialMT", "TimesNewRomanPSMT", "Calibri"]

# macOS-specific fonts
MACOS_FONTS = ["Helvetica"]

# Get fonts for current platform
COMMON_FONTS = CROSS_PLATFORM_FONTS + (
    MACOS_FONTS if platform.system() == "Darwin" else []
)


def get_python_executable():
    """Detect the correct Python executable alias"""
    for alias in ["python3", "python", "py"]:
        try:
            result = subprocess.run(
                [alias, "--version"], capture_output=True, text=True
            )
            if result.returncode == 0 and "Python 3" in result.stdout:
                return alias
        except FileNotFoundError:
            continue
    return sys.executable  # Fallback to current Python


def get_font_script_path():
    """Get path to get_user_fonts.py script"""
    project_root = Path(__file__).parent.parent.parent
    return (
        project_root
        / "dist"
        / "DeadlineCloudSubmitter_Assets"
        / "JobTemplate"
        / "scripts"
        / "get_user_fonts.py"
    )


@pytest.mark.parametrize("postscript_name", COMMON_FONTS)
def test_font_detection(postscript_name):
    """Test that get_user_fonts.py can find common fonts by PostScript name"""
    script_path = get_font_script_path()
    python_exec = get_python_executable()

    result = subprocess.run(
        [python_exec, str(script_path), postscript_name], capture_output=True, text=True
    )

    # Should either find font (exit 0) or not find it (exit 1)
    # Just verify script runs without crashing
    assert result.returncode in [
        0,
        1,
    ], f"Script crashed for {postscript_name}: {result.stderr}"

    if result.returncode == 0:
        # If found, should output a file path
        assert result.stdout.strip(), f"No output for found font {postscript_name}"


def test_missing_font():
    """Test that script exits with error for non-existent font"""
    script_path = get_font_script_path()
    python_exec = get_python_executable()

    result = subprocess.run(
        [python_exec, str(script_path), "NonExistentFont123"],
        capture_output=True,
        text=True,
    )

    assert result.returncode == 1
    assert "FONT_NOT_FOUND" in result.stdout


def test_script_no_args():
    """Test that script exits with error when no font name provided"""
    script_path = get_font_script_path()
    python_exec = get_python_executable()

    result = subprocess.run(
        [python_exec, str(script_path)], capture_output=True, text=True
    )

    assert result.returncode == 1
    assert "Missing font name argument" in result.stdout
