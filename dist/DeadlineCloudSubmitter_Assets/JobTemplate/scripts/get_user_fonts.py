# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

import os
import sys

try:
    from fontTools import ttLib
except ModuleNotFoundError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fonttools"])
    from fontTools import ttLib

# Font locations to search
SEARCH_PATHS = [
    "%APPDATA%/Adobe/CoreSync/plugins/livetype",
    "%APPDATA%/Adobe/User Owned Fonts",
    "%LOCALAPPDATA%/Microsoft/Windows/Fonts",
    "%WINDIR%/Fonts",
]

if sys.platform == "darwin":
    SEARCH_PATHS = [
        "~/Library/Application Support/Adobe/CoreSync/plugins/livetype",
        "~/Library/Application Support/Adobe/User Owned Fonts",
        "~/Library/Fonts",
        "/Library/Fonts"
    ]

FONT_EXTENSIONS = [".otf", ".ttf", ".fon", ""]
TTF_POSTSCRIPT_NAME = 6


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Missing font name argument")
        sys.exit(1)

    target_postscript_name = sys.argv[1]

    try:
        for search_path in SEARCH_PATHS:
            search_root = os.path.normpath(os.path.expandvars(os.path.expanduser(search_path)))
            if not os.path.exists(search_root):
                continue

            for path, dirs, files in os.walk(search_root):
                for file in files:
                    _, ext = os.path.splitext(file)
                    if ext.lower() not in FONT_EXTENSIONS:
                        continue

                    font_path = os.path.join(path, file)
                    try:
                        t = ttLib.TTFont(font_path)
                        names_table = t["name"].names
                        postscript_name = str(names_table[TTF_POSTSCRIPT_NAME])
                        if postscript_name == target_postscript_name:
                            print(font_path)
                            sys.exit(0)
                    except Exception:
                        continue
        print(f"Font file {target_postscript_name} is missing")
        sys.exit(1)
    except Exception as e:
        print(f"An error occurred: {e}")
        sys.exit(1)

