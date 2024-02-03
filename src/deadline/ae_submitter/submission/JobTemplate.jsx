var OPENJD_TEMPLATE = {
    "specificationVersion": "jobtemplate-2023-09",
    "name": "After Effects Template Edit Test",
    "description": null,
    "parameterDefinitions": [{
            "name": "AfterEffectsProjectFile",
            "type": "PATH",
            "objectType": "FILE",
            "dataFlow": "IN",
            "userInterface": {
                "control": "CHOOSE_INPUT_FILE",
                "label": "After Effects Project File",
                "groupLabel": "After Effects Settings",
                "fileFilters": [{
                        "label": "After Effects Project Files",
                        "patterns": [
                            "*.aep",
                            "*.aepx"
                        ]
                    },
                    {
                        "label": "All Files",
                        "patterns": [
                            "*"
                        ]
                    }
                ]
            },
            "description": "The After Effects Project file to render."
        },
        {
            "name": "Frames",
            "type": "STRING",
            "userInterface": {
                "control": "LINE_EDIT",
                "label": "Frames",
                "groupLabel": "After Effects Settings"
            },
            "description": "The frame range to render. E.g. 1,8,11",
            "minLength": 1
        },
        {
            "name": "OutputPattern",
            "type": "STRING",
            "description": "Name for the output file.",
            "default": "Output_[####]"
        },
        {
            "name": "OutputFormat",
            "type": "STRING",
            "description": "File type.",
            "default": "png"
        },
        {
            "name": "CompName",
            "type": "STRING",
            "description": "Selected composition to render."
        },
        {
            "name": "OutputFilePath",
            "type": "PATH",
            "objectType": "DIRECTORY",
            "dataFlow": "OUT",
            "userInterface": {
                "control": "CHOOSE_DIRECTORY",
                "label": "Output File Path",
                "groupLabel": "After Effects Settings"
            },
            "description": "The render output path."
        }
    ],
    "steps": [{
        "name": "AfterEffects Simple Render",
        "parameterSpace": {
            "taskParameterDefinitions": [
                {
                  "name": "Frame",
                  "type": "INT",
                  "range": "{{Param.Frames}}"
                }
            ]
        },
        "stepEnvironments": [{
            "name": "AfterEffects",
            "description": "Runs After Effects in the background.",
            "script": {
                "embeddedFiles": [
                    {
                        "name": "initData",
                        "filename": "init-data.yaml",
                        "type": "TEXT",
                        "data": "project_file: {{Param.AfterEffectsProjectFile}} \n"

                    },
                    {
                        "name": "runStart",
                        "filename": "start.bat",
                        "type": "TEXT",
                        "data": "AfterEffectsAdaptor daemon start --connection-file {{Session.WorkingDirectory}}/connection.json --init-data file://{{Env.File.initData}} \n"
                    },
                    {
                        "name": "runStop",
                        "filename": "stop.bat",
                        "type": "TEXT",
                        "data": "AfterEffectsAdaptor daemon stop --connection-file {{Session.WorkingDirectory}}/connection.json \n"
                    }
                ],
                "actions": {
                    "onEnter": {
                        "command": "powershell",
                        "args": [
                            "{{Env.File.runStart}}"
                        ]
                    },
                    "onExit": {
                        "command": "powershell",
                        "args": [
                            "{{Env.File.runStop}}"
                        ]
                    }
                }
            }
        }],
        "script": {
            "actions": {
                "onRun": {
                    "command": "powershell",
                    "args": [
                        "{{Task.File.runScript}}"
                    ]
                }
            },
            "embeddedFiles": [
            {
                "name": "runData",
                "filename": "run-data.yaml",
                "type": "TEXT",
                "data": [
                    "frame: {{Task.Param.Frame}}"
                ]
            },
            {
                "name": "runScript",
                "filename": "bootstrap.bat",
                "type": "TEXT",
                "runnable": true,
                "data": "AfterEffectsAdaptor daemon run --connection-file {{ Session.WorkingDirectory }}/connection.json --run-data file://{{Task.File.runData}} \n"
            }
            ]
        }
    }]
}

var OPENJD_TEMPLATE_LAYER = {
    "specificationVersion": "jobtemplate-2023-09",
    "name": "After Effects Template Edit Test",
    "description": null,
    "parameterDefinitions": [{
            "name": "AfterEffectsProjectFile",
            "type": "PATH",
            "objectType": "FILE",
            "dataFlow": "IN",
            "userInterface": {
                "control": "CHOOSE_INPUT_FILE",
                "label": "After Effects Project File",
                "groupLabel": "After Effects Settings",
                "fileFilters": [{
                        "label": "After Effects Project Files",
                        "patterns": [
                            "*.aep",
                            "*.aepx"
                        ]
                    },
                    {
                        "label": "All Files",
                        "patterns": [
                            "*"
                        ]
                    }
                ]
            },
            "description": "The After Effects Project file to render."
        },
        {
            "name": "Frames",
            "type": "STRING",
            "userInterface": {
                "control": "LINE_EDIT",
                "label": "Frames",
                "groupLabel": "After Effects Settings"
            },
            "description": "The frame range to render. E.g. 1,8,11",
            "minLength": 1
        },
        {
            "name": "OutputPattern",
            "type": "STRING",
            "description": "Name for the output file.",
            "default": "Output_[####]"
        },
        {
            "name": "OutputFormat",
            "type": "STRING",
            "description": "File type.",
            "default": "png"
        },
        {
            "name": "CompName",
            "type": "STRING",
            "description": "Selected composition to render."
        },
        {
            "name": "OutputFilePath",
            "type": "PATH",
            "objectType": "DIRECTORY",
            "dataFlow": "OUT",
            "userInterface": {
                "control": "CHOOSE_DIRECTORY",
                "label": "Output File Path",
                "groupLabel": "After Effects Settings"
            },
            "description": "The render output path."
        }
    ],
    "steps": [{
        "name": "AfterEffects Simple Render",
        "parameterSpace": {
            "taskParameterDefinitions": {
                "name": "Frame",
                "type": "INT",
                "range": "{{Param.Frames}}"
            }
        },
        "stepEnvironments": [{
            "name": "AfterEffects",
            "description": "Runs After Effects in the background.",
            "script": {
                "embeddedFiles": [
                    {
                        "name": "initData",
                        "filename": "init-data.yaml",
                        "type": "TEXT",
                        "data": [
                            "project_file: {{Param.AfterEffectsProjectFile}} \n",
                            "comp_name: {{Param.CompName}} \n",
                            "output_file_path: {{Param.OutputFilePath}} \n",
                            "output_pattern: {{Param.OutputPattern}} \n",
                            "output_format: {{Param.OutputFormat}} \n"
                        ]
                    },
                    {
                        "name": "runStart",
                        "filename": "start.bat",
                        "type": "TEXT",
                        "data": "AfterEffectsAdaptor daemon start --connection-file {{Session.WorkingDirectory}}/connection.json --init-data file://{{Env.File.initData}} \n"
                    },
                    {
                        "name": "runStop",
                        "filename": "stop.bat",
                        "type": "TEXT",
                        "data": "AfterEffectsAdaptor daemon start --connection-file {{Session.WorkingDirectory}}/connection.json \n"
                    }
                ],
                "actions": {
                    "onEnter": {
                        "command": "powershell",
                        "args": [
                            "{{Env.File.runStart}}"
                        ]
                    },
                    "onExit": {
                        "command": "powershell",
                        "args": [
                            "{{Env.File.runStop}}"
                        ]
                    }
                }
            }
        }],
        "script": {
            "actions": {
                "onRun": {
                    "command": "powershell",
                    "args": [
                        "{{Task.File.runScript}}"
                    ]
                }
            },
            "embeddedFiles": [
            {
                "name": "runData",
                "filename": "run-data.yaml",
                "type": "TEXT",
                "data": [
                    "frame: {{Task.Param.Frame}}"
                ]
            },
            {
                "name": "runScript",
                "filename": "bootstrap.bat",
                "type": "TEXT",
                "runnable": true,
                "data": "AfterEffectsAdaptor daemon run --connection-file {{ Session.WorkingDirectory }}/connection.json --run-data file://{{Task.File.runData}} \n"
            }
            ]
        }
    }]
}