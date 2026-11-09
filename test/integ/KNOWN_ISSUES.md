# Known issues and harness constraints

Findings from driving the real submitter and rendering on Windows workers. Numbers are
referenced from code and case notes.

## 1. The submitter's temp folder is shared across drives

The submitter rewrites its temp folder (bundle and `tempFonts/`) on every drive. That
is `Folder.temp` when writable (`%TEMP%` on Windows), else a fallback such as
`~/.deadline/DeadlineCloudAETemp/` on macOS. The drive reports which one it used. pytest runs every bundle test before any render test, so the harness
submits each case during its own drive (`conftest.py::case_run`). Tests that read a
bundle later read the per-case copies under `build/integ-artifacts/<case>/`.

## 2. A macOS `.ttc` font fails on Windows workers

`gdi32.AddFontResourceW` rejects macOS's `AmericanTypewriter.ttc`, and the worker's
"Install Fonts to Worker" environment fails the whole job when any one font fails to
load. The projects use no `.ttc` font.

## 3. T10: one comp's worker session hangs after aerender exits

The `ñ`-named comp renders and `aerender` returns 0, but the session never ends, so the
task runs until its timeout. The ASCII-punctuation comp in the same job finishes. Not
yet reproduced outside this case, so T10 is bundle-only.

## 4. `framesPerTask` applies to image sequences only

The submitter declares `ChunkSize` only when the selection has an image-sequence output.
For video it is inert. `test_job_settings` fails a case that sets `framesPerTask`
without producing `ChunkSize`.

## 5. Output-module formats are limited to AE's templates

An output module's `Format` is read-only from script, so only AE's built-in templates
are reachable. AE ships no JPEG Sequence, PNG Sequence or MP3 template, so image
sequences are TIFF and audio is AIFF. The builder fails if a template is missing or
yields the wrong format.

## 6. Re-saving a project can damage it

A project re-saved after AE relinked a missing font failed to load on the worker
("missing data in file"). Drives open a copy under `build/integ/assets/`, and projects
are only written by the builder (`aep_test_assets/scripts/run_build.py`), which fails if
a font it names is missing.

## 7. Fixed: the submitter floored a fractional frame start (T22)

The submitter computed a queue item's first frame as
`Math.floor((comp.displayStartTime + timeSpanStart) * frameRate)`. For a comp starting at
frame 1001 with its work area at 1010, that product is 1009.999…, so the job rendered
1009–1032 instead of 1010–1033. Fixed in #358, which snaps values within float error of
a whole frame. T22 now passes.

## 8. The submitter uses the URI-encoded output file name (T23, T24)

The submitter reads an output module's file name from ExtendScript's `File.name`, which
is URI-encoded. It decodes only `%20` and `%5B#####%5D`. So `[####]` padding reaches the
job as `%5B####%5D` (T23), and `{{` as `%7B%7B`. The submitter's own check that rejects
`{{` in an output name therefore never fires (T24). Both are registered in
`harness/known_defects.py`.

T24 also covers the partial bundle: the submitter refuses `{{` after it has started
writing the bundle, and the drive must report that as a failure. Once #8 is fixed,
T24 exercises it. Setting an output module's file to `null` from script blocks AE with
a dialog, so there is no other scripted reproduction.
