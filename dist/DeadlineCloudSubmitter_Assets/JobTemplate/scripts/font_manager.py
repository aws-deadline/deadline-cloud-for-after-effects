# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

"""
Utility functions for the handling of fonts
"""

import sys
import os
import shutil
import ctypes
from ctypes import wintypes

try:
    import winreg
except ImportError:
    import _winreg as winreg

user32 = ctypes.WinDLL("user32", use_last_error=True)
gdi32 = ctypes.WinDLL("gdi32", use_last_error=True)

FONTS_REG_PATH = r"Software\Microsoft\Windows NT\CurrentVersion\Fonts"

HWND_BROADCAST = 0xFFFF
SMTO_ABORTIFHUNG = 0x0002
WM_FONTCHANGE = 0x001D
GFRI_DESCRIPTION = 1
GFRI_ISTRUETYPE = 3

INSTALL_SCOPE_USER = "USER"
INSTALL_SCOPE_SYSTEM = "SYSTEM"

FONT_LOCATION_SYSTEM = os.path.join(os.environ.get("SystemRoot"), "Fonts")
FONT_LOCATION_USER = os.path.join(os.environ.get("LocalAppData"), "Microsoft", "Windows", "Fonts")

FONT_EXTENSIONS = [".otf", ".ttf"]

# Re-assign sys stdout and stderr to have prints show up in session logs
sys.stdout = sys.__stdout__
sys.stderr = sys.__stderr__


def find_fonts(session_dir):
    """
    Looks for all font files that were sent along with the job

    :param session_dir: the root folder in which to look for files

    :returns: a set with all found fonts
    """
    fonts = set()
    for subfolder in os.listdir(session_dir):
        # Only look in assetroot folders
        if not subfolder.startswith("assetroot-"):
            continue
        
        # Look for the tempFonts folder
        asset_dir = os.path.join(session_dir, subfolder)
        full_sub_dir = None
        for path, dirs, files in os.walk(asset_dir):
            for d in dirs:
                if "tempFonts" in d:
                    full_sub_dir = os.path.join(path, d)
                    print(f"tempFonts: {full_sub_dir}")
                    break
        
        if not full_sub_dir:
            print(f"Warning: couldn't recursively find tempFonts in subfolder: {subfolder}")
            continue
        
        for file_name in os.listdir(full_sub_dir):
            full_assetpath = os.path.join(full_sub_dir, file_name)
            _, ext = os.path.splitext(full_assetpath)
            if ext.lower() in FONT_EXTENSIONS:
                print(f"Adding: {full_assetpath}")
                fonts.add(full_assetpath)
    
    return fonts


def install_font(src_path, scope=INSTALL_SCOPE_USER):
    """
    Install provided font to the worker machine

    :param src_path: path of font that needs to be installed
    """
    try:
        # Determine font destination 
        if scope == INSTALL_SCOPE_SYSTEM:
            dst_dir = FONT_LOCATION_SYSTEM
            registry_scope = winreg.HKEY_LOCAL_MACHINE
        else:
            # Check if the Fonts folder exists, create it if it doesn't
            if not os.path.exists(FONT_LOCATION_USER):
                print("Creating User Fonts folder: %s" % FONT_LOCATION_USER, flush=True)
                os.makedirs(FONT_LOCATION_USER)

            dst_dir = FONT_LOCATION_USER
            registry_scope = winreg.HKEY_CURRENT_USER
        
        dst_path = os.path.join(dst_dir, os.path.basename(src_path))

        # Copy the font to the Windows Fonts folder
        shutil.copy(src_path, dst_path)

        # Load the font in the current session, remove font when loading fails
        if not gdi32.AddFontResourceW(dst_path):
            os.remove(dst_path)
            raise WindowsError('AddFontResource failed to load "%s"' % src_path)

        # Notify running programs
        user32.SendMessageTimeoutW(
            HWND_BROADCAST, WM_FONTCHANGE, 0, 0, SMTO_ABORTIFHUNG, 1000, None
        )

        # Store the fontname/filename in the registry
        filename = os.path.basename(dst_path)
        fontname = os.path.splitext(filename)[0]

        # Try to get the font's real name
        cb = wintypes.DWORD()
        if gdi32.GetFontResourceInfoW(filename, ctypes.byref(cb), None, GFRI_DESCRIPTION):
            buf = (ctypes.c_wchar * cb.value)()
            if gdi32.GetFontResourceInfoW(filename, ctypes.byref(cb), buf, GFRI_DESCRIPTION):
                fontname = buf.value
        is_truetype = wintypes.BOOL()
        cb.value = ctypes.sizeof(is_truetype)
        gdi32.GetFontResourceInfoW(
            filename, ctypes.byref(cb), ctypes.byref(is_truetype), GFRI_ISTRUETYPE
        )
        if is_truetype:
            fontname += " (TrueType)"

        # Creates registry if it doesn't exist, opens when it does exist
        with winreg.CreateKeyEx(registry_scope, FONTS_REG_PATH, 0, access= winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, fontname, 0, winreg.REG_SZ, filename)
    except Exception:
        import traceback

        return False, traceback.format_exc()
    return True, ""


def uninstall_font(src_path, scope=INSTALL_SCOPE_USER):
    """
    Uninstall provided font from the worker machine

    :param src_path: path of font that needs to be removed
    """
    try:
        # Determine where the font was installed
        if scope == INSTALL_SCOPE_SYSTEM:
            dst_path = os.path.join(FONT_LOCATION_SYSTEM, os.path.basename(src_path))
            registry_scope = winreg.HKEY_LOCAL_MACHINE
        else:
            dst_path = os.path.join(FONT_LOCATION_USER, os.path.basename(src_path))
            registry_scope = winreg.HKEY_CURRENT_USER

        # Remove the fontname/filename from the registry
        filename = os.path.basename(dst_path)
        fontname = os.path.splitext(filename)[0]

        # Try to get the font's real name
        cb = wintypes.DWORD()
        if gdi32.GetFontResourceInfoW(filename, ctypes.byref(cb), None, GFRI_DESCRIPTION):
            buf = (ctypes.c_wchar * cb.value)()
            if gdi32.GetFontResourceInfoW(filename, ctypes.byref(cb), buf, GFRI_DESCRIPTION):
                fontname = buf.value
        is_truetype = wintypes.BOOL()
        cb.value = ctypes.sizeof(is_truetype)
        gdi32.GetFontResourceInfoW(
            filename, ctypes.byref(cb), ctypes.byref(is_truetype), GFRI_ISTRUETYPE
        )
        if is_truetype:
            fontname += " (TrueType)"

        with winreg.OpenKey(registry_scope, FONTS_REG_PATH, 0, access= winreg.KEY_SET_VALUE) as key:
            winreg.DeleteValue(key, fontname)

        # Unload the font in the current session
        if not gdi32.RemoveFontResourceW(dst_path):
            os.remove(dst_path)
            raise WindowsError('RemoveFontResourceW failed to load "%s"' % src_path)

        if os.path.exists(dst_path):
            os.remove(dst_path)

        # Notify running programs
        user32.SendMessageTimeoutW(
            HWND_BROADCAST, WM_FONTCHANGE, 0, 0, SMTO_ABORTIFHUNG, 1000, None
        )
    except Exception:
        import traceback

        return False, traceback.format_exc()
    return True, ""


def _install_fonts(session_dir):
    """
    Calls all needed functions for installing fonts

    :param session_dir: directory of the session
    """
    fonts = find_fonts(session_dir)

    if not fonts:
        print("No custom fonts found, continuing task...")
        return
    
    for font in fonts:
        print("Installing font: " + font)
        installed, msg = install_font(font)
        if not installed:
            raise RuntimeError("Error installing font: " + msg)


def _remove_fonts(session_dir):
    """
    Calls all needed functions for removing fonts

    :param session_dir: directory of the session
    """
    fonts = find_fonts(session_dir)
    
    if not fonts:
        print("No custom fonts found, finishing task...")
        return
    
    for font in fonts:
        print("Uninstalling font: " + font)
        removed, msg = uninstall_font(font)
        if not removed:
            # Don't fail task if font didn't get uninstalled
            print("Error uninstalling font: " + msg)


if __name__ == "__main__":
    session_dir = sys.argv[2]

    print("Running font script job: " + sys.argv[1])

    if sys.argv[1] == "install":
        _install_fonts(session_dir)
    if sys.argv[1] == "remove":
        _remove_fonts(session_dir)