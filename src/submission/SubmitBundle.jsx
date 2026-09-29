// Parameters that are declared once for the whole job instead of once per render queue item.
// Listing a name here has two effects: generateStepParameterFragment skips emitting a per-item
// definition for it, and generateStepTemplateFragment leaves "{{Param.<name>}}" references in the
// step fragments unprefixed so that every step resolves them to the single job-level parameter.
var JobParams = [
    "JobScriptDir",
    "CondaPackages",
    "ProjectFile",
    "ChunkSize",
    "MultiFrameRendering",
    "MaxCpuUsagePercentage",
    "IgnoreMissingDependencies"
]

var paramPattern = "Param\\.";
for (var p = 0; p < JobParams.length; p++) {
    paramPattern = paramPattern + "(?!" + JobParams[p] + ")";
}
var paramPatternRegex = new RegExp(paramPattern, 'g');

if (typeof submitBundleFile == 'undefined') {
    const submitBundleFile = "SubmitButton.jsx";
}

// Validate that the RenderQueueIndex for each selectionItem is still valid and update list if they're out of date
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
    validateRenderQueueItemOutputModule(renderQueueItem);
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

// Loading our default template from disk
function loadDefaultJobTemplate(bundlePath, submitBundleFile) {
    const path = bundlePath + "/template.json";
    const templateContents = readFile(path);
    // Parse the template string to a JSON object
    const templateObject = JSON.parse(templateContents);
    templateObject.name = File.decode(app.project.file.name);
    logger.debug("The template name is " + templateObject.name, submitBundleFile);

    return templateObject;
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

function generateParameterName(index, compName, parameter) {
    /** Generates the name of the parameter to be used in the job submission
     * by prefixing with the index and compName
     * Truncates compname to avoid going over character limit.
     **/
    if (parameter === undefined) {
        parameter = "";
    }
    if (parameter !== "") {
        parameter = "_" + parameter;
    }
    index = index.toString();
    compName = compName.substring(0, 15);
    // replace non-alphanumeric characters to comply with OpenJD
    compName = compName.replace(/[^a-zA-Z0-9]/g, '_');
    return "_" + index + "_" + compName + parameter;
}

function generatePrettyParameterName(index, compName, parameter) {
    /** Generates name of the parameter to be displayed in job submission UI
     * Truncates compname to avoid going over character limit
     **/
    if (parameter === undefined) {
        parameter = "";
    }
    index = index.toString();
    const maxLength = 10;
    if (compName.length >= maxLength) {
        compName = compName.substring(0, maxLength - 3) + "...";
    }
    // replace non-alphanumeric characters to comply with OpenJD
    compName = compName.replace(/[^a-zA-Z0-9]/g, '_');
    return "(" + index + "_" + compName + ") " + parameter;
}

// Generates the parameter definitions for each step by loading the `parameter_definitions_<>_fragment.json`
//      Adding our `( <RenderQueueItemID> )` to the label and changing the name to prefixed by `<RenderQueueItemID>_`
function generateStepParameterFragment(bundlePath, isImageSeq, renderQueueIndex, compName) {
    var path = bundlePath + "/parameter_definitions_video_fragment.json";
    if (isImageSeq) {
        path = bundlePath + "/parameter_definitions_image_fragment.json";
    }
    const stepParametersContents = readFile(path);
    // Parse the template string to a JSON object
    const stepParametersObject = JSON.parse(stepParametersContents);

    const updatedParameterDefinitions = []
    for (var i = 0; i < stepParametersObject.parameterDefinitions.length; i++) {
        if (JobParams.indexOf(stepParametersObject.parameterDefinitions[i].name) !== -1) {
            // Don't modify these values
            continue;
        }
        var replacedDefinition = stepParametersObject.parameterDefinitions[i]
        replacedDefinition.name = generateParameterName(renderQueueIndex, compName, replacedDefinition.name);
        replacedDefinition.userInterface.label = generatePrettyParameterName(renderQueueIndex, compName, replacedDefinition.userInterface.label);

        updatedParameterDefinitions.push(replacedDefinition);
    }
    stepParametersObject.parameterDefinitions = updatedParameterDefinitions;
    return stepParametersObject;
}

// Generates the step chunk of the template for each step by loading the `step_<>_fragment.json`
//      Replacing the parameters to be pointing to our per-renderQueueItem parameters and updating any parameters in the onRun
function generateStepTemplateFragment(bundlePath, isImageSeq, renderQueueItemIndex, compName, taskTimeoutSeconds, outputFileName) {
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
        taskParameters.range = taskParameters.range.replace(paramPatternRegex, "Param." + generateParameterName(renderQueueItemIndex, compName, "") + "_");
        taskParameters.name = generateParameterName(renderQueueItemIndex, compName, taskParameters.name);
        stepTemplateObject.steps[0].parameterSpace.taskParameterDefinitions[0] = taskParameters;
    }

    stepTemplateObject.steps[0].name = generateParameterName(renderQueueItemIndex, compName, "");
    const renderQueueIndexToken = "{{Param." + generateParameterName(renderQueueItemIndex, compName, "RenderQueueIndex") + "}}";
    const outputFileNameToken = "{{Param." + generateParameterName(renderQueueItemIndex, compName, "OutputFileName") + "}}";
    // Replace any parameter names in onRun script
    const scriptArgs = stepTemplateObject.steps[0].script.actions.onRun.args;
    const replacedArgs = []
    for (var i = 0; i < scriptArgs.length; i++) {
        // Rename first, so the regex never sees the output file name, which may contain "Param."
        // JobParams
        var scriptArg = scriptArgs[i].replace(paramPatternRegex, "Param." + generateParameterName(renderQueueItemIndex, compName, "") + "_");
        // split/join keeps a $ in the output file name literal
        scriptArg = scriptArg.split(renderQueueIndexToken).join(renderQueueItemIndex.toString());
        replacedArgs.push(scriptArg.split(outputFileNameToken).join(outputFileName));
    }
    stepTemplateObject.steps[0].script.actions.onRun.args = replacedArgs;
    stepTemplateObject.steps[0].script.actions.onRun["timeout"] = taskTimeoutSeconds;
    logger.debug("Added timeout of " + taskTimeoutSeconds + " seconds to onRun action", submitBundleFile);

    return stepTemplateObject;
}

// Modifies the `Create Output Directories` job environment by adding all of our output folder parameters
function generateJobEnvironmentFragment(bundlePath, outputFoldersStr) {
    const path = bundlePath + "/job_environments_fragment.json";
    const jobEnvironmentsContents = readFile(path);
    // Parse the template string to a JSON object
    const jobEnvironmentsObject = JSON.parse(jobEnvironmentsContents);

    for (var j = 0; j < jobEnvironmentsObject.jobEnvironments.length; j++) {
        if (jobEnvironmentsObject.jobEnvironments[j].name === "Create Output Directories") {
            jobEnvironmentsObject.jobEnvironments[j].script.actions.onEnter.args = [
                "{{Param.JobScriptDir}}/create_output_directory.py",
                outputFoldersStr
            ]
        }
    }
    return jobEnvironmentsObject;
}

/**
 * Launches the Deadline Cloud GUI submitter on macOS without using Terminal.
 *
 * After Effects inherits a minimal launchd PATH from Finder that does not
 * include the deadline CLI. Routing through Terminal.app to source the user's
 * shell profile created a race: on a cold start the shell may not be ready
 * before `do script` fires, silently dropping the command.
 *
 * Instead, system python3 (/usr/bin/python3) — which is always on the launchd
 * PATH — runs launch_deadline.py, which locates the deadline binary by its
 * well-known installer path and launches gui-submit as a detached process.
 *
 * @param {String} bundlePath         path to the job bundle directory
 * @param {String} pythonExecutable   python3 executable found by getPythonExecutable()
 **/
function launchDeadlineGUI(bundlePath, pythonExecutable) {
    const launcherScript = scriptFolder +
        "/DeadlineCloudSubmitter_Assets/JobTemplate/scripts/launch_deadline.py";
    const cmd = pythonExecutable + " \"" + launcherScript + "\" \"" + bundlePath + "\"";
    logger.debug("Launching Deadline GUI via Python launcher: " + cmd, submitBundleFile);
    system.callSystem(cmd);
}

/**
 * Submit the selected render queue item
 **/
function SubmitSelection(selection, selectionSettings) {
    // The Submit button stays enabled at all times, so this is the only thing standing between an
    // empty selection and a job template with no steps in it.
    if (selection === null || selection.length === 0) {
        adcAlert("Error: Select at least one render queue item to submit.", true);
        return;
    }

    // Calculate task run timeout in seconds
    var taskTimeoutSeconds = (selectionSettings.taskRunDays() * 24 * 60 * 60) + (selectionSettings.taskRunHours() * 60 * 60) + (selectionSettings.taskRunMinutes() * 60);
    // Validate timeout values during job submission
    if (taskTimeoutSeconds <= 0) {
        adcAlert("The following timeout value must be greater than 0: TaskRun", true);
        return;
    }

    // Check required files exist before proceeding
    const assetsFolder = new Folder(scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate");
    if (!assetsFolder.exists) {
        adcAlert("Error: Missing DeadlineCloudSubmitter_Assets folder at " + assetsFolder.fsName, true);
        return;
    }

    const requiredFiles = [
        "scripts/get_user_fonts.py",
        "scripts/font_manager.py",
        "scripts/call_aerender.py",
        "scripts/create_output_directory.py",
        "scripts/launch_deadline.py",
        "template.json",
        "image_template.json",
        "video_template.json",
        "job_environments_fragment.json",
        "parameter_definitions_image_fragment.json",
        "parameter_definitions_video_fragment.json",
        "step_image_fragment.json",
        "step_video_fragment.json"
    ];

    var missingFiles = [];
    for (var f = 0; f < requiredFiles.length; f++) {
        var requiredFile = new File(assetsFolder.fsName + "/" + requiredFiles[f]);
        if (!requiredFile.exists) {
            missingFiles.push(requiredFiles[f]);
        }
    }
    
    if (missingFiles.length > 0) {
        adcAlert("Error: Missing required files:\n" + missingFiles.join("\n"), true);
        return;
    }

    // Checked before the project is saved and before any dependency scanning, so an oversized
    // selection is refused immediately rather than after a wait.
    if (selection.length > MAX_RENDER_QUEUE_ITEMS_PER_JOB) {
        adcAlert(
            "Error: " + selection.length + " render queue items are selected, but a single job supports at most " +
            MAX_RENDER_QUEUE_ITEMS_PER_JOB + ".\n\n" +
            "Each render queue item adds parameters to the job template that this submitter generates, and the " +
            "Open Job Description specification allows a job template at most " + MAX_JOB_PARAMETERS + " parameters, " +
            "shared with the parameters declared by the queue's environments.\n\n" +
            "Please select " + MAX_RENDER_QUEUE_ITEMS_PER_JOB +
            " or fewer render queue items and submit the rest as a separate job.", true
        );
        return;
    }

    const renderQueueItems = [];

    // Check to make sure that all of our selection indices are correct
    for (var i = 0; i < selection.length; i++) {
        var selectionItem = selection[i];
        var initialRenderQueueIndex = selectionItem.renderQueueIndex;

        // because our panel is updated independently of the render queue, the two may become out of sync
        // we need to verify that the selection made actually matches what is in the render queue
        if (!UpdateRenderQueueIndices(initialRenderQueueIndex, selectionItem)) {
            return;
        }
        var initialRenderQueueItem = app.project.renderQueue.item(initialRenderQueueIndex);
        renderQueueItems.push([initialRenderQueueItem, initialRenderQueueIndex]);
    }

    // We have valid selections check for saving
    if (app.project.dirty) {
        const confirmation = confirm("Project must be saved before submitting. Continue?");
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
    }

    // Check if warning should be shown
    const ignoreWarning = dcUtil.getBoolMetadata(dcUtil.composeXMPPath(DEADLINECLOUD_SETTINGS_ROOT, DEADLINECLOUD_IGNORE_VERSION_WARNING));
    const savedVersion = dcUtil.getNumberMetadata(dcUtil.composeXMPPath(DEADLINECLOUD_SETTINGS_ROOT, DEADLINECLOUD_IGNORE_VERSION_WARNING_VERSION), 0);
    const currentVersion = dcUtil.getAEVersion();

    // Is this AE version not supported in the deadline-cloud channel?
    if (SUPPORTED_VERSIONS.indexOf(currentVersion) === -1) {
        // If so, has the warning already been ignored or is the user on a different AE version and we should warn them again?
        if (!ignoreWarning || savedVersion !== currentVersion) {
            const versionMismatchWarningMessage = "Warning: Your After Effects version " + currentVersion +
                " is not officially supported in the deadline-cloud conda channel. Supported versions are: " + SUPPORTED_VERSIONS.join(", ") + ". " +
                "This may result in compatibility issues or failed jobs.\n\nDon't show this warning again for version " + currentVersion + "?";

            // Provide warning, and if acknowledged, store their current version and warning preference. Otherwise, block job submission.
            dcUtil.saveStringMetadata(dcUtil.composeXMPPath(DEADLINECLOUD_SETTINGS_ROOT, DEADLINECLOUD_IGNORE_VERSION_WARNING_VERSION), currentVersion.toString());
            if (confirm(versionMismatchWarningMessage)) {
                dcUtil.saveBoolMetadata(dcUtil.composeXMPPath(DEADLINECLOUD_SETTINGS_ROOT, DEADLINECLOUD_IGNORE_VERSION_WARNING), true);
            } else {
                dcUtil.saveBoolMetadata(dcUtil.composeXMPPath(DEADLINECLOUD_SETTINGS_ROOT, DEADLINECLOUD_IGNORE_VERSION_WARNING), false);
                return;
            }
        } else {
            logger.debug("Version mismatch already acknowledged, version warning skipped.");
        }
        logger.debug("Defaulting to After Effects major version conda package to minimize incompatibility issues.");
    }


    var aftereffectsCondaVersion = dcUtil.getAEVersion();
    if (SUPPORTED_VERSIONS.indexOf(aftereffectsCondaVersion) === -1) {
        aftereffectsCondaVersion = Math.floor(aftereffectsCondaVersion);
    }
    logger.debug("The compatible version of After Effects is " + aftereffectsCondaVersion, submitBundleFile);


    const bundle = generateBundle();
    const jobAssetReferences = {
        assetReferences: {
            inputs: {
                directories: [],
                filenames: [],
            },
            outputs: {
                directories: [],
            },
            referencedPaths: [],
        },
    };
    const jobParameterDefinitions = {
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
            "name": "JobScriptDir",
            "description": "Directory containing embedded scripts.",
            "userInterface": {
                "control": "HIDDEN"
            },
            "type": "PATH",
            "objectType": "DIRECTORY",
            "dataFlow": "IN",
            "default": "scripts"
        },
        {
            "name": "CondaPackages",
            "type": "STRING",
            "userInterface": {
                "control": "HIDDEN"
            },
            "default": "aftereffects=" + aftereffectsCondaVersion,
            "description": "If a queue accepts this parameter, it will create a conda virtual environment from it."
        },
        {
            "name": "MultiFrameRendering",
            "type": "STRING",
            "default": "OFF",
            "allowedValues": [
                "ON",
                "OFF"
            ],
            "userInterface": {
                "control": "DROPDOWN_LIST",
                "label": "Enable or disable multi-frame rendering",
                "groupLabel": "Multi-Frame Rendering"
            },
            "description": "Multi frame rendering settings"
        },
        {
            "name": "MaxCpuUsagePercentage",
            "type": "INT",
            "userInterface": {
                "control": "SPIN_BOX",
                "label": "Max CPU Usage Percentage",
                "groupLabel": "Multi-Frame Rendering"
            },
            "description": "Max Cpu Percentage to use with Multi-Frame Rendering, ignored if MFR is OFF",
            "minValue": 1,
            "maxValue": 100,
            "default": 90
        },
        {
            "name": "IgnoreMissingDependencies",
            "type": "STRING",
            "default": "OFF",
            "allowedValues": [
                "ON",
                "OFF"
            ],
            "userInterface": {
                "control": "DROPDOWN_LIST",
                "label": "Ignore Missing Dependencies",
                "groupLabel": "Ignore Missing Dependencies"
            },
            "description": "Allows render to continue without failing if referenced files are missing."
        }
        ]
    }

    // ChunkSize only drives the image step's task parameter space, so it is left out entirely when
    // nothing in the selection renders an image sequence.
    var selectionHasImageSequence = false;
    for (var i = 0; i < renderQueueItems.length; i++) {
        if (dcUtil.isRenderQueueItemImageOutput(renderQueueItems[i][0])) {
            selectionHasImageSequence = true;
            break;
        }
    }
    if (selectionHasImageSequence) {
        jobParameterDefinitions.parameterDefinitions.push({
            "name": "ChunkSize",
            "type": "INT",
            "userInterface": {
                "control": "SPIN_BOX",
                "label": "Frames Per Task",
                "groupLabel": "Frame Range"
            },
            "description": "The chunk size of frames per task to render",
            "minValue": 1,
            "default": DEFAULT_FRAMESPERTASK
        });
    }
    // These four settings apply to the whole job, so they are read once here rather than per
    // render queue item, and contribute one parameter value each instead of one per step.
    const jobFramesPerTask = selectionSettings.framesPerTask();
    const jobMaxCpuUsagePercentage = selectionSettings.maxCpuUsagePercentage();
    const jobMultiFrameRendering = selectionSettings.multiFrameRendering();
    const jobIgnoreMissingDependencies = selectionSettings.ignoreMissingDependencies();

    const jobParameterValues = {
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
            value: app.project.file.fsName,
        },
        {
            name: "MultiFrameRendering",
            value: jobMultiFrameRendering === true ? "ON" : "OFF",
        },
        {
            name: "MaxCpuUsagePercentage",
            value: jobMaxCpuUsagePercentage,
        },
        {
            name: "IgnoreMissingDependencies",
            value: jobIgnoreMissingDependencies === true ? "ON" : "OFF",
        },
        ]
    }
    if (selectionHasImageSequence) {
        jobParameterValues.parameterValues.push({
            name: "ChunkSize",
            value: jobFramesPerTask,
        });
    }

    const template = loadDefaultJobTemplate(bundle.fsName, submitBundleFile);
    template.steps = [];
    template.parameterDefinitions = jobParameterDefinitions.parameterDefinitions;

    const stepOutputFolderParameters = [];

    for (var i = 0; i < renderQueueItems.length; i++) {
        var renderQueueItem = renderQueueItems[i][0];
        var renderQueueIndex = renderQueueItems[i][1];

        if (!validateRenderQueueItemOutputModule(renderQueueItem)) {
            return;
        }

        var outputModule = renderQueueItem.outputModule(1).file;
        var outputPath = outputModule.fsName;
        var outputFile = outputModule.name;
        var outputFolder = outputModule.parent.fsName;

        logger.debug("OutputPath is: " + outputPath, submitBundleFile);
        logger.debug("OutputFile is: " + outputFile, submitBundleFile);
        logger.debug("OutputFolder is: " + outputFolder, submitBundleFile);

        // Calculate frame range using the utility function
        var frameRange = dcUtil.calculateFrameRange(renderQueueItem);
        var startFrame = frameRange.startFrame;
        var endFrame = frameRange.endFrame;

        var dependencies = findJobAttachments(renderQueueItem.comp, jobIgnoreMissingDependencies); // list of filenames
        var compName = dcUtil.removeIllegalCharacters(renderQueueItem.comp.name);
        var sanitizedOutputFolder = sanitizeFilePath(outputFolder);

        var outputFileNameNoRegex = getFileNameNoRegex(outputFile);
        var extension = getFileExtension(outputFileNameNoRegex);
        logger.debug("extension set to: " + extension, submitBundleFile);
        // Uses the same check as selectionHasImageSequence above. The two must agree: that flag
        // decides whether ChunkSize is declared, and this decides whether a step references it.
        var isImageSeq = dcUtil.isRenderQueueItemImageOutput(renderQueueItem);

        var sanitizedOutputFileName = dcUtil.removePercentageFromFileName(outputFileNameNoRegex);
        logger.debug("sanitizedOutputFileName is " + sanitizedOutputFileName, submitBundleFile);

        // The file name is written into the step's command rather than passed as a parameter, so it
        // ends up inside an Open Job Description format string. "{{" or "}}" there would be read as
        // parameter reference delimiters instead of as part of the file name.
        if (sanitizedOutputFileName.indexOf("{{") !== -1 || sanitizedOutputFileName.indexOf("}}") !== -1) {
            adcAlert(
                "Error: The output file name for " + renderQueueItem.comp.name + " contains \"{{\" or \"}}\", which " +
                "is not supported.\n\nPlease rename the output file in the render queue and try again.", true
            );
            return;
        }

        // Push step asset references
        for (var d = 0; d < dependencies.length; d++) {
            jobAssetReferences.assetReferences.inputs.filenames.push(dependencies[d]);
        }
        jobAssetReferences.assetReferences.outputs.directories.push(sanitizedOutputFolder);

        var parameterValues = generateParameterValues(
            sanitizedOutputFolder,
            startFrame,
            endFrame,
            generateParameterName(renderQueueIndex, compName, "")
        );
        for (var p = 0; p < parameterValues.parameterValues.length; p++) {
            if (jobParameterValues.parameterValues.indexOf(parameterValues.parameterValues[p]) === -1) {
                jobParameterValues.parameterValues.push(parameterValues.parameterValues[p]);
            }
        }

        stepOutputFolderParameters.push("{{Param." + generateParameterName(renderQueueIndex, compName, "OutputDir") + "}}");

        // Generates template and parameters for the current render queue item, then pushes them to the main template
        var stepTemplate = generateStepTemplateFragment(bundle.fsName, isImageSeq, renderQueueIndex, compName, taskTimeoutSeconds, sanitizedOutputFileName);
        for (var s = 0; s < stepTemplate.steps.length; s++) {
            template.steps.push(stepTemplate.steps[s]);
        }
        var stepParameters = generateStepParameterFragment(bundle.fsName, isImageSeq, renderQueueIndex, compName);
        for (var p = 0; p < stepParameters.parameterDefinitions.length; p++) {
            var parameterExists = false;
            for (var tpd = 0; tpd < template.parameterDefinitions.length; tpd++) {
                var templateParameterDefinition = template.parameterDefinitions[tpd];
                var stepParameterDefinition = stepParameters.parameterDefinitions[p];
                if (templateParameterDefinition.name == stepParameterDefinition.name) {
                    parameterExists = true;
                    break;
                }
            }
            if (parameterExists === false) {
                template.parameterDefinitions.push(stepParameters.parameterDefinitions[p]);
            }
        }
    }

    // Backstop for MAX_RENDER_QUEUE_ITEMS_PER_JOB, which is calculated by hand. Firing means that
    // number is now too high, and that the artist waited through dependency scanning for nothing.
    if (template.parameterDefinitions.length > MAX_JOB_PARAMETERS) {
        adcAlert(
            "Error: The generated job template declares " + template.parameterDefinitions.length +
            " parameters, more than the " + MAX_JOB_PARAMETERS + " an Open Job Description job template allows.\n\n" +
            "Please select fewer render queue items and submit the rest as a separate job.", true
        );
        logger.error(
            "Job template declared " + template.parameterDefinitions.length + " parameterDefinitions for " +
            renderQueueItems.length + " render queue items, which exceeds the Open Job Description limit of " +
            MAX_JOB_PARAMETERS + ". The selection was within MAX_RENDER_QUEUE_ITEMS_PER_JOB (" +
            MAX_RENDER_QUEUE_ITEMS_PER_JOB + "), so that value is too high for the parameters this template " +
            "now declares and needs recalculating.", submitBundleFile
        );
        return;
    }

    // Writes out final bundle files
    const generatedJobEnvironment = generateJobEnvironmentFragment(bundle.fsName, stepOutputFolderParameters.join(","));
    template.jobEnvironments = generatedJobEnvironment.jobEnvironments;

    writeFile(bundle.fsName + "/asset_references.json", JSON.stringify(jobAssetReferences, null, 4));

    writeFile(bundle.fsName + "/parameter_values.json", JSON.stringify(jobParameterValues, null, 4));

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
        if (output.indexOf("\nERROR CODE: ", 0) >= 0) {
            adcAlert(
                "ERROR:" + output, true
            );
            logger.error("Error when launching Deadline GUI submitter: " + output, "Utils.jsx");
        }
    } else {
        launchDeadlineGUI(bundle.fsName, getPythonExecutable());
    }
}
