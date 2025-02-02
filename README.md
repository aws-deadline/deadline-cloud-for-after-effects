# AWS Deadline Cloud for After Effects

AWS Deadline Cloud for After Effects is a package that supports creating and running Adobe After Effects jobs within AWS Deadline Cloud. It provides the implementation of an After Effects plug-in for your workstation that helps you offload the computation for your rendering workloads to AWS Deadline Cloud to free up your workstation's compute for other tasks. The job bundles it creates utilizes the `aerender` executable that comes with Adobe After Effects.

## Compatibility

1. After Effects 2024 - 2025,
1. Python 3.9 or higher; and
1. Windows or macOS operating system.

## Versioning

This package's version follows [Semantic Versioning 2.0](https://semver.org/), but is still considered to be in its initial development, thus backwards incompatible versions are denoted by minor version bumps. To help illustrate how versions will increment during this initial development stage, they are described below:

1. The MAJOR version is currently 0, indicating initial development.
1. The MINOR version is currently incremented when backwards incompatible changes are introduced to the public API.
1. The PATCH version is currently incremented when bug fixes or backwards compatible changes are introduced to the public API.

## Getting Started

This After Effects integration for AWS Deadline Cloud has a submitter script that you will need to install.

Before submitting any large, complex, or otherwise compute-heavy After Effects render jobs to your farm using
the submitter that you setup, we strongly recommend that you construct a simple test scene that can be rendered
quickly and submit renders of that scene to your farm to ensure that your setup is correctly functioning.

### After Effects Submitter

The After Effects submitter creates a dockable panel in your After Effects application that can be used to
submit jobs to AWS Deadline Cloud. Clicking the submit button reveals a UI to create a job submission for
AWS Deadline Cloud using [AWS Deadline Cloud client library submission UI](https://github.com/aws-deadline/deadline-cloud).
It automatically determines the files required based on the loaded scene, allows the user to specify render options,
builds an [Open Job Description template](https://github.com/OpenJobDescription/openjd-specifications/wiki) that
defines the workflow, and submits the job to the farm and queue of your choosing.

The submitter includes a folder `DeadlineCloudSubmitter_Assets` and a file `DeadlineCloudSubmitter.jsx`.

1. `DeadlineCloudSubmitter_Assets` folder include default job template json file (`image_template.json` or `video_template.json` depending on the output type) with two Python scripts that will be run as tasks of the job.
1. `DeadlineCloudSubmitter.jsx` is the After Effects script written by
   ExtendScript.

#### To install the submitter:

1. Install the Deadline CLI and Deadline Cloud monitor by running the Deadline Cloud Submitter and Deadline Cloud monitor installers from the downloads section of the Deadline Cloud service in your AWS Console.
1. This submitter requires the ability to write files and send communication over the network in order to function properly.
   By default, After Effects scripts are not allowed to perform these actions. [Reference link](https://helpx.adobe.com/after-effects/using/scripts.html). To allow scripts to write files or send communication over a network, edit the following settings within After Effects:

   - Windows: `Select Edit > Preferences > Scripting & Expressions > select Allow Scripts To Write Files And Access Network`
   - macOS: `Select After Effects > Settings > Scripting & Expressions > select Allow Scripts To Write Files And Access Network`

   Additionally, to disable warnings every time you submit a job with the submitter, edit the following settings within After Effects:

   - Windows `Select Edit > Preferences > Scripting & Expressions > deselect Warn User When Executing Files`
   - macOS: `Select After Effects > Settings > Scripting & Expressions > deselect Warn User When Executing Files`

1. Copy `DeadlineCloudSubmitter.jsx` and the `DeadlineCloudSubmitter_Assets` folder in the `dist` folder to
   the **ScriptUI Panels** folder within your After Effects installation. This folder is typically located at the following path:

   - Windows: `Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\Script UI Panels`
   - macOS: `Applications/Adobe After Effects <version>/Scripts/Script UI Panels`

1. Finally, to install the necessary dependencies used by the submitter, run `pip install fonttools` in your local Terminal or Command Prompt.
1. Restart After Effects if it was open.

#### To use the submitter:

1. Add a composition to your render queue and set up your render settings, output module, and output path.
1. Open the Deadline Cloud Submitter Panel by clicking **Windows > DeadlineCloudSubmitter.jsx**.
1. Select your composition from the list and click **Submit**. You can hit the **Refresh** button to refresh the list.
1. (Optional: for image sequences output types) you can specify the number of frames per task so that the job created by the After Effects submitter will create the tasks based on the number and then Deadline Cloud will assign the tasks to available workers to delegate the load.
1. If you see a warning popup window with "You are about to run the script contained in file", you can suppress the warning by following the instruction in the popup or the instructions above to disable warnings when submitting jobs.
1. Install any python libraries if prompted and press the Login button in the bottom left if you are not logged in.
1. Set the farm and queue you are submitting to with the Settings button, and click **Submit**.

**Note**: The After Effects submitter calls the Deadline GUI Submitter to complete job submission. If you hit any issues on the GUI submitter, please refer to [deadline-cloud](https://github.com/aws-deadline/deadline-cloud) library for help.

#### Font attachment system:

The submitter detects fonts used in the submitted composition and automatically adds them as job attachments on submission. These get installed on the worker before the render starts and get removed again when the job ends.
Supported font types include: OpenType (`.otf`), TrueType (`.ttf`), and [Adobe Fonts](https://fonts.adobe.com/).
Windows bitmap fonts (`.fon`) are only supported on Windows machines.

If fonts are missing at render time, first check that they're installed (on the system or your user), and then check they're being included in the job attachments tab in the submitter.

Fonts distributed through Adobe Creative Cloud can be made available for all non-Adobe apps on your workstation, or only made available in Adobe apps. Cloud fonts need to be installed for all non-Adobe apps for use with Deadline Cloud.
To install fonts for non-Adobe apps in Creative Cloud:

1. Open Adobe Creative Cloud Desktop.
1. Click "Adobe Fonts" on the account sidebar under "Your plan" to show the Adobe Fonts panel.
1. Click "Added fonts" on the "Adobe Fonts" sidebar to show your added fonts.
1. Click "Install family" next to the fonts you would like to make available for non-Adobe apps.

## Setting up After Effects with your Deadline Cloud Farm

Even though After Effects is not available in AWS Deadline Cloud Service Managed Fleet yet (See this [link](https://docs.aws.amazon.com/deadline-cloud/latest/userguide/create-queue-environment.html) for more information
on which software is supported), but you can either use Customer Managed Fleet with After Effects installed in your worker
instances or building a conda channel that contains After Effects conda package following
[the instruction](https://docs.aws.amazon.com/deadline-cloud/latest/developerguide/configure-jobs-s3-channel.html) with Service Managed Fleet.
You can use After Effects conda recipe in
[deadline-cloud-sample package](https://github.com/aws-deadline/deadline-cloud-samples/tree/mainline/conda_recipes/aftereffects-25.0)
as a reference when building the package.

Jobs created by this submitter require `aerender` executable be available on the PATH of the user that will be running your jobs. Or you can set the `AERENDER_EXECUTABLE` to point to the aerender executable.

## Viewing the Job Bundle that will be submitted

To submit a job, the submitter first generates a [Job Bundle](https://docs.aws.amazon.com/deadline-cloud/latest/developerguide/build-job-bundle.html), and then uses functionality
from the [Deadline](https://github.com/aws-deadline/deadline-cloud) package to submit the Job Bundle to your render farm to run.
If you would like to see the job that will be submitted to your farm, then you can
use the "Export Bundle" button in the submitter to export the Job Bundle
in the job history directory (default: ~/.deadline/job_history).
If you want to submit the job from the export, rather than through the submitter
then you can use the [Deadline Cloud application](https://github.com/aws-deadline/deadline-cloud) to submit that bundle to your farm.

## Security

We take all security reports seriously. When we receive such reports, we will investigate and subsequently address any potential vulnerabilities as quickly as possible. If you discover a potential security issue in this project, please notify AWS/Amazon Security via our [vulnerability reporting page](http://aws.amazon.com/security/vulnerability-reporting/) or directly via email to [AWS Security](https://github.com/aws-deadline/deadline-cloud-for-maya/blob/mainline/aws-security@amazon.com). Please do not create a public GitHub issue in this project.

## Telemetry

See [telemetry](https://github.com/aws-deadline/deadline-cloud-for-after-effects/blob/release/docs/telemetry.md)
for more information.

## License

This project is licensed under the Apache-2.0 License.
