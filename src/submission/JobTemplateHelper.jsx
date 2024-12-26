/**
 * Generates the basic parameterValue file for the job template
 **/
function parameterValues(
    renderQueueIndex,
    projectFile,
    outputPath,
    startFrame,
    endFrame,
    framesPerTask
) {
    var frameStart;
    var frameEnd;
    var re = new RegExp("^[^#]*#{5}[^#]*$"); //checks for output patterns with [####] in them which usually indicates an image sequence
    var isSequence = false;
    isSequence = re.test(outputPath);

    if (framesPerTask < 1 || !isSequence) {
        frameStart = startFrame.toString();
        frameEnd = endFrame.toString();
    } else if (framesPerTask == 1) {
        frameStart = startFrame.toString() + "-" + endFrame.toString();
        frameEnd = frameStart;
    } else {
        var frame = startFrame;
        var startArray = [];
        var endArray = [];
        while (frame <= endFrame) {
            startArray.push(frame.toString());
            frame = Math.min(endFrame + 1, frame + framesPerTask);
            endArray.push((frame - 1).toString());
        }
        frameStart = startArray.join(",");
        frameEnd = endArray.join(",");
    }

    return {
        parameterValues: [{
                name: "CondaPackages",
                value: "aftereffects",
            },
            {
                name: "deadline:targetTaskRunStatus",
                value: "READY",
            },
            {
                name: "deadline:maxFailedTasksCount",
                value: 20,
            },
            {
                name: "deadline:maxRetriesPerTask",
                value: 5,
            },
            {
                name: "deadline:priority",
                value: 50,
            },
            {
                name: "ProjectFile",
                value: projectFile,
            },
            {
                name: "RenderQueueIndex",
                value: renderQueueIndex,
            },
            {
                name: "OutputFile",
                value: outputPath,
            },
            {
                name: "FrameStart",
                value: frameStart,
            },
            {
                name: "FrameEnd",
                value: frameEnd,
            }
        ],
    };
}

/**
 * Generates the basic format of the asset reference for job template.
 **/
function jobAttachmentsJson(inputFiles, outputFolder) {
    return {
        assetReferences: {
            inputs: {
                directories: [],
                filenames: inputFiles,
            },
            outputs: {
                directories: [outputFolder],
            },
            referencedPaths: [],
        },
    };
}

/**
 * Breadth first sweep through the root composition to find all footage references
 * More efficient than just iterating through items in the project when 
 * there is a lot of unused footage in the project   
 **/
function findJobAttachments(rootComp) {
    if (rootComp == null) {
        return [];
    }
    var attachments = [];
    var exploredItems = {}; // using this object as a set because AE doesn't support sets
    attachments.push(app.project.file.fsName);
    exploredItems[rootComp.id] = true;
    var queue = [rootComp];
    while (queue.length > 0) {
        var comp = queue.pop();
        var shouldShowPopup = true; // only show the popup once per comp so the user doesn't get spammed if there's a lot of missing media
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (
                layer != null &&
                layer instanceof AVLayer &&
                layer.source != null
            ) {
                var src = layer.source;
                if (src.id in exploredItems) {
                    continue;
                }
                exploredItems[src.id] = true;
                if (src instanceof CompItem) {
                    queue.push(src);
                } else if (
                    src instanceof FootageItem &&
                    src.mainSource instanceof FileSource
                ) {
                    if (src.footageMissing) {
                        if (shouldShowPopup) {
                            adcAlert(
                                "Missing Footage: " +
                                src.name +
                                " (" +
                                src.missingFootagePath +
                                ")"
                            );
                            shouldShowPopup = false;
                        }
                    } else {
                        attachments.push(src.file.fsName);
                    }
                }
            }
        }
    }
    return attachments;
}

var AE_JOB_TEMPLATE = {
    "specificationVersion": "jobtemplate-2023-09",
    "name": "{{JOBNAME}}",
    "description": "A simple job bundle that allows a user to select a project and comp to render with aerender.",
    "parameterDefinitions": [{
            "name": "ProjectFile",
            "type": "PATH",
            "objectType": "FILE",
            "dataFlow": "IN",
            "userInterface": {
                "control": "CHOOSE_INPUT_FILE",
                "label": "Project file",
                "groupLabel": "Source",
                "fileFilters": [{
                        "label": "After Effects project files",
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
            "description": "The After Effects project file to render."
        },
        {
            "name": "RenderQueueIndex",
            "type": "INT",
            "userInterface": {
                "control": "SPIN_BOX",
                "label": "Render Queue Index",
                "groupLabel": "Source"
            },
            "description": "The index of the item in the render queue to render.",
            "default": 1
        },
        {
            "name": "OutputFile",
            "type": "PATH",
            "objectType": "FILE",
            "dataFlow": "OUT",
            "userInterface": {
                "control": "HIDDEN",
                "label": "Output File",
                "groupLabel": "Frame Range"
            },
            "default": "~\\Desktop\\output",
            "description": "The render output destination"
        },
        {
            "name": "FrameStart",
            "type": "STRING",
            "userInterface": {
                "control": "LINE_EDIT",
                "label": "Start Frame",
                "groupLabel": "Frame Range"
            },
            "default": "1-10",
        },
        {
            "name": "FrameEnd",
            "type": "STRING",
            "userInterface": {
                "control": "LINE_EDIT",
                "label": "End Frame",
                "groupLabel": "Frame Range"
            },
            "default": "1-10",
        },
        {
            "name": "JobScriptDir",
            "description": "Directory containing embedded scripts.",
            "userInterface": {
                "control": "HIDDEN"
            },
            "type": "PATH",
            "objectType": "DIRECTORY",
            "dataFlow": "IN",
            "default": "scripts"
        }
    ],
    "jobEnvironments": [{
        "name": "Create Output Directories",
        "description": "Create Output Directories",
        "script": {
            "actions": {
                "onEnter": {
                    "command": "powershell",
                    "args": [
                        "-File",
                        "{{Param.JobScriptDir}}/start.ps1",
                        "{{Param.OutputFile}}"
                    ]
                }
            }
        }
    }],
    "steps": [{
        "name": "{{COMPNAME}}",
        "hostRequirements": {
            "attributes": [{
                "name": "attr.worker.os.family",
                "anyOf": [
                    "windows"
                ]
            }]
        },
        "parameterSpace": {
            "taskParameterDefinitions": [{
                    "name": "FrameChunkStart",
                    "type": "INT",
                    "range": "{{Param.FrameStart}}"
                },
                {
                    "name": "FrameChunkEnd",
                    "type": "INT",
                    "range": "{{Param.FrameEnd}}"
                }
            ],
            "combination": "(FrameChunkStart, FrameChunkEnd)"
        },
        "script": {
            "actions": {
                "onRun": {
                    "command": "powershell",
                    "args": [
                        "-File",
                        "{{Param.JobScriptDir}}/aerender.ps1",
                        "{{Param.ProjectFile}}",
                        "{{Param.RenderQueueIndex}}",
                        "{{Task.Param.FrameChunkStart}}",
                        "{{Task.Param.FrameChunkEnd}}",
                        "{{Param.OutputFile}}"
                    ]
                }
            }
        }
    }]
};

/**
* Write the JSON file to the file path
*/
function writeJSONFile(jsonData, filePath) {

    var file = File(filePath);
    file.open('w');
    file.write(JSON.stringify(jsonData, null, 4));
    file.close();
}