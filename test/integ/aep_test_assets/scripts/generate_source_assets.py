#!/usr/bin/env python3
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
"""
Generate versioned source assets for the After Effects integration tests.

Assets produced (version stamped into filenames AND burned into pixels/labels):
  - video/     : H.264 source clip used as imported footage (job-attachment coverage)
  - audio/     : tone in WAV / AIFF / MP3 for audio-render coverage
  - images/    : still PNG reference footage
  - image_sequences/ : PNG sequence for image-sequence-import coverage
  - special_characters/ : PNG whose filename carries special characters (=, +, -, _, ñ)

Everything is generated locally. Labels use Lato (SIL Open Font License).
"""

import os
import shutil
import subprocess

VERSION = "1.0.0"
# Defaults to the in-repo asset tree (this script's parent dir). AE_TEST_ASSETS
# overrides it, matching run_build.py and the harness.
ROOT = os.environ.get("AE_TEST_ASSETS") or os.path.dirname(
    os.path.dirname(os.path.abspath(__file__))
)
SRC = os.path.join(ROOT, "source_assets")
# Lato (SIL OFL). AE_LABEL_FONT overrides the path. Pillow searches the system
# font folders by file name; the per-user folders are added here.
LABEL_FONT = os.environ.get("AE_LABEL_FONT") or "Lato-Regular.ttf"
_USER_FONT_DIRS = [
    os.path.join(os.environ.get("LOCALAPPDATA", ""), "Microsoft", "Windows", "Fonts"),
    os.path.expanduser("~/Library/Fonts"),
    os.path.expanduser("~/.local/share/fonts"),
]

from PIL import Image, ImageDraw, ImageFont

W, H = 1920, 1080


def font(sz):
    # No fallback: Pillow's default face would silently change every label.
    for candidate in [LABEL_FONT] + [
        os.path.join(d, LABEL_FONT) for d in _USER_FONT_DIRS
    ]:
        try:
            return ImageFont.truetype(candidate, sz)
        except OSError:
            continue
    raise SystemExit(f"{LABEL_FONT} not found; install Lato (see test/integ/README.md)")


def draw_label(draw, lines, origin=(80, 80), size=48, fill=(255, 255, 255)):
    f = font(size)
    y = origin[1]
    for ln in lines:
        draw.text((origin[0], y), ln, font=f, fill=fill)
        y += int(size * 1.35)


def make_still(path, title, subtitle, bg=(18, 24, 42)):
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    # simple framing
    d.rectangle([40, 40, W - 40, H - 40], outline=(80, 140, 220), width=6)
    draw_label(
        d,
        [
            title,
            subtitle,
            f"asset v{VERSION}",
            "Deadline Cloud for After Effects integration test",
        ],
        origin=(90, 380),
        size=64,
    )
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path)
    print("still :", os.path.relpath(path, ROOT))


def make_sequence(dirpath, base, frames=60):
    os.makedirs(dirpath, exist_ok=True)
    for i in range(1, frames + 1):
        t = i / frames
        bg = (int(20 + 60 * t), 24, int(80 - 40 * t))
        img = Image.new("RGB", (W, H), bg)
        d = ImageDraw.Draw(img)
        d.rectangle([40, 40, W - 40, H - 40], outline=(120, 200, 255), width=6)
        draw_label(
            d,
            [
                "Image Sequence Import",
                f"frame {i:04d} / {frames}",
                f"asset v{VERSION}",
                "Deadline Cloud for After Effects integration test",
            ],
            origin=(90, 360),
            size=64,
        )
        # moving marker to prove sequence order on render
        x = int(90 + (W - 320) * t)
        d.ellipse([x, H - 220, x + 90, H - 130], fill=(255, 210, 60))
        img.save(os.path.join(dirpath, f"{base}_{i:04d}.png"))
    print("seq   :", os.path.relpath(dirpath, ROOT), f"({frames} frames)")


def run(cmd):
    out = cmd[-1]
    if not str(out).startswith("-"):
        os.makedirs(os.path.dirname(out), exist_ok=True)
    proc = subprocess.run(
        cmd, check=False, stdout=subprocess.DEVNULL, stderr=subprocess.PIPE, text=True
    )
    if proc.returncode != 0:
        raise SystemExit(f"{cmd[0]} failed ({proc.returncode}): {proc.stderr[-2000:]}")


def make_video(path, seconds=6, fps=30):
    # This ffmpeg build has no drawtext filter, so render frames with Pillow
    # (burned-in label + frame counter) then encode H.264 / yuv420p, 1080p30.
    import tempfile

    frames = seconds * fps
    tmp = tempfile.mkdtemp(prefix="ae_src_vid_")
    try:
        for i in range(1, frames + 1):
            t = i / frames
            img = Image.new("RGB", (W, H), (13, 26, 51))
            d = ImageDraw.Draw(img)
            # simple horizontal gradient band that shifts over time
            for x in range(0, W, 8):
                c = int(40 + 120 * ((x / W + t) % 1.0))
                d.rectangle([x, 0, x + 8, H], fill=(c // 3, 40 + c // 3, 60 + c))
            d.rectangle([40, 40, W - 40, H - 40], outline=(120, 200, 255), width=6)
            draw_label(
                d,
                ["AE SOURCE FOOTAGE", f"asset v{VERSION}", "integration test"],
                origin=(90, 120),
                size=56,
            )
            f = font(120)
            d.text((W // 2 - 120, H // 2 - 60), f"{i:03d}", font=f, fill=(255, 210, 60))
            img.save(os.path.join(tmp, f"f_{i:04d}.png"))
        run(
            [
                "ffmpeg",
                "-y",
                "-framerate",
                str(fps),
                "-i",
                os.path.join(tmp, "f_%04d.png"),
                "-c:v",
                "libx264",
                "-pix_fmt",
                "yuv420p",
                "-r",
                str(fps),
                path,
            ]
        )
        print("video :", os.path.relpath(path, ROOT))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


def make_audio():
    # A gentle two-tone chord + slow tremolo, 6s stereo 48k, exported to 3 formats.
    src = (
        "sine=frequency=220:sample_rate=48000:duration=6[a];"
        "sine=frequency=330:sample_rate=48000:duration=6[b];"
        "[a][b]amix=inputs=2,tremolo=f=4:d=0.5,volume=0.6"
    )
    targets = {
        f"tone_48k_stereo_v{VERSION}.wav": ["-c:a", "pcm_s16le"],
        f"tone_48k_stereo_v{VERSION}.aiff": ["-c:a", "pcm_s16be"],
        f"tone_48k_stereo_v{VERSION}.mp3": ["-c:a", "libmp3lame", "-b:a", "192k"],
    }
    for name, codec in targets.items():
        out = os.path.join(SRC, "audio", name)
        run(["ffmpeg", "-y", "-f", "lavfi", "-i", src, "-ac", "2"] + codec + [out])
        print("audio :", os.path.relpath(out, ROOT))


def main():
    if not shutil.which("ffmpeg"):
        raise SystemExit(
            "ffmpeg not found on PATH; it builds the video and audio assets"
        )
    # Video
    make_video(os.path.join(SRC, "video", f"plate_motion_1080p30_v{VERSION}.mp4"))
    # Audio (3 formats)
    make_audio()
    # Stills
    make_still(
        os.path.join(SRC, "images", f"still_ref_1080p_v{VERSION}.png"),
        "Still Reference Footage",
        "used for missing-dependency + basic tests",
    )
    # Image sequence
    make_sequence(
        os.path.join(SRC, "image_sequences", f"seq_1080p_v{VERSION}"),
        f"seq_v{VERSION}",
        frames=60,
    )
    # Special-character-named still (avoid ':' -- a colon breaks job attachments)
    make_still(
        os.path.join(SRC, "special_characters", f"plate_ñ=+-_v{VERSION}.png"),
        "Special Characters",
        "filename carries  ñ = + - _",
    )
    print("\nAll source assets generated under", os.path.relpath(SRC, ROOT))


if __name__ == "__main__":
    main()
