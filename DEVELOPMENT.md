
# Development documentation

This documentation provides guidance on developer workflows for working with the code in this repository.

Table of Contents:
* [Development Environment Setup](#development-environment-setup)
* [Submitter Development Workflow](#submitter-development-workflow)
    * [Running the Script](#running-the-script)
    * [Making Code Changes](#making-code-changes)

## AE Script Development Environment Setup
1. An install of a supported version of After Effects.
2. A valid AWS Account.
3. An AWS Deadline Cloud Farm to run jobs on.
4. Python3.9 or higher in order to use the python bundle script to build the final jsx script.


To develop the ExtendScript, the recommended development environment is VSCode with plugins `ExtendScript`, `ExtendScript Debugger`, and `ESLint`.

Add the following in VS Code's settings.json:

```json
    // ...
    "eslint.options": {
        "extensions": [
            ".jsx",
            ".js"
        ]
    },
    "eslint.validate": [
        "javascript",
        "javascriptreact",
        "jsx"
    ]
    // ...
```


Example `launch.json` configuration for attached debugger (for After Effects 25):

```json
{
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "extendscript-debug",
            "request": "attach",
            "name": "Attach to ExtendScript Engine",
            "hostAppSpecifier": "aftereffects-25.0"
        },
        {
            "type": "extendscript-debug",
            "request": "launch",
            "name": "Launch Script in ExtendScript Engine",
            "hostAppSpecifier": "aftereffects-25.0"
        }
    ]
}
```

You can develop on a macOS, or Windows workstation since After Effects is only available in these two operation systems.

### Submitter Development Workflow
The submitter script generates job bundles to submit to AWS Deadline Cloud. Developing a change
to the submitter involves iteratively changing the script code, then running the script within After Effects
to generate or submit a job bundle, inspecting the generated job bundle to ensure that it is as you expect,
and ultimately running that job to ensure that it works as desired.

#### Running the Script
You will need to load the script within After Effects. Copy `DeadlineCloudSubmitter.jsx` and the `DeadlineCloudSubmitter_Assets` folder in the `dist` folder to the **ScriptUI Panels** folder within your After Effects installation. This folder is typically located at the following path:

    - Windows: Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\Script UI Panels
    - macOS: Applications/Adobe After Effects <version>/Scripts/Script UI Panels
Restart After Effects if it was open.

You can use the "Export Bundle" option in the submitter to save the job bundle for a submission to your local disk (default path is `~/.deadline/history`)
to inspect it, or the "Submit" button (after selecting your Deadline Cloud Farm and Queue in the submitter UI) to
submit the job to your farm to run.

#### Making Code Changes
Once you make the change of the submitter, you can run

```python
python jsxbundler.py --source src/OpenAESubmitter.jsx --destination dist/DeadlineCloudSubmitter.jsx
```

under `deadline-cloud-for-after-effects` path to generate a new `DeadlineCloudSubmitter.jsx` file. Then replace the file in Script UI Panels of After Effects application with the new file. Same for files in the `DeadlineCloudSubmitter_Assets` folder.

Make sure to right click the new files in the dist folder in VSCode and do "Format Document" and save the changes.

Then reopen the submitter panel from the application to test your change.

## AE Installer Environment Setup

### Prerequisites
- Install the InstallBuilder application here: https://installbuilder.com/download-step-2, be sure to download the Multi-Platform version

Default MacOS InstallBuilder path: `"/Applications/InstallBuilder Enterprise <major>.<minor>.<patch>"`
Default Windows InstallBuilder path: `"C:\\Program Files\\InstallBuilder Enterprise <major>.<minor>.<patch>\\" `


### Build the installer

```bash
hatch run installer:build-installer --local-dev-build --platform <PLATFORM> [--install-builder-location <LOCATION> --output-dir <DIR>]
```
Use the default locations listed above under Preqrequisites as guidance. For Platform, your options are Windows or MacOS. For local dev, remove `--output-dir` and specify `--local-dev` flag instead.

Run `hatch run installer:build-installer -h` to see the full list of arguments.

...

### Testing

First, install the necessary dependencies by running:
```bash
hatch run sync
```

To run linting, run either of these commands
```bash
hatch run lint-check # Runs formatting without modifying code
hatch run lint # Runs formatting and modifies code
```

To run unit tests, run the following
```bash
hatch run test
```
Note: if you added new files and see the copyright headers test failing, run linting

To test the installer, there are user-level and system-level installer tests.

On Mac, run one of these commands to run a set of installer tests:
```bash
hatch run test-installer # Just user-level installer tests
sudo hatch run test-installer # Run user-level and system-level installer tests
```

On Windows, either run the following command in a regular Powershell window for user-level installer tests or in a "Run As Admin" Powershell window for system-level installer tests
```bash
hatch run test-installer
```