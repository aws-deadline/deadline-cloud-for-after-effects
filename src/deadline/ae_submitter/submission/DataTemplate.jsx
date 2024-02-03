function __generateDataTemplate() {
    var Frames = 
    {
        "name": "Frames",
        "type": "STRING",
        "userInterface": {
            "control": "LINE_EDIT",
            "label": "Frames",
            "groupLabel": "After Effects Settings"
        },
        "description": "The frames to render. E.g. 1,8,11",
        "minLength": 1
    }
    var OutputPattern =
    {
        "name": "OutputPattern",
        "type": "STRING",
        "description": "Name for the output file.",
        "default": "Output_[####]"
    }
    var OutputFormat =
    {
        "name": "OutputFormat",
        "type": "STRING",
        "description": "File type.",
        "default": "png"
    }
    var CompName =
    {
        "name": "CompName",
        "type": "STRING",
        "description": "Selected composition to render."
    }
    var OutputFilePath =
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
    return {
        "Frames": Frames,
        "OutputPattern" : OutputPattern,
        "OutputFormat": OutputFormat,
        "CompName": CompName,
        "OutputFilePath": OutputFilePath
    }
}

dcDataTemplate = __generateDataTemplate();