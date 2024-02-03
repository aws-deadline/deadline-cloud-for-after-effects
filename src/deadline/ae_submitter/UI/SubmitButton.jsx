function __generateSubmitButton() {
    // Extract the file name
    var _submitButtonFileName = "SubmitButton.jsx";
    function submitRenderQueueToDeadlineCloud(renderQueueItem, itemName) {
        /**
         * Submit the entire renderQueue to deadline based on a job template and job parameters.
         */

        var templates = createDataAndParameterTemplateSeparateJobs(renderQueueItem, itemName);
        jobAssetReferences = generateAssetReferences();
        var _submissionResult = createSubmission(templates.jobTemplate, templates.jobParams, jobAssetReferences, dcProperties.config.job_history_dir.get(), jobGroup.jobName.text);
        return _submissionResult;
    }

    function generatePartialTemplate()
    {
        // 1. Copy template, modify attributes as needed
        jobTemplate = JSON.parse(JSON.stringify(OPENJD_TEMPLATE));

        jobTemplate.name = dcUtil.removePercentageFromFileName(jobGroup.jobName.text);

        // Only add description when there is one provided
        if(dcProperties.deadlineJobParameters.description.get().length !== 0)
        {
            jobTemplate.description = dcProperties.deadlineJobParameters.description.get();
        }

        paramDefCopy = jobTemplate.parameterDefinitions;
        jobTemplate.parameterDefinitions = [];
        // Only use the AfterEffectsProjectFile parameter from the template, remove the others.
        for(var i = paramDefCopy.length - 1; i >= 0; i--)
        {
            if(paramDefCopy[i].name == "AfterEffectsProjectFile")
            {
                jobTemplate.parameterDefinitions.push(paramDefCopy[i]);
            }
        }

        return jobTemplate;
    }

    function generateAssetReferences()
    {
        // 3. Create asset reference dict
        jobAssetReferences = JSON.parse(JSON.stringify(OPENJD_ASSET_REFERENCE));

        // Get asset references from Job Attachment Panel
        // --------- Attach input files
        if(dcProperties.jobAttachments.autoDetectedInputFiles.get().length < dcProperties.jobAttachments.userAddedInputFiles.get().length + dcProperties.jobAttachments.autoDetectedInputFiles.get().length)
        {   
            // Add auto detected footage and added footage together to send as asset files for the template
            var assetFiles = dcProperties.jobAttachments.userAddedInputFiles.get().concat(dcProperties.jobAttachments.autoDetectedInputFiles.get());
            jobAssetReferences.assetReferences.inputs.filenames = assetFiles;
        }
        else{
            var assetFiles = dcProperties.jobAttachments.autoDetectedInputFiles.get();
            jobAssetReferences.assetReferences.inputs.filenames = assetFiles;
        }

        // ---------- Input Directories
        var inputDirectories = dcProperties.jobAttachments.userAddedInputDirectories.get();
        jobAssetReferences.assetReferences.inputs.directories = inputDirectories;

        // ---------- Output Directories
        if(dcProperties.jobAttachments.autoDetectOutputDirectories.get().length < dcProperties.jobAttachments.userAddedOutputDirectories.get().length + dcProperties.jobAttachments.autoDetectOutputDirectories.get().length)
        {
            var outputDirectories = dcProperties.jobAttachments.userAddedOutputDirectories.get().concat(dcProperties.jobAttachments.autoDetectOutputDirectories.get());
            jobAssetReferences.assetReferences.outputs.directories = outputDirectories;
        }
        else{
            var outputDirectories = dcProperties.jobAttachments.autoDetectOutputDirectories.get();
            jobAssetReferences.assetReferences.outputs.directories = outputDirectories;
        }

        return jobAssetReferences;
    }


    function generateStep(basicTemplate, itemName, stepsTemplate, stepID, renderQueueItem)
    {
        var compNameToCheck = dcUtil.removeIllegalCharacters(renderQueueItem.comp.name);
        // logger.debug("[generateStep] itemName: " + itemName + "  stepID: " + stepID + "  compNameToCheck: " + compNameToCheck, _submitButtonFileName);
        stepsTemplate[0].name = itemName;
        stepsTemplate[0].parameterSpace.taskParameterDefinitions[0].range = "{{Param." + itemName + "_Frames}}";
        stepsTemplate[0].script.embeddedFiles[0].data = "frame: {{Task.Param.Frame}}";
        if(itemName != compNameToCheck)
        {
            stepsTemplate[0].stepEnvironments[0].script.embeddedFiles[0].data += "comp_name: {{Param." + compNameToCheck + "_CompName}} \n";
        }
        else
        {
            stepsTemplate[0].stepEnvironments[0].script.embeddedFiles[0].data += "comp_name: {{Param." + itemName + "_CompName}} \n";
        }
        stepsTemplate[0].stepEnvironments[0].script.embeddedFiles[0].data += "output_file_path: {{Param." + itemName + "_OutputFilePath}} \n";
        stepsTemplate[0].stepEnvironments[0].script.embeddedFiles[0].data += "output_pattern: {{Param." + itemName + "_OutputPattern}} \n";
        stepsTemplate[0].stepEnvironments[0].script.embeddedFiles[0].data += "output_format: {{Param." + itemName + "_OutputFormat}} \n";
        basicTemplate.steps[stepID-1] = stepsTemplate[0]; 
        // logger.debug("[generateStep] basicTemplate: " + JSON.stringify(basicTemplate), _submitButtonFileName);
        return basicTemplate;
    }

    function applyDataToTemplate(dataName, dataTemplate)
    {
        if(dataName.indexOf("Frames") >= 0 || dataName.indexOf("OutputFilePath") >= 0)
        {
            dataTemplate.userInterface.groupLabel = dataName + " Settings";
        }
        dataTemplate.name = dataName;
        return dataTemplate;
    }

    function applyDataToParameterTemplate(dataName, dataValue)
    {
        var parameterDataTemplate = 
        {
            "name": dataName,
            "value": dataValue
        }
        return parameterDataTemplate;
    }

    function applyHostReqToTemplate(jobTemplate)
    {
        // Add host requirements to each step
        if(runGroup.runRequirementHostCheckBox.value)
        {
            var reqs = dcUtil.collectHostRequirements();
            for(var i = 0; i < jobTemplate.steps.length; i++)
            {
                jobTemplate.steps[i].hostRequirements = reqs;
            }
        }
        return jobTemplate
    }
    function getStartFrame(renderQueueItem) {
        /**
         * Get Startframe from the renderQueueItem
         */
        //get the frame offset & duration
        var frameOffset = app.project.displayStartFrame;
        var frameDuration = renderQueueItem.comp.frameDuration;
        var startFrame = 0;
        if (frameListGroup.useCompFrameList.value == true) {
            startFrame = frameOffset + Math.round(renderQueueItem.comp.workAreaStart / frameDuration);
            return startFrame;
        }

        startFrame = frameListGroup.frameList.text.split("-")[0];
        logger.debug("Start frame set to: " + startFrame, _submitButtonFileName);
        return startFrame;
    }

    function getEndFrame(renderQueueItem) {
        /**
         * Get EndFrame from the renderQueueItem
         */
        var frameOffset = app.project.displayStartFrame;
        var frameDuration = renderQueueItem.comp.frameDuration;
        var endFrame = 0;
        if (frameListGroup.useCompFrameList.value == true) {
            var currStartFrame = frameOffset + Math.round(renderQueueItem.comp.workAreaStart / frameDuration);
            endFrame = currStartFrame + Math.round(renderQueueItem.comp.workAreaDuration / frameDuration) - 1;
            return endFrame;
        }

        endFrame = frameListGroup.frameList.text.split("-")[1];
        logger.debug("End frame set to: " + endFrame, _submitButtonFileName);
        return endFrame;
    }

    function getFrameList(renderQueueItem)
    {
        var frameList = "";
        // Get correct frameList based on UI 
        if(frameListGroup.useCompFrameList.value)
        {
            frameList = getStartFrame(renderQueueItem) + "-" + getEndFrame(renderQueueItem);
        }
        else
        {
            frameList = frameListGroup.frameList.text;
            frameList = frameList;
        }
        return frameList;
    }

    function getCompName(renderQueueItem) {

        var compName = renderQueueItem.comp.name;
        var regexCompName = new RegExp('\\b' + "%20" + '\\b', 'g');
        compName = compName.replace(regexCompName, " ");
        logger.debug("Comp name set to: " + compName, _submitButtonFileName);
        return compName;
    }

    function getRenderQueueItemData(renderQueueItem) {
        /**
         * Get fileName and extension for the a renderQueueItem
         */
        var path = getOutputDirectory(renderQueueItem);
        // Split the file path to extract the file name and extension
        // Create lastIndex and regex to remove unwanted parts in the name. 
        var lastIndex = path.name.lastIndexOf(".");
        var regex = new RegExp('\\b' + "%5B#####%5D" + '\\b', 'g');
        var outputFileNameWithExtension = path.name.replace(regex, "[####]");
        var outputFileNameNoRegex = path.name.substring(0, lastIndex);
        var outputFileName = outputFileNameNoRegex.replace(regex, "[####]");
        var extension = outputFileNameWithExtension.substring(outputFileNameWithExtension.lastIndexOf('.') + 1);
        logger.debug("Output File Name set to: " + outputFileName, _submitButtonFileName);
        logger.debug("Extension set to: " + extension, _submitButtonFileName);

        return {
            fileName: outputFileName,
            extension: extension
        };
    }

    function getCompleteDirectory(renderQueueItem) {
        var fullPath = getOutputDirectory(renderQueueItem).parent.fsName;
        return fullPath;
    }

    function getOutputDirectory(renderQueueItem) {
        /**
         * Get the output directory for the renderQueueItem
         */

        var outputModule = renderQueueItem.outputModule(1); // Assuming you want the first output module
        // Get the file path from the output module
        var filePath = outputModule.file;
        logger.debug("Output Dir set to: " + filePath.parent.fsName, _submitButtonFileName);
        return filePath;
    }

    function handleSubmitButtonPressed() {
        /**
         * Gives warning popups if settings are wrong, comps not selected, no items in render queue, etc.
         */
        // Reset progressbar (In case submit button was pressed multiple times)
        progressBarPanel.progressBar.value = 0;
        
        // Alerts with numbers are placeholders to test functionality of the submit button.
        var queuedCount = dcAeUtil.getQueuedCompCount();
        if (queuedCount != 0) {
            results = "";
            errors = "";
            warnings = "";
            // Check for duplicate items in render queue
            if (dcAeUtil.containsDuplicateComps())
                errors += "\nAt least 2 of your items in the Render Queue have the same name. Please ensure that all of your items have unique names.\n";

            // Check no comp names contain whitespace at start or end of comp name.
            var compNames = dcAeUtil.checkForWhiteSpaceCompName();
            if (compNames.length > 0)
                errors += "\nThe following comp names contain starting/trailing whitespace characters. Ensure whitespace is removed prior to job submission:\n\n" + compNames.join() + "\n";
            // Check no comp names contain any illegal file path characters.
            var compNames = dcAeUtil.checkForIllegalCharCompName();
            if (compNames.length > 0)
                errors += "\nThe following comp names contain illegal characters in their name. Ensure any invalid file path characters are removed prior to job submission:\n\n" + compNames.join() + "\n";

            // Check frame range
            if (!frameListGroup.useCompFrameList.value && frameListGroup.frameList.text == "")
                errors += "\nPlease specify a frame list, or enable the option to use the frame list from the comp.\n";
            var __frameList = frameListGroup.frameList.text;
            __frameList = dcUtil.getDuplicateFrames(__frameList);
            if(__frameList.length != 0)
            {
                errors += "\nPlease give a correct frame list. Current frame list has duplicate frames and/or is wrong.\n";
            }

            // Cycle through all the comps in the Render Queue and check the queued ones
            var submissionText = compSubmissionGroup.compSubmission.selection.toString();

            if (submissionText == useQueue || submissionText != selectOne) {
                for (i = 1; i <= app.project.renderQueue.numItems; ++i) {
                    if (submissionText == useQueue && app.project.renderQueue.item(i).status != RQItemStatus.QUEUED) {
                        // Don't display warnings about unqueued items
                        continue;
                    }
                    warnings += dcAeUtil.checkCompOutputs(i);
                }
            } else if (compSelectionGroup.compSelection.selection == null) {
                errors += "\nNo Comp is selected.\n";
            } else {
                // Render queue items are 1-indexed
                var compSelectionItemIndex = compSelectionGroup.compSelection.selection.index + 1;
                warnings += dcAeUtil.checkCompOutputs(compSelectionItemIndex);
            }
            if (errors != "") {
                errors += "\n\nPlease fix these errors before submitting your job to Deadline.";
                alert(errors);
                return;
            } 

            var restoreProjectPath = false;
            var deleteTempXmlFile = false;
            var oldProjectPath = projectPath;
            var oldGPUAccelType = dcUtil.checkGPUAccelType(submitEntireQueueGroup.submitScene.value, ignoreGPUAccelGroup.ignoreGPUAccelWarning.value);

            // See if we need to save the current scene as an aepx file first.
            if (ignoreMissingLayersGroup.value && projectPath.indexOf(".aep", projectPath.length - 4) != -1) {
                app.project.save(File(projectPath.substring(0, projectPath.length - 4) + ".aepx"));
                projectPath = app.project.file.fsName;
                restoreProjectPath = true;
                if (ignoreMissingEffectsGroup.deleteTempXml.value && submitEntireQueueGroup.submitScene.value) {
                    deleteTempXmlFile = true;
                }
            } else {
                // Save the project before submission
                app.project.save(app.project.file);
            }

            var jobCount = 0;
            var totalJobs = queuedCount;

            if (submissionText == useQueue)
                totalJobs = 1;

            progressBarPanel.progressBar.value = 0;
            
            // If we're selecting a comp to render, check if it's not queued for render
            if ((submissionText == selectOne) && (app.project.renderQueue.item(compSelectionItemIndex).status != RQItemStatus.QUEUED)) {
                // Alert user that comp is not queued for render and stop submit process
                var comp_queue_error = "The selected comp is not queued for render: " + app.project.renderQueue.item(compSelectionItemIndex).comp.name + "\n";
                comp_queue_error += "Please enable rendering for that item in the Render Queue.";
                alert(comp_queue_error);
                return;
            }
            
            var numSucceeded = 0;
            var isValidToRenderSubmission = false;
            if (submissionText == allQueueSep) {
                // Cycle through all the comps in the Render Queue and submit the queued ones
                for (i = 1; i <= app.project.renderQueue.numItems; ++i) {
                    if (app.project.renderQueue.item(i).status != RQItemStatus.QUEUED) {
                        // Only submit comps that are queued
                        continue;
                    }
                    // Check if skip existing files option has been enabled, if not enabled it. If pressed cancel, we cancel the submission
                    if (!dcUtil.validateSkipExistingFrames(app.project.renderQueue.item(i), app.project.renderQueue.item(i).getSettings(), isValidToRenderSubmission)) {
                        progressBarPanel.progressBar.value = 0;
                        app.project.save(app.project.file);
                        logger.info("Pressed cancel, aborting entire submission process.", _submitButtonFileName);
                        continue;
                    }
                    // Only show prompt to upload files once.
                    if(i == 1 && dcProperties.config.auto_accept.get() == "False" && !dcUtil.validateAutoAccept())
                    {
                        progressBarPanel.progressBar.value = 0;
                        app.project.save(app.project.file);
                        logger.info("Pressed cancel upload job attachments, aborting entire submission process.", _submitButtonFileName);
                        break;
                    }
                    // Submit the current item
                    var submitCompResult = submitRenderQueueToDeadlineCloud(app.project.renderQueue.item(i), dcUtil.removeIllegalCharacters(app.project.renderQueue.item(i).comp.name));
                    results = submitCompResult;
                    jobCount = jobCount + 1;
                    progressBarPanel.progressBar.value = (jobCount * 100) / (totalJobs + 1);

                    if(submitCompResult) {
                        numSucceeded++;
                    } else {
                        logger.info("Submission for " + app.project.renderQueue.item(i).comp.name + " has failed.", _submitButtonFileName);
                        alert("Failed to submit job for " + app.project.renderQueue.item(i).comp.name + ".");
                        continue;
                    }
                    
                    logger.info("Submit Entire Render Queue to Deadline Cloud.")
                    if (submissionText == useQueue)
                        break;
                }

            } else if (submissionText == selectOne) {
                // Check if skip existing files option has been enabled, if not enabled it. If pressed cancel, we cancel the submission
                if (!dcUtil.validateSkipExistingFrames(app.project.renderQueue.item(compSelectionItemIndex), app.project.renderQueue.item(compSelectionItemIndex).getSettings(), isValidToRenderSubmission)) {
                    progressBarPanel.progressBar.value = 0;
                    app.project.save(app.project.file);
                    logger.info("Pressed cancel, aborting entire submission process.", _submitButtonFileName);
                }
                else if(dcProperties.config.auto_accept.get() == "False" && !dcUtil.validateAutoAccept())
                {
                    progressBarPanel.progressBar.value = 0;
                    app.project.save(app.project.file);
                    logger.info("Pressed cancel upload job attachments, aborting entire submission process.", _submitButtonFileName);
                }
                else{
                    var submitSelectedCompResult = submitRenderQueueToDeadlineCloud(app.project.renderQueue.item(compSelectionItemIndex), dcUtil.removeIllegalCharacters(compSelectionGroup.compSelection.selection.text));
                    results = submitSelectedCompResult;
                    if(submitSelectedCompResult) {
                        numSucceeded++;
                    } else {
                        logger.info("Submission for " + compSelectionGroup.compSelection.selection.text + " has failed.", _submitButtonFileName);
                    }
                    logger.info("Submit Selected Comp to Deadline Cloud", _submitButtonFileName);
                }
            }
            else {
                // Submit the entire render queue as one job
                logger.info("Submit the entire render queue as one job", _submitButtonFileName);
                var templates = createDataAndParameterTemplateOneJob();
                // logger.debug("templates: " + JSON.stringify(templates), _submitButtonFileName);
                jobAssetReferences = generateAssetReferences();
                // logger.debug("jobAssetReferences: " + JSON.stringify(jobAssetReferences), _submitButtonFileName);
                var _submissionResult = createSubmission(templates.jobTemplate, templates.jobParams, jobAssetReferences, dcProperties.config.job_history_dir.get(), jobGroup.jobName.text);
                // logger.debug("_submissionResult: " + JSON.stringify(_submissionResult), _submitButtonFileName);
                results = _submissionResult;
                if (results) {
                    numSucceeded++;
                }
            }

            progressBarPanel.progressBar.value = 100;
            // Restore the original project path if necessary.
            if (restoreProjectPath) {
                //Delete temp aepx project file if generated by Deadline job submission prior to restoring project path.
                if (deleteTempXmlFile) {
                    var tempXmlFile = File(projectPath);
                    tempXmlFile.remove();
                }
                app.open(File(oldProjectPath));
                projectName = app.project.file.name; //reset to current projectName for subsequent job submissions.
                projectPath = app.project.file.fsName; //reset to current projectPath for subsequent job submissions.
            } else if (oldGPUAccelType != null) {
                app.project.gpuAccelType = oldGPUAccelType;
            }
            if (!results && submissionText == selectOne) {
                alert("Failed to submit job for " + compSelectionGroup.compSelection.selection.text + ".")
            }
            else if (!results && submissionText == useQueue)
            {
                alert("Failed to submit the render queue.\n");
            }
            else if (results && (submissionText == selectOne) || ((queuedCount == 1) && (submissionText == useQueue || submissionText == allQueueSep))) {
                alert("Completed submission.\n" + "1 job was submitted successfully.");
            }
            else {
                alert("Completed submission.\n" + numSucceeded + " of " + queuedCount + " jobs were submitted successfully.");
            }
        } else {
            alert("The render queue is currently empty, or you do not have any items enabled for rendering in the render queue, or you did not provide an output location for the renderQueueItem.");
        }
    }

    function createDataAndParameterTemplateOneJob()
    {
        jobTemplate = generatePartialTemplate();
        stepsTemplate = jobTemplate.steps;
        jobTemplate.steps = [];

        // Add parameter data that only has to be added once
        jobParams = {};
        jobParams.parameterValues = [];
        jobParams.parameterValues.push(applyDataToParameterTemplate("AfterEffectsProjectFile", app.project.file.fsName));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:targetTaskRunStatus", dcProperties.deadlineJobParameters.targetTaskRunStatus.get()));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:maxFailedTasksCount", dcProperties.deadlineJobParameters.maxFailedTasksCount.get()));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:maxRetriesPerTask", dcProperties.deadlineJobParameters.maxRetriesPerTask.get()));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:priority", dcProperties.deadlineJobParameters.priority.get()));
        
        // As we may skip some items, stepIndex is the number of renderQueue items successfully processed.
        var stepIndex = 1;
        for (var j = 1; j <= app.project.renderQueue.numItems; j++) {
            // logger.debug("[createDataAndParameterTemplateOneJob] j: " + j, _submitButtonFileName);
            if (app.project.renderQueue.item(j).status != RQItemStatus.QUEUED) {
                // Only submit comps that are queued
                continue;
            }
            
            var __compName = dcUtil.removeIllegalCharacters(app.project.renderQueue.item(j).comp.name);
            var frameList = getFrameList(app.project.renderQueue.item(j));
            
            // logger.debug("[createDataAndParameterTemplateOneJob] __compName: " + __compName, _submitButtonFileName);
            // logger.debug("[createDataAndParameterTemplateOneJob] frameList: " + frameList, _submitButtonFileName);
            
            // Add data to the main template
            jobTemplate.parameterDefinitions.push(applyDataToTemplate(__compName + "_Frames", dcUtil.deepCopy(dcDataTemplate.Frames)));
            jobTemplate.parameterDefinitions.push(applyDataToTemplate(__compName + "_OutputPattern", dcUtil.deepCopy(dcDataTemplate.OutputPattern)));
            jobTemplate.parameterDefinitions.push(applyDataToTemplate(__compName + "_OutputFormat", dcUtil.deepCopy(dcDataTemplate.OutputFormat)));
            jobTemplate.parameterDefinitions.push(applyDataToTemplate(__compName + "_CompName", dcUtil.deepCopy(dcDataTemplate.CompName)));
            jobTemplate.parameterDefinitions.push(applyDataToTemplate(__compName + "_OutputFilePath", dcUtil.deepCopy(dcDataTemplate.OutputFilePath)));
            
            // Add steps data per task that needs to be run
            jobTemplate = generateStep(jobTemplate, __compName, dcUtil.deepCopy(stepsTemplate), stepIndex, app.project.renderQueue.item(j));
            // logger.debug("[createDataAndParameterTemplateOneJob] jobTemplate: " + JSON.stringify(jobTemplate), _submitButtonFileName);
            
            jobTemplate = applyHostReqToTemplate(jobTemplate);
            // logger.debug("[createDataAndParameterTemplateOneJob] jobTemplate applyHostReqToTemplate: " + JSON.stringify(jobTemplate), _submitButtonFileName);
            
            // Add data to the parameter template
            jobParams.parameterValues.push(applyDataToParameterTemplate(__compName + "_Frames", frameList));
            jobParams.parameterValues.push(applyDataToParameterTemplate(__compName + "_CompName", app.project.renderQueue.item(j).comp.name));
            jobParams.parameterValues.push(applyDataToParameterTemplate(__compName + "_OutputPattern", dcUtil.removePercentageFromFileName(getRenderQueueItemData(app.project.renderQueue.item(j))["fileName"])));
            jobParams.parameterValues.push(applyDataToParameterTemplate(__compName + "_OutputFormat", getRenderQueueItemData(app.project.renderQueue.item(j))["extension"]));
            jobParams.parameterValues.push(applyDataToParameterTemplate(__compName + "_OutputFilePath", getCompleteDirectory(app.project.renderQueue.item(j))));
            
            stepIndex++;
        }

        return {
            "jobTemplate": jobTemplate,
            "jobParams": jobParams
        }
    }

    function createDataAndParameterTemplateSeparateJobs(renderQueueItem, itemName)
    {
        var compNameToCheck = dcUtil.removeIllegalCharacters(renderQueueItem.comp.name);
        var frameList = getFrameList(renderQueueItem);
        jobTemplate = generatePartialTemplate();
        // Add data to the main template
        jobTemplate.parameterDefinitions.push(applyDataToTemplate(itemName + "_Frames", dcDataTemplate.Frames));
        jobTemplate.parameterDefinitions.push(applyDataToTemplate(itemName + "_OutputPattern", dcDataTemplate.OutputPattern));
        jobTemplate.parameterDefinitions.push(applyDataToTemplate(itemName + "_OutputFormat", dcDataTemplate.OutputFormat));
        // jobTemplate.parameterDefinitions.push(applyDataToTemplate(itemName + "_CompName", dcDataTemplate.CompName));
        jobTemplate.parameterDefinitions.push(applyDataToTemplate(itemName + "_OutputFilePath", dcDataTemplate.OutputFilePath));
        __stepsTemplate = jobTemplate.steps;
        jobTemplate.steps = [];
        jobTemplate = generateStep(jobTemplate, itemName, __stepsTemplate, 1, renderQueueItem);
        jobTemplate = applyHostReqToTemplate(jobTemplate);
        jobParams = {};
        jobParams.parameterValues = [];
        jobParams.parameterValues.push(applyDataToParameterTemplate("AfterEffectsProjectFile", app.project.file.fsName));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:targetTaskRunStatus", dcProperties.deadlineJobParameters.targetTaskRunStatus.get()));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:maxFailedTasksCount", dcProperties.deadlineJobParameters.maxFailedTasksCount.get()));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:maxRetriesPerTask", dcProperties.deadlineJobParameters.maxRetriesPerTask.get()));
        jobParams.parameterValues.push(applyDataToParameterTemplate("deadline:priority", dcProperties.deadlineJobParameters.priority.get()));
        jobParams.parameterValues.push(applyDataToParameterTemplate(itemName + "_Frames", frameList));
        // jobParams.parameterValues.push(applyDataToParameterTemplate(itemName + "_CompName", comp));
        jobParams.parameterValues.push(applyDataToParameterTemplate(itemName + "_OutputPattern", dcUtil.removePercentageFromFileName((getRenderQueueItemData(renderQueueItem)["fileName"]))));
        jobParams.parameterValues.push(applyDataToParameterTemplate(itemName + "_OutputFormat", getRenderQueueItemData(renderQueueItem)["extension"]));
        jobParams.parameterValues.push(applyDataToParameterTemplate(itemName + "_OutputFilePath", getCompleteDirectory(renderQueueItem)));
        
        // Check if item name is the same as the comp name. When submitting layers this will not be the case -> change data to be correct comp name for those submissions
        if(itemName !== compNameToCheck)
        {
            jobTemplate.parameterDefinitions.push(applyDataToTemplate(compNameToCheck + "_CompName", dcDataTemplate.CompName));
            jobParams.parameterValues.push(applyDataToParameterTemplate(compNameToCheck + "_CompName", renderQueueItem.comp.name));
        }
        else{
            jobTemplate.parameterDefinitions.push(applyDataToTemplate(itemName + "_CompName", dcDataTemplate.CompName));
            jobParams.parameterValues.push(applyDataToParameterTemplate(itemName + "_CompName", renderQueueItem.comp.name));
        }
        return {
            "jobTemplate": jobTemplate,
            "jobParams": jobParams
        }
    }
    return {
        "getStartFrame": getStartFrame,
        "getEndFrame": getEndFrame,
        "getCompName": getCompName,
        "getRenderQueueItemData": getRenderQueueItemData,
        "handleSubmitButtonPressed": handleSubmitButtonPressed,
        "getOutputDirectory": getOutputDirectory,
        "getCompleteDirectory": getCompleteDirectory,
        "submitRenderQueueToDeadlineCloud": submitRenderQueueToDeadlineCloud,
        "createDataAndParameterTemplateOneJob": createDataAndParameterTemplateOneJob,
        "createDataAndParameterTemplateSeparateJobs": createDataAndParameterTemplateSeparateJobs,
        "generateAssetReferences": generateAssetReferences
    }
}

dcSubmitButton = __generateSubmitButton();