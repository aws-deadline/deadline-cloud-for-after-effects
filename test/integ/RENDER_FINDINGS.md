# Integration render findings

Findings from driving the real After Effects submitter headlessly (macOS host with an
AE license) and rendering the produced bundles on the service-managed Windows fleet.

## 1. Harness bug (fixed) — stale shared bundle on every render

**Symptom:** all `--render` cases failed identically, every job running the *last*
generated case's steps.

**Cause:** the submitter overwrites the shared temp dir
(`~/.deadline/DeadlineCloudAETemp/` — bundle *and* `tempFonts/`) on every AE drive.
pytest runs all `test_bundle_generation` before any `test_render`, so deferring the
farm submit uploaded whichever case was generated last for every render.

**Fix:** submit each case's bundle during its own per-case drive (interleaved), while
that case's bundle+fonts are still the ones on disk. See `conftest.py::case_run` and its
module docstring. Verified: jobs now carry each case's own steps.

## 2. First-case cold-start timeout (fixed)

**Symptom:** the first case's bundle generation hit its per-drive timeout with the driver
JSX never firing, while every later case drove in ~15s.

**Cause:** a cold AE launch (from a fully quit app) takes minutes to reach the point where
Startup scripts execute — it must finish the licensing handshake and clear a startup
dialog first. The first case's per-drive timeout was racing that one-time cold init.

**Fix:** `driver.warmup()` (session-autouse `_ae_warmup` fixture) primes AE once, untimed,
before any case is measured: stage a project-less config so the Startup JSX reaches its
"started" breadcrumb then bails, dismiss the startup dialog on a loop, wait for the
breadcrumb, then quit. The first real drive then starts warm.

## 3. Genuine test-data defect — macOS-only font fails on the Windows fleet (FIXED)

**Symptom (after fixes 1–2):** T06 (`video_custom_fonts`) and T21 (`get_user_fonts`)
originally failed their render. The job aborted in the "Install Fonts to Worker"
environment, before the render task ran.

**Confirmed worker traceback (CloudWatch, both sessions, identical):**

```
OSError: AddFontResource failed to load "...\tempFonts\AmericanTypewriter.ttc"
  font_manager.py:142  raise WindowsError('AddFontResource failed to load ...')
  font_manager.py:217  raise RuntimeError("Error installing font: ...")
Process exited with code: 1
--------- Exiting Environment: Install Fonts to Worker
```

**Cause:** these two projects use *American Typewriter*, a macOS-only TrueType Collection
(`/System/Library/Fonts/Supplemental/AmericanTypewriter.ttc`). The harness drives the real
submitter on the Mac, so the submitter collects that font into `tempFonts/` and uploads it.
On the Windows fleet, `gdi32.AddFontResourceW` rejects that particular Apple `.ttc`.

**Scope:** exactly the two cases that reference it. All other bundled fonts load on Windows,
including T06's deliberately-named `NotInstalledFont-Regular.otf`. So it is specifically the
macOS system `.ttc` that breaks — not a submitter or harness defect.

**Fix applied:** the T06/T21 `.aep` projects were re-authored in AE to swap every
*American Typewriter* text layer to `Komet-Regular` — a font already proven to load via
`AddFontResourceW` on the Windows fleet (it ships in the same bundles). Both static and
keyframed Source Text layers were converted and the projects saved in place. A verify
pass reopening both files confirmed **0** American Typewriter layers remain. The asset
builder now drops the `.ttc` row too, and T06/T21 were rebuilt from it on 2026-10-06.

**Verified end-to-end:** re-running `pytest --render -k "T06 or T21"` after the swap,
both cases now pass. The farm jobs cleared the "Install Fonts to Worker" environment and
rendered to completion:

| Case | Job | Farm result |
|---|---|---|
| T06 video_custom_fonts | job-cfd7fe17ca264575bf1d774cc5b193cd | SUCCEEDED (1 task, 0 failed) |
| T21 get_user_fonts     | job-e557915c48f54162b82e6c1bd1073f7d | SUCCEEDED (1 task, 0 failed) |

With this, every `--render` case succeeds on the farm.

## 4. Full `--render` suite result (16 cases, one 48-min run)

`pytest --render` reported **19 passed, 9 failed, 4 skipped**, but the raw scorecard was
misleading. Querying the farm directly (`aws deadline get-job ... taskRunStatusCounts`) for
each "failed" case showed **7 of the 9 actually SUCCEEDED** — see finding 5. The only
genuine render failures were the two font cases:

| Case | Harness reported | True farm status | Verdict |
|---|---|---|---|
| T10 special_characters   | TIMEOUT | SUCCEEDED | false alarm |
| T11 multi_frame          | TIMEOUT | SUCCEEDED | false alarm |
| T15 conda_version        | TIMEOUT | SUCCEEDED | false alarm |
| T17 multicomp            | TIMEOUT | SUCCEEDED ×3 | false alarm |
| T18 sticky_settings      | TIMEOUT | SUCCEEDED ×3 | false alarm |
| T19 image_sequence       | TIMEOUT | SUCCEEDED ×2 | false alarm |
| T20 missing_dependencies | TIMEOUT | SUCCEEDED | false alarm |
| **T06 video_custom_fonts** | fail | **FAILED ×1** → now SUCCEEDED | genuine, since fixed (finding 3) |
| **T21 get_user_fonts**     | fail | **FAILED ×1** → now SUCCEEDED | genuine, since fixed (finding 3) |

At the time of that run every render succeeded on the farm except T06/T21 (the
`AmericanTypewriter.ttc` defect). After the finding-3 font fix, T06/T21 also render
successfully, so all `--render` cases now pass. The harness fixes in findings 1–2 are
confirmed: no case failed for stale-bundle or cold-start.

## 5. Harness false-negative — poll outlives the credentials

**Symptom:** in a long full-suite run, later cases were recorded `TIMEOUT` despite their farm
jobs succeeding.

**Cause:** Deadline Cloud Monitor credentials have a ~1-hour
lifetime. A 48-min suite with up to 1800s-per-job polling can outlive them mid-run; once
expired, `deadline wait` throws `CredentialRetrievalError` and the harness treats the failed
poll as a job `TIMEOUT` — a false negative.

**Fixed.** `deadline_client.wait` classifies a non-zero exit that printed no job JSON and
carries a credential/network marker as `POLL_ERROR`, and the render layer then believes
`taskRunStatusCounts` over the local poll. Under `--strict-environment` a farm that cannot
be read at all fails rather than skips.

## 6. Product-robustness observation (out of scope)

`font_manager.py::_install_fonts` (lines 216-217) raises and hard-fails the **entire job** if
*any single* font can't be loaded. A customer submitting from a Mac with a Mac system font
would hit the same wall a render would. This is shipped behavior — flagged here, not changed.
A softer policy (log + skip the un-loadable font, still render) would be more forgiving, but
that is a product decision.

## 7. T10 special-characters — one comp's session hangs *after* a clean render

**Symptom:** T10 (`special_characters`) shows a task "running" on the Deadline Cloud Monitor
console for 90+ minutes. It is not rendering — it is wedged in post-render teardown.

**Evidence (CloudWatch, job-ba976e6f8a4b4deeb3d0369173e00454):** the job has two steps, one
per comp, and only one hangs:

| Step | Comp | Session | Result |
|---|---|---|---|
| `_2_T10_comp_eq_plu` | `=eq+plus-dash` (ASCII punctuation) | — | SUCCEEDED, fast |
| `_1_T10_comp___name` | `ñ` name (non-ASCII → sanitised to `_`) | session-bb36dc44… | RUNNING, hung 1h41m+ |

The hung session's log runs clean right up to the render and then goes silent:

```
22:51:06  Install Fonts to Worker … OK
22:51:06  [DEBUG] Starting aerender process … -rqindex 1 -s 0 -e 119 … -output "…\T10_1_ae2026.mp4"
22:51:11  [DEBUG] Process finished with return code: 0
          (no further events for 1h41m+)
```

`aerender.exe` returned **0** in ~5s, but — unlike every prior phase — there is **no matching
`Process pid NNNN exited with code: 0`** line afterward. So aerender returned while the task
runner that wrapped it never exited: the render completed, the *session* did not end.

**Likely cause:** a lingering child process. `aerender.exe` spawns an `AfterFX.exe` render
engine; the parent returns 0 but the engine stays alive (typically stuck on a modal it can't
surface headlessly), and the Deadline session action blocks waiting for the whole process tree
to drain. It never does, so the task idles until its run-timeout fires. Note the final *output*
path is pure ASCII (`T10_1_ae2026.mp4`) — this is not an output-path encoding problem; it is
specific to that comp opening/rendering in the headless engine. The ASCII-punctuation comp in
the same job renders fine.

**Impact on the harness:** every T10 render burns the full `job_wait_timeout` (1800s) and then
records TIMEOUT — a real hang, distinct from the finding-5 credential false-negative. It is
also why T10 "takes so long every time."

**Not yet resolved (needs a worker-side repro).** Two paths, neither applied here:
- If it's a test-data quirk (like the finding-3 font swap), re-author the `ñ` comp to confirm
  whether the character in the *comp name* is what wedges the engine, and fix the asset.
- If a clean-named comp reproduces it, this is a genuine product finding — a headless render
  engine that hangs post-`aerender` rather than exiting — and should be filed as such.

## 8. Harness bug (fixed) — `apply_job_metadata` clobbered every case's own task timeout

Found while building the `test_job_settings` layer, by comparing each case's step timeouts
against its `render` flag. Every `render: true` case showed `onRun.timeout == 3600`, while
`render: false` cases showed either the submitter's 172800s default or their own configured
value. The cause: `apply_job_metadata` stamped the harness's blanket `JOB_TASK_TIMEOUT_S`
(3600) into *every* submitted bundle unconditionally, overwriting whatever the submitter had
composed from the case's `taskRunTimeout*` settings.

**Why it mattered more than it looks.** T12 exists to prove a 1-minute task timeout makes a
job fail. It was parked at `render: false`, so the clobbering was dormant — but flipping it to
`render: true` without noticing this would have rewritten its 60s to 3600s, the heavy comp
would have finished well inside the hour, and the case would have reported a confident green
while testing the exact opposite of its intent.

**Fix.** The patch is now conditional on `bundle.specifies_task_timeout(case.settings)`: a case
that pins any `taskRunTimeout*` component keeps its own value, and only cases that pin none get
the blanket bound. The bundle is also archived twice per case — `bundle-as-built` (pre-patch,
what the settings layer asserts) and `bundle` (as submitted) — so this class of bug is visible
by diffing two directories instead of being invisible by construction.

**Validated live:** `job-3d05386efe314995b4ad6c2268f6d299` ended `FAILED` with one failed task,
490s elapsed, carrying `timeout: 60` all the way to the farm.

## 9. Test-data defect — no case exercises image-sequence chunking

T08 is named "image chunking, 300 frames" and sets `framesPerTask: 100`, but its comp's output
module is video (`T08_ae2025.mp4`). The submitter applies frames-per-task to image sequences
only — its own UI says "img seq only ... Has no effect on video output" — and emits no
`ChunkSize` job parameter at all for a video output. The setting is inert, and the case has
never tested chunking.

Checked across all 15 bundle-producing cases: **none** emits a `ChunkSize`. Frame chunking,
one of the submitter's more consequential features, has zero coverage in this suite.

**Status: fixed 2026-10-01.** T08's comp now renders a TIFF sequence, the submitter emits
`ChunkSize: 100`, and the step's task range is `{{Param._1_T08_image_chunk_Frames}}:{{Param.ChunkSize}}`
— 300 frames in 3 tasks. The strict xfail did exactly what it was registered to do: the case
XPASSed, the suite went red, and `cases.SETTINGS_XFAIL` is now empty.

Two corrections to the diagnosis above, both found while fixing it:

* The cause was **not** specific to T08's asset. It was a shared defect in the asset
  builder affecting three cases — see finding 11. T08 was simply the only one whose
  breakage a test could see, because it was the only one whose *settings* depended on the
  output module.
* The settings layer originally asserted only `ChunkSize`'s declaration and value. That is
  insufficient: a submitter could declare the parameter and omit it from the step's range,
  rendering the whole range in one task while still passing. `Bundle.step_task_ranges()` and
  a second assertion now cover the range itself.

## 10. Test-data defect (fixed) — T11 asserted the submitter's own default

T11 ("multi-frame rendering") set `maxCpuUsagePercentage: 90`, which *is* the submitter's
default (`Utils.jsx`). A submitter that ignored the setting entirely would produce an identical
bundle, so the case could not distinguish "applied" from "dropped on the floor". Changed to
`50`. Worth generalising: a settings-driven case is only meaningful if its value differs from
the default it is testing against.

## 11. Test-data defect (fixed) — three cases silently rendered H.264 instead of their intended format

Every one of the suite's 20 render steps produced an `.mp4`, including the three whose
filenames claimed otherwise:

| case | filename said | actually rendered |
|---|---|---|
| T07 audio render | `T07_ae2025.mp3` | H.264 video |
| T08 image chunking | `T08_ae2025_[#####].jpg` | H.264 video (single file) |
| T19 emit half | `T19_emit_ae2025_[#####].png` | H.264 video (single file) |

**Cause.** `aep_test_assets/scripts/build_test_projects.jsx` selected an output-module
template by *keyword substring*, and when no template matched it kept the render queue's
default — H.264 — while still applying the caller's intended filename:

```jsx
for (var i = 0; i < tpls.length; i++) {
    if (tpls[i].toLowerCase().indexOf(keyword) >= 0) { om.applyTemplate(tpls[i]); break; }
}   // no match -> `applied = "(default)"`, H.264 retained, .mp3/.jpg/.png filename kept
```

The keyword could never match for these three, because **AE ships no JPEG Sequence, PNG
Sequence or MP3 output-module template**. The original build log records it plainly —
`template=(default)  out=T07_ae2025.mp3` — but nothing read that log and nothing asserted
the format, so the assets looked right by filename and tested the wrong thing for both
AE versions.

**Why the obvious fix doesn't work.** `OutputModule.setSettings()` (AE 17.0+) looks like it
should set the format directly. It cannot: probed on AE 2025 (25.6.6x4), every attempt
returns

```
After Effects error: Invalid Value for key: <Format>.  Property is read-only
```

and `getSettings(GetSettingsFormat.STRING_SETTABLE)` confirms `Format` is absent from the
settable key set (settable: Audio Bit Depth, Audio Channels, Audio Sample Rate, Crop,
Include Project Link, Include Source XMP Metadata, Output Audio, Output File Info,
Post-Render Action, Resize, Video Output). **`applyTemplate` is the only lever**, so the
reachable formats are exactly what AE ships. The 12 non-hidden templates on AE 2025 map to:

| template | format | file |
|---|---|---|
| AIFF 48kHz | AIFF | `.aif` (video off, audio on) |
| Alpha Only, Lossless, Lossless with Alpha | AVI | `.avi` |
| H.264 - Match Render Settings - 5/15/40 Mbps | H.264 | `.mp4` |
| High Quality, High Quality with Alpha | QuickTime | `.mov` |
| Multi-Machine Sequence, Photoshop | Photoshop Sequence | `_[#####].psd` |
| TIFF Sequence with Alpha | TIFF Sequence | `_[#####].tif` |

**Fix.** Named output-module specs (`OM_H264` / `OM_SEQUENCE` / `OM_AUDIO`) replace keyword
matching, and `queueRender` now **throws** if no candidate template exists or if the applied
template did not yield the expected format. A silent fallback is the whole defect, so it is
now a hard build failure recorded in the per-version build log. Image sequences are TIFF and
audio is AIFF — not the JPEG/PNG/MP3 the coverage matrix names, but the same code paths, and
TIFF is strictly better for the output-diffing work ahead: lossless and one file per frame.

**Also fixed while here.** Two things that only showed up once the builder was run
headlessly rather than by hand from AE's Scripts menu:

* `buildChunking` set an expression on the frame-counter's Source Text and *then* read
  `.value` back off it to apply styling. Reading a property that carries an expression
  evaluates that expression, and `timeToFrames()` needs a time context, so with no comp
  open in a viewer AE raises `internal verification failure, sorry! {no current context}`
  and the whole project build fails. It worked interactively only because a viewer left
  open by the previous comp happened to supply a context. Styling now precedes the
  expression.
* The builder was only ever runnable by hand, which is why a regeneration never happened.
  `aep_test_assets/scripts/run_build.py` now drives it headlessly the same way the harness
  drives the submitter, it hands the asset root and the ids to build to the JSX through
  a config file in the temp dir (macOS launches AE with `open -a`, which drops the
  environment), and `run_build.py T07 T08` restricts a run to the ids that changed — AE rewrites every `.aep` it saves, so a full rebuild would
  produce a 16-file diff for a 3-file fix.

**Scope.** Both `ae2025` and `ae2026` projects were regenerated and validated — the three
templates the specs name (`AIFF 48kHz`, `TIFF Sequence with Alpha`, `H.264 - Match Render
Settings - 15 Mbps`) exist under both AE 25.6.6x4 and AE 26.3x87, so the specs are
version-portable. The offline suite passed under either (30 passed / 18 skipped with the
three layers of the time), and T08's
bundle carries `ChunkSize: 100` with the chunked task range in both.

An earlier draft of this finding claimed AE 2026 could not be driven on this host because of
the Win 11 23H2 compatibility modal. That was wrong: the modal appears on a fresh profile,
and `ae_launcher` already preserves `SCRPriorState.json` on Windows so it stays
acknowledged. 2025 is the *chosen* default here, not the only possible one.

## 12. Test-data defect (fixed) — T12's heavy comp rendered inside its timeout

T12 expects FAILED from a 1-minute task timeout. A fast worker rendered the 20s comp in 59s,
so the job SUCCEEDED. The comp is now 120s. Validated: `job-e4292d53…` → FAILED.

## 13. Test-data defect (fixed) — T21's project failed to load on the worker

T21's `.aep` failed in the worker's aerender at load: `After Effects error: missing data
in file`. The driver re-saves a project that opens dirty, and that re-save was ~35 KB
smaller than the committed file. The committed file rendered fine locally, and the same
bundle with it SUCCEEDED on the farm, so the re-save was producing a damaged project.

Fixed by rebuilding T06 and T21 from the asset builder, which also dropped the
`AmericanTypewriter.ttc` row (finding 3) — the host had no `.ttc`, so the open relinked
fonts and dirtied the project. The builder now fails outright if a font it names is
missing, instead of letting AE substitute one silently.
