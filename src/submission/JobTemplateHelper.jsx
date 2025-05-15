var jobTemplateHelperFile = "JobTemplateHelper.json";
/**
 * Generates the basic parameterValue file for the job template
 **/
function parameterValues(
    renderQueueIndex,
    projectFile,
    outputDir,
    outputFileName,
    isImageSeq,
    startFrame,
    endFrame,
    chunkSize,
    multiFrameRendering,
    maxCpuUsagePercentage
) {
    var parameterValuesList = [{
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
            name: "OutputDir",
            value: outputDir,
        },
        {
            name: "OutputFileName",
            value: outputFileName,
        },
        {
            name: "Frames",
            value: startFrame.toString() + "-" + endFrame.toString(),
        },
        {
            name: "MultiFrameRendering",
            value: multiFrameRendering,
        },
    ];
    if (maxCpuUsagePercentage) {
        parameterValuesList.push({
            name: "MaxCpuUsagePercentage",
            value: maxCpuUsagePercentage,
        })
    }
    if (isImageSeq) {
        parameterValuesList.push({
            name: "ChunkSize",
            value: chunkSize,
        });
    }
    return {
        parameterValues: parameterValuesList
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
                                ")",
                                false
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

    var fontsInProject = getFontsFromFile();

    if (fontsInProject.length > 0) {
        // Notify the user if any fonts are missing or are substituted during the session.
        // A substituted font is a font that was already missing when the project is opened.
        // A missing font is a font that went missing (e.g. font was uninstalled) while the project was open.
        if (app.fonts.missingOrSubstitutedFonts != "") {
            adcAlert("Missing fonts in project: " + (app.fonts.missingOrSubstitutedFonts).toString(), false);
        }
        // Formatting collected fonts
        var fontReferences = generateFontReferences(fontsInProject);
        for (var i = 0; i < fontReferences.length; i++) {
            attachments.push(fontReferences[i]);
        }
    }

    return attachments;
}

/**
 * Collects all fonts from the project.
 * @return an array of font metadata, each item containing the font's temp copy name and the actual location of that font file
 **/
function getFontsFromFile() {
    var fontLocations = [];
    // app.project.usedFonts was introduced in 24.5. Fall back to scanning text layers if version is older
    if (dcUtil.getAEVersion() >= 24.5) {
        var usedList = app.project.usedFonts;
        for (var i = 0; i < usedList.length; i++) {
            var font = usedList[i].font;
            var fontPostScriptName = font.postScriptName;
            var fontLocation = font.location || getLocationForFont(fontPostScriptName);
            if (!fontLocation) {
                adcAlert(
                    "The path to the font " + fontPostScriptName + " couldn't be identified.\n" +
                    "Please install the font for non-Adobe apps in Creative Cloud Desktop before submitting this project.", false
                );
                continue;
            }
            var fontName = createFontFilename(fontLocation, fontPostScriptName);
            if (fontName) {
                fontLocations.push([fontName, fontLocation]);
            }
        }
    } else {
        fontLocations = getFontsFromFileLegacy();
    }

    return fontLocations;
}

/**
 * Checks that the system has Python installed and version >= 3
 * @return String with executable name corresponding to Python 3, or an empty string if not found
 **/
function getPythonExecutable() {
    var pythonExecutables = ["python3", "python", "py"];

    for (var i = 0; i < pythonExecutables.length; i++) {
        // Search for python executable
        var pythonExecutable = pythonExecutables[i];
        var findCommand = "which " + pythonExecutable;
        var findSuccess = "/" + pythonExecutable;
        var os = $.os.toLowerCase();
        if (os.indexOf("windows") !== -1) {
            findCommand = "where " + pythonExecutable;
            findSuccess = "\\" + pythonExecutable;
        }
        var outputWhere = null;
        try {
            outputWhere = system.callSystem(findCommand);
            if (!outputWhere || outputWhere.indexOf(findSuccess) === -1) {
                logger.warning("Couldn't find Python with executable name '" + pythonExecutable + "'");
                continue;
            }
        } catch (e) {
            logger.error(e.message, jobTemplateHelperFile);
            logger.debug("Where command output: " + outputWhere, jobTemplateHelperFile);
        }

        // Python executable was found, verify Python version
        var output = null;
        try {
            output = system.callSystem(pythonExecutable + " --version");
            if (output && output.indexOf("Python ") !== -1) {
                var pythonVersion = parseInt(output.substring(output.indexOf(" ") + 1));
                if (pythonVersion >= 3) {
                    return pythonExecutable;
                }
            }
        } catch (e) {
            logger.error(e.message, jobTemplateHelperFile);
            logger.debug("Command output: " + output, jobTemplateHelperFile);
        }
    }

    // If reaching here, this means python version was too low or executable was not found
    var errorMessage =
        "Error: Couldn't find Python 3 or higher on your PATH.\n" +
        "\n" +
        "Please ensure that Python 3 or higher is installed correctly and added to your PATH.";
    logger.error(errorMessage, jobTemplateHelperFile);
    adcAlert(errorMessage, true);
    return "";
}

/**
 * Scans user font paths for user-installed fonts and parses their name metadata.
 * @return Font metadata object, or null if there was an error
 **/
function getFontPaths() {
    var errorMessage = "";
    // Ensure Python exists and is at least version 3
    var pythonExecutable = getPythonExecutable();
    if (!pythonExecutable) {
        return null;
    }
    var scriptPath = scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate/scripts/get_user_fonts.py";
    var scriptFile = new File(scriptPath);
    if (!scriptFile.exists) {
        errorMessage =
            "Error: Missing font script at " + scriptFile.fsName + "\n" +
            "\n" +
            "Please ensure that the Deadline Cloud Submitter is installed correctly.";
        adcAlert(errorMessage, true);
        return null;
    }

    var output = {};
    try {
        var outputRaw = system.callSystem(pythonExecutable + " \"" + scriptFile.fsName + "\"");
        output = JSON.parse(outputRaw);
    } catch (e) {
        logger.error(e.message, jobTemplateHelperFile);
        logger.debug("Command output: " + output, jobTemplateHelperFile);
        adcAlert(
            "Error when finding fonts:\n" +
            "\n" +
            e.message,
            true
        );
    }
    if ("error" in output) {
        adcAlert(
            output["error"],
            true
        );
        return null;
    }
    return output;
}

/**
 * Gets the path to a user-installed font whose PostScript name is fontPostScriptName.
 * @return The path to that font file or null if the path was not found
 **/
function getLocationForFont(fontPostScriptName) {
    var fontPath = null;
    try {
        // Get user-installed fonts
        var fontPaths = getFontPaths();
        if (!fontPaths) {
            return null;
        }
        for (var path in fontPaths) {
            if (fontPaths[path]["postscript_name"] == fontPostScriptName) {
                // Found path that matches the given font's name
                fontPath = path;
                break;
            }
        }
    } catch (e) {
        logger.error(e.message, jobTemplateHelperFile);
    }
    return fontPath;
}

/**
 * Generates a font filename based on the font name and the extension of the font filename.
 * @return a string with the font filename
 **/
function createFontFilename(fontLocation, fontPostScriptName) {
    var fileExtension = "";
    var lastDotIndex = fontLocation.lastIndexOf('.');
    var extensionRegex = /\.[a-zA-Z]+$/;

    var fontName = "";

    var validExtension = true;
    var fontExtensions = [".otf", ".ttf"];

    // Windows also supports .fon files
    var os = $.os.toLowerCase();
    if (os.indexOf("windows") !== -1) {
        fontExtensions.push(".fon");
    }

    // Some Adobe Fonts files have a dot followed by numbers as its name with no extension (e.g. ".52741")
    if (extensionRegex.test(fontLocation)) {
        fileExtension = fontLocation.substring(lastDotIndex).toLowerCase();
        var fontExtensionsAsString = fontExtensions.toString();
        if (fontExtensionsAsString.indexOf(fileExtension) == -1) {
            adcAlert(
                "font with an unsupported extension '" + fileExtension +
                "' was found: " + fontPostScriptName + ".\n" +
                "This font won't be added to the job.", false
            );
            validExtension = false;
        }
    }

    if (validExtension) {
        var fontName = fontPostScriptName + fileExtension;
    }

    return fontName;
}

/**
 * Collects all fonts from the project. After Effects versions < 24.5 do not have app.usedFonts.
 * @return an array of font metadata, each item containing the font's temp copy name and the actual location of that font file
 **/
function getFontsFromFileLegacy() {
    var fontLocations = [];
    var items = app.project.items;
    for (var i = items.length; i >= 1; i--) {
        var item = app.project.item(i);
        // Only look at CompItems
        if (!(item instanceof CompItem)) {
            continue;
        }
        for (var j = item.layers.length; j >= 1; j--) {
            var layer = item.layers[j];
            // Only look at TextLayers
            if (!(layer instanceof TextLayer)) {
                continue;
            }
            var sourceText = layer.text.sourceText;
            // Check if the sourceText property has keys.
            // If it has keys, the font can change over time and we need to check all keys for their font
            if (sourceText.numKeys) {
                var oldLocation = "";
                for (var k = 1; k <= sourceText.numKeys; k++) {
                    var textDocument = sourceText.keyValue(k);
                    var fontPostScriptName = "";
                    try {
                        fontPostScriptName = textDocument.fontObject.postScriptName;
                    } catch (e) {
                        logger.error(e.message, jobTemplateHelperFile);
                    }
                    var fontLocation = textDocument.fontLocation || getLocationForFont(fontPostScriptName);
                    if (oldLocation == fontLocation) {
                        continue;
                    }
                    if (!fontLocation) {
                        adcAlert(
                            "The path to the font " + fontPostScriptName + " couldn't be identified.\n" +
                            "Please install the font for non-Adobe apps in Creative Cloud Desktop before submitting this project.", false
                        );
                        continue;
                    }
                    var fontName = createFontFilename(fontLocation, fontPostScriptName);
                    if (fontName) {
                        fontLocations.push([fontName, fontLocation]);
                    }
                    oldLocation = fontLocation;
                }
            } else {
                var textDocument = sourceText.value;
                var fontPostScriptName = "";
                try {
                    fontPostScriptName = textDocument.fontObject.postScriptName;
                } catch (e) {
                    logger.error(e.message, jobTemplateHelperFile);
                }
                var fontLocation = textDocument.fontLocation || getLocationForFont(fontPostScriptName);
                if (!fontLocation) {
                    adcAlert(
                        "The path to the font " + fontPostScriptName + " couldn't be identified.\n" +
                        "Please install the font for non-Adobe apps in Creative Cloud Desktop before submitting this project.", false
                    );
                    continue;
                }
                var fontName = createFontFilename(fontLocation, fontPostScriptName);
                if (fontName) {
                    fontLocations.push([fontName, fontLocation]);
                }
            }
        }
    }
    return fontLocations;
}

/**
 * Copies given fonts to a temp folder.
 * @param fontPaths an array of font metadata, each item containing the font's temp copy name and the actual location of that font file
 * @return an array of the temp font paths that were created
 **/
function generateFontReferences(fontPaths) {
    // Create a temp folder where all used fonts get gathered
    var _tempFontsFolder = dcUtil.normPath(dcUtil.getTempFolder() + '/' + "tempFonts");
    var formattedFontsPaths = [];
    var tempFontPath = new Folder(_tempFontsFolder);
    if (!tempFontPath.exists) {
        tempFontPath.create();
    }

    // Copy the font files to the temp folder
    for (var i = 0; i < fontPaths.length; i++) {
        var fontName = fontPaths[i][0];
        var fontLocation = fontPaths[i][1];

        var fontFile = File(fontLocation);
        var _tempFontPath = dcUtil.normPath(_tempFontsFolder + "/" + fontName);
        var fontCopied = fontFile.copy(_tempFontPath);
        // Check if font file was actually copied.
        if (fontCopied) {
            formattedFontsPaths.push(_tempFontPath);
        }
    }
    return formattedFontsPaths;
}


function isVideoOutput(extension) {
    const VideoOutputExtensions = ["avi", "mp4", "mov"];
    return VideoOutputExtensions.indexOf(extension) >= 0;
}

function isAudioOutput(extension) {
    const AudioOutputExtensions = ["aif", "mp3", "wav"];
    return AudioOutputExtensions.indexOf(extension) >= 0;
}

function isImageOutput(extension) {
    const FrameOutputExtensions = ["dpx", "iff", "jpg", "jpeg", "exr", "png", "psd", "hdr", "sgi", "tif", "tiff", "tga"];
    return FrameOutputExtensions.indexOf(extension) >= 0;
}
