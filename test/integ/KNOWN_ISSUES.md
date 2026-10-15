# Known issues and harness constraints

Findings from driving the real submitter and rendering on Windows workers. Numbers are
referenced from code and case notes.

## 1. The submitter's temp folder is shared across drives

The submitter rewrites `~/.deadline/DeadlineCloudAETemp/` (bundle and `tempFonts/`) on
every drive. pytest runs every bundle test before any render test, so the harness
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

## 7. The submitter floors a fractional frame start (T22)

The submitter computes a queue item's first frame as
`Math.floor((comp.displayStartTime + timeSpanStart) * frameRate)`. For a comp starting at
frame 1001 with its work area at 1010, that product is 1009.999…, so the job renders
1009–1032 instead of 1010–1033. T22 is registered in `cases.KNOWN_DEFECTS`.

## 8. The submitter uses the URI-encoded output file name (T23)

The submitter reads an output module's file name from ExtendScript's `File.name`, which
is URI-encoded. It decodes only `%20` and `%5B#####%5D`. So `[####]` padding reaches the
job as `%5B####%5D`, and `{{` as `%7B%7B`. The submitter's own check that rejects `{{`
in an output name therefore never fires. T23 is registered in `cases.KNOWN_DEFECTS`.

The same encoding means a partial bundle (the submitter stopping after it started
writing the bundle) has no scriptable reproduction: the `{{` check cannot fire, and
setting an output module's file to `null` from script blocks AE with a dialog. The
driver still fails a drive whose bundle lacks any of its three files.
