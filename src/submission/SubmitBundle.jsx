/**
 * Submit the selected render queue item
 **/
function SubmitSelection(selection, framesPerTask) {
    const submitBundleFile = "SubmitButton.jsx";
    // first we must verify that our selection is valid
    if (selection == null) {
        adcAlert("Error: No selection");
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
            "Error: Render Queue has changed since last refreshing. Refreshing panel now. Please try again."
        );
        updateList();
        return;
    }
    rqi = app.project.renderQueue.item(renderQueueIndex);
    if (rqi == null || rqi.comp.id != selection.compId) {
        adcAlert(
            "Error: Render Queue has changed since last refresh. Refreshing panel now. Please try again."
        );
        updateList();
        return;
    }
    if (rqi.numOutputModules > 1) {
        adcAlert(
            "Warning: Multiple output modules detected. It is not supported in current submitter. Please raise an issue on Github repo for feature request."
        );
        return;
    }

    //We have a valid selection
    var r = confirm("Project must be saved before submitting. Continue?");
    if (!r) {
        return;
    } else {
        app.project.save();
    }
    if (app.project.file == null) {
        //If the user hit yes to the prompt, but the file had never been saved, a second prompt would appear asking where they would want to save the project. If they hit cancel on the second prompt, the project file should be null and we should cancel the submission.
        return;
    }
    var outputPath = "";
    var outputFolder = "";
    for (var j = 1; j <= rqi.numOutputModules; j++) {
        var outputModule = rqi.outputModule(j).file;
        if (outputModule == null) {
            if (rqi.numOutputModules > 1) {
                adcAlert("Error: Output module does not have its output file set");
            } else {
                adcAlert(
                    "Error: One of your output modules does not have its output file set"
                );
            }
            return;
        } else {
            outputPath = outputModule.fsName;
            outputFolder = outputModule.parent.fsName;
        }
    }
    var renderSettings = rqi.getSettings(GetSettingsFormat.STRING_SETTABLE);
    var dependencies = findJobAttachments(rqi.comp); //list of filenames
    var compName = rqi.comp.name;

    function generateAssetReferences(bundlePath) {
        var sanitizedOutputFolder = sanitizeFilePath(outputFolder);

        // Write the asset_references.json file
        var jobAttachmentsContents = jobAttachmentsJson(
            dependencies,
            sanitizedOutputFolder
        );
        var assetReferencesOutDir = bundlePath + "/asset_references.json";
        writeJSONFile(jobAttachmentsContents, assetReferencesOutDir);
    }

    /**
     * Generates parameter_values json file
     **/
    function generateParameterValues(bundlePath) {
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
            ) - 1; //end frame is inclusive so we subtract 1

        var sanitizedOutputFilePath = sanitizeFilePath(outputPath);
        var parametersContents = parameterValues(
            renderQueueIndex,
            app.project.file.fsName,
            sanitizedOutputFilePath,
            startFrame,
            endFrame,
            framesPerTask,
        );
        var parametersOutDir = bundlePath + "/parameter_values.json";
        writeJSONFile(parametersContents, parametersOutDir);
    }

    /**
     * Generates job template json file
     **/
    function generateTemplate(bundlePath) {
        // Write the template.json file
        var template = new File(bundlePath + "/template.json");
        template.open("r");
        var templateContents = template.read();
        template.close();
        // Parse the template string to JSON dict.
        var templateObject = JSON.parse(templateContents);
        templateObject.name = File.decode(app.project.file.name) + " [" + compName + "]";
        logger.debug("The template name is " + templateObject.name, submitBundleFile);
        try {
            if (templateObject.steps[0].name) {
                templateObject.steps[0].name = compName;
                logger.debug("The step name is " + templateObject.steps[0].name, submitBundleFile);
            }
        } catch (e) {
            adcAlert("Error accessing the template's steps name. \nPlease check your template.json and make sure you have name under steps.");
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

        template.open("w");
        template.write(JSON.stringify(templateObject, null, 4));
        template.close();
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

        generateAssetReferences(bundlePath);
        generateParameterValues(bundlePath);

        var jobTemplateSourceFolder = new Folder(
            scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate"
        );
        if (!jobTemplateSourceFolder.exists) {
            adcAlert(
                "Error: Missing job template at " + jobTemplateSourceFolder.fsName
            );
            return null;
        }
        recursiveCopy(jobTemplateSourceFolder, bundleRoot);

        generateTemplate(bundlePath);
        return bundleRoot;
    }
    var bundle = generateBundle();

    // Runs a bat script that requires extra permissions but will not block the After Effects UI while submitting.
    var submitScriptContents =
        'deadline bundle gui-submit "' + bundle.fsName + "\" --output json --install-gui";
    if ($.os.toString().slice(0, 7) === "Windows") {
        var submitScript = new File(Folder.temp.fsName + "/submit.bat");

        submitScript.open("w");
        submitScript.write(submitScriptContents);
        submitScript.close();
        submitScript.execute();
    } else {
        // Execute the command using a bash in the interactive mode so it loads the bash profile to set
        // the PATH correctly.
        var shellPath = $.getenv("SHELL") || "/bin/bash";
        var cmd = shellPath + " -i -c 'echo \"START_DEADLINE_OUTPUT\";" + submitScriptContents + "'";
        systemCallWithErrorAlerts(cmd);
    }
}