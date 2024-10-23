# AWS Deadline CLoud for After Effects: Dockable Submitter

### Disclaimer

---

This GitHub repository is an example integration with AWS Deadline Cloud that is intended to only be used for testing and is subject to change. This code is an alpha release. It is not a commercial release and may contain bugs, errors, defects, or harmful components. Accordingly, the code in this repository is provided as-is. Use within a production environment is at your own risk!

Our focus is to explore a variety of software applications to ensure we have good coverage across common workflows. We prioritized making this example available earlier to users rather than being feature complete.

This example has been used by at least one internal or external development team to create a series of jobs that successfully rendered. However, your mileage may vary. If you have questions or issues with this example, please start a discussion or cut an issue.

---

This submitter creates and submits [OpenJD](https://github.com/OpenJobDescription/openjd-specifications) job bundles for rendering After Effects jobs. The job bundles it creates utilizes the aerender executable that comes with After Effects

[deadline-cloud]: https://docs.aws.amazon.com/deadline-cloud/latest/userguide/what-is-deadline-cloud.html
[deadline-cloud-client]: https://github.com/aws-deadline/deadline-cloud
[openjd]: https://github.com/OpenJobDescription/openjd-specifications/wiki

## Installation

1. Install the Deadline CLI and Deadline Cloud Monitor by running the Deadline Submitter and Deadline Monitor installers from the downloads section of the Deadline Cloud service in your AWS Console.
2. Copy DeadlineCloudSubmitter.jsx and the DeadlineCloudSubmitter_Assets folder to the **ScriptUI Panels** folder within your After Effects installation. This folder is typically located at the following path:

   Windows: Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\Script UI Panels
   macOS: Applications/Adobe After Effects <version>/Scripts/Script UI Panels

3. Restart After Effects if it was open.

## Compatibility

1. After Effects 24
1. Python3.9 or higher; and
1. Windows or a MacOS operating System

## Usage

1. Add a composition to your render queue and set up your render settings, output module, and output path.
2. Open the Deadline Cloud Submitter Panel by clicking _Windows > DeadlineCloudSubmitter.jsx_
3. Select your composition from the list and click _Submit_. You may need to hit the _⟳_ refresh button.
4. Install any python libraries if prompted and press the Login button in the bottom left if you are not logged in.
5. Set the farm and queue you are submitting to with the Settings button, and click _Submit_.

### Script Permissions

This submitter requires the ability to write files and send communication over the network in order to function properly.
By default, After Effects scripts are not allowed to perform these actions. To allow scripts to write files or send communication over a network, edit the following settings within After Effects:

    Windows: Select Edit > Preferences > Scripting & Expressions > select Allow Scripts To Write Files And Access Network.
    macOS: Select After Effects > Settings > Scripting & Expressions > select Allow Scripts To Write Files And Access Network.

### Render Optimization

Multi-Frame Rendering will spin up multiple render processes in order to fully utilize all of a render machine's resources. After Effects provides options for choosing the percentage of the CPU power to utilize but unfortunately, this functionality is broken as of After Effects 2024 such that Multi-Frame Rendering will always use 100% of your CPU if turned on.

In order for Multi-Frame Rendering to work, each task needs to have multiple frames, preferably more than the number of cores on the render machines. However, if your render machines are bottle-necked by RAM, maxing out your CPU cores may result in an "Out of memory" failure. Make sure to either use machines with plenty of free ram, or only assign a few frames per task. If the option to choose CPU percentage worked, you would have also been able to prevent "Out of memory" issues with that option.

## License

This project is licensed under the Apache-2.0 License.
