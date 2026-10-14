# After Effects submitter — integration tests

These tests drive the **real** Deadline Cloud for After Effects submitter in a real
After Effects, and optionally render the result on a real Deadline Cloud farm.

Nothing here reimplements the submitter. A Startup JSX re-drives the installed
`DeadlineCloudSubmitter*.jsx` headlessly, and pytest asserts on what it produces.

This first change carries one case (T17, three comps) to get the approach reviewed.
More cases and layers follow separately.

## Layers

One cached AE drive (~1 min) feeds both tests.

| Test | Proves | Runs |
|---|---|---|
| `test_bundle_generation` | The bundle passes `openjd check`; one step per comp; frame ranges match the comps; conda and asset references are right; no unexpected submitter warnings. | always |
| `test_render` | The job reaches the expected terminal state on the farm. | `--render` |

## How it works

1. `driver.install_driver()` copies `scripts/DeadlineCloudAutoSubmit.jsx` into AE's
   `Scripts/Startup`.
2. `driver.run_submitter()` writes `~/.deadline/headless_submit_config.json` and
   launches AE. The JSX opens the project, clears sticky submitter settings, runs the
   real submitter with its UI stubbed, and writes a result file plus a `.done` marker.
3. The harness waits for the marker, stops AE, and archives the bundle.
4. With `--render`, the bundle is patched (description, task timeout, output dir under
   `build/`) and submitted during the same drive. `test_render` polls the job.

The submitter UI is stubbed, so the Submit button, docking and dialogs are not tested.

## Prerequisites

- After Effects 2025 or 2026, signed in to Creative Cloud, with the **Amazon Ember**
  font installed (the test project uses it).
- In AE: *Preferences (macOS: Settings) > Scripting & Expressions > Allow Scripts to
  Write Files and Access Network* on.
- The submitter installed in AE's **user** ScriptUI Panels folder:
  - macOS: `~/Library/Preferences/Adobe/After Effects/<ver>/Scripts/ScriptUI Panels/`
  - Windows: `%APPDATA%\Adobe\After Effects\<ver>\Scripts\ScriptUI Panels\`

  The harness tests whichever submitter is installed. To test your branch, copy
  `dist/DeadlineCloudSubmitter.jsx` and `dist/DeadlineCloudSubmitter_Assets/` there.
- [hatch](https://hatch.pypa.io/).
- Render only: the `deadline` CLI with a default farm and queue (`deadline config show`)
  and valid credentials. The queue needs job attachments.
- An unlocked desktop session. AE can't finish a drive while the screen is locked.

### What a run changes on your machine

To launch AE unattended, the harness edits your **real** AE preferences before each
launch. Run it on a dedicated test machine, or save your work first:

- **Deletes** AE's `Adobe After Effects Auto-Save Recovery/` and `CrashRecovery/`
  folders, crash markers, and `*.aepcrash` files, so the crash-repair dialog can't
  block a launch. Unsaved recovery data is lost.
- Sets `AE.DebugShowPreviousCrashWarning` to `false` in `Debug Database.txt`.
- On macOS, clears AE's `AppStates` defaults.
- Turns off Adobe's in-app feedback survey for the AE version under test.
- Installs a Startup script while the suite runs, and removes it afterwards.

## Running

```bash
# Bundle only. No farm.
hatch run integ:test

# Bundle + render on the default farm.
hatch run integ:test-render

# Pick the AE year (default 2026).
AE_VERSION=2025 hatch run integ:test
```

Results: pytest output, plus JUnit XML at `build/integ/results.xml`. Each case writes
`build/integ-artifacts/<id>-<slug>/` with the bundle as built, the bundle as
submitted, and the submit/wait results.

A drive may re-save the `.aep`. Revert before committing:
`git checkout -- test/integ/aep_test_assets/projects/`.

### Options

| Var / flag | Default | Meaning |
|---|---|---|
| `AE_VERSION` / `--ae-version` | `2026` | AE year to drive. |
| `AE_EXECUTABLE` | from year | AE executable path. |
| `AE_TEST_ASSETS` | `test/integ/aep_test_assets` | Asset root (`projects/ae<year>/`). |
| `DEADLINE_CLI` | `deadline` | Deadline CLI. |
| `--render` / `AE_RUN_RENDER=1` | off | Enable the render layer. |
| `--strict-environment` / `AE_STRICT_ENVIRONMENT=1` | off | Fail, not skip, on missing AE/submitter/assets or an unreachable farm. |
| `AE_JOB_WAIT_TIMEOUT` | `1200` | Per-job poll budget (s). |
| `AE_JOB_SUBMIT_TIMEOUT` | `900` | Upper bound for `deadline bundle submit` (s). |
| `AE_JOB_TASK_TIMEOUT` | `3600` | Task timeout stamped on cases that set none (s). |
| `AE_JOB_MAX_RETRIES` | `3` | Retries per task. |

## Adding a case

A case is a directory with a `case.json`:

```json
{
  "id": "T17",
  "name": "Multi-comp submit",
  "aep_slug": "multicomp",
  "settings": {},
  "expect": "SUCCEEDED",
  "render": true
}
```

`id` + `aep_slug` resolve `aep_test_assets/projects/ae<year>/<id>_<slug>_ae<year>_v1.0.0.aep`.
`settings` are applied by the driver JSX. `expect` is the terminal job status to assert.
Optional: `expect_failure_message`, `expect_alerts`, `max_retries`, `ae_run_timeout`.

AE records the saving machine's name and home-directory paths (with the username) in
each `.aep`. The harness replaces both with placeholders after every drive, and
`test/unit/test_integ_asset_hygiene.py` fails if a committed project still carries
either.
