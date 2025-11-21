var jobTemplateHelperFile = "JobTemplateHelper.json";
/**
 * Generates the basic parameterValue file for the job template
 **/
function generateParameterValues(
    renderQueueIndex,
    projectFile,
    outputDir,
    outputFileName,
    isImageSeq,
    startFrame,
    endFrame,
    chunkSize,
    multiFrameRendering,
    maxCpuUsagePercentage,
    ignoreMissingDependencies,
    prefix
) {
    const parameterValuesList = [{
        name: prefix + "_RenderQueueIndex",
        value: renderQueueIndex,
    },
    {
        name: prefix + "_OutputDir",
        value: outputDir,
    },
    {
        name: prefix + "_OutputFileName",
        value: outputFileName,
    },
    {
        name: prefix + "_Frames",
        value: startFrame.toString() + "-" + endFrame.toString(),
    },
    {
        name: prefix + "_MultiFrameRendering",
        value: multiFrameRendering === true ? "ON" : "OFF",
    },
    ];
    if (maxCpuUsagePercentage) {
        parameterValuesList.push({
            name: prefix + "_MaxCpuUsagePercentage",
            value: maxCpuUsagePercentage,
        });
    }
    if (isImageSeq) {
        parameterValuesList.push({
            name: prefix + "_ChunkSize",
            value: chunkSize,
        });
    }
    if (ignoreMissingDependencies) {
        parameterValuesList.push({
            name: prefix + "_IgnoreMissingDependencies",
            value: ignoreMissingDependencies === true ? "ON" : "OFF",
        })
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
 * Helper for recursive job attachment search in findJobAttachments.
 * Updates the queue, exploredItems list, and attachments list after processing a single AV layer.
 */
function processAVLayer(layer, queue, exploredItems, attachments, ignoreMissingDependencies, shouldShowPopup) {
    if (layer == null || !(layer instanceof AVLayer) || layer.source == null) {
        return {
            queue: queue,
            exploredItems: exploredItems,
            attachments: attachments,
            shouldShowPopup: shouldShowPopup
        }
    }
    var src = layer.source;
    if (src.id in exploredItems) {
        return {
            queue: queue,
            exploredItems: exploredItems,
            attachments: attachments,
            shouldShowPopup: shouldShowPopup
        }
    }
    exploredItems[src.id] = true;
    if (src instanceof CompItem) {
        queue.push(src);
    } else if (src instanceof FootageItem && src.mainSource instanceof FileSource) {
        // We only care if the footage is missing when ignoreMissingDependencies is false
        if (src.footageMissing && !ignoreMissingDependencies) {
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
            attachments = attachments.concat(dcUtil.getFilePathsFromFootageItem(src));
        }
    }
    return {
        queue: queue,
        exploredItems: exploredItems,
        attachments: attachments,
        shouldShowPopup: shouldShowPopup
    }
}

/**
 * Helper for recursive job attachment search in findJobAttachments.
 * Updates the queue, exploredItems list, and attachments list after recursively processing all layers in a comp.
 */
function processJobAttachmentComp(queue, exploredItems, attachments, ignoreMissingDependencies) {
    var comp = queue.pop();
    var shouldShowPopup = true; // only show the popup once per comp so the user doesn't get spammed if there's a lot of missing media
    for (var i = 1; i <= comp.numLayers; i++) {
        var layer = comp.layer(i);
        var result = processAVLayer(layer, queue, exploredItems, attachments, ignoreMissingDependencies, shouldShowPopup);
        queue = result.queue;
        exploredItems = result.exploredItems;
        attachments = result.attachments;
        shouldShowPopup = result.shouldShowPopup;
    }
    return {
        queue: queue,
        exploredItems: exploredItems,
        attachments: attachments,
    }
}

/**
 * Breadth first sweep through the root composition to find all footage and font references
 * More efficient than just iterating through items in the project when
 * there is a lot of unused footage in the project
 **/
function findJobAttachments(rootComp, ignoreMissingDependencies) {
    if (rootComp == null) {
        return [];
    }
    if (ignoreMissingDependencies === undefined) {
        ignoreMissingDependencies = false;
    }
    var attachments = [];
    var exploredItems = {}; // using this object as a set because AE doesn't support sets
    attachments.push(app.project.file.fsName);
    exploredItems[rootComp.id] = true;
    var queue = [rootComp];
    while (queue.length > 0) {
        var result = processJobAttachmentComp(queue, exploredItems, attachments, ignoreMissingDependencies);
        queue = result.queue;
        exploredItems = result.exploredItems;
        attachments = result.attachments;
    }

    const fontsInProject = getFontsFromFile();

    if (fontsInProject.length > 0) {
        // Notify the user if any fonts are missing or are substituted during the session.
        // A substituted font is a font that was already missing when the project is opened.
        // A missing font is a font that went missing (e.g. font was uninstalled) while the project was open.
        //  Again only care if ignoreMissingDependencies is false
        if (app.fonts.missingOrSubstitutedFonts != "" && !ignoreMissingDependencies) {
            adcAlert("Missing fonts in project: " + (app.fonts.missingOrSubstitutedFonts).toString(), false);
        }
        // Formatting collected fonts
        const fontReferences = generateFontReferences(fontsInProject);
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
    var unsupportedFonts = {}; // using this object as a set because AE doesn't support sets
    var unsupportedFontList = [];
    var fontsWithoutLocation = [];
    // app.project.usedFonts was introduced in 24.5. Fall back to scanning text layers if version is older
    if (dcUtil.getAEVersion() >= 24.5) {
        const usedList = app.project.usedFonts;
        for (var i = 0; i < usedList.length; i++) {
            var font = usedList[i].font;
            var fontPostScriptName = font.postScriptName;
            var fontLocation = font.location || getLocationForFont(fontPostScriptName);
            if (!fontLocation) {
                fontsWithoutLocation.push(fontPostScriptName);
                continue;
            }
            var fontDetails = getFontFilenameAndSupportStatus(fontLocation, fontPostScriptName);
            if (fontDetails["isExtensionSupported"]) {
                fontLocations.push([fontDetails.fontName, fontLocation]);
            } else {
                unsupportedFonts[font.familyName + fontDetails.fileExtension] = true;
            }
        }
    } else {
        fontLocations = getFontsFromFileLegacy();
    }

    for (var key in unsupportedFonts) {
        unsupportedFontList.push(key);
    }
    if (unsupportedFontList.length > 0) {
        adcAlert(
            "Font(s) detected with unsupported extension(s) \n"
            + unsupportedFontList.join(", \n") +
            "\n\nThese font(s) won't be added to the job.", false
        );
    }

    if (fontsWithoutLocation.length > 0) {
        adcAlert(
            "The path to the below font(s) couldn't be identified. \n\n" +
            fontsWithoutLocation.join(", ") + "\n" +
            "\nPlease install the font for non-Adobe apps in Creative Cloud Desktop before submitting this project.", false
        );
    }

    return fontLocations;
}

/**
 * Checks that the system has Python installed and version >= 3
 * @return String with executable name corresponding to Python 3, or an empty string if not found
 **/
function getPythonExecutable() {
    const pythonExecutables = ["python3", "python", "py"];

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
    const errorMessage =
        "Error: Couldn't find Python 3 or higher on your PATH.\n" +
        "\n" +
        "Please ensure that Python 3 or higher is installed correctly and added to your PATH.";
    logger.error(errorMessage, jobTemplateHelperFile);
    adcAlert(errorMessage, true);
    return "";
}

/**
 * Gets the path to a user-installed font whose PostScript name is fontPostScriptName.
 * @return The path to that font file or null if the path was not found
 **/
function getLocationForFont(fontPostScriptName) {
    try {
        const pythonExecutable = getPythonExecutable();
        if (!pythonExecutable) {
            return null;
        }
        const scriptPath = scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate/scripts/get_user_fonts.py";
        const outputRaw = system.callSystem(pythonExecutable + " \"" + scriptPath + "\" \"" + fontPostScriptName + "\"");

        // Clean the output by removing all leading and trailing whitespace and newline characters
        const cleanOutput = outputRaw ? outputRaw.replace(/(^\s+)|(\s+$)/g, '') : null;

        if (cleanOutput === "FONT_NOT_FOUND" || cleanOutput === "FONT_ERROR") {
            logger.error("Error when finding font, received code: " + cleanOutput + "\n", jobTemplateHelperFile);
            return null;
        }

        return cleanOutput || null;
    } catch (e) {
        logger.error(e.message, jobTemplateHelperFile);
        return null;
    }
}

/**
 * Generates a font filename based on the font name and the extension of the font filename.
 * @return a string with the font filename
 **/
function createFontFilename(fontLocation, fontPostScriptName) {
    var fileExtension = "";
    const lastDotIndex = fontLocation.lastIndexOf('.');
    const extensionRegex = /\.[a-zA-Z]+$/;

    var fontName = "";

    var validExtension = true;
    const fontExtensions = [".otf", ".ttf", ".ttc"];

    // Windows also supports .fon files
    const os = $.os.toLowerCase();
    if (os.indexOf("windows") !== -1) {
        fontExtensions.push(".fon");
    }

    // Some Adobe Fonts files have a dot followed by numbers as its name with no extension (e.g. ".52741")
    if (extensionRegex.test(fontLocation)) {
        fileExtension = fontLocation.substring(lastDotIndex).toLowerCase();
        const fontExtensionsAsString = fontExtensions.toString();
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
 * Generates a font filename based on the font name and the extension of the font filename
 * and whether the extension is supported
 * @return an object with the font filename and extension validity
 **/
function getFontFilenameAndSupportStatus(fontLocation, fontPostScriptName) {
    var fileExtension = "";
    const lastDotIndex = fontLocation.lastIndexOf('.');
    const extensionRegex = /\.[a-zA-Z]+$/;

    var validExtension = true;
    const fontExtensions = [".otf", ".ttf", ".ttc"];

    // Windows also supports .fon files
    const os = $.os.toLowerCase();
    if (os.indexOf("windows") !== -1) {
        fontExtensions.push(".fon");
    }

    // Some Adobe Fonts files have a dot followed by numbers as its name with no extension (e.g. ".52741")
    if (extensionRegex.test(fontLocation)) {
        fileExtension = fontLocation.substring(lastDotIndex).toLowerCase();
        const fontExtensionsAsString = fontExtensions.toString();
        if (fontExtensionsAsString.indexOf(fileExtension) == -1) {
            validExtension = false;
        }
    }
    if (validExtension) {
        return {
            "isExtensionSupported": true,
            "fileExtension": fileExtension,
            "fontName": fontPostScriptName + fileExtension
        };
    } else {
        return {
            "isExtensionSupported": false,
            "fileExtension": fileExtension,
            "fontName": fontPostScriptName + fileExtension
        };
    }
}

/**
 * Collects all fonts from the project. After Effects versions < 24.5 do not have app.usedFonts.
 * @return an array of font metadata, each item containing the font's temp copy name and the actual location of that font file
 **/
function getFontsFromFileLegacy() {
    const fontLocations = [];
    const items = app.project.items;
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
    const _tempFontsFolder = dcUtil.normPath(dcUtil.getTempFolder() + '/' + "tempFonts");
    const formattedFontsPaths = [];
    const tempFontPath = new Folder(_tempFontsFolder);
    if (!tempFontPath.exists) {
        tempFontPath.create();
    }

    // Copy the font files to the temp folder
    for (var i = 0; i < fontPaths.length; i++) {
        var fontName = fontPaths[i][0];
        var fontLocation = fontPaths[i][1];

        // Normalize the font path for ExtendScript compatibility
        var normalizedFontLocation = fontLocation.replace(/\//g, File.fs == "Windows" ? "\\" : "/");
        var fontFile = File(normalizedFontLocation);
        var _tempFontPath = dcUtil.normPath(_tempFontsFolder + "/" + fontName);
        var fontCopied = fontFile.copy(_tempFontPath);
        // Check if font file was actually copied.
        if (fontCopied) {
            formattedFontsPaths.push(_tempFontPath);
        }
    }
    return formattedFontsPaths;
}