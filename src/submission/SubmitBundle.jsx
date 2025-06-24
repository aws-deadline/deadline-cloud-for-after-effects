var JobParams = [
    "JobScriptDir",
    "CondaPackages",
    "ProjectFile"
]

var paramPattern = "Param\."
for (var p=0;p<JobParams.length;p++) {
    paramPattern = paramPattern + "(?!" + JobParams[p] + ")"
}
var paramPatternRegex = new RegExp(paramPattern, 'g')


// Validate that the RenderQueueIndex for each selectionItem is still valid
function UpdateRenderQueueIndices(renderQueueIndex, selectionItem) {
    if (
        renderQueueIndex < 1 ||
        renderQueueIndex > app.project.renderQueue.numItems
    ) {
        adcAlert(
            "Error: Render Queue has changed since last refreshing. Refreshing panel now. Please try again.", true
        );
        updateList();
        return false;
    }

    const renderQueueItem = app.project.renderQueue.item(renderQueueIndex);
    if (renderQueueItem == null || renderQueueItem.comp.id != selectionItem.compId) {
        adcAlert(
            "Error: Render Queue has changed since last refresh. Refreshing panel now. Please try again.", true
        );
        updateList();
        return false;
    }
    if (renderQueueItem.numOutputModules > 1) {
        adcAlert(
            "Warning: Multiple output modules detected. It is not supported in current submitter. Please raise an issue on Github repo for feature request.", false
        );
        return false;
    }
    return true;
}

// Validate that our outputModule is set
function validateRenderQueueItemOutputModule(renderQueueItem) {
    // We have already validated that we don't have more than 1 `numOutputModels`
    const outputModule = renderQueueItem.outputModule(1).file;
    if (outputModule == null) {
        adcAlert("Error: Render Queue Item " + renderQueueItem.comp.name + " does not have its output file set", true);
        return false;
    }
    return true;
}

// Generate our prefixed Parameter Values for the provided comp
function generateParameterValuesForStep(
    prefix,
    renderQueueIndex,
    outputFolder,
    outputFileName,
    isImageSeq,
    startFrame,
    endFrame,
    chunkSize,
    multiFrameRendering,
    maxCpuUsagePercentage,
) {
    return parameterValues(
        renderQueueIndex,
        app.project.file.fsName,
        outputFolder,
        outputFileName,
        isImageSeq,
        startFrame,
        endFrame,
        chunkSize,
        multiFrameRendering,
        maxCpuUsagePercentage,
        prefix,
    )
}

// Loading our default template from disk
function loadDefaultJobTemplate(bundlePath, submitBundleFile) {
    const path = bundlePath + "/template.json";
    const templateContents = readFile(path);
    // Parse the template string to a JSON object
    const templateObject = JSON.parse(templateContents);
    templateObject.name = File.decode(app.project.file.name);
    logger.debug("The template name is " + templateObject.name, submitBundleFile);

    return templateObject
}

// Generates the job bundle and copies files from our template source folder into it
function generateBundle() {
    // create the job bundle folder
    const bundleRoot = new Folder(
        dcUtil.getTempFolder() + "/DeadlineCloudAESubmission"
    ); //forward slash works on all operating systems
    recursiveDelete(bundleRoot);
    bundleRoot.create();

    const jobTemplateSourceFolder = new Folder(
        scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate"
    );
    if (!jobTemplateSourceFolder.exists) {
        adcAlert(
            "Error: Missing job template at " + jobTemplateSourceFolder.fsName, true
        );
        return null;
    }
    recursiveCopy(jobTemplateSourceFolder, bundleRoot);
    return bundleRoot;
}

// Generates the parameter definitions for each step by loading the `parameter_definitions_<>_fragment.json`
//      Adding our `( <CompName> )` to the label and changing the name to prefixed by `<CompName>_`
function generateStepParameterFragment(bundlePath, isImageSeq, compName) {
    var path = bundlePath + "/parameter_definitions_video_fragment.json";
    if (isImageSeq) {
        path = bundlePath + "/parameter_definitions_image_fragment.json";
    }
    const stepParametersContents = readFile(path);
    // Parse the template string to a JSON object
    const stepParametersObject = JSON.parse(stepParametersContents);

    const updatedParameterDefinitions = []
    for (var i=0;i<stepParametersObject.parameterDefinitions.length;i++) {
        if (JobParams.indexOf(stepParametersObject.parameterDefinitions[i].name) !== -1) {
            // Don't modify these values
            continue
        }
        var replacedDefinition = stepParametersObject.parameterDefinitions[i]
        replacedDefinition.name = compName + "_" + stepParametersObject.parameterDefinitions[i].name
        replacedDefinition.userInterface.label = "(" + compName + ") " + replacedDefinition.userInterface.label

        updatedParameterDefinitions.push(replacedDefinition)
    }
    stepParametersObject.parameterDefinitions = updatedParameterDefinitions
    return stepParametersObject
}

// Generates the step chunk of the template for each step by loading the `step_<>_fragment.json`
//      Replacing the parmaeters to be pointing to our per-CompName parameters and updating any parameters in the onRun
function generateStepTemplateFragment(bundlePath, isImageSeq, compName) {
    var path = bundlePath + "/step_video_fragment.json";
    if (isImageSeq) {
        path = bundlePath + "/step_image_fragment.json";
    }
    const stepTemplateContents = readFile(path);
    // Parse the template string to a JSON object
    const stepTemplateObject = JSON.parse(stepTemplateContents);

    if (isImageSeq) {
        // Replace parameter names in the creation of `Index`
        const taskParameters = stepTemplateObject.steps[0].parameterSpace.taskParameterDefinitions[0]
        taskParameters.range = taskParameters.range.replace(paramPatternRegex, "Param." + compName + "_")
        taskParameters.name = compName + "_" + taskParameters.name
        stepTemplateObject.steps[0].parameterSpace.taskParameterDefinitions[0] = taskParameters
    }

    stepTemplateObject.steps[0].name = compName;
    // Replace any parameter names in onRun script
    const scriptArgs = stepTemplateObject.steps[0].script.actions.onRun.args
    const replacedArgs = []
    for (var i=0;i<scriptArgs.length;i++) {
        // JobParams
        replacedArgs.push(scriptArgs[i].replace(paramPatternRegex, "Param." + compName + "_"))
    }
    stepTemplateObject.steps[0].script.actions.onRun.args = replacedArgs

    return stepTemplateObject
}

// Modifies the `Create Output Directories` job environment by adding all of our output folder parameters
function generateJobEnvironmentFragment(bundlePath, outputFoldersStr) {
    const path = bundlePath + "/job_environments_fragment.json";
    const jobEnvironmentsContents = readFile(path);
    // Parse the template string to a JSON object
    const jobEnvironmentsObject = JSON.parse(jobEnvironmentsContents);

    for (var j=0;j<jobEnvironmentsObject.jobEnvironments.length;j++) {
        if (jobEnvironmentsObject.jobEnvironments[j].name === "Create Output Directories") {
            jobEnvironmentsObject.jobEnvironments[j].script.actions.onEnter.args = [
                "{{Param.JobScriptDir}}/create_output_directory.py",
                outputFoldersStr
            ]
        }
    }
    return jobEnvironmentsObject
}

/**
 * Submit the selected render queue item
 **/
function SubmitSelection(selection, framesPerTask, multiFrameRendering, maxCpuUsagePercentage, taskTimeoutDays, taskTimeoutHours, taskTimeoutMinutes) {
    // Calculate task run timeout in seconds
    var taskTimeoutSeconds = 0;
    // Validate timeout values during job submission
    if (taskTimeoutDays === 0 && taskTimeoutHours === 0 && taskTimeoutMinutes === 0) {
        adcAlert("The following timeout value must be greater than 0: TaskRun", true);
        throw new Error("Task run timeout must be greater than zero");
    }
    taskTimeoutSeconds = (taskTimeoutDays * 24 * 60 * 60) + (taskTimeoutHours * 60 * 60) + (taskTimeoutMinutes * 60);

    const submitBundleFile = "SubmitButton.jsx";
    const renderQueueItems = []

    // Check to make sure that all of our selection indices are correct
    for (var i=0;i<selection.length;i++) {
        var selectionItem = selection[i];
        var initialRenderQueueIndex = selectionItem.renderQueueIndex;

        // because our panel is updated independently of the render queue, the two may become out of sync
        // we need to verify that the selection made actually matches what is in the render queue
        if (!UpdateRenderQueueIndices(initialRenderQueueIndex, selectionItem)) {
            return;
        }
        var initialRenderQueueItem = app.project.renderQueue.item(initialRenderQueueIndex);
        renderQueueItems.push([initialRenderQueueItem, initialRenderQueueIndex])
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

    // Check if warning should be shown
    const ignoreWarning = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_IGNORE_VERSION_WARNING) === "true";
    const savedVersion = parseFloat(app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_IGNORE_VERSION_WARNING_VERSION) || "0");
    const currentVersion = dcUtil.getAEVersion();

    // Is this AE version not supported in the deadline-cloud channel?
    if (SUPPORTED_VERSIONS.indexOf(currentVersion) === -1) {
        // If so, has the warning already been ignored or is the user on a different AE version and we should warn them again?
        if (!ignoreWarning || savedVersion !== currentVersion) {
            const versionMismatchWarningMessage = "Warning: Your After Effects version " + currentVersion +
            " is not officially supported in the deadline-cloud conda channel. Supported versions are: " + SUPPORTED_VERSIONS.join(", ") + ". " +
            "This may result in compatibility issues or failed jobs.\n\nDon't show this warning again for version " + currentVersion + "?";

            // Provide warning, and if acknowledged, store their current version and warning preference. Otherwise, block job submission.
            app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_IGNORE_VERSION_WARNING_VERSION, currentVersion.toString());
            if (confirm(versionMismatchWarningMessage)) {
                app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_IGNORE_VERSION_WARNING, "true");
            } else {
                app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_IGNORE_VERSION_WARNING, "false");
                return;
            }
        } else {
            logger.debug("Version mismatch already acknowledged, version warning skipped.");
        }
        logger.debug("Defaulting to After Effects major version conda package to minimize incompatibility issues.");
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
            app.project.save();
        }
        if (app.project.file == null) {
            // If the user hit yes to the prompt, but the file had never been saved, a second prompt would appear asking where they would want to save the project.
            // If they hit cancel on the second prompt, the project file should be null and we should cancel the submission.
            return;
        }
    }

    // Calculate frame range using the utility function
    const frameRange = dcUtil.calculateFrameRange(rqi);
    const startFrame = frameRange.startFrame;
    const endFrame = frameRange.endFrame;

    const aftereffectsVersion = app.version[0] + app.version[1];
    logger.debug("The major version of After Effects is " + aftereffectsVersion, submitBundleFile);

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
                    framesPerTask,
                    multiFrameRendering,
                    maxCpuUsagePercentage
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
        try {
            if (templateObject.steps[0].script && templateObject.steps[0].script.actions) {
                // Add timeout to the onRun action
                if (templateObject.steps[0].script.actions.onRun) {
                    templateObject.steps[0].script.actions.onRun["timeout"] = taskTimeoutSeconds;
                    logger.debug("Added timeout of " + taskTimeoutSeconds + " seconds to onRun action", submitBundleFile);
                }
            }
        } catch (e) {
            adcAlert("Error accessing the template's actions. \nPlease check your template.json.", true);
            logger.debug("Error accessing the template's actions: " + e.message, submitBundleFile);
        }

        var aftereffectsCondaVersion = dcUtil.getAEVersion();
        if (SUPPORTED_VERSIONS.indexOf(aftereffectsCondaVersion) === -1) {
            aftereffectsCondaVersion = Math.floor(aftereffectsCondaVersion);
        }
        logger.debug("The compatible version of After Effects is " + aftereffectsCondaVersion, submitBundleFile);

    // generateTemplate(bundle.fsName, isImageSeq, compName, submitBundleFile);
    const stepOutputFolderParameters = [];

        for (var i = paramDefCopy.length - 1; i >= 0; i--) {
            if (paramDefCopy[i].name == "CondaPackages") {
                paramDefCopy[i].default = "aftereffects=" + aftereffectsCondaVersion;
            }
        }

        var stepFramesPerTask = parseInt(selectionSettings.get(renderQueueItem.comp.id).framesPerTask() || framesPerTask)
        var stepMaxCpuUsagePercentage = parseInt(selectionSettings.get(renderQueueItem.comp.id).maxCpuUsagePercentage() || maxCpuUsagePercentage)
        var stepMultiFrameRendering = selectionSettings.get(renderQueueItem.comp.id).multiFrameRendering() || multiFrameRendering

        var outputModule = renderQueueItem.outputModule(1).file;
        var outputPath = outputModule.fsName;
        var outputFile = outputModule.name;
        var outputFolder = outputModule.parent.fsName;

        logger.debug("OutputPath is: " + outputPath, submitBundleFile);
        logger.debug("OutputFile is: " + outputFile, submitBundleFile);
        logger.debug("OutputFolder is: " + outputFolder, submitBundleFile);

        var renderSettings = renderQueueItem.getSettings(GetSettingsFormat.STRING_SETTABLE);
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

        var dependencies = findJobAttachments(renderQueueItem.comp); // list of filenames
        var compName = dcUtil.removeIllegalCharacters(renderQueueItem.comp.name);

        var sanitizedOutputFolder = sanitizeFilePath(outputFolder);

        var outputFileNameNoRegex = getFileNameNoRegex(outputFile);
        var extension = getFileExtension(outputFileNameNoRegex);
        logger.debug("extension set to: " + extension, submitBundleFile);
        var isImageSeq = isImageOutput(extension);

        var sanitizedOutputFileName = dcUtil.removePercentageFromFileName(outputFileNameNoRegex);
        logger.debug("sanitizedOutputFileName is " + sanitizedOutputFileName, submitBundleFile);

        // Push step asset references
        for (var d=0;d<dependencies.length;d++) {
            jobAssetReferences.assetReferences.inputs.filenames.push(dependencies[d])
        }
        jobAssetReferences.assetReferences.outputs.directories.push(sanitizedOutputFolder)

        var parameterValues = generateParameterValuesForStep(
            compName,
            renderQueueIndex,
            sanitizedOutputFolder,
            sanitizedOutputFileName,
            isImageSeq,
            startFrame,
            endFrame,
            stepFramesPerTask,
            stepMultiFrameRendering,
            stepMaxCpuUsagePercentage
        )

        for (var p=0;p<parameterValues.parameterValues.length;p++) {
            if (jobParameterValues.parameterValues.indexOf(parameterValues.parameterValues[p]) === -1) {
                jobParameterValues.parameterValues.push(parameterValues.parameterValues[p])
            }
        }

        stepOutputFolderParameters.push("{{Param." + compName + "_OutputDir}}")

        var stepTemplate = generateStepTemplateFragment(bundle.fsName, isImageSeq, compName)
        for (var s=0;s<stepTemplate.steps.length;s++) {
            template.steps.push(stepTemplate.steps[s])
        }
        var stepParameters = generateStepParameterFragment(bundle.fsName, isImageSeq, compName)
        for (var p=0;p<stepParameters.parameterDefinitions.length;p++) {
            var parameterExists = false;
            for (var tpd=0;tpd<template.parameterDefinitions.length;tpd++) {
                var templateParameterDefinition = template.parameterDefinitions[tpd];
                var stepParameterDefinition = stepParameters.parameterDefinitions[p];
                if (templateParameterDefinition.name == stepParameterDefinition.name) {
                    parameterExists = true
                    break
                }
            }
            if (parameterExists === false) {
                template.parameterDefinitions.push(stepParameters.parameterDefinitions[p])
            }
        }
    }
    const generatedJobEnvironment = generateJobEnvironmentFragment(bundle.fsName, stepOutputFolderParameters.join(","))
    template.jobEnvironments = generatedJobEnvironment.jobEnvironments

    writeFile(bundle.fsName + "/parameter_values.json",JSON.stringify(jobParameterValues, null, 4));

    writeFile(bundle.fsName + "/template.json", JSON.stringify(template, null, 4));
    logger.debug("Wrote the template.json file to the bundle folder " + bundle.fsName, submitBundleFile);

    // Runs a bat script that requires extra permissions but will not block the After Effects UI while submitting.
    const logFile = new File(dcUtil.getTempFolder() + "/submitter_output.log");
    logFile.open("w"); // Erase contents of active log file
    logFile.close();
    var submitScriptContents = "";
    var output = "";
    var cmd = "";
    if ($.os.toString().slice(0, 7) === "Windows") {
        const tempBatFile = new File(
            dcUtil.getTempFolder() + "/DeadlineCloudAESubmission.bat"
        );
        cmd =
            'deadline bundle gui-submit \"' + bundle.fsName + '\" --output json --install-gui --submitter-name \"After Effects\"';
        submitScriptContents = cmd + " > " + dcUtil.getTempFolder() + "\\submitter_output.log 2>&1";
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
        const shellPath = $.getenv("SHELL") || "/bin/bash";
        cmd =
            'deadline bundle gui-submit \\\"' + bundle.fsName + '\\\" --output json --install-gui --submitter-name=\\\\\\\"After Effects\\\\\\\"';
        submitScriptContents = shellPath + " -i -c \\\"" + cmd + "\\\" && exit";
        output = system.callSystem('osascript -e \'tell application "Terminal"\' -e \'do script "' + submitScriptContents + '\"\'' + ' -e \'end tell\' > /dev/null');
    }
    if (output.indexOf("\nERROR CODE: ", 0) >= 0) {
        adcAlert(
            "ERROR:" + output, true
        );
        logger.error("Error when launching Deadline GUI submitter: " + output, "Utils.jsx");
    }
}