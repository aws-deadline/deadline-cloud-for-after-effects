# AWS Deadline Cloud for After Effects

This GitHub repository is an example integration with AWS Deadline Cloud that is intended to only be used for testing and is subject to change. This code is an alpha release. It is not a commercial release and may contain bugs, errors, defects, or harmful components. Accordingly, the code in this repository is provided as-is. Use within a production environment is at your own risk!
 
Our focus is to explore a variety of software applications to ensure we have good coverage across common workflows. We prioritized making this example available earlier to users rather than being feature complete.

This example has been used by at least one internal or external development team to create a series of jobs that successfully rendered. However, your mileage may vary. If you have questions or issues with this example, please start a discussion or cut an issue.

## Deadline Cloud for After Effects Adaptor

The adaptor is supported on Windows only.

## Telemetry

This library collects telemetry data by default. Telemetry events contain non-personally-identifiable information that helps us understand how users interact with our software so we know what features our customers use, and/or what existing pain points are.

You can opt out of telemetry data collection by either:

1. Setting the environment variable: `DEADLINE_CLOUD_TELEMETRY_OPT_OUT=true`
2. Setting the config file: `deadline config set telemetry.opt_out true`

Note that setting the environment variable supersedes the config file setting.

## Security

### Lint

```bash
hatch run lint
```

### Format

```bash
hatch run fmt
```

### Build

#### Adaptor

The adaptor wheel can now be made using the package ipc client from the previous step as normal:

```bash
hatch build
```

#### openjd client IPC layer

The adaptor requires an IPC layer between openjd-adaptor-runtime and the 
client running inside of After Effects.

The source of the IPC layer is located in `src/aeipc`. This is bundled into the adaptor
at `src/deadline/ae_adaptor/clientipc/ipc.jsx`.

Any changes to `src/aeipc` can be rebundled into the adaptor using the `jsxbundler.py` script as follows:

```
python jsxbundler.py --source src/aeipc/ipc.jsx --destination src/deadline/ae_adaptor/clientipc/ipc.jsx
```

## Deadline Cloud for After Effects Submitter

The submitter is supported on Windows and Mac.

### Build & Install

Bundle the JSX and JS files together with the `jsxbundler.py` script:

```
python jsxbundler.py --source src/deadline/ae_submitter/OpenAESubmitter.jsx --destination dist/jsxbundle/DeadlineCloudSubmitter.jsx
```

Will create "dist/jsxbundle/DeadlineCloudSubmitter.jsx". Copy the generate
bundle file into the scripts location for After Effects.

Alternatively, you can specify the output path for the bundler directly with the `--destination` option. 
See `python jsxbundler.py --help` for details. This may require elevated permissions.

The default scripts location is at `<AE_INSTALL_LOCATION>/Support Files/Scripts` (Windows example path: `C:\Program Files\Adobe\Adobe After Effects 2023\Support Files\Scripts`)

### Usage

Before using the script you must configure the following options in After Effects:

Navigate to the "Edit" menu > "Preferences" > "Scripting & Expressions" and enable the following options:

- Allow Scripts to Write Files and Access Network
- Enable JavaScript Debugger (optional, for development)

To run the script:

1. Open an After Effects project.
2. Once inside the project, navigate to the "File" Panel at the top.
3. Under the "Scripts" sub-menu, select "DeadlineCloudSubmitter.jsx" script to start it.

## License

This project is licensed under the Apache-2.0 License.
