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
 * Breadth first sweep through the root composition to find all footage and font references
 * More efficient than just iterating through items in the project when 
 * there is a lot of unused footage in the project   
 **/
function findJobAttachments(rootComp) {
    if (rootComp == null) {
        return [];
    }
    var attachments = [];
    var fontsInComp = [];
    var exploredItems = {}; //using this object as a set because AE doesn't support sets
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
            if (layer instanceof TextLayer){
                var font = layer.text.sourceText.value;
                var fontLocation = font.fontLocation;
                // If the font location has a font extension, use the actual file name
                if(fontLocation.indexOf(".otf") !== -1 || fontLocation.indexOf(".ttf") !== -1) {
                    var fontLocationSplit = fontLocation.split("\\");
                    var fontName = fontLocationSplit[fontLocationSplit.length - 1];
                }
                // Else use the family name for the temp file that will be created 
                else {
                    if (dcUtil.getAEVersion() >= 24){
                        var fontName = font.font + ".otf";
                    } 
                    else {
                        var fontFamilyName = font.familyName;
                        var familyStyle = font.styleName;
                        var fontName = fontFamilyName + " " + familyStyle + ".otf";
                    }
                }
                fontsInComp.push([fontName, fontLocation]);
            }
        }
    }

    if (fontsInComp.length > 0){
        // formatting collected fonts
        var fontReferences = generateFontReferences(fontsInComp);
        for (var j = 0; j < fontReferences.length; j++){
            attachments.push(fontReferences[j]);
        }
    }

    return attachments;
}

/**
 * Copies given fonts to a temp folder. 
 * @param fontPaths an array containing the actual location of the font file and the name that should be given to the temp copy per font
 * @return an array of the temp font paths that were created
 **/
function generateFontReferences(fontPaths){
    // Create a temp folder where all used fonts get gathered
    var _tempFontsFolder = dcUtil.normPath(Folder.temp.fsName + '/' + "tempFonts");
    var formattedFontsPaths = [];
    var tempFontPath = new Folder(_tempFontsFolder);
    if(!tempFontPath.exists){
        tempFontPath.create();
    }

    // Copy the font files to the temp folder
    for (var i = 0; i < fontPaths.length; i++){
        var fontName = fontPaths[i][0];
        var fontLocation = fontPaths[i][1];

        var fontFile = File(fontLocation);
        var _tempFontPath = dcUtil.normPath(_tempFontsFolder + "/" + fontName);
        fontFile.copy(_tempFontPath);
        formattedFontsPaths.push(_tempFontPath);
    }
    return formattedFontsPaths;
}

/*
 * Write the JSON file to the file path
 */
function writeJSONFile(jsonData, filePath) {

    var file = File(filePath);
    file.open('w');
    file.write(JSON.stringify(jsonData, null, 4));
    file.close();
}