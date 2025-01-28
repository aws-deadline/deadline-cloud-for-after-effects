# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
Collects font name metadata from user-installed fonts. Output as JSON.
"""

import json
import os
import sys
import traceback

try:
    from fontTools import ttLib
except ModuleNotFoundError:
    error_msg = "Error: The fonttools module was not found.\n"
    error_msg += "Please install fonttools by running:\n\npip install fonttools"
    print(json.dumps({
        "error": error_msg
    }))
    sys.exit(1)
except Exception as e:
    print(json.dumps({
        "error": traceback.format_exc()
    }))
    sys.exit(1)


# Font locations to search on Windows
SEARCH_PATHS = [
    "%APPDATA%/Adobe/CoreSync/plugins/livetype",
    "%APPDATA%/Adobe/User Owned Fonts",
    "%LOCALAPPDATA%/Microsoft/Windows/Fonts"
]

if sys.platform == "darwin":
    # Font locations to search on Mac
    SEARCH_PATHS = [
        "~/Library/Application Support/Adobe/CoreSync/plugins/livetype",
        "~/Library/Application Support/Adobe/User Owned Fonts",
        "~/Library/Fonts",
        "/Library/Fonts"
    ]


# Supported font file extensions
FONT_EXTENSIONS = [".otf", ".ttf", ".fon", ""]

# Table indices from https://developer.apple.com/fonts/TrueType-Reference-Manual/RM06/Chap6name.html
TTF_FAMILY_NAME = 1
TTF_STYLE = 2
TTF_FULL_NAME = 4
TTF_POSTSCRIPT_NAME = 6


def get_font(font_path):
    """
    Collect font metadata from the given font file.
    Returns a dictionary of metadata.
    """

    result = {}

    try:
        t = ttLib.TTFont(font_path)
    except Exception as e:
        if verbose:
            print(traceback.format_exc())
        return result

    # Collect name metadata from the name table
    names_table = t["name"].names
    raw_table = {}
    try:
        raw_table = {i:str(names_table[i]) for i in range(0, len(names_table))}
    except Exception:
        if verbose:
            print(traceback.format_exc())
        return result

    try:
        result[font_path] = {
            "family_name": str(names_table[TTF_FAMILY_NAME]),
            "style": str(names_table[TTF_STYLE]),
            "full_name": str(names_table[TTF_FULL_NAME]),
            "postscript_name": str(names_table[TTF_POSTSCRIPT_NAME]),
            "raw": raw_table
        }
    except Exception:
        if verbose:
            print(traceback.format_exc())
        return result

    return result


def get_fonts(root_path, verbose=None):
    """
    Collect font metadata from all font files under the specified root_path.
    Returns a dictionary with file paths as the keys.
    """

    result = {}

    try:
        if not os.path.exists(root_path):
            return result
    except Exception:
        if verbose:
            print(traceback.format_exc())
        return result

    try:
        for path, dirs, files in os.walk(root_path):
            for file in files:
                _, ext = os.path.splitext(file)
                if ext.lower() not in FONT_EXTENSIONS:
                    continue

                font_path = path + "/" + file
                if sys.platform == "win32":
                    font_path = font_path.replace("\\", "/")
                else:
                    pass

                if verbose:
                    print(f"font_path: {font_path}")

                font_data = {}
                try:
                    font_data = get_font(font_path)
                    result.update(font_data)
                except Exception:
                    if verbose:
                        print(traceback.format_exc())
                    continue
    except Exception:
        if verbose:
            print(traceback.format_exc())
    return result


def search_for_fonts(search_paths, verbose=None):
    """
    Searches the given paths recursively for font files and collects
    their metadata.
    Returns a dictionary with file paths as the keys.
    """

    fonts = {}

    for search_path in search_paths:
        search_root = os.path.normpath(os.path.expandvars(os.path.expanduser(search_path)))
        try:
            if not os.path.exists(search_root):
                continue
        except Exception:
            if verbose:
                print(traceback.format_exc())
            continue

        if verbose:
            print(f"search_root: {search_root}")

        font_results = get_fonts(search_root, verbose=verbose)
        fonts.update(font_results)

    return fonts


if __name__ == "__main__":
    verbose = False
    result = []
    try:
        result = search_for_fonts(SEARCH_PATHS, verbose=verbose)
        print(json.dumps(result))
    except Exception:
        if verbose:
            print(traceback.format_exc())

