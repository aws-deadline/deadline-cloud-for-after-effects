/**
 * Generates the basic paramterValue file for the job template
 **/
function parameterValues(
    renderQueueIndex,
    projectFile,
    outputPaths,
    startFrame,
    endFrame,
    framesPerTask,
    multiFramePercentage
) {
    var frameStarts;
    var frameEnds;
    var re = new RegExp(".*[#+].*"); //checks for output patterns with [####] in them which usually indicates an image sequence
    var isSequence = false;
    for (var i = 0; i < outputPaths.length; i++) {
        isSequence = re.test(outputPaths[i]);
        if (isSequence) {
            break;
        }
    }

    var outputPathStr = outputPaths.join(",");
    if (framesPerTask < 1 || !isSequence) {
        frameStarts = startFrame.toString();
        frameEnds = endFrame.toString();
    } else if (framesPerTask == 1) {
        frameStarts = startFrame.toString() + "-" + endFrame.toString();
        frameEnds = frameStarts;
    } else {
        var frame = startFrame;
        var startArray = [];
        var endArray = [];
        while (frame <= endFrame) {
            startArray.push(frame.toString());
            frame = Math.min(endFrame + 1, frame + framesPerTask);
            endArray.push((frame - 1).toString());
        }
        frameStarts = startArray.join(",");
        frameEnds = endArray.join(",");
    }

    return JSON.stringify({
        parameterValues: [{
                name: "CondaPackages",
                value: "",
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
                name: "OutputFiles",
                value: outputPathStr,
            },
            {
                name: "FrameStarts",
                value: frameStarts,
            },
            {
                name: "FrameEnds",
                value: frameEnds,
            },
            {
                name: "MultiFrameMaxCPU",
                value: multiFramePercentage,
            },
        ],
    });
}

/**
 * Generates the basic format of the asset reference for job template.
 **/
function jobAttachmentsJson(inputFiles, outputFolders) {
    return JSON.stringify({
        assetReferences: {
            inputs: {
                directories: [],
                filenames: inputFiles,
            },
            outputs: {
                directories: outputFolders,
            },
            referencedPaths: [],
        },
    });
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
    var exploredItems = {}; //using this object as a set because AE doesn't support sets
    attachments.push(app.project.file.fsName);
    exploredItems[rootComp.id] = true;
    var queue = [rootComp];
    while (queue.length > 0) {
        var comp = queue.pop();
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            var shouldShowPopup = true; //only show the popup once per comp so the user doesn't get spammed if there's a lot of missing media
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