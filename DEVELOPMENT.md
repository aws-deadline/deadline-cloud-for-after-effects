# Amazon Deadline Cloud for After Effects Development

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