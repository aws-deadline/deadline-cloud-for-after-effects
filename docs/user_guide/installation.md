# Installation

To install AWS Deadline Cloud submitter for After Effects, please prepare the following environment:

- Windows or macOS workstation
- Adobe After Effects 24 or 25 installation
- Python 3.9 or higher
- Access to an AWS Deadline Cloud farm with either
    - a service-managed fleet with After Effects available (via custom Conda package)
    - a customer-managed fleet with After Effects and licensing set up

## Prerequisites

Before installing the submitter, you need to:

1. Install the Deadline CLI and Deadline Cloud Monitor by running the Deadline Submitter and Deadline Monitor installers from the downloads section of the Deadline Cloud service in your AWS Console.

2. Enable script permissions in After Effects. This submitter requires the ability to write files and send communication over the network in order to function properly. By default, After Effects scripts are not allowed to perform these actions. [Reference link](https://helpx.adobe.com/after-effects/using/scripts.html).

   To allow scripts to write files or send communication over a network:
   
   - **Windows**: Select `Edit > Preferences > Scripting & Expressions > select Allow Scripts To Write Files And Access Network`
   - **macOS**: Select `After Effects > Settings > Scripting & Expressions > select Allow Scripts To Write Files And Access Network`

## Installing the submitter

The After Effects submitter extension allows you to submit jobs to Deadline Cloud directly from within After Effects.

**Note: During the installer process, you will choose between User Install or System Install. macOS users will default to User Install, since automatic System Install is currently not supported on macOS (manual System Install is still possible for admin users). Read only the section below that matches your selection:**

### User Install

1. Download the Deadline Cloud Submitter installer by following [Step 1: Install the Deadline Cloud Submitter](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/submitter.html#submitter-installation).
2. Run the installer (no admin required).
3. Follow the prompts and select the After Effects submitter and choose the major version (e.g., 24 or 25).
4. The submitter will be installed based on your operating system:
   - **macOS**: The installer automatically places `DeadlineCloudSubmitter(User).jsx` and `DeadlineCloudSubmitter_Assets` into your After Effects user preferences directory for all minor versions of the selected major version:
     ```
     /Users/<user>/Library/Preferences/Adobe/After Effects/<version>/Scripts/ScriptUI Panels
     ```
     The submitter will appear in the **Window** menu in After Effects.
   - **Windows**: The submitter is installed to a standalone location by default:
     ```
     C:\Users\<user>\DeadlineCloudSubmitter\Submitters\AfterEffects\AE<version>
     ```
     You will need to run the script manually via **File > Scripts > Run Script File**.

### System Install

**Note: Automatic macOS system install is not yet supported by the submitter installer. macOS admin users can perform a manual system install by copying files to the application directory (see [Manual Installation](#manual-installation-alternative)).**

1. Download the Deadline Cloud Submitter installer by following [Step 1: Install the Deadline Cloud Submitter](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/submitter.html#submitter-installation).
2. **Windows only**: Right-click the installer and choose `Run as Admin`.
3. Follow the prompts and select the After Effects submitter. It will be installed to:
   - **Windows**: `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\Script UI Panels`
   - **macOS** (manual): `/Applications/Adobe After Effects <version>/Scripts/ScriptUI Panels`

### Final Setup Steps

1. After installing via submitter installer, ensure you log into your Deadline user profile by running `deadline auth login` in the Terminal/Powershell or logging in via the Deadline Cloud Monitor.
2. Next, to install the necessary dependencies used by the AE submitter, run the following in your local Terminal or Command Prompt:
   ```
   pip install fonttools
   ```
3. Finally, restart After Effects if it was open.

## Manual Installation (Alternative)

If you prefer to install manually, you can copy the submitter files directly:

1. Locate the `DeadlineCloudSubmitter.jsx` file and the `DeadlineCloudSubmitter_Assets` folder in the `dist` folder of this repository.
2. Copy both to the **ScriptUI Panels** folder within your After Effects installation:
   - **Windows**: `Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\Script UI Panels`
   - **macOS**: `Applications/Adobe After Effects <version>/Scripts/Script UI Panels`
3. Restart After Effects if it was open.

## Setting up After Effects with your Deadline Cloud Farm

After Effects conda packages are available in AWS Deadline Cloud Service Managed Fleet. For the list of supported versions, see the [Deadline Cloud User Guide](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/create-queue-environment.html). If you would like to build a conda channel that contains a different After Effects conda package, please follow [these instructions](https://docs.aws.amazon.com/deadline-cloud/latest/developerguide/configure-jobs-s3-channel.html).

You can also use the After Effects conda recipe in [deadline-cloud-samples package](https://github.com/aws-deadline/deadline-cloud-samples/tree/mainline/conda_recipes/aftereffects-25.0) as a reference when building the package.

Jobs created by this submitter require the `aerender` executable to be available on the PATH of the user that will be running your jobs. Alternatively, you can set the `AERENDER_EXECUTABLE` environment variable to point to the aerender executable.

## Updating the submitter

To update the submitter to the latest version, download and run the latest submitter installer.
