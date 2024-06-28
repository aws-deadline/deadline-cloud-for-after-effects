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


def install_font(src_path, scope=INSTALL_SCOPE_USER):
    try:
        # copy the font to the Windows Fonts folder
        if scope == INSTALL_SCOPE_SYSTEM:
            dst_path = os.path.join(FONT_LOCATION_SYSTEM, os.path.basename(src_path))
            registry_scope = winreg.HKEY_LOCAL_MACHINE
        else:
            dst_path = os.path.join(FONT_LOCATION_USER, os.path.basename(src_path))
            registry_scope = winreg.HKEY_CURRENT_USER

        shutil.copy(src_path, dst_path)
        # load the font in the current session
        if not gdi32.AddFontResourceW(dst_path):
            os.remove(dst_path)
            raise WindowsError('AddFontResource failed to load "%s"' % src_path)
        # notify running programs
        user32.SendMessageTimeoutW(
            HWND_BROADCAST, WM_FONTCHANGE, 0, 0, SMTO_ABORTIFHUNG, 1000, None
        )
        # store the fontname/filename in the registry
        filename = os.path.basename(dst_path)
        fontname = os.path.splitext(filename)[0]
        # try to get the font's real name
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
        with winreg.OpenKey(registry_scope, FONTS_REG_PATH, 0, winreg.KEY_SET_VALUE) as key:
            winreg.SetValueEx(key, fontname, 0, winreg.REG_SZ, filename)
    except Exception:
        import traceback

        return False, traceback.format_exc()
    return True, ""


def uninstall_font(src_path, scope=INSTALL_SCOPE_USER):
    try:
        # copy the font to the Windows Fonts folder
        if scope == INSTALL_SCOPE_SYSTEM:
            dst_path = os.path.join(FONT_LOCATION_SYSTEM, os.path.basename(src_path))
            registry_scope = winreg.HKEY_LOCAL_MACHINE
        else:
            dst_path = os.path.join(FONT_LOCATION_USER, os.path.basename(src_path))
            registry_scope = winreg.HKEY_CURRENT_USER

        # remove the fontname/filename from the registry
        filename = os.path.basename(dst_path)
        fontname = os.path.splitext(filename)[0]
        # try to get the font's real name
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

        with winreg.OpenKey(registry_scope, FONTS_REG_PATH, 0, winreg.KEY_SET_VALUE) as key:
            winreg.DeleteValue(key, fontname)

        # unload the font in the current session
        if not gdi32.RemoveFontResourceW(dst_path):
            os.remove(dst_path)
            raise WindowsError('RemoveFontResourceW failed to load "%s"' % src_path)

        if os.path.exists(dst_path):
            os.remove(dst_path)

        # notify running programs
        user32.SendMessageTimeoutW(
            HWND_BROADCAST, WM_FONTCHANGE, 0, 0, SMTO_ABORTIFHUNG, 1000, None
        )
    except Exception:
        import traceback

        return False, traceback.format_exc()
    return True, ""
