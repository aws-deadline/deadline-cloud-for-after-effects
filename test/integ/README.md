# After Effects submitter — integration tests

These tests exercise the **real** Deadline Cloud for After Effects submitter against a
real After Effects install, and (optionally) a real Deadline Cloud farm. They are the
regression net for "did a submitter change break bundle generation or the end‑to‑end
render?".

Nothing here reimplements the submitter. The harness *re-drives* the installed
`DeadlineCloudSubmitter*.jsx` headlessly and asserts on what it produces.

## Layers

Five tests per case. One cached AE drive (~1 min) feeds all of them.

| Test | Proves | Runs |
|---|---|---|
| `test_bundle_generation` | Submitter builds a well-formed OpenJD bundle; `openjd check` passes. | always |
| `test_bundle_matches_golden` | Bundle matches the committed golden, after normalization. | always |
| `test_job_settings` | Case `settings` reach the bundle; unset ones give defaults. | always |
| `test_render` | Job reaches the expected terminal state. | `--render` |
| `test_render_outputs` | Job wrote every expected file; sampled frames decode. | `--render` |

## How it works

1. `driver.install_driver()` copies `scripts/DeadlineCloudAutoSubmit.jsx` into AE's
   `Scripts/Startup`.
2. `driver.run_submitter()` writes `~/.deadline/headless_submit_config.json` and
   launches AE. The JSX runs the real submitter (UI stripped), writes a result JSON,
   and renames the config to `*.done`.
3. The driver polls for `*.done`, then stops AE.
4. With `--render`, the bundle is patched (description, task timeout, output dir) and
   submitted during the same drive. `test_render` polls it.
5. `test_render_outputs` lists the job's outputs (no download) and checks every
   expected file exists. It downloads only chunk-boundary frames and decodes them.

## Prerequisites

- After Effects 2025 or 2026, signed in to Creative Cloud.
- Fonts **Amazon Ember** (`AmazonEmber-Regular`) and **Komet** (`Komet-Regular`)
  installed. The projects use them, and the submitter's "Missing fonts" warning fails
  the bundle layer for every case that does not expect it.
- In AE: *Preferences (macOS: Settings) > Scripting & Expressions > Allow Scripts to Write Files and
  Access Network* on. The driver writes its result file.
- The submitter installed in AE's **user** ScriptUI Panels folder. The harness looks
  only there:
  - macOS: `~/Library/Preferences/Adobe/After Effects/<ver>/Scripts/ScriptUI Panels/`
  - Windows: `%APPDATA%\Adobe\After Effects\<ver>\Scripts\ScriptUI Panels\`
- [hatch](https://hatch.pypa.io/).
- Render layers only: `deadline` CLI with a default farm and queue
  (`deadline config show`), and valid credentials (log in through Deadline Cloud
  monitor). The queue needs job attachments.

The harness tests whichever submitter is installed, not your branch. To test branch
code, copy `dist/DeadlineCloudSubmitter.jsx` and `dist/DeadlineCloudSubmitter_Assets/`
into that folder (see `DEVELOPMENT.md` to rebuild `dist/`).

## Running

```bash
# Offline: bundle generation + job settings. No farm.
hatch run integ:test

# Everything: also submit, poll, and check outputs.
hatch run integ:test-render

# One AE year.
AE_VERSION=2025 hatch run integ:test

# Some cases. Keep the path; it loads the conftest.
hatch run integ:test-render test/integ -k "T08 or T19"
```

The `integ` env installs `requirements-testing.txt` and `requirements-integ.txt`.
Only one AE year runs per invocation. Run both when changing assets.

Results: pytest output, plus JUnit XML at `build/integ/results.xml`.

A run resaves `.aep` files that open with unsaved changes. Revert before committing:
`git checkout -- test/integ/aep_test_assets/projects/`.

### Options

| Var / flag | Default | Meaning |
|---|---|---|
| `AE_VERSION` / `--ae-version` | `2026` | AE year to drive. |
| `AE_EXECUTABLE` | from year | AE executable path. |
| `AE_TEST_ASSETS` | `test/integ/aep_test_assets` | Asset root (`projects/ae<year>/`). |
| `DEADLINE_CLI` | `deadline` | Deadline CLI. |
| `--render` / `AE_RUN_RENDER=1` | off | Enable the render layers. |
| `--keep-outputs` | off | Keep downloaded frames for passing cases too. |
| `AE_UPDATE_GOLDENS=1` | off | Rewrite each case's golden bundle from this run, then compare. |
| `--strict-environment` / `AE_STRICT_ENVIRONMENT=1` | off | Fail, not skip, on missing AE/submitter/assets or an unreachable farm. Use in CI. |
| `AE_JOB_WAIT_TIMEOUT` | `600` | Per-job poll budget (s), same for every case. |
| `AE_JOB_TASK_TIMEOUT` | `3600` | Task timeout stamped on cases that set none (s). |
| `AE_JOB_MAX_RETRIES` | `3` | Retries per task. |
| `AE_PROCESS_NAME` | from platform | AE process name to wait for and stop. |
| `AE_BUILD_TIMEOUT` | `900` | `run_build.py` launch budget (s). |

The render layers use the default farm/queue from `deadline config`.

### Output checking

- Output goes to `build/integ-artifacts/<case>/output/`, not the asset tree.
- Completeness: every expected filename must be in the job's output manifest. No bytes move.
- Content: only frames at chunk seams and range ends are downloaded. T08 (300 frames,
  chunk 100) fetches `0, 99, 100, 199, 200, 299`.
- Sampled frames must decode, must not be flat, and must differ from each other.
- Video and audio are checked for presence and size only. No ffmpeg is required.
- Passing cases' `output/` is deleted at session end. Failing cases keep it.

## Adding a test case

A case is just a directory — no Python change needed.

```
test/integ/test_cases/<Txx>_<slug>/
├── case.json
└── expected/job_bundle/         # golden: template, parameter_values, asset_references
```

`case.json`:

```json
{
  "id": "T05",
  "name": "Basic submit (single comp, default settings)",
  "aep_slug": "submit_dockable",
  "settings": {},
  "expect": "SUCCEEDED",
  "render": true,
  "ae_run_timeout": 300
}
```

- `id` + `aep_slug` resolve the project file at
  `projects/ae<year>/<id>_<aep_slug>_ae<year>_v<asset_version>.aep`.
- `settings` are passed straight to the driver JSX (e.g. `multiFrameRendering`,
  `maxCpuUsagePercentage`, `framesPerTask`, `ignoreMissingDependencies`).
- `expect` is the terminal job status the render layer asserts (`SUCCEEDED`, `FAILED`, …)
  — use it for negative cases.
- `expect_failure_message` (optional): text a failed task's message must contain, so a
  negative case fails for the right reason. T12 uses `"TIMEOUT"`.
- `max_retries` (optional, default `AE_JOB_MAX_RETRIES`): farm retries per task. Use
  `0` for expected failures.
- `ae_run_timeout` (optional, default 300): per-drive budget in seconds.
- `expect_alerts` (optional): substrings of submitter warnings the case expects. Any
  other warning fails `test_bundle_generation`. T06 expects `"Missing fonts"`.
- Set `"render": false` for cases that should only ever build a bundle (never render).

### Golden bundles

Each case commits the bundle the submitter is expected to build. Paths and versions
are stored as placeholders (`<ASSETS>`, `<TEMP>`, `<HOME>`, `ae<YEAR>`,
`aftereffects=<VER>`), so one golden serves every host and AE version. A version
that genuinely differs gets its own `expected/job_bundle-ae<YEAR>/`.

After an intended submitter change:

```bash
AE_UPDATE_GOLDENS=1 hatch run integ:test test/integ -k golden
git diff test/integ/test_cases    # review every change before committing
```

## Artifacts

Each case writes `build/integ-artifacts/<id>-<slug>/`:

| File | Written by |
|---|---|
| `result.json`, `submitter_run.json` | AE drive |
| `bundle-as-built/` | submitter, before harness patches |
| `bundle/` | as submitted |
| `submit.json`, `wait.json`, `job.json` | render layer |
| `outputs.json` | output layer (expected counts, sampled frames) |
| `output/` | downloaded frames (kept on failure) |

## Regenerating assets

```bash
hatch run integ:python test/integ/aep_test_assets/scripts/run_build.py T07 T08
```

Pass only changed ids. The builder fails if a font it names is missing, rather than
letting AE substitute one silently.

AE records the saving machine's name in each `.aep`, and these files are public. The
builder and every harness drive replace it with a placeholder
(`harness/aep.py`), and `test/unit/test_integ_asset_hygiene.py` fails if a committed
project still carries one.

## Skipped cases

T10 (special characters) is skipped: its render hangs on the worker after aerender
exits (`RENDER_FINDINGS.md` #7). T09, T13 and T16 build bundles only.

## Troubleshooting

**AE shows a "Crash Repair Options" dialog on launch and the run stalls.** This
happens after an unclean AE exit (the harness force-kills AE: `pkill -9` on macOS,
`taskkill /F /T` on Windows). AE draws the dialog *before* Startup scripts run, so the
driver JSX never executes. The harness prevents it: `ae_launcher.launch_ae()` sets
`AE.DebugShowPreviousCrashWarning=false` in `Debug Database.txt` and purges crash
markers (crashpad `SentryIO-db/*.run`, and `SCRPriorState.json` on macOS only — on
Windows it holds the System Compatibility Report acknowledgement) across **all**
`<major>.*` prefs/caches folders. If you see the dialog, don't pick **"Start in Safe
Mode"** — it loads AE without scripts.

**Drives hang with the screen locked.** AE needs an unlocked desktop session.

## CI

`.github/workflows/integration_tests.yml` runs on `mainline` pushes. The AE jobs need
self-hosted runners and are off until enabled with repository variables:

| Variable | Enables |
|---|---|
| `INTEG_MACOS_RUNNER=true` | macOS job (runner labels `self-hosted, macOS, after-effects`) |
| `INTEG_WINDOWS_RUNNER=true` | Windows job (runner labels `self-hosted, windows, after-effects`) |
| `AE_TEST_ASSETS` / `AE_TEST_ASSETS_WINDOWS` | optional asset root override |

Runners need AE signed in to Creative Cloud, the submitter installed, and secrets
`AWS_OIDC_ROLE_ARN` / `AWS_REGION`. macOS runners also need Accessibility permission
for System Events, granted once by hand.

## Platforms

macOS and Windows both run unattended. Findings from live runs are in
`RENDER_FINDINGS.md`.
