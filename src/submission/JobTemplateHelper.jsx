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

/**
 * Write the JSON file to the file path
 */
function writeJSONFile(jsonData, filePath) {

    var file = File(filePath);
    file.open('w');
    file.write(JSON.stringify(jsonData, null, 4));
    file.close();
}