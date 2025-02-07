/**
 * Submit the selected render queue item
 **/
function SubmitSelection(selection, framesPerTask) {
    const submitBundleFile = "SubmitButton.jsx";
    // first we must verify that our selection is valid
    if (selection == null) {
        adcAlert("Error: No selection", true);
        return;
    }

    var renderQueueIndex = selection.renderQueueIndex;
    var rqi;

    // because our panel is updated independently of the render queue, the two may become out of sync
    // we need to verify that the selection made actually matches what is in the render queue
    if (
        renderQueueIndex < 1 ||
        renderQueueIndex > app.project.renderQueue.numItems
    ) {
        adcAlert(
            "Error: Render Queue has changed since last refreshing. Refreshing panel now. Please try again.", true
        );
        updateList();
        return;
    }
    rqi = app.project.renderQueue.item(renderQueueIndex);
    if (rqi == null || rqi.comp.id != selection.compId) {
        adcAlert(
            "Error: Render Queue has changed since last refresh. Refreshing panel now. Please try again.", true
        );
        updateList();
        return;
    }
    if (rqi.numOutputModules > 1) {
        adcAlert(
            "Warning: Multiple output modules detected. It is not supported in current submitter. Please raise an issue on Github repo for feature request.", false
        );
        return;
    }

    //We have a valid selection
    var confirmation = confirm("Project must be saved before submitting. Continue?");
    if (!confirmation) {
        return;
    } else {
        app.project.save();
    }
    if (app.project.file == null) {
        // If the user hit yes to the prompt, but the file had never been saved, a second prompt would appear asking where they would want to save the project.
        // If they hit cancel on the second prompt, the project file should be null and we should cancel the submission.
        return;
    }
    var outputPath = "";
    var outputFile = "";
    var outputFolder = "";
    for (var j = 1; j <= rqi.numOutputModules; j++) {
        var outputModule = rqi.outputModule(j).file;
        if (outputModule == null) {
            if (rqi.numOutputModules > 1) {
                adcAlert("Error: Output module does not have its output file set", true);
            } else {
                adcAlert(
                    "Error: One of your output modules does not have its output file set", true
                );
            }
            return;
        } else {
            outputPath = outputModule.fsName;
            outputFile = outputModule.name;
            outputFolder = outputModule.parent.fsName;
            logger.debug("OutputPath is: " + outputPath, submitBundleFile);
            logger.debug("OutputFile is: " + outputFile, submitBundleFile);
            logger.debug("outputFolder is: " + outputFolder, submitBundleFile);
        }
    }
    var renderSettings = rqi.getSettings(GetSettingsFormat.STRING_SETTABLE);
    var startFrame = Number(
        timeToFrames(
            Number(renderSettings["Time Span Start"]),
            Number(renderSettings["Use this frame rate"])
        )
    );
    var endFrame =
        Number(
            timeToFrames(
                Number(renderSettings["Time Span End"]),
                Number(renderSettings["Use this frame rate"])
            )
        ) - 1; // end frame is inclusive so we subtract 1

    var dependencies = findJobAttachments(rqi.comp); // list of filenames
    var compName = dcUtil.removeIllegalCharacters(rqi.comp.name);

    function generateAssetReferences(bundlePath, sanitizedOutputFolder) {
        // Write the asset_references.json file
        var jobAttachmentsContents = jobAttachmentsJson(
            dependencies,
            sanitizedOutputFolder
        );
        var assetReferencesOutDir = bundlePath + "/asset_references.json";
        writeFile(assetReferencesOutDir, JSON.stringify(jobAttachmentsContents, null, 4));
    }

    /**
     * Generates parameter_values json file
     **/
    function generateParameterValues(bundlePath, outputFolder, outputFileName, isImageSeq) {
        var parametersOutDir = bundlePath + "/parameter_values.json";
        writeFile(
            parametersOutDir,
            JSON.stringify(
                parameterValues(
                    renderQueueIndex,
                    app.project.file.fsName,
                    outputFolder,
                    outputFileName,
                    isImageSeq,
                    startFrame,
                    endFrame,
                    framesPerTask
                ),
                null,
                4,
            )
        );
    }

    /**
     * Generates job template json file
     **/
    function generateTemplate(bundlePath, isImageSeq) {
        // Open the template depending on the output type
        var path = bundlePath + "/video_template.json";
        if (isImageSeq) {
            path = bundlePath + "/image_template.json";
        }
        var templateContents = readFile(path);
        // Parse the template string to a JSON object
        var templateObject = JSON.parse(templateContents);
        templateObject.name = File.decode(app.project.file.name) + " [" + compName + "]";
        logger.debug("The template name is " + templateObject.name, submitBundleFile);
        try {
            if (templateObject.steps[0].name) {
                templateObject.steps[0].name = compName;
                logger.debug("The step name is " + templateObject.steps[0].name, submitBundleFile);
            }
        } catch (e) {
            adcAlert("Error accessing the template's steps name. \nPlease check your template.json and make sure you have name under steps.", true);
            logger.debug("Error accessing the template's steps name. " + error, submitBundleFile);
        }
        const aftereffectsVersion = app.version[0] + app.version[1];
        logger.debug("The major version of After Effects is " + aftereffectsVersion, submitBundleFile);

        var paramDefCopy = templateObject.parameterDefinitions;

        for (var i = paramDefCopy.length - 1; i >= 0; i--) {
            if (paramDefCopy[i].name == "CondaPackages") {
                paramDefCopy[i].default = "aftereffects=" + aftereffectsVersion;
            }
        }
        writeFile(bundlePath + "/template.json", JSON.stringify(templateObject, null, 4));
        logger.debug("Wrote the template.json file to the bundle folder " + bundlePath, submitBundleFile);
    }

    /**
     * Generates the job bundle, including template.json, parameter_values.json
     * and asset_references.json
     **/
    function generateBundle() {
        // create the job bundle folder
        var bundleRoot = new Folder(
            Folder.temp.fsName + "/DeadlineCloudAESubmission"
        ); //forward slash works on all operating systems
        recursiveDelete(bundleRoot);
        bundleRoot.create();
        var bundlePath = bundleRoot.fsName;

        var sanitizedOutputFolder = sanitizeFilePath(outputFolder);

        const outputFileNameNoRegex = getFileNameNoRegex(outputFile);
        const extension = getFileExtension(outputFileNameNoRegex);
        logger.debug("extension set to: " + extension, submitBundleFile);
        const isImageSeq = isImageOutput(extension);

        var sanitizedOutputFileName = dcUtil.removePercentageFromFileName(outputFileNameNoRegex);
        logger.debug("sanitizedOutputFileName is " + sanitizedOutputFileName, submitBundleFile);

        generateAssetReferences(bundlePath, sanitizedOutputFolder);
        generateParameterValues(bundlePath, sanitizedOutputFolder, sanitizedOutputFileName, isImageSeq);

        var jobTemplateSourceFolder = new Folder(
            scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate"
        );
        if (!jobTemplateSourceFolder.exists) {
            adcAlert(
                "Error: Missing job template at " + jobTemplateSourceFolder.fsName, true
            );
            return null;
        }
        recursiveCopy(jobTemplateSourceFolder, bundleRoot);

        generateTemplate(bundlePath, isImageSeq);
        return bundleRoot;
    }
    var bundle = generateBundle();

    // Runs a bat script that requires extra permissions but will not block the After Effects UI while submitting.
    var cmd =
        'deadline bundle gui-submit "' + bundle.fsName + "\" --output json --install-gui";
    var logFile = new File(Folder.temp.fsName + "/submitter_output.log");
    logFile.open("w"); // Erase contents of active log file
    logFile.close();
    var submitScriptContents = "";
    var output = "";
    if ($.os.toString().slice(0, 7) === "Windows") {
        var tempBatFile = new File(
            Folder.temp.fsName + "/DeadlineCloudAESubmission.bat"
        );
        submitScriptContents = cmd + " > " + Folder.temp.fsName + "\\submitter_output.log 2>&1";
        tempBatFile.open("w");
        tempBatFile.writeln("@echo off");
        tempBatFile.writeln("echo:"); //this empty print statement is required to circumvent a weird bug
        tempBatFile.writeln(submitScriptContents);
        tempBatFile.writeln("IF %ERRORLEVEL% NEQ 0 (");
        tempBatFile.writeln(" echo ERROR CODE: %ERRORLEVEL% >>" + logFile.fsName);
        tempBatFile.writeln(")");
        tempBatFile.close();
        system.callSystem(tempBatFile.fsName);
        if (logFile.exists) {
            logFile.open("r");
            output = logFile.read();
            logFile.close();
        }
    } else {
        // Execute the command using a bash in the interactive mode so it loads the bash profile to set
        // the PATH correctly.
        var shellPath = $.getenv("SHELL") || "/bin/bash";
        submitScriptContents = shellPath + " -i -c '" + cmd + "'";
        output = system.callSystem(submitScriptContents + ' || echo "\nERROR CODE: $?"');
    }
    if (output.indexOf("\nERROR CODE: ", 0) >= 0) {
        adcAlert(
            "ERROR:" + output, true
        );
        logger.error("Error when launching Deadline GUI submitter: " + output, "Utils.jsx");
    }
}