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
    chunkSize
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
        }
    ];
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
            // Warn the user that missing or substituted fonts will cause incorrect render output.
            var error_msg = "Warning: These fonts are missing or substituted:\n\n" +
                app.fonts.missingOrSubstitutedFonts.toString() + "\n\n" +
                "The fonts have been substituted with different fonts by After Effects and will render as the substituted fonts instead.\n" +
                "Please install the fonts and reopen this project to ensure correct render output.";
            if (app.fonts.missingOrSubstitutedFonts.length == 1) {
                error_msg = "Warning: This font is missing or substituted:\n\n" +
                    app.fonts.missingOrSubstitutedFonts.toString() + "\n\n" +
                    "The font has been substituted with a different font by After Effects and will render as the substituted font instead.\n" +
                    "Please install the font and reopen this project to ensure correct render output.";
            }
                
            adcAlert(error_msg, false);
        }
        // Build a new array containing only attachable fonts.
        var fontsInProjectFiltered = [];
        for (i = 0; i < fontsInProject.length; i++) {
            // If the font's fontPostScriptName contains a missing or substituted font name, log a warning
            if (app.fonts.missingOrSubstitutedFonts.toString().indexOf(fontsInProject[i].fontPostScriptName) !== -1) {
                logger.warning("Missing or substituted font: " + fontsInProject[i].fontPostScriptName, jobTemplateHelperFile);
            }
            // Always attach the font
            fontsInProjectFiltered.push(fontsInProject[i]);
        }
        // Formatting collected fonts
        var fontReferences = generateFontReferences(fontsInProjectFiltered);
        for (var j = 0; j < fontReferences.length; j++) {
            attachments.push(fontReferences[j]);
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
            var fontNameOverride = "";
            try {
                if (font.isSubstitute) {
                    fontFileName = font.location.replace(/\\/g, "/").substr(font.location.replace(/\\/g, "/").lastIndexOf("/") + 1); 
                    fontNameOverride = getPostScriptNameForFont(fontFileName);
                    if (fontNameOverride) {
                        logger.info("Changing substituted font file name from '" + fontPostScriptName + "' to '" + fontNameOverride + "'", jobTemplateHelperFile);
                    } else {
                        logger.warning("Couldn't get PostScript name for font: " + font.location + ", using: " + fontFileName, jobTemplateHelperFile);
                        fontNameOverride = fontFileName;
                    }
                }
            } catch (e) {
                logger.error(e.message, jobTemplateHelperFile);
            }
            
            var fontName = createFontFilename(fontLocation, fontPostScriptName, fontNameOverride);
            if (fontName) {
                fontLocations.push({
                    fontName: fontName,
                    fontLocation: fontLocation,
                    fontPostScriptName: fontPostScriptName
                });
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
    var pythonExecutables = ["python3", "python"];

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
                logger.warning("Couldn't find Python with executable name '" + pythonExecutable + "'", jobTemplateHelperFile);
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
 * Gets the PostScript name of an installed font whose file name is fontFileName.
 * @return The PostScript name of the font or null if the font was not found
 **/
function getPostScriptNameForFont(fontFileName) {
    var fontPostScriptName = null;
    try {
        // Get user-installed fonts
        var fontPaths = getFontPaths();
        if (!fontPaths) {
            return null;
        }
        for (var path in fontPaths) {
            if (path.indexOf(fontFileName) !== -1) {
                // Found name that matches the given font's path
                fontPostScriptName = fontPaths[path]["postscript_name"];
                break;
            }
        }
    } catch (e) {
        logger.error(e.message, jobTemplateHelperFile);
    }
    return fontPostScriptName;
}

/**
 * Generates a font filename based on the font name and the extension of the font filename.
 * @return a string with the font filename
 **/
function createFontFilename(fontLocation, fontPostScriptName, fontNameOverride) {
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

    if (fontNameOverride) {
        logger.warning("Overriding font file name from '" + fontPostScriptName + "' to '" + fontNameOverride + "'", jobTemplateHelperFile);
        fontName = fontNameOverride;
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
                    var fontNameOverride = "";
                    if (textDocument.fontObject.isSubstitute) {
                        fontFileName = textDocument.fontLocation.replace(/\\/g, "/").substr(textDocument.fontLocation.replace(/\\/g, "/").lastIndexOf("/") + 1); 
                        fontNameOverride = getPostScriptNameForFont(fontFileName);
                        if (fontNameOverride) {
                            logger.info("Changing substituted font file name from '" + fontPostScriptName + "' to '" + fontNameOverride + "'", jobTemplateHelperFile);
                        } else {
                            logger.warning("Couldn't get PostScript name for font: " + textDocument.fontLocation + ", using: " + fontFileName, jobTemplateHelperFile);
                            fontNameOverride = fontFileName;
                        }
                    }
                    var fontName = createFontFilename(fontLocation, fontPostScriptName, fontNameOverride);
                    if (fontName) {
                        fontLocations.push({
                            fontName: fontName,
                            fontLocation: fontLocation,
                            fontPostScriptName: fontPostScriptName
                        });
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
                var fontNameOverride = "";
                if (textDocument.fontObject.isSubstitute) {
                    fontFileName = textDocument.fontLocation.replace(/\\/g, "/").substr(textDocument.fontLocation.replace(/\\/g, "/").lastIndexOf("/") + 1); 
                    fontNameOverride = getPostScriptNameForFont(fontFileName);
                    if (fontNameOverride) {
                        logger.info("Changing substituted font file name from '" + fontPostScriptName + "' to '" + fontNameOverride + "'", jobTemplateHelperFile);
                    } else {
                        logger.warning("Couldn't get PostScript name for font: " + textDocument.fontLocation + ", using: " + fontFileName, jobTemplateHelperFile);
                        fontNameOverride = fontFileName;
                    }
                }
                var fontName = createFontFilename(fontLocation, fontPostScriptName, fontNameOverride);
                if (fontName) {
                    fontLocations.push({
                        fontName: fontName,
                        fontLocation: fontLocation,
                        fontPostScriptName: fontPostScriptName
                    });
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
    var _tempFontsFolder = dcUtil.normPath(Folder.temp.fsName + '/' + "tempFonts");
    var formattedFontsPaths = [];
    var tempFontPath = new Folder(_tempFontsFolder);
    if (!tempFontPath.exists) {
        tempFontPath.create();
    }

    // Copy the font files to the temp folder
    for (var i = 0; i < fontPaths.length; i++) {
        var fontName = fontPaths[i].fontName;
        var fontLocation = fontPaths[i].fontLocation;

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
