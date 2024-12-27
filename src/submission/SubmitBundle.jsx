const SubmitBundleFile = "SubmitButton.jsx";

/**
 * Submit the selected render queue item
 **/
function SubmitSelection(selection, framesPerTask) {
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

    /**
     * Generates the job bundle
     **/
    function generateBundle() {
        var bundleRoot = new Folder(
            Folder.temp.fsName + "/DeadlineCloudAESubmission"
        ); //forward slash works on all operating systems
        recursiveDelete(bundleRoot);
        bundleRoot.create();

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

        // Write the template.json file
        var template = new File(bundleRoot.fsName + "/template.json");
        template.open("r");
        var templateContents = template.read();
        templateContents = templateContents.replace(
            "{{JOB_NAME}}",
            File.decode(app.project.file.name) + " [" + compName + "]"
        );
        templateContents = templateContents.replace(
            "{{COMP_NAME}}", compName
        );
        const aftereffectsVersion = app.version[0] + app.version[1];
        logger.debug("The major version of After Effects is " + aftereffectsVersion, SubmitBundleFile);
        templateContents = templateContents.replace(
            "{{AE_VERSION}}", aftereffectsVersion
        );
        template.open("w");
        template.write(templateContents);
        template.close();
        logger.debug("Wrote the template.json file", SubmitBundleFile);

        var sanitizedOutputFolder = sanitizeFilePath(outputFolder);
        var sanitizedOutputFilePath = sanitizeFilePath(outputPath);

        // Write the asset_references.json file
        var jobAttachmentsContents = jobAttachmentsJson(
            dependencies,
            sanitizedOutputFolder
        );
        var assetReferencesOutDir = bundleRoot.fsName + "/asset_references.json";
        writeJSONFile(jobAttachmentsContents, assetReferencesOutDir);

        // Write the parameter_values.json file
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
        var parametersContents = parameterValues(
            renderQueueIndex,
            app.project.file.fsName,
            sanitizedOutputFilePath,
            startFrame,
            endFrame,
            framesPerTask,
        );
        var parametersOutDir = bundleRoot.fsName + "/parameter_values.json";
        writeJSONFile(parametersContents, parametersOutDir);

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