# Test cases

Each directory here is one case: a `case.json`, a golden bundle under
`expected/job_bundle/`, and one project per AE year in
`../aep_test_assets/projects/ae<year>/`. The schema is in `../harness/cases.py`; how
to run and add cases is in [`../README.md`](../README.md).

## Coverage

✅ runs · ➖ skipped by design · ⚠️ known submitter defect (strict xfail on the
checks against what was authored in AE; every other check still runs).

| Case | Covers | bundle | golden | settings | render | outputs |
|---|---|:-:|:-:|:-:|:-:|:-:|
| [T05](#t05) | Baseline submit | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T06](#t06) | Fonts + video | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T07](#t07) | Audio-only output | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T08](#t08) | Chunking, 300 frames | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T09](#t09) | CLI error case | ✅ | ✅ | ✅ | ➖ | ➖ |
| [T10](#t10) | Special characters | ✅ | ✅ | ✅ | ➖ | ➖ |
| [T11](#t11) | Multi-frame rendering | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T12](#t12) | Task timeout | ✅ | ✅ | ✅ | ✅ | ➖ |
| [T16](#t16) | Version warning | ✅ | ✅ | ✅ | ➖ | ➖ |
| [T17](#t17) | Three comps | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T19](#t19) | Image sequences | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T20](#t20) | Ignore missing dependencies | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T21](#t21) | get_user_fonts fallback | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T22](#t22) | Frame numbers | ✅ | ✅ | ✅ | ✅ | ✅ |
| [T23](#t23) | Output names | ⚠️ | ✅ | ✅ | ➖ | ➖ |
| [T24](#t24) | Output name with braces | ⚠️ | ➖ | ➖ | ➖ | ➖ |

Layer columns are the tests in `../test_submitter.py`: **bundle** = `test_bundle_generation`, **golden** = `test_bundle_matches_golden`, **settings** = `test_job_settings`, **render** = `test_render`, **outputs** = `test_render_outputs`. The render and outputs layers need `--render`.

⚠️ cases are registered in `../harness/known_defects.py`, scoped to one check and
comp; the defect is [`../KNOWN_ISSUES.md`](../KNOWN_ISSUES.md) #8. "(partial)" cases
check less than their name says; their follow-ups are in their notes.

## Cases

<a id="t05"></a>
<details>
<summary><b>T05</b> · Baseline submit</summary>

One comp, no settings. Pins the submitter's defaults, the basic bundle shape, call_aerender.py on every step, and CondaPackages aftereffects=<major> (rendered on the farm).

| | |
|---|---|
| Project | `T05_submit_dockable_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T05_submit_dock` |
| Outputs | `T05_ae<year>.mp4` |
| Layers | bundle, golden, settings, render, outputs |

> Baseline: one comp, default settings. The harness stubs the submitter UI, so the Submit button and docking are not tested. The slug keeps the old 'submit_dockable' name.

</details>

<a id="t06"></a>
<details>
<summary><b>T06</b> · Fonts + video</summary>

Installed (Lato) and Creative Cloud (Komet) fonts are collected into the bundle; a deliberately missing font raises the 'Missing fonts' alert.

| | |
|---|---|
| Project | `T06_video_custom_fonts_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED`<br>alerts: `Missing fonts` |
| Steps | `_1_T06_video_custo` |
| Outputs | `T06_ae<year>.mp4` |
| Layers | bundle, golden, settings, render, outputs |

> A missing font must be reported (expect_alerts); installed and Creative Cloud fonts must be collected.

</details>

<a id="t07"></a>
<details>
<summary><b>T07</b> · Audio-only output</summary>

AIFF output module (video off, audio on). Proves an audio-only step builds and renders.

| | |
|---|---|
| Project | `T07_audio_render_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T07_audio_rende` |
| Outputs | `T07_ae<year>.aif` |
| Layers | bundle, golden, settings, render, outputs |

> Audio-only output (AIFF). AE ships no MP3 output-module template and a script cannot set the format (KNOWN_ISSUES.md #5).

</details>

<a id="t08"></a>
<details>
<summary><b>T08</b> · Chunking, 300 frames</summary>

TIFF sequence with framesPerTask 100: ChunkSize is declared, valued and drives the task range (3 tasks). Every chunk seam is decoded.

| | |
|---|---|
| Project | `T08_image_chunking_300f_ae<year>_v1.0.0.aep` |
| Settings | `framesPerTask: 100` |
| Expects | terminal state `SUCCEEDED`<br>frames as AE shows them: `0-299`<br>`ChunkSize` declared and referenced by the task range |
| Steps | `_1_T08_image_chunk` |
| Outputs | `T08_ae<year>_[#####].tif` |
| Layers | bundle, golden, settings, render, outputs |

> TIFF sequence, 300 frames, framesPerTask 100: ChunkSize must be 100 and drive the step's task range. expect_frames checks the farm's tasks start at 0, 100, 200. The output layer checks every chunk seam.

</details>

<a id="t09"></a>
<details>
<summary><b>T09</b> · CLI error case · bundle only</summary>

Only builds the bundle. Rendering with the deadline CLI absent from PATH needs a harness hook (follow-up).

| | |
|---|---|
| Project | `T09_cli_error_handling_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T09_cli_error_h` |
| Outputs | `T09_ae<year>.mp4` |
| Layers | bundle, golden, settings |

> Partial: only builds the bundle. Rendering with the deadline CLI absent from PATH needs a harness hook (follow-up).

</details>

<a id="t10"></a>
<details>
<summary><b>T10</b> · Special characters · bundle only</summary>

Comp and footage names with ñ = + - _. Bundle only: one comp's worker session hangs after aerender exits.

| | |
|---|---|
| Project | `T10_special_characters_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T10_comp___name`<br>`_2_T10_comp_eq_plu` |
| Outputs | `T10_1_ae<year>.mp4`<br>`T10_2_ae<year>.mp4` |
| Layers | bundle, golden, settings |

> Comp names and footage with special characters. Bundle only: one comp's worker session hangs after aerender finishes (KNOWN_ISSUES.md #3).

</details>

<a id="t11"></a>
<details>
<summary><b>T11</b> · Multi-frame rendering</summary>

MultiFrameRendering ON and MaxCpuUsagePercentage 50 (not the default 90) reach the bundle.

| | |
|---|---|
| Project | `T11_multi_frame_rendering_ae<year>_v1.0.0.aep` |
| Settings | `multiFrameRendering: true`, `maxCpuUsagePercentage: 50` |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T11_multi_frame` |
| Outputs | `T11_ae<year>.mp4` |
| Layers | bundle, golden, settings, render, outputs |

> maxCpuUsagePercentage is 50, not the default 90, so the setting is distinguishable from the default.

</details>

<a id="t12"></a>
<details>
<summary><b>T12</b> · Task timeout</summary>

1-minute task timeout on a 120 s comp. The job must end FAILED, and the failed task's message must say TIMEOUT.

| | |
|---|---|
| Project | `T12_timeout_ae<year>_v1.0.0.aep` |
| Settings | `taskRunTimeoutDays: 0`, `taskRunTimeoutHours: 0`, `taskRunTimeoutMinutes: 1` |
| Expects | terminal state `FAILED`<br>failed task message contains `TIMEOUT`<br>max retries `0` |
| Steps | `_1_T12_timeout` |
| Outputs | `T12_ae<year>.mp4` |
| Layers | bundle, golden, settings, render |

> Expected failure: a 1-minute task timeout on a 120 s comp. max_retries 0 so the job settles on the first timeout.

</details>

<a id="t16"></a>
<details>
<summary><b>T16</b> · Version warning · bundle only</summary>

The unsupported-version prompt must appear exactly when the host AE is unsupported (checked in every case), with the conda fallback. Spoofing a version on demand needs a driver hook (follow-up).

| | |
|---|---|
| Project | `T16_incompatible_version_warning_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T16_incompatibl` |
| Outputs | `T16_ae<year>.mp4` |
| Layers | bundle, golden, settings |

> Partial. Every case now asserts the unsupported-version confirm() appears exactly when the host AE is not in the submitter's SUPPORTED_VERSIONS, and that CondaPackages falls back to the major version then. This case's own goal, an unsupported version on demand, needs a driver hook to spoof it (follow-up).

</details>

<a id="t17"></a>
<details>
<summary><b>T17</b> · Three comps</summary>

One step per comp, per-comp frame ranges, unique parameter names (openjd check rejects duplicates).

| | |
|---|---|
| Project | `T17_multicomp_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T17_comp_1`<br>`_2_T17_comp_2`<br>`_3_T17_comp_3` |
| Outputs | `T17_comp1_ae<year>.mp4`<br>`T17_comp2_ae<year>.mp4`<br>`T17_comp3_ae<year>.mp4` |
| Layers | bundle, golden, settings, render, outputs |

> Three comps, all queued: one step per comp, per-comp frame ranges, unique parameter names.

</details>

<a id="t19"></a>
<details>
<summary><b>T19</b> · Image sequences</summary>

A PNG sequence import (every frame must be an input) and a TIFF sequence output in one job.

| | |
|---|---|
| Project | `T19_image_sequence_import_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED`<br>`ChunkSize` declared and referenced by the task range |
| Steps | `_1_T19_emit_image_`<br>`_2_T19_import_png_` |
| Outputs | `T19_emit_ae<year>_[#####].tif`<br>`T19_import_ae<year>.mp4` |
| Layers | bundle, golden, settings, render, outputs |

> Imports a PNG sequence (every frame must be an input) and emits a TIFF sequence.

</details>

<a id="t20"></a>
<details>
<summary><b>T20</b> · Ignore missing dependencies</summary>

ignoreMissingDependencies reaches the bundle. Nothing is missing yet; removing a file from the run copy is a follow-up.

| | |
|---|---|
| Project | `T20_missing_dependencies_ae<year>_v1.0.0.aep` |
| Settings | `ignoreMissingDependencies: true` |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T20_missing_dep` |
| Outputs | `T20_ae<year>.mp4` |
| Layers | bundle, golden, settings, render, outputs |

> Partial: checks that ignoreMissingDependencies reaches the bundle. Nothing is missing yet; removing a file from the run copy before the drive is a follow-up.

</details>

<a id="t21"></a>
<details>
<summary><b>T21</b> · get_user_fonts fallback</summary>

T06's comp without the missing font. Nothing forces the Python font-discovery fallback yet (follow-up).

| | |
|---|---|
| Project | `T21_get_user_fonts_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED` |
| Steps | `_1_T21_get_user_fo` |
| Outputs | `T21_ae<year>.mp4` |
| Layers | bundle, golden, settings, render, outputs |

> Partial: same comp as T06 without the missing font. Nothing forces the get_user_fonts fallback yet (follow-up).

</details>

<a id="t22"></a>
<details>
<summary><b>T22</b> · Frame numbers</summary>

Start frame 1001 with an offset work area, a work area starting at 5, and 23.976 fps. Bundle frames, farm task frames and a pixel-encoded frame number are checked against what AE shows. Fixed in #358.

| | |
|---|---|
| Project | `T22_frame_numbers_ae<year>_v1.0.0.aep` |
| Settings | `framesPerTask: 7` |
| Expects | terminal state `SUCCEEDED`<br>frames as AE shows them: `1010-1033`, `5-16`, `0-23`<br>each sampled frame carries its own frame number<br>`ChunkSize` declared and referenced by the task range |
| Steps | `_1_T22_start_1001`<br>`_2_T22_work_area_o`<br>`_3_T22_fps_23976` |
| Outputs | `T22_1_ae<year>_[#####].tif`<br>`T22_2_ae<year>_[#####].tif`<br>`T22_3_ae<year>_[#####].tif` |
| Layers | bundle, golden, settings, render, outputs |

> Frame numbers as AE shows them: a comp starting at 1001 with an offset work area, a work area starting at 5, and 23.976 fps. The bundle's frame ranges, the farm's task frames, and the number encoded in each sampled output frame must all match expect_frames.

</details>

<a id="t23"></a>
<details>
<summary><b>T23</b> · Output names · ⚠️ known defect · bundle only</summary>

A [####]-padded sequence. The bundle must name the files AE would write.

| | |
|---|---|
| Project | `T23_output_names_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | terminal state `SUCCEEDED`<br>`ChunkSize` declared and referenced by the task range |
| Steps | `_1_T23_padding_4` |
| Outputs | `T23_padding_ae<year>_%5B####%5D.tif` |
| Layers | bundle, golden, settings |
| Known defect | Output names are URI-encoded: [####] becomes %5B####%5D (KNOWN_ISSUES #8). |

> A sequence with four-digit padding ([####]). The bundle must name the files AE would write. Bundle only. Known defect (KNOWN_ISSUES.md #8).

</details>

<a id="t24"></a>
<details>
<summary><b>T24</b> · Output name with braces · ⚠️ known defect · bundle only</summary>

'{{' in an output name must be refused, after the bundle was started: the drive must report the partial bundle.

| | |
|---|---|
| Project | `T24_output_braces_ae<year>_v1.0.0.aep` |
| Settings | none (the submitter's defaults must hold) |
| Expects | refused, with an alert containing `contains "{{" or "}}"`; the drive reports the partial bundle |
| Steps |  |
| Outputs |  |
| Layers | bundle |
| Known defect | The '{{' check never fires: it sees the encoded %7B%7B, so no refusal (KNOWN_ISSUES #8). |

> '{{' in an output name must be refused, after the submitter has started writing the bundle, so the drive must report the partial bundle as a failure. Known defect: the check never fires (KNOWN_ISSUES.md #8).

</details>
