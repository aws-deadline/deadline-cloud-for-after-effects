# AWS Deadline Cloud for After Effects

[![pypi](https://img.shields.io/pypi/v/deadline-cloud-for-after-effects.svg?style=flat)](https://pypi.python.org/pypi/deadline-cloud-for-after-effects)
[![python](https://img.shields.io/pypi/pyversions/deadline-cloud-for-after-effects.svg?style=flat)](https://pypi.python.org/pypi/deadline-cloud-for-after-effects)
[![license](https://img.shields.io/pypi/l/deadline-cloud-for-after-effects.svg?style=flat)](https://github.com/aws-deadline/deadline-cloud-for-after-effects/blob/mainline/LICENSE)

### Disclaimer
---
This GitHub repository is an example integration with AWS Deadline Cloud that is intended to only be used for testing and is subject to change. This code is an alpha release. It is not a commercial release and may contain bugs, errors, defects, or harmful components. Accordingly, the code in this repository is provided as-is. Use within a production environment is at your own risk!
 
Our focus is to explore a variety of software applications to ensure we have good coverage across common workflows. We prioritized making this example available earlier to users rather than being feature complete.

This example has been used by at least one internal or external development team to create a series of jobs that successfully rendered. However, your mileage may vary. If you have questions or issues with this example, please start a discussion or cut an issue.

---
AWS Deadline Cloud for After Effects is a package that allows users to create [AWS Deadline Cloud][deadline-cloud] jobs from within After Effects. Using the [Open Job Description (OpenJD) Adaptor Runtime][openjd-adaptor-runtime] this package also provides a command line application that adapts to After Effects' command line interface to support the [OpenJD specification][openjd].

[deadline-cloud]: https://docs.aws.amazon.com/deadline-cloud/latest/userguide/what-is-deadline-cloud.html
[deadline-cloud-client]: https://github.com/aws-deadline/deadline-cloud
[openjd]: https://github.com/OpenJobDescription/openjd-specifications/wiki
[openjd-adaptor-runtime]: https://github.com/OpenJobDescription/openjd-adaptor-runtime-for-python
[openjd-adaptor-runtime-lifecycle]: https://github.com/OpenJobDescription/openjd-adaptor-runtime-for-python/blob/release/README.md#adaptor-lifecycle

## Compatibility

This library requires:

**Submitter:**
1. After Effects 24.3
1. Python3.9 or higher; and
1. Windows or a MacOS operating System

**Adaptor:**
1. After Effects 24.3
1. Python3.9 or higher; and
1. A Windows operating system

## Submitter

This package provides a JavaScript based After Effects plugin that creates jobs for AWS Deadline Cloud using the [AWS Deadline Cloud client library][deadline-cloud-client]. Based on the loaded project it determines the files required, allows the user to specify render options, and builds an [OpenJD template][openjd] that defines the workflow.

## Adaptor

The After Effects Adaptor implements the [OpenJD][openjd-adaptor-runtime] interface that allows render workloads to launch After Effects and feed it commands. This gives the following benefits:
* a standardized render application interface,
* sticky rendering, where the application stays open between tasks,
  * See [adaptor IPC](https://github.com/aws-deadline/deadline-cloud-for-after-effects/blob/release/docs/adaptor_ipc.md) for more information.
* path mapping, that enables cross-platform rendering

Jobs created by the submitter use this adaptor by default. 

## Getting Started

### Adaptor
---
The adaptor can be installed by the standard python packaging mechanisms:
```sh
$ pip install deadline-cloud-for-after-effects
```

After installation it can then be used as a command line tool:
```sh
$ afterfx-openjd --help
```
### Submitter
---
### Build & Install

Bundle the JSX and JS files together with the `jsxbundler.py` script:

```
python jsxbundler.py --source src/deadline/ae_submitter/OpenAESubmitter.jsx --destination dist/jsxbundle/DeadlineCloudSubmitter.jsx
```

This will create a bundle file at `dist/jsxbundle/DeadlineCloudSubmitter.jsx`.
Copy the generated bundle file into the scripts location for After Effects.

Alternatively, you can specify the output path for the bundler directly with the `--destination` option. 
See `python jsxbundler.py --help` for details. This may require elevated permissions.

The default scripts location is at `<AE_INSTALL_LOCATION>/Support Files/Scripts`. For example, on Windows this would be: `C:\Program Files\Adobe\Adobe After Effects 2023\Support Files\Scripts`

### Submitter Usage

Before using the script you must configure the following options in After Effects:

Navigate to the `Edit` menu > `Preferences` > `Scripting & Expressions` and enable the following options:

- Allow Scripts to Write Files and Access Network
- Enable JavaScript Debugger (optional, for development)

To run the script:

1. Open an After Effects project.
2. Once inside the project, navigate to the `File` Panel at the top.
3. Under the `Scripts` sub-menu, select the `DeadlineCloudSubmitter.jsx` script to start it.

## Versioning

This package's version follows [Semantic Versioning 2.0](https://semver.org/), but is still considered to be in its 
initial development, thus backwards incompatible versions are denoted by minor version bumps. To help illustrate how
versions will increment during this initial development stage, they are described below:

1. The MAJOR version is currently 0, indicating initial development. 
2. The MINOR version is currently incremented when backwards incompatible changes are introduced to the public API. 
3. The PATCH version is currently incremented when bug fixes or backwards compatible changes are introduced to the public API. 

## Security

See [CONTRIBUTING](https://github.com/aws-deadline/deadline-cloud-for-after-effects/blob/release/CONTRIBUTING.md#security-issue-notifications) for more information.

## Telemetry

See [telemetry](https://github.com/aws-deadline/deadline-cloud-for-after-effects/blob/release/docs/telemetry.md) for more information.

## License

This project is licensed under the Apache-2.0 License.
