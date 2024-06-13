# Development documentation

This package has two active branches:

- `mainline` -- For active development. This branch is not intended to be consumed by other packages. Any commit to this branch may break APIs, dependencies, and so on, and thus break any consumer without notice.
- `release` -- The official release of the package intended for consumers. Any breaking releases will be accompanied with an increase to this package's interface version.

## Build / Test / Release

### Build the package

```bash
hatch build
```

### Run tests

```bash
hatch run test
```

### Run linting

```bash
hatch run lint
```

### Run formatting

```bash
hatch run fmt
```

### Run tests for all supported Python versions

```bash
hatch run all:test
```

### Configuring development environment (Submitter)

Recommended development environment is VSCode with plugins `ExtendScript`, `ExtendScript Debugger`, and `ESLint`.

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

Example `launch.json` configuration for attached debugger (for AE 2023):

```json
{
    // For more information, visit: https://go.microsoft.com/fwlink/?linkid=830387
    "version": "0.2.0",
    "configurations": [
        {
            "type": "extendscript-debug",
            "request": "attach",
            "name": "Attach to ExtendScript Engine",
            "hostAppSpecifier": "aftereffects-23.0"
        },
        {
            "type": "extendscript-debug",
            "request": "launch",
            "name": "Launch Script in ExtendScript Engine",
            "hostAppSpecifier": "aftereffects-23.0"
        }
    ]
}
```


_______

NOTE: The aftereffects-openjd binary expects that the AfterEffects executable is named `afterfx` and is set on the PATH. If this is not the case, you can set the `AFTEREFFECTS_ADAPTOR_AEFX_EXECUTABLE` environment variable to the path to the After Effects executable.
