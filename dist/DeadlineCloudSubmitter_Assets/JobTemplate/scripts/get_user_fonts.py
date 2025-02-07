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
    error_exit(error_msg)
except Exception as e:
    error_exit(traceback.format_exc())

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


def error_exit(message, errorlevel=1):
    print(json.dumps({
        "error": message
    }))
    sys.exit(errorlevel)


def get_font(font_path):
    """
    Collect font metadata from the given font file.
    Returns a dictionary of metadata.
    """

    result = {}

    try:
        t = ttLib.TTFont(font_path)
    except ttLib.TTLibError as e:
        # Not a TrueType or OpenType font (bad sfntVersion)
        result["error_verbose"] = traceback.format_exc()
        if "bad sfntVersion" in str(e):
            # These errors are very common.
            # Don't show a UI warning but report the error in "error_verbose"
            result["error_verbose"] = traceback.format_exc()
        else:
            result["error"] = f"{e}: {font_path}"
        return result
    except Exception as e:
        result["error_verbose"] = traceback.format_exc()
        result["error"] = f"{getattr(e, 'message', str(e))}: {font_path}"
        return result

    # Collect name metadata from the name table
    names_table = t["name"].names
    raw_table = {}
    try:
        raw_table = {i:str(names_table[i]) for i in range(0, len(names_table))}
    except Exception as e:
        result["error_verbose"] = traceback.format_exc()
        result["error"] = f"{getattr(e, 'message', str(e))}: {font_path}"
        return result

    try:
        result[font_path] = {
            "family_name": str(names_table[TTF_FAMILY_NAME]),
            "style": str(names_table[TTF_STYLE]),
            "full_name": str(names_table[TTF_FULL_NAME]),
            "postscript_name": str(names_table[TTF_POSTSCRIPT_NAME]),
            "raw": raw_table
        }
    except Exception as e:
        result["error"] = f"{getattr(e, 'message', str(e))}: {font_path}"
        return result

    return result


def get_fonts(root_path):
    """
    Collect font metadata from all font files under the specified root_path.
    Returns a dictionary with file paths as the keys and a list of errors encountered.
    """

    result = {}
    errors = []

    try:
        if not os.path.exists(root_path):
            return result
    except Exception as e:
        result["error_verbose"] = traceback.format_exc()
        errors.append(f"{getattr(e, 'message', str(e))}: {root_path}")
        return result, errors

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

                font_data = {}
                try:
                    font_data = get_font(font_path)
                    result.update(font_data)
                    if "error" in font_data:
                        errors.append(font_data["error"])
                except Exception as e:
                    errors.append(f"{getattr(e, 'message', str(e))}: {font_path}")
                    continue
    except Exception as e:
        errors.append(f"{getattr(e, 'message', str(e))}: {root_path}")
    return result, errors


def search_for_fonts(search_paths):
    """
    Searches the given paths recursively for font files and collects
    their metadata.
    Returns a dictionary with file paths as the keys.
    """

    fonts = {}
    errors = []
    
    for search_path in search_paths:
        search_root = os.path.normpath(os.path.expandvars(os.path.expanduser(search_path)))
        try:
            if not os.path.exists(search_root):
                continue
        except Exception as e:
            errors.extend(f"{getattr(e, 'message', str(e))}: {search_root}")
            continue

        font_results, font_errors = get_fonts(search_root)
        fonts.update(font_results)
        errors.extend(font_errors)

    if errors:
        s = "s" if len(errors) > 1 else ""
        fonts["error"] = f"Error{s} encountered during font scan:\n"
        for e in errors:
            fonts["error"] += e + "\n"

    return fonts


if __name__ == "__main__":
    result = []
    try:
        result = search_for_fonts(SEARCH_PATHS)
        print(json.dumps(result))
    except Exception as e:
        result = {
            "error": f"{getattr(e, 'message', str(e))}",
            "error_verbose": traceback.format_exc()
        }
        print(json.dumps(result))

