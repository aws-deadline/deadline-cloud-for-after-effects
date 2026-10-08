# After Effects SMF Test Artifact Superset

Test assets and After Effects projects for the **Deadline Cloud for After Effects**
submitter E2E suite — submitting jobs from a **Mac workstation** to **Windows SMF**
(Service-Managed Fleet) workers. Built from the *After Effects SMF Test Coverage*
matrix.

**Asset version: v1.0.0** — the version is burned into every rendered frame along
with the test id/name and the `mac -> Windows SMF` target, so any downloaded render
is self-identifying.

## Layout

```
aep_test_assets/
├── README.md                 # this file
├── manifest.json             # machine-readable test -> artifact map (for the harness)
├── projects/
│   ├── ae2025/               # 16 .aep files, saved natively by AE 2025 (v25.6)
│   └── ae2026/               # 16 .aep files, saved natively by AE 2026 (v26.3)
├── source_assets/            # shared, versioned footage imported by the projects
│   ├── video/                # H.264 1080p30 clip (job-attachment coverage)
│   ├── audio/                # tone in WAV / AIFF / MP3, 48 kHz stereo
│   ├── images/               # still reference PNG
│   ├── image_sequences/      # 60-frame PNG sequence
│   └── special_characters/   # PNG whose filename carries  ñ = + - _
├── renders/                  # local render output (gitignored)
└── scripts/
    ├── generate_source_assets.py   # regenerates source_assets (ffmpeg + Pillow)
    ├── build_test_projects.jsx     # builds the .aep files
    └── run_build.py                # runs the builder headlessly
```

## Naming

`projects/<aeVer>/<TESTID>_<slug>_<aeVer>_v<assetVer>.aep`
e.g. `T06_video_custom_fonts_ae2026_v1.0.0.aep`

## AE version coverage

| AE version | Produced | Notes |
|---|---|---|
| AE 2024 (v24) | ❌ | Not installed; skipped by request. |
| AE 2025 (v25.6) | ✅ | Saved natively. |
| AE 2026 (v26.3) | ✅ | Saved natively. |

## Fonts used

| Role (from the matrix) | Font | PostScript name |
|---|---|---|
| Supported, installed | Amazon Ember | `AmazonEmber-Regular` |
| Supported, Creative Cloud | Komet | `Komet-Regular` |
| Missing (error path) | *(deliberately absent)* | `NotInstalledFont-Regular` |

No `.ttc` font: macOS's `AmericanTypewriter.ttc` fails to load on the Windows fleet
(`RENDER_FINDINGS.md` #3).

## Render queue / output modules

Every comp is queued with a built-in output-module template. AE's `Format` is
read-only from script and AE ships no JPEG/PNG Sequence or MP3 template, so:

- video: **H.264**
- image sequences (T08, T19 emit): **TIFF Sequence with Alpha**
- audio (T07): **AIFF 48kHz**

The builder fails if a template is missing or yields the wrong format.
See `manifest.json` → `output_module_note`.

## Regenerating

- Source assets: `python3 scripts/generate_source_assets.py`
- Projects (headless, any host with AE):
  `hatch run integ:python test/integ/aep_test_assets/scripts/run_build.py T07 T08`
  Pass only the ids you changed. `AE_VERSION` picks the AE year. Writes
  `scripts/build_log_ae<ver>.txt` (gitignored).

## Test → artifact coverage

| Test | Artifact | Intended output |
|---|---|---|
| T05 Submit + Dockable | `T05_submit_dockable` | H.264 |
| T06 Video + Custom Fonts | `T06_video_custom_fonts` | H.264 |
| T07 Audio Rendering | `T07_audio_render` | AIFF (audio only) |
| T08 Image Chunking (300f) | `T08_image_chunking_300f` | TIFF Sequence; frames/task 100 |
| T09 Deadline CLI Error | `T09_cli_error_handling` | H.264 |
| T10 Special Characters | `T10_special_characters` (2 comps) | H.264 |
| T11 Multi-frame Rendering | `T11_multi_frame_rendering` | H.264 |
| T12 Timeout | `T12_timeout` | H.264 (heavy/long) |
| T13 AE Env Variable | `T13_env_variable` | H.264 |
| T15 Conda in Gamma | `T15_conda_version` | H.264 |
| T16 Incompatible Version | `T16_incompatible_version_warning` | H.264 |
| T17 Multi-comp | `T17_multicomp` (3 comps) | H.264 |
| T18 Sticky Settings | `T18_sticky_settings` (3 comps) | H.264 |
| T19 Image Sequence Import | `T19_image_sequence_import` (emit + import) | TIFF Seq + H.264 |
| T20 Missing Dependencies | `T20_missing_dependencies` | H.264 |
| T21 Get User Fonts | `T21_get_user_fonts` | H.264 |

Not covered by an `.aep` (code/process-only tests): **T03** JSX bundler, **T04** unit
tests, **T14** installer testing.
