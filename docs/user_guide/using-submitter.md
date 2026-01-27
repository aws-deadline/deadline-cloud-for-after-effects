# Using the After Effects Submitter

To use the Deadline Cloud submitter for After Effects, please ensure your Farm is configured with an After Effects capable fleet (see [Setting up After Effects with your Deadline Cloud Farm](installation.md#setting-up-after-effects-with-your-deadline-cloud-farm)), and have the submitter installed. Also, please log into the Deadline Cloud Monitor or provide AWS credentials via a configuration profile for Deadline Cloud access.

Refer to the [installation.md](installation.md) to configure the fleet and After Effects application.

## Submit a job

**Note: Follow the instructions below that match the install type you selected during installation.**

### User Install - macOS

1. Launch Adobe After Effects.
2. Open the submitter by clicking **Window > DeadlineCloudSubmitter(User).jsx**.
3. Follow the steps in [Submitting Your Job](#submitting-your-job) below.

### User Install - Windows

1. Launch Adobe After Effects.
2. Open the submitter by clicking **File > Scripts > Run Script File** and navigate to where the `DeadlineCloudSubmitter.jsx` file is located and select it to run the submitter. If you recently closed the submitter, you can reopen it by clicking **File > Scripts > Recent Script Files** and pick the `DeadlineCloudSubmitter.jsx` file that was previously run.
3. Follow the steps in [Submitting Your Job](#submitting-your-job) below.

### System Install

1. Launch After Effects as Admin (Windows) or with appropriate permissions (macOS).
2. Open the submitter by clicking **Window > DeadlineCloudSubmitter.jsx**.
3. Follow the steps in [Submitting Your Job](#submitting-your-job) below.

### Submitting Your Job

1. Click "Open Render Queue" on the submitter. Add any composition to your render queue and set up your render settings, output module, and output path.
2. Click **Refresh** on the submitter to see your composition in the composition list.
3. Select your composition you want to render and click **Submit** to submit a render job. For details on available settings, see [After Effects Specific Settings](#after-effects-specific-settings) below.
4. If you see a warning popup window with "You are about to run the script contained in file", you can suppress the warning by following the instruction in the popup or the instructions in [installation.md](installation.md) to disable warnings when submitting jobs.
5. Install any python libraries if prompted and press the **Login** button in the bottom left if you are not logged in.
6. Set the farm and queue you are submitting to with the **Settings** button, and click **Submit**.

**Note**: The After Effects submitter calls the Deadline GUI Submitter to complete job submission. If you hit any issues on the GUI submitter, please refer to [deadline-cloud](https://github.com/aws-deadline/deadline-cloud) library for help.

### Shared Job Settings

Settings that apply to the entire job:

- **Farm Selection** - Choose which farm your job will render on
- **Queue Selection** - Select the specific queue within your chosen farm
- **Job Name** - Give your render job a descriptive name
- **Job Description** - Add optional details about your render job
- **Priority** - Set job priority for queue management
- **Initial State** - Control whether the job starts immediately or remains paused
- **Max Failed Tasks Count** - Maximum number of tasks that can fail before the job is marked as failed
- **Max Retries Per Task** - Number of times a failed task will be retried
- **Max Worker Count** - Maximum number of workers that can work on this job simultaneously

### After Effects Specific Settings

Settings specific to After Effects rendering:

- **Composition Selection** - Select which composition from your render queue to submit
- **Frames Per Task** - (For image sequences) Specify how many frames each task should render. By default, Deadline Cloud creates one task for every frame. Increasing this value can speed up rendering in jobs where each frame renders quickly.
- **Multi-Frame Rendering** - Enable After Effects multi-frame rendering. You can also specify the max percentage of CPU usage to allocate towards rendering. For more information, visit [Adobe's multi-frame rendering documentation](https://helpx.adobe.com/after-effects/using/multi-frame-rendering.html).
- **Timeout** - (Optional) Configure timeout settings (days, hours, and minutes) to handle unexpected cases where a task may become unresponsive. The default timeout is 2 days.
- **Output Type** - Automatically detected based on your render queue settings (image sequence or video)
- **Output Path** - Directory where rendered files will be saved (from your render queue settings)

For information about the other submitter tabs, see the [AWS Deadline Cloud guide for using a submitter](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/jobs-using-submitter.html).

### Font Attachment System

Fonts used in the submitted composition are detected by the submitter and are automatically added as job attachments on submission. These get installed on the worker before the render starts and get removed again when the job ends.

**Supported font types:**
- OpenType (`.otf`)
- TrueType (`.ttf`)
- TrueTypeCollection (`.ttc`) - majority supported
- [Adobe Fonts](https://fonts.adobe.com/)
- Windows bitmap fonts (`.fon`) - only supported on Windows machines

**Troubleshooting fonts:**
If fonts are missing at render time:

1. Check that fonts are installed on your system:
   - **Windows**: Open Settings > Personalization > Fonts to view installed fonts
   - **macOS**: Open Font Book application to view installed fonts
2. Verify fonts are included in job attachments: After clicking **Submit** in the submitter, check the **Job Attachments** tab in the submission dialog to confirm your fonts are listed.

**Adobe Creative Cloud Fonts:**
In order for Deadline Cloud to use fonts distributed through Adobe Creative Cloud, they must be made available for all non-Adobe apps on your workstation.

To install fonts for non-Adobe apps in Creative Cloud:
1. Open Adobe Creative Cloud Desktop.
2. Click "Adobe Fonts" on the account sidebar under "Your plan" to show the Adobe Fonts panel.
3. Click "Added fonts" on the "Adobe Fonts" sidebar to show your added fonts.
4. Click "Install family" next to the fonts you would like to make available for non-Adobe apps.

## Viewing the Job Bundle

To submit a job, the submitter first generates a [Job Bundle](https://docs.aws.amazon.com/deadline-cloud/latest/developerguide/build-job-bundle.html), and then uses functionality from the Deadline package to submit the Job Bundle to your render farm to run.

If you would like to see the job that will be submitted to your farm:

1. Use the **Export Bundle** button in the submitter to export the Job Bundle in the job history directory (default: `~/.deadline/job_history`).
2. If you want to submit the job from the export, rather than through the submitter, you can use the Deadline Cloud application to submit that bundle to your farm.

## Monitoring your jobs

You can monitor job progress using the Deadline Cloud monitor. For more information, see the [AWS Deadline Cloud guide for using the monitor](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/working-with-deadline-monitor.html).

## Getting help

- Contact AWS Support
- For bugs, please log an [issue to our GitHub](https://github.com/aws-deadline/deadline-cloud-for-after-effects/issues) (Requires a GitHub account)
- For feature requests or improvement ideas, visit our [discussion forum](https://github.com/aws-deadline/deadline-cloud-for-after-effects/discussions)

## Troubleshooting

### Error: Couldn't find Python 3 or higher on your PATH

**For macOS:**
1. Open your Terminal and run the following scripts in your command line: `where python` and `where python3`. If you're not getting any results, this means you need to install Python for your workstation.
2. If you do not have `python3` CLI installed but you have `python`, run `python --version` to check if you have Python 3.9 or higher. If not, please install Python 3.9 or higher first and add it to your path.
3. Once you are getting results from the version check and where check, then check which python executable is actively being used. Run `which python`, `which python3`. If you're not getting any results, you'll need to add your python CLI to your zsh $PATH.
4. We must also ensure you're adding the Python that was used to install Deadline CLI. Run `python -m pip list` and/or `python3 -m pip list` to verify this and add to $PATH whichever python applies.
5. Finally, add the `bin` folder containing Python CLI to your path by editing `~/.zshrc` (and `~/.bashrc` if applicable) and updating the $PATH. For example, if your Python and Deadline CLI are under `/Library/Frameworks/Python.framework/Versions/3.13/bin`, add the following code to your `~/.zshrc` file at the end of the file so it gets final priority when the $PATH is evaluated:
   ```
   export PATH=$PATH:/Library/Frameworks/Python.framework/Versions/3.13/bin
   ```
6. Save and exit, then run `source ~/.zshrc`

In the end, your output should follow a pattern similar to the following example:
```
user@7cf34df03377 ~ % which python3
/Library/Frameworks/Python.framework/Versions/3.13/bin/python3
user@7cf34df03377 ~ % where deadline
/Library/Frameworks/Python.framework/Versions/3.13/bin/deadline
```
7. Now if you run `python --version` and `deadline --version`, you should have access to both of the executables and After Effects should too. Retry job submission.

**For Windows:**
1. Open Command Prompt (or PowerShell).
2. Run `where python`, `where python3`, `where py`, and `where deadline` to locate the executables. Note: In PowerShell, use `Get-Command python` instead of `where python`.
3. Press Windows + S and search for "Edit the system environment variables". Note this will require admin access. Click "Environment Variables...".
4. Depending on whether Deadline CLI was a user installation or system installation, select the "Path" variable under either "User variables" or "System variables", then click **Edit**.
5. In the Edit window, click **New** and paste the path to the folder containing your Python and Deadline executables.
6. Ensure that the binary folders containing deadline and your python CLI have been added. Deadline will either be located in the DeadlineCloudSubmitter folder when installed from the submitter installer or under a python folder if managed by pip. If you're managing Deadline CLI with pip, run `python -m pip list` and/or `python3 -m pip list` to ensure you add the Python containing Deadline CLI to your path.

### Error: Deadline Not Found

1. First, open your Terminal or Command Prompt and run `deadline --version` to verify installation.
2. Then follow the troubleshooting steps above for Python for your respective OS and verify that deadline is on your $PATH.
3. If you have multiple Python installations and manage Deadline via Pip, verify that the Python on your $PATH is the Python that managed your Deadline installation. This can be done by running `python -m pip list` and `python3 -m pip list` to verify this.

### Error: Missing job template at /Applications/Adobe After Effects 2025/Scripts/ScriptUI Panels/DeadlineCloudSubmitter_Assets/JobTemplate

This error occurs when the `DeadlineCloudSubmitter_Assets` folder is missing or not located next to the `DeadlineCloudSubmitter.jsx` script file.

1. Locate where your `DeadlineCloudSubmitter.jsx` script is installed or moved to.
2. Ensure the `DeadlineCloudSubmitter_Assets` folder is in the same directory as the script.
3. If the assets folder is missing, copy it from your original installation source to the same location as the JSX script.
4. Restart After Effects and try running the submitter again.

### Warning: Unsupported After Effects Version Detected

This means you are using an After Effects version that is not available in the deadline-cloud Conda channel. For example, if you're using After Effects 24.3, but the channel only supports 24.6.

If you continue, the default major version in use locally will be filled in the CondaPackages field, but your job submission may fail unless you have created a custom Conda channel with your specific After Effects version and included this channel in the CondaChannels parameter.

To resolve this, you can either:
1. Switch to a supported After Effects version,
2. Acknowledge the warning and proceed (at your own risk), or
3. Create a custom Conda channel with your desired After Effects version

### After submission on Windows, a command prompt screen flashes open and close and submitter GUI doesn't pop open

Go to the Windows Start menu and search for "Manage app execution aliases". Then disable the `python3.exe` and `python.exe` aliases manually and retry submission.

### Font with an unsupported extension was found

See the **Font Attachment System** section above for supported font types.
