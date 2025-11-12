# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

import os
import sys

try:
    from fontTools import ttLib
    from fontTools.ttLib.ttCollection import TTCollection
except ModuleNotFoundError:
    import subprocess
    subprocess.check_call([sys.executable, "-m", "pip", "install", "fonttools"])
    from fontTools import ttLib
    from fontTools.ttLib.ttCollection import TTCollection

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
        "/Library/Fonts",
        "/System/Library/Fonts",
    ]

FONT_EXTENSIONS = [".otf", ".ttf", ".fon", ".ttc", ""]
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
                        if ext.lower() == ".ttc":
                            # TTC file - check all fonts in the collection
                            ttc = TTCollection(font_path)
                            for font_index in range(len(ttc)):
                                font = ttc[font_index]
                                names_table = font["name"].names
                                for name_record in names_table:
                                    if name_record.nameID == TTF_POSTSCRIPT_NAME:
                                        postscript_name = str(name_record)
                                        if postscript_name == target_postscript_name:
                                            print(font_path)
                                            sys.exit(0)
                                        break
                        else:
                            # Single font file
                            t = ttLib.TTFont(font_path)
                            names_table = t["name"].names
                            for name_record in names_table:
                                if name_record.nameID == TTF_POSTSCRIPT_NAME:
                                    postscript_name = str(name_record)
                                    if postscript_name == target_postscript_name:
                                        print(font_path)
                                        sys.exit(0)
                                    break
                    except Exception:
                        continue
        print("FONT_NOT_FOUND")
        sys.exit(1)
    except Exception as e:
        print("FONT_ERROR")
        sys.exit(1)

