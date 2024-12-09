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

        var template = new File(bundleRoot.fsName + "/template.yaml");
        template.open("r");
        var templateContents = template.read();
        templateContents = templateContents.replace(
            "{{JOBNAME}}",
            File.decode(app.project.file.name) + " [" + compName + "]"
        );
        templateContents = templateContents.replace(
            "{{COMPNAME}}", compName
        );
        template.close();
        template.remove();
        template.open("w");
        template.write(templateContents);
        template.close();

        var sanitizedOutputFolder = sanitizeFilePath(outputFolder);
        var sanitizedOutputFilePath = sanitizeFilePath(outputPath);
        var jobAttachmentsContents = jobAttachmentsJson(
            dependencies,
            sanitizedOutputFolder
        );
        var attachmentJson = new File(
            bundleRoot.fsName + "/asset_references.json"
        );
        attachmentJson.open("w");
        attachmentJson.write(jobAttachmentsContents);
        attachmentJson.close();

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
        var parametersJson = new File(
            bundleRoot.fsName + "/parameter_values.json"
        );
        parametersJson.open("w");
        parametersJson.write(parametersContents);
        parametersJson.close();

        return bundleRoot;
    }
    var bundle = generateBundle();

    // Runs a bat script that requires extra permissions but will not block the After Effects UI while submitting.
    // The following commented-out line will block the UI until the submission window is closed, but it doesn't require extra permissions
    // systemCallWithErrorAlerts("deadline bundle gui-submit \"" + bundle.fsName + "\"")
    if ($.os.toString().slice(0, 7) === "Windows") {
        var submitScript = new File(Folder.temp.fsName + "/submit.bat");
        var submitScriptContents =
            'deadline bundle gui-submit "' + bundle.fsName + '"';
        submitScript.open("w");
        submitScript.write(
            'deadline bundle gui-submit "' + bundle.fsName + '"'
        );
        submitScript.close();
        submitScript.execute();
    } else {
        //On mac we fall back to directly calling the command to get around file execute permission errors
        systemCallWithErrorAlerts(
            'deadline bundle gui-submit "' + bundle.fsName + '"'
        );
    }
}