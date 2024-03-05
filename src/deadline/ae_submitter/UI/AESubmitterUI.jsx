var config = dcProperties.config.aws_profile.get();
var version = app.version.substring(0, app.version.indexOf('x'));
// Create object to hold all UI variables and init variables
var deadlineCloud = {};
var deadlineCloudConfiguration = null;

var totalCount = app.project.renderQueue.numItems; //used later on in submission script.

// file paths
var projectName = app.project.file.name;
var projectPath = app.project.file.fsName;

if (app.project.renderQueue.numItems != 0) {
    var initCompSelection = app.project.renderQueue.item(1).comp.name;
}

// globals for job submission types
var submissionText = "";
var selectOne = "Select One Comp";
var useQueue = "Submit Entire Queue As One Job";
var allQueueSep = "Submit Entire Queue As Separate Jobs";

function __generateSubmitterUI() {

    // Create variables to use for logger;
    var _scriptFileAESubmitterName = "AESubmitterUI.jsx";
    var LABEL_SIZE = [150, 20]
    var TEXT_SIZE = [500, 18];
    var SHORT_TEXT_SIZE = [160, 18];
    var COMBO_SIZE = [160, 20];
    var SHORT_COMBO_SIZE = [160, 20];
    var BUTTON_SIZE = [36, 20];
    var SLIDER_SIZE = [336, 20];
    var CHECKBOX_A_SIZE = [320, 20];
    var CHECKBOX_B_SIZE = [200, 20];
    var CHECKBOX_C_SIZE = [250, 20];
    var CHECKBOX_D_SIZE = [175, 20];
    var CHECKBOX_E_SIZE = [125, 20];
    var LIST_BOX_SIZE = [700, 300];
    var LIST_BOX_SIZE_SMALL = [700, 100];
    var FILE_BUTTON_SIZE = [100, 30]
    var LAYER_LABEL_SIZE = [300, 20];
    var LAYER_TEXT_SIZE = [35, 18];

    // Create List of footageItems in the scene
    dcProperties.jobAttachments.userAddedInputFiles.set([]);
    dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.set(0);
    dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.set(0);
    dcProperties.footageLabels.SELECTED_FOOTAGE_ITEMS.set(0);

    // Create list of input directories
    dcProperties.jobAttachments.userAddedInputDirectories.set([]);
    dcProperties.inputLabels.ADDED_INPUT_ITEMS.set(0);
    dcProperties.inputLabels.AUTO_DETECTED_INPUT_ITEMS.set(0);
    dcProperties.inputLabels.SELECTED_INPUT_ITEMS.set(0);

    // Create list of output directories from the renderqueue
    dcProperties.jobAttachments.userAddedOutputDirectories.set([]);
    dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.set(0);
    dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.set(0);
    dcProperties.outputLabels.SELECTED_OUTPUT_ITEMS.set(0);

    // get the saved defaults from the ini file
    var initUseCompName = dcUtil.parseBool(dcSettings.getIniSetting("UseCompName", "false"));
    var initGroup = dcSettings.getIniSetting("Group", "none");
    var initSubmitScene = dcUtil.parseBool(dcSettings.getIniSetting("SubmitScene", "false"));
    var initMultiProcess = dcUtil.parseBool(dcSettings.getIniSetting("MultiProcess", "false"));
    var initMissingFootage = dcUtil.parseBool(dcSettings.getIniSetting("MissingFootage", "false"));
    var initExportAsXml = dcUtil.parseBool(dcSettings.getIniSetting("ExportAsXml", "false"));
    var initDeleteTempXml = dcUtil.parseBool(dcSettings.getIniSetting("DeleteTempXml", "false"));
    var initUseCompFrameRange = dcUtil.parseBool(dcSettings.getIniSetting("UseCompFrame", "false"));
    var initFirstAndLast = null;
    if (!initUseCompFrameRange) {
        initFirstAndLast = false;
    } else {
        initFirstAndLast = dcUtil.parseBool(dcSettings.getIniSetting("FirstAndLast", "false"));
    }

    var initIgnoreMissingLayers = dcUtil.parseBool(dcSettings.getIniSetting("MissingLayers", "false"));
    var initIgnoreMissingEffects = dcUtil.parseBool(dcSettings.getIniSetting("MissingEffects", "false"));
    var initFailOnWarnings = dcUtil.parseBool(dcSettings.getIniSetting("FailOnWarnings", "false"));
    var initDependentComps = dcUtil.parseBool(dcSettings.getIniSetting("DependentComps", "false"));
    var initSubmitEntireQueue = dcUtil.parseBool(dcSettings.getIniSetting("SubmitEntireQueue", "false"));
    var initLocalRendering = dcUtil.parseBool(dcSettings.getIniSetting("LocalRendering", "false"));
    var initIncludeOutputPath = dcUtil.parseBool(dcSettings.getIniSetting("IncludeOutputPath", "false"));
    var initOverrideFailOnExistingAEProcess = dcUtil.parseBool(dcSettings.getIniSetting("OverrideFailOnExistingAEProcess", "false"));
    var initFailOnExistingAEProcess = dcUtil.parseBool(dcSettings.getIniSetting("FailOnExistingAEProcess", "false"));
    var initIgnoreGPUAccelWarning = dcUtil.parseBool(dcSettings.getIniSetting("IgnoreGPUAccelWarning", "false"));

    var initMultiMachine = dcUtil.parseBool(dcSettings.getIniSetting("MultiMachine", "false"));
    var initFileSize = parseInt(dcSettings.getIniSetting("FileSize", 0));
    var initDeleteFile = dcUtil.parseBool(dcSettings.getIniSetting("DeleteFile", "false"));
    var initMemoryManagement = dcUtil.parseBool(dcSettings.getIniSetting("MemoryManagement", "false"));
    var initImageCachePercentage = parseInt(dcSettings.getIniSetting("ImageCachePercentage", 100));
    var initMaxMemoryPercentage = parseInt(dcSettings.getIniSetting("MaxMemoryPercentage", 100));
    var initCompSubmissionType = dcSettings.getIniSetting("CompSubmissionType", "Select One Comp");

    var initFailedTasksLimit = parseInt(dcSettings.getIniSetting("FailedTasksLimit", 20));
    var initTaskRetryLimit = parseInt(dcSettings.getIniSetting("TaskRetryLimit", 5));
    var initDeadlineCloudPriority = parseInt(dcSettings.getIniSetting("DeadlineCloudPriority", 50));
    var initOutputFolder = dcSettings.getIniSetting("Layers_OutputFolder", "");


    function createUI() {
        // Call init to initialize UI
        initMainUI();

        // Define colors for status boxes
        red = deadlineCloud.winGraphics.newPen(deadlineCloud.winGraphics.BrushType.SOLID_COLOR, [1, 0, 0], 1);
        green = deadlineCloud.winGraphics.newPen(deadlineCloud.winGraphics.BrushType.SOLID_COLOR, [0, 1, 0], 1);

        // Create authentication group and widgets
        authenticateGroup = deadlineCloud.aeSubmitterUI.add("group", undefined);
        authenticateGroup.orientation = "row";

        credsLabel = authenticateGroup.add("statictext", undefined, "Source: ");
        credsLabel.size = [40, 20];

        credsAuthentication = authenticateGroup.add("statictext", undefined, "NOT_VALID");
        credsAuthentication.graphics.foregroundColor = red;
        credsAuthentication.size = [200, 20];

        statusLabel = authenticateGroup.add("statictext", undefined, "Status: ");
        statusLabel.size = [40, 20];
        
        statusAuthentication = authenticateGroup.add("statictext", undefined, "NEEDS_LOGIN");
        statusAuthentication.graphics.foregroundColor = red;
        statusAuthentication.size = [140, 20];

        apiStatusLabel = authenticateGroup.add("statictext", undefined, "Deadline Cloud API: ");
        apiStatusLabel.size = [110, 20];

        apiAuthentication = authenticateGroup.add("statictext", undefined, "False");
        apiAuthentication.graphics.foregroundColor = red;
        apiAuthentication.size = [140, 20];

        // Render Layers button (brings up new dialog)
        buttonsGroup = deadlineCloud.aeSubmitterUI.add("group", undefined);

        // Login Button
        buttonsGroup.loginButton = buttonsGroup.add("button", undefined, "Login");
        buttonsGroup.loginButton.size = [100, 30];
        buttonsGroup.loginButton.onClick = function() {
            var _loginWindow = dcInitData.loadingLoginWindow();
            _loginWindow.text = "Logging in to Deadline Cloud Monitor."
            _loginWindow.children[0].text = "Logging in to Deadline Cloud Monitor."
            var result = dcDeadlineCommands.login(dcProperties.config.aws_profile.get(), dcProperties.config.deadline_cloud_monitor.get());
            _loginWindow.close();
            if(result.return_code == 0){ 
                dcProperties.isLoggedIn.set(true);
            } else{
                dcProperties.isLoggedIn.set(false);
                dcProperties.isAPIAvailable.set(false);
            }
        }
        // Logout Button
        buttonsGroup.logoutButton = buttonsGroup.add("button", undefined, "Logout");
        buttonsGroup.logoutButton.size = [100, 30];
        buttonsGroup.logoutButton.onClick = function() {
            var result = dcDeadlineCommands.logout(dcProperties.config.aws_profile.get(), dcProperties.config.deadline_cloud_monitor.get());
            if(result.return_code == 0){  
                dcProperties.isLoggedIn.set(false);
            } else{
                dcProperties.isLoggedIn.set(false);
            }
            farmList = [];
            queueList = [];
        }
        // Settings Button
        buttonsGroup.settingsButton = buttonsGroup.add("button", undefined, "Settings");
        buttonsGroup.settingsButton.size = [100, 30];
        buttonsGroup.settingsButton.onClick = function() {
            deadlineCloud.aeSubmitterUI.enabled = false;
            logger.info("OPENING SETTINGS WINDOW", _scriptFileAESubmitterName);
            dcSettingsWindow.initDeadlineCloudSettingsWindow(deadlineCloud.aeSubmitterUI);
            
        }

        // Submit Selected Layers Button
        buttonsGroup.submitLayersButton = buttonsGroup.add('button', undefined, 'Submit Selected Layers');
        buttonsGroup.submitLayersButton.size = [180, 30];
        buttonsGroup.submitLayersButton.onClick = function()
        {
            dcProperties.isLoggedIn.get();
            dcProperties.deadlineJobParameters.description.set(descriptionGroup.textComment.text);
            dcProperties.deadlineJobParameters.targetTaskRunStatus.set(initStateGroup.initStateDropdown.selection.text);
            dcProperties.deadlineJobParameters.maxFailedTasksCount.set(parseInt(failedTasksGroup.failedTasksText.text));
            dcProperties.deadlineJobParameters.maxRetriesPerTask.set(parseInt(taskRetryGroup.taskRetryText.text));
            dcProperties.deadlineJobParameters.priority.set(parseInt(deadlineCloudPriorityGroup.textPriority.text));
            dcSubmitLayerButton.SubmitLayersToDeadline();
        }
        //submit button - goes through the selected layers and submits them
        buttonsGroup.submitButton = buttonsGroup.add('button', undefined, 'Submit');
        buttonsGroup.submitButton.onClick = function() 
        {
            dcProperties.deadlineJobParameters.description.set(descriptionGroup.textComment.text);
            dcProperties.deadlineJobParameters.targetTaskRunStatus.set(initStateGroup.initStateDropdown.selection.text);
            dcProperties.deadlineJobParameters.maxFailedTasksCount.set(parseInt(failedTasksGroup.failedTasksText.text));
            dcProperties.deadlineJobParameters.maxRetriesPerTask.set(parseInt(taskRetryGroup.taskRetryText.text));
            dcProperties.deadlineJobParameters.priority.set(parseInt(deadlineCloudPriorityGroup.textPriority.text));
            dcSubmitButton.handleSubmitButtonPressed();
        }
        buttonsGroup.exportBundleButton = buttonsGroup.add('button', undefined, 'Export Bundle');
        buttonsGroup.exportBundleButton.size = [100, 30];
        buttonsGroup.exportBundleButton.onClick = function() 
        {
            dcProperties.deadlineJobParameters.description.set(descriptionGroup.textComment.text);
            dcProperties.deadlineJobParameters.targetTaskRunStatus.set(initStateGroup.initStateDropdown.selection.text);
            dcProperties.deadlineJobParameters.maxFailedTasksCount.set(parseInt(failedTasksGroup.failedTasksText.text));
            dcProperties.deadlineJobParameters.maxRetriesPerTask.set(parseInt(taskRetryGroup.taskRetryText.text));
            dcProperties.deadlineJobParameters.priority.set(parseInt(deadlineCloudPriorityGroup.textPriority.text));

            var exportCount = 0;
            if (dcProperties.config.job_history_dir.get() == "")
            {
                alert("Please add a 'Job History Directory' in the 'Settings' before exporting the job bundle.");
                return;
            }
            var exportText = compSubmissionGroup.compSubmission.selection.toString();
            if(exportText == selectOne)
            {
                exportBundleToJobHistoryDir(app.project.renderQueue.item(compSelectionGroup.compSelection.selection.index + 1), dcProperties.config.job_history_dir.get(), compSelectionGroup.compSelection.selection.text);
                return alert("Export for " + compSelectionGroup.compSelection.selection.text + " was successful. Export can be found at: " + dcProperties.config.job_history_dir.get());
            }
            else if(exportText == useQueue)
            {
                exportBundleToJobHistoryDir(null, dcProperties.config.job_history_dir.get(), null);
                return alert("Export for the entire renderQueue was successful. Export can be found at: " + dcProperties.config.job_history_dir.get());
            }
            for (i = 1; i <= app.project.renderQueue.numItems; ++i) 
            {
                exportBundleToJobHistoryDir(app.project.renderQueue.item(i), dcProperties.config.job_history_dir.get(), app.project.renderQueue.item(i).comp.name);
                exportCount+=1;
            }
            alert("Completed job export.\n" + exportCount + " of " + app.project.renderQueue.numItems + " jobs were exported successfully.\n" + "Exports can be found at: " + dcProperties.config.job_history_dir.get() + ".");
        }   

        // Create main close button
        buttonsGroup.closeButton = buttonsGroup.add('button', undefined, 'Close');
        buttonsGroup.closeButton.size = [100, 30];
        buttonsGroup.closeButton.onClick = function() {
            dcCloseButton.closeButtonFncMain(deadlineCloud.aeSubmitterUI);
        }

        // Create Progress Bar for Submission Button
        progressBarPanel = deadlineCloud.aeSubmitterUI.add('group', undefined);
        progressBarPanel.alignment = [ScriptUI.Alignment.RIGHT, ScriptUI.Alignment.TOP];
        progressBarPanel.progressBar = progressBarPanel.add('progressbar', undefined, '');
        progressBarPanel.progressBar.size = [200, 20];
        progressBarPanel.progressBar.value = 0;

        deadlineCloud.aeSubmitterUI.center()
        deadlineCloud.aeSubmitterUI.show();
        deadlineCloud.aeSubmitterUI.update();

        initCallbacks();
        // Fill farm and queue list again. When we startup and we are logged out the lists are empty
        var result = dcDeadlineCommands.credentialStatus(dcProperties.config.aws_profile.get());
        if(result.status == "AUTHENTICATED")
        {
            // var result = dcDeadlineCommands.login(dcProperties.config.aws_profile.get(), dcProperties.config.deadline_cloud_monitor.get());
            dcProperties.isLoggedIn.set(true);
            dcProperties.isAPIAvailable.set(true);
        }
        else{
            dcProperties.isLoggedIn.set(false);
            dcProperties.isAPIAvailable.set(false);
        }
    }


    function initMainUI() {
        /**
         * Initialize all widgets separate by tab
         */
        logger.log("Initializing Main UI", _scriptFileAESubmitterName, LOG_LEVEL.INFO);
        // Create main window object
        deadlineCloud.aeSubmitterUI = new Window("palette", "Submit After Effects To Deadline");
        deadlineCloud.winGraphics = deadlineCloud.aeSubmitterUI.graphics;
        // Create a TabbedPanel
        deadlineCloud.mainPanel = deadlineCloud.aeSubmitterUI.add("tabbedpanel", undefined, "");
        deadlineCloud.aeSubmitterUI.autoDetectFootageList = dcProperties.jobAttachments.autoDetectedInputFiles.get();
        deadlineCloud.aeSubmitterUI.autoDetectInputList = dcProperties.jobAttachments.autoDetectInputDirectories.get();
        deadlineCloud.aeSubmitterUI.autoDetectOutputList = dcProperties.jobAttachments.autoDetectOutputDirectories.get();
        //deadlineCloud.aeSubmitterUI.loginState = false;
        initSharedJobSettingsTab();

        initJobSpecific();

        initAdvanced();

        initJobAttachment();

        initHostRequirements();

        initConnections();
    }

    function initConnections() {
        /**
         * Initialize all functionality attacked to widgets that are initialized in init.
         */
        logger.log("Initializing Main UI Connections", _scriptFileAESubmitterName, LOG_LEVEL.INFO);

        // Call Connections for the widgets in the Shared Job Settings tab(functionality)
        initConnectionsSharedJobSettings();

        // Call Connections for the widgets in the Advanced tab(functionality)
        initConnectionsAdvanced();

        // Call Connections for the widgets in the Job-Specific Settings tab(functionality)
        initConnectionsJobSpecific();

        // Call Connections for the widgets in the Job Attachment tab(functionality)
        initConnectionsJobAttachment();

        // Call Connections for the widgets in Host Requirements tab(functionality)
        initConnectionsHostRequirements();
    }

    function initSharedJobSettingsTab() {
        logger.log("Initializing Shared Job Settings Tab", _scriptFileAESubmitterName, LOG_LEVEL.INFO);

        // Create Shared Job Settings tab
        deadlineCloud.tabSharedJobSettings = deadlineCloud.mainPanel.add("tab", undefined, "Shared Job Settings");
        deadlineCloud.tabSharedJobSettings.orientation = "column";

        // Add UI elements to the Shared Job Settings tab
        // Create job properties panel and widgets
        deadlineCloud.jobPanel = deadlineCloud.tabSharedJobSettings.add("panel", undefined, "Job Properties");
        deadlineCloud.jobPanel.orientation = "column";
        deadlineCloud.jobPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Job group creation
        jobGroup = deadlineCloud.jobPanel.add("group", undefined);
        jobGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        jobGroup.orientation = "row";
        jobGroup.labelJob = jobGroup.add("statictext", undefined, "Name");
        jobGroup.labelJob.size = LABEL_SIZE;
        jobGroup.labelJob.helpTip = 'The name of your job. This is optional, and if left blank, it will default to "Untitled". Disabled if Use Comp Name is enabled.';
        var projectNameWithoutExtension = projectName.split(".")[0];
        jobGroup.jobName = jobGroup.add("edittext", undefined, dcUtil.removePercentageFromFileName(projectNameWithoutExtension));
        jobGroup.jobName.enabled = !initUseCompName;
        jobGroup.jobName.size = TEXT_SIZE;


        // Group checkbox creation
        checkboxGroup = deadlineCloud.jobPanel.add("group", undefined);
        checkboxGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        checkboxGroup.orientation = "row";
        checkboxGroup.labelCheckBox = checkboxGroup.add("statictext", undefined, "");
        checkboxGroup.labelCheckBox.size = LABEL_SIZE;
        checkboxGroup.useNameCheckBox = checkboxGroup.add("checkbox", undefined, "Use File Name As Job Name");
        checkboxGroup.useNameCheckBox.value = initUseCompName;
        checkboxGroup.useNameCheckBox.size = TEXT_SIZE;
        checkboxGroup.useNameCheckBox.helpTip = "If enabled, the job's name will be the File name.";

        // Description group creation
        descriptionGroup = deadlineCloud.jobPanel.add("group");
        descriptionGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        descriptionGroup.orientation = "row";
        descriptionGroup.labelComment = descriptionGroup.add("statictext", undefined, "Description");
        descriptionGroup.labelComment.size = LABEL_SIZE;
        descriptionGroup.helpTip = 'A simple description of your job. This is optional and can be left blank.';
        descriptionGroup.textComment = descriptionGroup.add("edittext", undefined, "");
        descriptionGroup.textComment.size = TEXT_SIZE;

        // Create Deadline Cloud Priority group and widgets
        deadlineCloudPriorityGroup = deadlineCloud.jobPanel.add("group", undefined);
        deadlineCloudPriorityGroup.orientation = "row";
        deadlineCloudPriorityGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        deadlineCloudPriorityGroup.labelPriority = deadlineCloudPriorityGroup.add("statictext", undefined, "Priority");
        deadlineCloudPriorityGroup.labelPriority.size = LABEL_SIZE;
        deadlineCloudPriorityGroup.labelPriority.helpTip = 'A job can have a numeric priority range, with 0 being the lowest priority.';
        deadlineCloudPriorityGroup.textPriority = deadlineCloudPriorityGroup.add("edittext", undefined, initDeadlineCloudPriority);
        deadlineCloudPriorityGroup.textPriority.size = COMBO_SIZE;

        deadlineCloudPriorityGroup.prioritySlider = deadlineCloudPriorityGroup.add('slider', undefined, initDeadlineCloudPriority, 0, 100);
        deadlineCloudPriorityGroup.prioritySlider.size = SLIDER_SIZE;

        // Create initial state group and widgets
        initStateGroup = deadlineCloud.jobPanel.add("group", undefined);
        initStateGroup.orientation = "row"
        initStateGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        initStateGroup.initStateLabel = initStateGroup.add("statictext", undefined, "Initial State");
        initStateGroup.initStateLabel.size = LABEL_SIZE;
        initStateGroup.initStateDropdown = initStateGroup.add("dropdownlist", undefined, ["READY", "SUSPENDED"]);
        initStateGroup.initStateDropdown.size = SHORT_TEXT_SIZE;
        initStateGroup.initStateDropdown.selection = 0;

        // Create failed tasks group and widgets
        failedTasksGroup = deadlineCloud.jobPanel.add("group", undefined);
        failedTasksGroup.orientation = "row"
        failedTasksGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        failedTasksGroup.failedTasksLabel = failedTasksGroup.add("statictext", undefined, "Maximum Failed Tasks Count");
        failedTasksGroup.failedTasksLabel.size = LABEL_SIZE;
        failedTasksGroup.failedTasksText = failedTasksGroup.add("edittext", undefined, initFailedTasksLimit);
        failedTasksGroup.failedTasksText.size = SHORT_TEXT_SIZE;

        failedTasksGroup.failedTasksSlider = failedTasksGroup.add('slider', undefined, initFailedTasksLimit, 0, 100);
        failedTasksGroup.failedTasksSlider.size = SLIDER_SIZE;

        // Create Task Retry Limit group and widgets
        taskRetryGroup = deadlineCloud.jobPanel.add("group", undefined);
        taskRetryGroup.orientation = "row"
        taskRetryGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        taskRetryGroup.taskRetryLabel = taskRetryGroup.add("statictext", undefined, "Maximum Retries Per Task");
        taskRetryGroup.taskRetryLabel.size = LABEL_SIZE;
        taskRetryGroup.taskRetryText = taskRetryGroup.add("edittext", undefined, initTaskRetryLimit);
        taskRetryGroup.taskRetryText.size = SHORT_TEXT_SIZE;

        taskRetryGroup.taskRetrySlider = taskRetryGroup.add('slider', undefined, initTaskRetryLimit, 0, 100);
        taskRetryGroup.taskRetrySlider.size = SLIDER_SIZE;

        // Create Deadline Cloud Settings panel
        deadlineCloud.deadlineCloudPanel = deadlineCloud.tabSharedJobSettings.add("panel", undefined, "Deadline Cloud Settings");
        deadlineCloud.deadlineCloudPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        deadlineCloud.deadlineCloudPanel.orientation = "column";

        // Create farm time group and widgets
        farmTimeGroup = deadlineCloud.deadlineCloudPanel.add("group", undefined);
        farmTimeGroup.orientation = "row"
        farmTimeGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        farmTimeGroup.farmTimeLabel = farmTimeGroup.add("statictext", undefined, "Farm " + "Default Farm");
        farmTimeGroup.farmTimeLabel.size = LAYER_LABEL_SIZE;

        // Create Queue group and widgets
        queueGroup = deadlineCloud.deadlineCloudPanel.add("group", undefined);
        queueGroup.orientation = "row"
        queueGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        queueGroup.qLabel = queueGroup.add("statictext", undefined, "Queue " + "Default Queue");
        queueGroup.qLabel.size = LAYER_LABEL_SIZE;

        // Create Installation Requirements panel
        var instReqPanel = deadlineCloud.tabSharedJobSettings.add("panel", undefined, "Installation Requirements");
        instReqPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        instReqPanel.orientation = "column";

        //------------------------------------------------------------------------------------

        // Create Instal req group and widgets
        overrideInstReqGroup = instReqPanel.add("group", undefined);
        overrideInstReqGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        overrideInstReqGroup.orientation = "row";
        // CB = checkbox
        overrideInstReqGroup.overrideInstReqCB = overrideInstReqGroup.add("checkbox", undefined, "");
        overrideInstReqGroup.overrideInstReqCB.value = true;
        overrideInstReqGroup.overrideInstReqLabel = overrideInstReqGroup.add("statictext", undefined, " Override Installation Requirements");
        overrideInstReqGroup.overrideInstReqLabel.size = [200, 20];
        overrideInstReqGroup.overrideInstReqText = overrideInstReqGroup.add("edittext", undefined, "");
        overrideInstReqGroup.overrideInstReqText.size = [400, 18];

        //------------------------------------------------------------------------------------
    }

    function initAdvanced() {
        logger.log("Initializing Advanced Panel", _scriptFileAESubmitterName, LOG_LEVEL.INFO);

        // Create Advanced AE options panel
        deadlineCloud.aeAdvancedOptionsPanel = deadlineCloud.jobSettingsPanel.add('panel', undefined, 'After Effects Advanced Options');
        deadlineCloud.aeAdvancedOptionsPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Create dependent comps group and widgets
        dependentCompsGroup = deadlineCloud.aeAdvancedOptionsPanel.add('group', undefined);
        dependentCompsGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        dependentCompsGroup.dependentComps = dependentCompsGroup.add('checkbox', undefined, 'Comps Are Dependent On Previous Comps');
        dependentCompsGroup.dependentComps.value = initDependentComps;
        dependentCompsGroup.dependentComps.size = CHECKBOX_C_SIZE;
        dependentCompsGroup.dependentComps.helpTip = 'If enabled, the job for each comp in the render queue will be dependent on the job for the comp ahead of it. This is useful if a comp in the render queue uses footage rendered by a comp ahead of it.';
        dependentCompsGroup.firstAndLast = dependentCompsGroup.add('checkbox', undefined, 'Render First And Last Frames Of The Comp First');
        dependentCompsGroup.firstAndLast.value = initFirstAndLast;
        dependentCompsGroup.firstAndLast.helpTip = 'If using the Comp\'s frame list, you can enable this so that the job renders the first and last frames first.';

        // Submit Entire Render Queue
        submitEntireQueueGroup = deadlineCloud.aeAdvancedOptionsPanel.add('group', undefined);
        submitEntireQueueGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        submitEntireQueueGroup.multiProcess = submitEntireQueueGroup.add('checkbox', undefined, 'Multi-Process Rendering');
        submitEntireQueueGroup.multiProcess.value = initMultiProcess;
        submitEntireQueueGroup.multiProcess.size = CHECKBOX_C_SIZE;
        submitEntireQueueGroup.multiProcess.enabled = true;
        submitEntireQueueGroup.multiProcess.helpTip = 'Enable to use multiple processes to render multiple frames simultaneously (After Effects CS3 and later).';
        submitEntireQueueGroup.submitScene = submitEntireQueueGroup.add('checkbox', undefined, 'Submit Project File With Job');
        submitEntireQueueGroup.submitScene.value = initSubmitScene;
        submitEntireQueueGroup.submitScene.size = CHECKBOX_D_SIZE;
        submitEntireQueueGroup.submitScene.helpTip = 'If enabled, the After Effects Project File will be submitted with the job.';

        // Create Ignore Missing Layers and Submit Project File group and widgets
        ignoreMissingLayersGroup = deadlineCloud.aeAdvancedOptionsPanel.add('group', undefined);
        ignoreMissingLayersGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        ignoreMissingLayersGroup.ignoreMissingLayers = ignoreMissingLayersGroup.add('checkbox', undefined, 'Ignore Missing Layer Dependencies');
        ignoreMissingLayersGroup.ignoreMissingLayers.value = initIgnoreMissingLayers;
        ignoreMissingLayersGroup.ignoreMissingLayers.size = CHECKBOX_C_SIZE;
        ignoreMissingLayersGroup.ignoreMissingLayers.helpTip = 'If enabled, Deadline will ignore errors due to missing layer dependencies.';
        ignoreMissingLayersGroup.failOnWarnings = ignoreMissingLayersGroup.add('checkbox', undefined, 'Fail On Warning Messages');
        ignoreMissingLayersGroup.failOnWarnings.value = initFailOnWarnings;
        ignoreMissingLayersGroup.failOnWarnings.size = CHECKBOX_B_SIZE;
        ignoreMissingLayersGroup.failOnWarnings.helpTip = 'If enabled, Deadline will fail the job whenever After Effects prints out a warning message.';
        ignoreMissingLayersGroup.exportAsXml = ignoreMissingLayersGroup.add('checkbox', undefined, 'Export XML Project File');
        ignoreMissingLayersGroup.exportAsXml.value = initExportAsXml;
        ignoreMissingLayersGroup.exportAsXml.size = CHECKBOX_D_SIZE;
        ignoreMissingLayersGroup.exportAsXml.enabled = (parseInt(version) > 8);
        ignoreMissingLayersGroup.exportAsXml.helpTip = 'Enable to export the project file as an XML file for Deadline to render (After Effects CS4 and later). The original project file will be restored after submission. If the current project file is already an XML file, this will do nothing.';

        // Create Ignore Missing Effects and Local Rendering group and widgets
        ignoreMissingEffectsGroup = deadlineCloud.aeAdvancedOptionsPanel.add('group', undefined);
        ignoreMissingEffectsGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        ignoreMissingEffectsGroup.ignoreMissingEffects = ignoreMissingEffectsGroup.add('checkbox', undefined, 'Ignore Missing Effect References');
        ignoreMissingEffectsGroup.ignoreMissingEffects.value = initIgnoreMissingEffects;
        ignoreMissingEffectsGroup.ignoreMissingEffects.size = CHECKBOX_C_SIZE;
        ignoreMissingEffectsGroup.ignoreMissingEffects.helpTip = 'If enabled, Deadline will ignore errors due to missing effect references.';
        ignoreMissingEffectsGroup.missingFootage = ignoreMissingEffectsGroup.add('checkbox', undefined, 'Continue On Missing Footage');
        ignoreMissingEffectsGroup.missingFootage.value = initMissingFootage;
        ignoreMissingEffectsGroup.missingFootage.size = CHECKBOX_B_SIZE;
        ignoreMissingEffectsGroup.missingFootage.enabled = (parseInt(version) > 8);
        ignoreMissingEffectsGroup.missingFootage.helpTip = 'If enabled, rendering will not stop when missing footage is detected (After Effects CS4 and later).';
        ignoreMissingEffectsGroup.deleteTempXml = ignoreMissingEffectsGroup.add('checkbox', undefined, 'Delete XML File After Export');
        ignoreMissingEffectsGroup.deleteTempXml.value = initDeleteTempXml;
        ignoreMissingEffectsGroup.deleteTempXml.size = CHECKBOX_D_SIZE;
        ignoreMissingEffectsGroup.deleteTempXml.enabled = initExportAsXml;
        ignoreMissingEffectsGroup.deleteTempXml.helpTip = 'If enabled, the exported aepx project file will be automatically deleted after job submission (After Effects CS4 and later). If the current project file is already an XML file, this will do nothing.\n\n"Submit Project File With Job" must be enabled for this feature.';

        // Create Fail On Existing AE Process group and widgets
        failOnExistingProcessGroup = deadlineCloud.aeAdvancedOptionsPanel.add('group', undefined);
        failOnExistingProcessGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        failOnExistingProcessGroup.OverrideFailOnExistingAEProcess = failOnExistingProcessGroup.add('checkbox', undefined, 'Override Fail On Existing AE Process');
        failOnExistingProcessGroup.OverrideFailOnExistingAEProcess.value = initOverrideFailOnExistingAEProcess;
        failOnExistingProcessGroup.OverrideFailOnExistingAEProcess.size = CHECKBOX_C_SIZE;
        failOnExistingProcessGroup.OverrideFailOnExistingAEProcess.helpTip = 'If enabled, the global repository setting "Fail on Existing AE Process" will be overridden.';
        failOnExistingProcessGroup.FailOnExistingAEProcess = failOnExistingProcessGroup.add('checkbox', undefined, 'Fail On Existing AE Process');
        failOnExistingProcessGroup.FailOnExistingAEProcess.value = initFailOnExistingAEProcess;
        failOnExistingProcessGroup.FailOnExistingAEProcess.enabled = initOverrideFailOnExistingAEProcess;
        failOnExistingProcessGroup.FailOnExistingAEProcess.size = CHECKBOX_B_SIZE;
        failOnExistingProcessGroup.FailOnExistingAEProcess.helpTip = 'If enabled, the job will be failed if any After Effects instances are currently running on the Worker.\n\nExisting After Effects instances can sometimes cause 3rd party AE plugins to malfunction during network rendering.';

        failOnExistingProcessGroup.localRendering = failOnExistingProcessGroup.add('checkbox', undefined, 'Enable Local Rendering');
        failOnExistingProcessGroup.localRendering.value = initLocalRendering;
        failOnExistingProcessGroup.localRendering.size = CHECKBOX_D_SIZE;
        failOnExistingProcessGroup.localRendering.helpTip = 'If enabled, the frames will be rendered locally, and then copied to their final network location.\n\nNote that this feature requires the Include Output File Path option to be enabled. It is also not supported if using Multi-Machine Rendering.';
        failOnExistingProcessGroup.localRendering.enabled = !initMultiMachine && initIncludeOutputPath;

        // Create Ignore GPU Acceleration Warning group and widgets
        ignoreGPUAccelGroup = deadlineCloud.aeAdvancedOptionsPanel.add('group', undefined);
        ignoreGPUAccelGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        ignoreGPUAccelGroup.ignoreGPUAccelWarning = ignoreGPUAccelGroup.add('checkbox', undefined, 'Ignore GPU Acceleration Warning');
        ignoreGPUAccelGroup.ignoreGPUAccelWarning.value = initIgnoreGPUAccelWarning;
        ignoreGPUAccelGroup.ignoreGPUAccelWarning.size = CHECKBOX_C_SIZE;
        ignoreGPUAccelGroup.ignoreGPUAccelWarning.helpTip = 'If enabled, Deadline will no longer warn you about the project\'s GPU acceleration type.';
        // include the output path
        ignoreGPUAccelGroup.includeOutputPath = ignoreGPUAccelGroup.add('checkbox', undefined, 'Include Output File Path');
        ignoreGPUAccelGroup.includeOutputPath.value = initIncludeOutputPath;
        ignoreGPUAccelGroup.includeOutputPath.size = CHECKBOX_D_SIZE;
        ignoreGPUAccelGroup.includeOutputPath.helpTip = 'If enabled, the output file path will be added to the plugin information file. This is required for Local Rendering.';

        // Create Output Checking panel, group, and widgets
        deadlineCloud.outputPanel = deadlineCloud.aeAdvancedOptionsPanel.add('panel', undefined, 'Output File Checking');
        deadlineCloud.outputPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        // Output Checking Options
        fileSizeGroup = deadlineCloud.outputPanel.add('group', undefined);
        fileSizeGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        fileSizeGroup.fileSizeLabel = fileSizeGroup.add('statictext', undefined, 'Minimum File Size (KB)');
        fileSizeGroup.fileSizeLabel.size = LABEL_SIZE;
        fileSizeGroup.fileSizeLabel.helpTip = 'If the output file size is less then this value (KB), Deadline will fail the task and requeue it. Set to 0 to disable this feature.\n\nNote that this feature is not supported if using Multi-Machine Rendering.';
        fileSizeGroup.fileSizeLabel.enabled = !initMultiMachine
        fileSizeGroup.fileSize = fileSizeGroup.add('edittext', undefined, initFileSize);
        fileSizeGroup.fileSize.size = SHORT_TEXT_SIZE;
        fileSizeGroup.fileSize.enabled = !initMultiMachine

        fileSizeGroup.fileSizeSlider = fileSizeGroup.add('slider', undefined, initFileSize, 0, 100000);
        fileSizeGroup.fileSizeSlider.size = SLIDER_SIZE;
        fileSizeGroup.fileSizeSlider.enabled = !initMultiMachine

        fileSizeDeleteFileGroup = deadlineCloud.outputPanel.add('group', undefined);
        fileSizeDeleteFileGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        fileSizeDeleteFileGroup.fileSizeDeleteFile = fileSizeDeleteFileGroup.add('checkbox', undefined, 'Delete Files Under Minimum File Size');
        fileSizeDeleteFileGroup.fileSizeDeleteFile.value = initDeleteFile;
        fileSizeDeleteFileGroup.fileSizeDeleteFile.enabled = false;
        fileSizeDeleteFileGroup.fileSizeDeleteFile.size = TEXT_SIZE;
        fileSizeDeleteFileGroup.fileSizeDeleteFile.helpTip = 'If enabled and the output file size is less than the minimum file size (kb), then the file will be deleted.';

        missingFileFailGroup = deadlineCloud.outputPanel.add('group', undefined);
        missingFileFailGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        missingFileFailGroup.failOnMissingFile = missingFileFailGroup.add('checkbox', undefined, 'Fail On Missing Output')
        missingFileFailGroup.failOnMissingFile.value = true;
        missingFileFailGroup.failOnMissingFile.size = TEXT_SIZE;
        missingFileFailGroup.failOnMissingFile.helpTip = 'If enabled and no file is generated, the Deadline Job will fail.\n\nNote that this feature is not supported if using Multi-Machine Rendering.';

        // Create Memory Management panel, group, and widgets
        deadlineCloud.memoryManagementPanel = deadlineCloud.aeAdvancedOptionsPanel.add('panel', undefined, 'Memory Management');
        deadlineCloud.memoryManagementPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Enable Memory Management
        memoryManagementGroup = deadlineCloud.memoryManagementPanel.add('group', undefined);
        memoryManagementGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        memoryManagementGroup.memoryManagement = memoryManagementGroup.add('checkbox', undefined, 'Enable Memory Management');
        memoryManagementGroup.memoryManagement.value = initMemoryManagement;
        memoryManagementGroup.memoryManagement.size = TEXT_SIZE;
        memoryManagementGroup.memoryManagement.helpTip = 'Enable to have Deadline control the amount of memory that After Effects uses.';

        // Create Image Cache Percentage group, and widgets
        imageCachePercentageGroup = deadlineCloud.memoryManagementPanel.add('group', undefined);
        imageCachePercentageGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        imageCachePercentageGroup.imageCachePercentageLabel = imageCachePercentageGroup.add('statictext', undefined, 'Image Cache %');
        imageCachePercentageGroup.imageCachePercentageLabel.size = LABEL_SIZE;
        imageCachePercentageGroup.imageCachePercentageLabel.enabled = initMemoryManagement;
        imageCachePercentageGroup.imageCachePercentageLabel.helpTip = 'The maximum amount of memory after effects will use to cache frames.';
        imageCachePercentageGroup.imageCachePercentage = imageCachePercentageGroup.add('edittext', undefined, initImageCachePercentage);
        imageCachePercentageGroup.imageCachePercentage.size = SHORT_TEXT_SIZE;
        imageCachePercentageGroup.imageCachePercentage.enabled = initMemoryManagement;

        imageCachePercentageGroup.imageCachePercentageSlider = imageCachePercentageGroup.add('slider', undefined, initImageCachePercentage, 20, 100);
        imageCachePercentageGroup.imageCachePercentageSlider.size = SLIDER_SIZE;
        imageCachePercentageGroup.imageCachePercentageSlider.enabled = initMemoryManagement;

        // Create Max Memory Percentage group, and widgets
        maxMemoryPercentageGroup = deadlineCloud.memoryManagementPanel.add('group', undefined);
        maxMemoryPercentageGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        maxMemoryPercentageGroup.maxMemoryPercentageLabel = maxMemoryPercentageGroup.add('statictext', undefined, 'Maximum Memory %');
        maxMemoryPercentageGroup.maxMemoryPercentageLabel.size = LABEL_SIZE;
        maxMemoryPercentageGroup.maxMemoryPercentageLabel.enabled = initMemoryManagement;
        maxMemoryPercentageGroup.maxMemoryPercentageLabel.helpTip = 'The maximum amount of memory After Effects can use overall.';
        maxMemoryPercentageGroup.maxMemoryPercentage = maxMemoryPercentageGroup.add('edittext', undefined, initMaxMemoryPercentage);
        maxMemoryPercentageGroup.maxMemoryPercentage.size = SHORT_TEXT_SIZE;
        maxMemoryPercentageGroup.maxMemoryPercentage.enabled = initMemoryManagement;

        maxMemoryPercentageGroup.maxMemoryPercentageSlider = maxMemoryPercentageGroup.add('slider', undefined, initMaxMemoryPercentage, 20, 100);
        maxMemoryPercentageGroup.maxMemoryPercentageSlider.size = SLIDER_SIZE;
        maxMemoryPercentageGroup.maxMemoryPercentageSlider.enabled = initMemoryManagement;
    }

    function initJobSpecific() {
        logger.log("Initializing Job-Specific Tab", _scriptFileAESubmitterName, LOG_LEVEL.INFO);
        // Create Job-Specific Settings panel and widgets
        deadlineCloud.jobSettingsPanel = deadlineCloud.mainPanel.add("tab", undefined, "Job-Specific Settings");
        projPathGroup = deadlineCloud.jobSettingsPanel.add('group', undefined);
        projPathGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        projPathGroup.orientation = "row";
        projPathGroup.projPathLabel = projPathGroup.add('statictext', undefined, 'Project Path');
        projPathGroup.projPathLabel.size = LABEL_SIZE;
        projPathGroup.projPathLabel.helpTip = 'Specify where the output files should be rendered to.';
        projPathGroup.projPathText = projPathGroup.add('edittext', undefined, app.project.file.path);
        projPathGroup.projPathText.size = TEXT_SIZE;
        projPathGroup.projPathText.enabled = false;
        projPathGroup.projButton = projPathGroup.add('button', undefined, '...');
        projPathGroup.projButton.size = BUTTON_SIZE;


        outputFolderGroup = deadlineCloud.jobSettingsPanel.add('group', undefined);
        outputFolderGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        outputFolderGroup.orientation = "row";
        outputFolderGroup.outputFolderLabel = outputFolderGroup.add('statictext', undefined, 'Output Folder');
        outputFolderGroup.outputFolderLabel.size = LABEL_SIZE;
        outputFolderGroup.outputFolderLabel.helpTip = 'Specify where the output files should be rendered to.';
        outputFolderGroup.outputFolderText = outputFolderGroup.add('edittext', undefined, initOutputFolder);
        outputFolderGroup.outputFolderText.size = TEXT_SIZE;
        outputFolderGroup.outputFolderText.enabled = false;
        outputFolderGroup.browseButton = outputFolderGroup.add('button', undefined, '...');
        outputFolderGroup.browseButton.size = BUTTON_SIZE;

        // Create Deadline Cloud options panel
        deadlineCloud.aeOptionsPanel = deadlineCloud.jobSettingsPanel.add('panel', undefined, 'After Effects Options');
        deadlineCloud.aeOptionsPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Create frame list group and widgets
        frameListGroup = deadlineCloud.aeOptionsPanel.add('group', undefined);
        frameListGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        frameListGroup.frameListLabel = frameListGroup.add('statictext', undefined, 'Frame List');
        frameListGroup.frameListLabel.size = LABEL_SIZE;
        frameListGroup.frameListLabel.helpTip = 'The list of frames to render.';
        frameListGroup.frameList = frameListGroup.add('edittext', undefined, 0 + "-" + 50);
        frameListGroup.frameList.size = SHORT_TEXT_SIZE;
        frameListGroup.useCompFrameList = frameListGroup.add('checkbox', undefined, 'Use Frame List From The Comp');
        frameListGroup.useCompFrameList.value = initUseCompFrameRange;
        frameListGroup.useCompFrameList.helpTip = 'If enabled, the Comp\'s frame list will be used instead of the frame list in this submitter.';

        // Create Comp submission group and widgets (Select One, Use Selected in RQ, All as separate)
        compSubmissionGroup = deadlineCloud.aeOptionsPanel.add('group', undefined);
        compSubmissionGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        compSubmissionGroup.compSubmissionLabel = compSubmissionGroup.add('statictext', undefined, 'Comp Submission');
        compSubmissionGroup.compSubmissionLabel.size = LABEL_SIZE;
        compSubmissionGroup.compSubmissionLabel.helpTip = 'Choose to select a specific comp, use the selection from the render queue, or submit all comps as separate jobs. ';
        compSubmissionGroup.compSubmission = compSubmissionGroup.add('dropdownlist', undefined, '');
        compSubmissionGroup.compSubmission.size = SHORT_COMBO_SIZE;

        // Create Comp selection group and widgets (if Select One)
        compSelectionGroup = deadlineCloud.aeOptionsPanel.add('group', undefined);
        compSelectionGroup.alignment = [ScriptUI.Alignment.RIGHT, ScriptUI.Alignment.TOP];
        compSelectionGroup.compSelectionLabel = compSubmissionGroup.add('statictext', undefined, 'Comp Selection');
        compSelectionGroup.compSelectionLabel.size = LABEL_SIZE;
        compSelectionGroup.compSelectionLabel.helpTip = 'Choose which Comp from the render queue you would like to submit to Deadline. ';
        compSelectionGroup.compSelection = compSubmissionGroup.add('dropdownlist', undefined, '');
        compSelectionGroup.compSelection.size = SHORT_COMBO_SIZE;
    }

    function initJobAttachment() {
        logger.log("Initializing Job Attachments Tab", _scriptFileAESubmitterName, LOG_LEVEL.INFO);

        // Create Job Attachment panel, and widgets
        deadlineCloud.tabJobAttachment = deadlineCloud.mainPanel.add("tab", undefined, "Job Attachments");

        // Create Attach Input Files panel
        deadlineCloud.attachInputFilesPanel = deadlineCloud.tabJobAttachment.add('panel', undefined, 'Attach Input Files');
        deadlineCloud.attachInputFilesPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Create button widgets -> No functionality YET
        listButtonsGroup = deadlineCloud.attachInputFilesPanel.add('group', undefined);
        listButtonsGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        listButtonsGroup.orientation = "row";
        listButtonsGroup.addFileButton = listButtonsGroup.add("button", undefined, "Add...");
        listButtonsGroup.addFileButton.size = FILE_BUTTON_SIZE;
        listButtonsGroup.removeFileButton = listButtonsGroup.add("button", undefined, "Remove Selected");
        listButtonsGroup.removeFileButton.size = FILE_BUTTON_SIZE;
        
        // Create label
        listButtonsGroup.itemLabels = listButtonsGroup.add("statictext", undefined, dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.get() + " auto, " + dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get() + " added, " + dcProperties.footageLabels.SELECTED_FOOTAGE_ITEMS.get() + " selected");
        listButtonsGroup.itemLabels.size = CHECKBOX_A_SIZE;

        listButtonsGroup.autoDetectCheckbox = listButtonsGroup.add("checkbox", undefined, "Show Auto-Detected");
        listButtonsGroup.autoDetectCheckbox.size = CHECKBOX_E_SIZE;
        listButtonsGroup.autoDetectCheckbox.value = true;

        // Create List Box group, and widgets
        listBoxGroup = deadlineCloud.attachInputFilesPanel.add('group', undefined);
        listBoxGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        listBoxGroup.attachFilesListBox = listBoxGroup.add("listbox", undefined, [], {
            multiselect: true
        });
        listBoxGroup.attachFilesListBox.size = LIST_BOX_SIZE;

        // Create Attach Input Directories panel
        deadlineCloud.attachInputDirectoriesFilesPanel = deadlineCloud.tabJobAttachment.add('panel', undefined, 'Attach Input Directories');
        deadlineCloud.attachInputDirectoriesFilesPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Create button widgets -> No functionality YET
        directoriesListButtonsGroup = deadlineCloud.attachInputDirectoriesFilesPanel.add('group', undefined);
        directoriesListButtonsGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        directoriesListButtonsGroup.orientation = "row";
        directoriesListButtonsGroup.addFileButton = directoriesListButtonsGroup.add("button", undefined, "Add...");
        directoriesListButtonsGroup.addFileButton.size = FILE_BUTTON_SIZE;
        directoriesListButtonsGroup.removeFileButton = directoriesListButtonsGroup.add("button", undefined, "Remove Selected");
        directoriesListButtonsGroup.removeFileButton.size = FILE_BUTTON_SIZE;
        // Create label
        directoriesListButtonsGroup.itemLabels = directoriesListButtonsGroup.add("statictext", undefined, dcProperties.inputLabels.AUTO_DETECTED_INPUT_ITEMS.get() + " auto, " + dcProperties.inputLabels.ADDED_INPUT_ITEMS.get() + " added, " + dcProperties.inputLabels.SELECTED_INPUT_ITEMS.get() + " selected");
        directoriesListButtonsGroup.itemLabels.size = CHECKBOX_A_SIZE;
        directoriesListButtonsGroup.autoDetectCheckbox = directoriesListButtonsGroup.add("checkbox", undefined, "Show Auto-Detected");
        directoriesListButtonsGroup.autoDetectCheckbox.size = CHECKBOX_E_SIZE;
        directoriesListButtonsGroup.autoDetectCheckbox.value = true;

        // Create List Box group, and widgets
        directoriesListBoxGroup = deadlineCloud.attachInputDirectoriesFilesPanel.add('group', undefined);
        directoriesListBoxGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        directoriesListBoxGroup.attachInputListBox = directoriesListBoxGroup.add("listbox", undefined, [], {
            multiselect: true
        });
        directoriesListBoxGroup.attachInputListBox.size = LIST_BOX_SIZE_SMALL;

        // Create Attach Input Directories panel
        deadlineCloud.specifyOutputDirectoriesPanel = deadlineCloud.tabJobAttachment.add('panel', undefined, 'Specify Output Directories');
        deadlineCloud.specifyOutputDirectoriesPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Create button widgets -> No functionality YET
        outputDirectoriesListButtonsGroup = deadlineCloud.specifyOutputDirectoriesPanel.add('group', undefined);
        outputDirectoriesListButtonsGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        outputDirectoriesListButtonsGroup.orientation = "row";
        outputDirectoriesListButtonsGroup.addFileButton = outputDirectoriesListButtonsGroup.add("button", undefined, "Add...");
        outputDirectoriesListButtonsGroup.addFileButton.size = FILE_BUTTON_SIZE;
        outputDirectoriesListButtonsGroup.removeFileButton = outputDirectoriesListButtonsGroup.add("button", undefined, "Remove Selected");
        outputDirectoriesListButtonsGroup.removeFileButton.size = FILE_BUTTON_SIZE;
        // Create label
        outputDirectoriesListButtonsGroup.itemLabels = outputDirectoriesListButtonsGroup.add("statictext", undefined, dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.get() + " auto, " + dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get() + " added, " + dcProperties.outputLabels.SELECTED_OUTPUT_ITEMS.get() + " selected");
        outputDirectoriesListButtonsGroup.itemLabels.size = CHECKBOX_A_SIZE;
        outputDirectoriesListButtonsGroup.autoDetectCheckBox = outputDirectoriesListButtonsGroup.add("checkbox", undefined, "Show Auto-Detected");
        outputDirectoriesListButtonsGroup.autoDetectCheckBox.size = CHECKBOX_E_SIZE;
        outputDirectoriesListButtonsGroup.autoDetectCheckBox.value = true;

        // Create List Box group, and widgets
        outputDirectoriesListBoxGroup = deadlineCloud.specifyOutputDirectoriesPanel.add('group', undefined);
        outputDirectoriesListBoxGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        outputDirectoriesListBoxGroup.attachOutputListBox = outputDirectoriesListBoxGroup.add("listbox", undefined, [], {
            multiselect: true
        });
        outputDirectoriesListBoxGroup.attachOutputListBox.size = LIST_BOX_SIZE_SMALL;

        // Auto filling listbox on creation.
        autoDetectFootageItems();
        autoDetectOutputItems();
    }

    function initHostRequirements() {
        logger.info("Initializing Host Requirements tab", _scriptFileAESubmitterName);
        
        // Create Job Attachment panel, and widgets
        deadlineCloud.tabHostRequirements = deadlineCloud.mainPanel.add("tab", undefined, "Host Requirements");
        deadlineCloud.tabHostRequirements.orientation = "column";

        // Add UI elements to the Host Requirements tab
        // Create run panel and widgets
        deadlineCloud.runPanel = deadlineCloud.tabHostRequirements.add("panel", undefined, "");
        deadlineCloud.runPanel.orientation = "column";
        deadlineCloud.runPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        deadlineCloud.runPanel.alignChildren = "left";

        // Run group creation
        runGroup = deadlineCloud.runPanel.add("group", undefined);
        runGroup.orientation = "column";

        runGroup.runAllWorkersCheckBox = runGroup.add("checkbox", undefined, "Run on all available worker hosts");
        runGroup.runAllWorkersCheckBox.size = TEXT_SIZE;
        runGroup.runAllWorkersCheckBox.value = true;
        runGroup.runAllWorkersCheckBox.helpTip = "Run submission on all available worker hosts.";

        runGroup.runRequirementHostCheckBox = runGroup.add("checkbox", undefined, "Run on worker hosts that meet the following requirements");
        runGroup.runRequirementHostCheckBox.size = TEXT_SIZE;
        runGroup.runRequirementHostCheckBox.value = !runGroup.runAllWorkersCheckBox.value;
        runGroup.runRequirementHostCheckBox.helpTip = "Run submission only on workers that have the minimum requirements.";

        runGroup.fieldsLabel = runGroup.add("statictext", undefined, "All fields below are optional");
        runGroup.fieldsLabel.size = TEXT_SIZE;

        // Create OS panel and widgets
        deadlineCloud.osPanel = deadlineCloud.tabHostRequirements.add("panel", undefined, "");
        deadlineCloud.osPanel.orientation = "column";
        deadlineCloud.osPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        deadlineCloud.osPanel.alignChildren = "left";

        // OS group creation
        osGroup = deadlineCloud.osPanel.add("group", undefined);
        osGroup.orientation = "column"
        osGroup.orientation = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];


        osGroup.OSLabel = osGroup.add("statictext", undefined, "Operating System");
        osGroup.OSLabel.size = TEXT_SIZE;

        osGroup.OSDropdownList = osGroup.add("dropdownlist", undefined, ["- ", "Windows", "MacOS", "Linux"]);
        osGroup.OSDropdownList.size = SHORT_TEXT_SIZE;
        osGroup.OSDropdownList.selection = 0;

        // CPU Architecture group creation
        cpuArchGroup = deadlineCloud.osPanel.add("group", undefined);
        cpuArchGroup.orientation = "column"
        cpuArchGroup.orientation = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];


        cpuArchGroup.cpuLabel = cpuArchGroup.add("statictext", undefined, "CPU Architecture");
        cpuArchGroup.cpuLabel.size = TEXT_SIZE;

        cpuArchGroup.cpuDropdownList = cpuArchGroup.add("dropdownlist", undefined, ["- ", "x86_64", "arm64"]);
        cpuArchGroup.cpuDropdownList.size = SHORT_TEXT_SIZE;
        cpuArchGroup.cpuDropdownList.selection = 0;

        // Create Hardware panel and widgets
        deadlineCloud.hardwarePanel = deadlineCloud.tabHostRequirements.add("panel", undefined, "Hardware requirements");
        deadlineCloud.hardwarePanel.orientation = "column";
        deadlineCloud.hardwarePanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        deadlineCloud.hardwarePanel.alignChildren = "left";

        // CPU group creation
        cpuGroup = deadlineCloud.hardwarePanel.add("group", undefined);
        cpuGroup.orientation = "row";

        cpuGroup.cpuLabel = cpuGroup.add("statictext", undefined, "vCPUs");
        cpuGroup.cpuLabel.size = SHORT_TEXT_SIZE;

        cpuGroup.cpuMinLabel = cpuGroup.add("statictext", undefined, "Min");
        cpuGroup.cpuMinLabel.size = LAYER_TEXT_SIZE;

        cpuGroup.cpuMinText = cpuGroup.add("edittext", undefined, "");
        cpuGroup.cpuMinText.size = SHORT_TEXT_SIZE;

        cpuGroup.cpuMaxLabel = cpuGroup.add("statictext", undefined, "Max");
        cpuGroup.cpuMaxLabel.size = LAYER_TEXT_SIZE;

        cpuGroup.cpuMaxText = cpuGroup.add("edittext", undefined, "");
        cpuGroup.cpuMaxText.size = SHORT_TEXT_SIZE;

        // Memory group creation
        memoryGroup = deadlineCloud.hardwarePanel.add("group", undefined);
        memoryGroup.orientation = "row";

        memoryGroup.memoryLabel = memoryGroup.add("statictext", undefined, "Memory (GiB)");
        memoryGroup.memoryLabel.size = SHORT_TEXT_SIZE;

        memoryGroup.memoryMinLabel = memoryGroup.add("statictext", undefined, "Min");
        memoryGroup.memoryMinLabel.size = LAYER_TEXT_SIZE;

        memoryGroup.memoryMinText = memoryGroup.add("edittext", undefined, "");
        memoryGroup.memoryMinText.size = SHORT_TEXT_SIZE;

        memoryGroup.memoryMaxLabel = memoryGroup.add("statictext", undefined, "Max");
        memoryGroup.memoryMaxLabel.size = LAYER_TEXT_SIZE;

        memoryGroup.memoryMaxText = memoryGroup.add("edittext", undefined, "");
        memoryGroup.memoryMaxText.size = SHORT_TEXT_SIZE;

        // GPU group creation
        gpuGroup = deadlineCloud.hardwarePanel.add("group", undefined);
        gpuGroup.orientation = "row";

        gpuGroup.gpuLabel = gpuGroup.add("statictext", undefined, "GPUs");
        gpuGroup.gpuLabel.size = SHORT_TEXT_SIZE;

        gpuGroup.gpuMinLabel = gpuGroup.add("statictext", undefined, "Min");
        gpuGroup.gpuMinLabel.size = LAYER_TEXT_SIZE;

        gpuGroup.gpuMinText = gpuGroup.add("edittext", undefined, "");
        gpuGroup.gpuMinText.size = SHORT_TEXT_SIZE;

        gpuGroup.gpuMaxLabel = gpuGroup.add("statictext", undefined, "Max");
        gpuGroup.gpuMaxLabel.size = LAYER_TEXT_SIZE;

        gpuGroup.gpuMaxText = gpuGroup.add("edittext", undefined, "");
        gpuGroup.gpuMaxText.size = SHORT_TEXT_SIZE;

        // GPU MEMORY group creation
        gpuMemoryGroup = deadlineCloud.hardwarePanel.add("group", undefined);
        gpuMemoryGroup.orientation = "row";

        gpuMemoryGroup.gpuMemoryLabel = gpuMemoryGroup.add("statictext", undefined, "GPU Memory (GiB)");
        gpuMemoryGroup.gpuMemoryLabel.size = SHORT_TEXT_SIZE;

        gpuMemoryGroup.gpuMemoryMinLabel = gpuMemoryGroup.add("statictext", undefined, "Min");
        gpuMemoryGroup.gpuMemoryMinLabel.size = LAYER_TEXT_SIZE;

        gpuMemoryGroup.gpuMemoryMinText = gpuMemoryGroup.add("edittext", undefined, "");
        gpuMemoryGroup.gpuMemoryMinText.size = SHORT_TEXT_SIZE;

        gpuMemoryGroup.gpuMemoryMaxLabel = gpuMemoryGroup.add("statictext", undefined, "Max");
        gpuMemoryGroup.gpuMemoryMaxLabel.size = LAYER_TEXT_SIZE;

        gpuMemoryGroup.gpuMemoryMaxText = gpuMemoryGroup.add("edittext", undefined, "");
        gpuMemoryGroup.gpuMemoryMaxText.size = SHORT_TEXT_SIZE;

        // Scratch Space group creation
        scratchSpaceGroup = deadlineCloud.hardwarePanel.add("group", undefined);
        scratchSpaceGroup.orientation = "row";

        scratchSpaceGroup.scratchSpaceLabel = scratchSpaceGroup.add("statictext", undefined, "Scratch Space");
        scratchSpaceGroup.scratchSpaceLabel.size = SHORT_TEXT_SIZE;

        scratchSpaceGroup.scratchSpaceMinLabel = scratchSpaceGroup.add("statictext", undefined, "Min");
        scratchSpaceGroup.scratchSpaceMinLabel.size = LAYER_TEXT_SIZE;

        scratchSpaceGroup.scratchSpaceMinText = scratchSpaceGroup.add("edittext", undefined, "");
        scratchSpaceGroup.scratchSpaceMinText.size = SHORT_TEXT_SIZE;

        scratchSpaceGroup.scratchSpaceMaxLabel = scratchSpaceGroup.add("statictext", undefined, "Max");
        scratchSpaceGroup.scratchSpaceMaxLabel.size = LAYER_TEXT_SIZE;

        scratchSpaceGroup.scratchSpaceMaxText = scratchSpaceGroup.add("edittext", undefined, "");
        scratchSpaceGroup.scratchSpaceMaxText.size = SHORT_TEXT_SIZE;

        // Create Custom Host Requirements panel and widgets
        deadlineCloud.customHostRequirementPanel = deadlineCloud.tabHostRequirements.add("panel", undefined, "Custom host requirements");
        deadlineCloud.customHostRequirementPanel.orientation = "column";
        deadlineCloud.customHostRequirementPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Button group creation
        createRequirementButtonGroup = deadlineCloud.customHostRequirementPanel.add("group", undefined);
        createRequirementButtonGroup.orientation = "row";

        createRequirementButtonGroup.addAmountButton = createRequirementButtonGroup.add('button', undefined, 'Add amount');
        createRequirementButtonGroup.addAmountButton.size = [100, 30];

        createRequirementButtonGroup.addAttributeButton = createRequirementButtonGroup.add('button', undefined, 'Add attribute');
        createRequirementButtonGroup.addAttributeButton.size = [100, 30];

        // Set panels to enabled or disabled based on checkbox selection
        if (runGroup.runAllWorkersCheckBox) {
            deadlineCloud.osPanel.enabled = !runGroup.runAllWorkersCheckBox;
            deadlineCloud.hardwarePanel.enabled = !runGroup.runAllWorkersCheckBox;
            deadlineCloud.customHostRequirementPanel.enabled = !runGroup.runAllWorkersCheckBox;
        }
    }
    
    function initConnectionsSharedJobSettings() {
        logger.log("Initializing Shared Job Settings Connections", _scriptFileAESubmitterName, LOG_LEVEL.INFO);
        var queuedCount = dcAeUtil.getQueuedCompCount();
        // Remove extension from project name
        var projectNameWithoutExtension = projectName.split(".")[0];
        projectNameWithoutExtension = dcUtil.removePercentageFromFileName(projectNameWithoutExtension);
        // On change functions: Add changed value to the Deadline Cloud Configuration Object
        // JobName
        if (initUseCompName == true) {
            jobGroup.jobName.text = dcUtil.removePercentageFromFileName(projectNameWithoutExtension);
        }

        // Functionality use project name checkbox + changing Deadline Cloud config
        checkboxGroup.useNameCheckBox.onClick = function() {
            if ((jobGroup.jobName.text == dcUtil.removePercentageFromFileName(projectNameWithoutExtension))) {
                jobGroup.jobName.text = dcUtil.removePercentageFromFileName(projectNameWithoutExtension);
                jobGroup.jobName.enabled = !this.value;
                logger.log("Set UseCompName to false", _scriptFileAESubmitterName, LOG_LEVEL.DEBUG);
                deadlineCloudConfiguration["UseCompName"] = "false";
                return;
            }
            jobGroup.jobName.enabled = !this.value;
            jobGroup.jobName.text = dcUtil.removePercentageFromFileName(projectNameWithoutExtension);
            logger.log("Set UseCompName to true", _scriptFileAESubmitterName, LOG_LEVEL.DEBUG);
            deadlineCloudConfiguration["UseCompName"] = "true";
        }
        
        // Failed task functionality
        failedTasksGroup.failedTasksSlider.onChange = function() {
            dcUtil.changeTextValue(failedTasksGroup.failedTasksSlider, failedTasksGroup.failedTasksText, 0, 100);
            makeClickHandler("FailedTasksLimit", failedTasksGroup.failedTasksSlider, Math.round);
        }

        failedTasksGroup.failedTasksText.onChange = function() {
            dcUtil.editTextIntValidation(failedTasksGroup.failedTasksText, failedTasksGroup.failedTasksSlider);
            dcUtil.changeSliderValue(failedTasksGroup.failedTasksSlider, failedTasksGroup.failedTasksText, 0, 100);
            makeClickHandler("FailedTasksLimit", failedTasksGroup.failedTasksSlider, Math.round);
        }

        // Task retry functionality
        taskRetryGroup.taskRetrySlider.onChange = function() {
            dcUtil.changeTextValue(taskRetryGroup.taskRetrySlider, taskRetryGroup.taskRetryText, 0, 100);
            makeClickHandler("TaskRetryLimit", taskRetryGroup.taskRetrySlider, Math.round);
        }
        taskRetryGroup.taskRetryText.onChange = function() {
            dcUtil.editTextIntValidation(taskRetryGroup.taskRetryText, taskRetryGroup.taskRetrySlider);
            dcUtil.changeSliderValue(taskRetryGroup.taskRetrySlider, taskRetryGroup.taskRetryText, 0, 100);
            makeClickHandler("TaskRetryLimit", taskRetryGroup.taskRetrySlider, Math.round);
        }

        // Deadline Cloud Priority slider functionality
        deadlineCloudPriorityGroup.prioritySlider.onChange = function() {
            dcUtil.changeTextValue(deadlineCloudPriorityGroup.prioritySlider, deadlineCloudPriorityGroup.textPriority, 0, 100);
            makeClickHandler("DeadlineCloudPriority", deadlineCloudPriorityGroup.prioritySlider, Math.round);
        }
        deadlineCloudPriorityGroup.textPriority.onChange = function() {
            dcUtil.editTextIntValidation(deadlineCloudPriorityGroup.textPriority, deadlineCloudPriorityGroup.prioritySlider);
            dcUtil.changeSliderValue(deadlineCloudPriorityGroup.prioritySlider, deadlineCloudPriorityGroup.textPriority, 0, 100);
            makeClickHandler("DeadlineCloudPriority", deadlineCloudPriorityGroup.prioritySlider, Math.round);
        }

        dcProperties.defaultFarm.add_listener(function(newValue) {
            farmTimeGroup.farmTimeLabel.text = "Farm: " + newValue;
        });

        dcProperties.defaultQueue.add_listener(function(newValue){
            queueGroup.qLabel.text = "Queue: " + newValue;
        });
    }

    function initConnectionsAdvanced() {
        logger.log("Initializing Advanced Connections", _scriptFileAESubmitterName, LOG_LEVEL.INFO);
        var queuedCount = dcAeUtil.getQueuedCompCount();

        // Dependent comp groups functionality
        dependentCompsGroup.dependentComps.enabled = (totalCount > 1 && submissionText == allQueueSep) || (queuedCount > 1 && submissionText == useQueue) && !initSubmitEntireQueue;
        dependentCompsGroup.dependentComps.onClick = function() {
            if (queuedCount > 1) {
                makeClickHandler("DependentComps", dependentCompsGroup.dependentComps, dcUtil.toBooleanString);
            }
        }
        dependentCompsGroup.firstAndLast.enabled = initUseCompFrameRange && !initSubmitEntireQueue && !initMultiMachine;
        dependentCompsGroup.firstAndLast.onClick = function() {
            makeClickHandler("FirstAndLast", dependentCompsGroup.firstAndLast, dcUtil.toBooleanString);
        }

        // Fail on Warnings functionality + update
        ignoreMissingLayersGroup.failOnWarnings.onClick = function() {
            makeClickHandler("FailOnWarnings", ignoreMissingLayersGroup.failOnWarnings, dcUtil.toBooleanString);
        }

        // Missing layer functionality + update
        ignoreMissingLayersGroup.ignoreMissingLayers.onClick = function() {
            makeClickHandler("MissingLayers", ignoreMissingLayersGroup.ignoreMissingLayers, dcUtil.toBooleanString);
        }

        // Export as XML functionality + update
        ignoreMissingLayersGroup.exportAsXml.onClick = function() {
            makeClickHandler("ExportAsXml", ignoreMissingLayersGroup.exportAsXml, dcUtil.toBooleanString);
        }

        // delete temp xml functionality + update
        ignoreMissingEffectsGroup.deleteTempXml.onClick = function() {
            makeClickHandler("DeleteTempXml", ignoreMissingEffectsGroup.deleteTempXml, dcUtil.toBooleanString);
        }

        // missing footage functionality + update
        ignoreMissingEffectsGroup.missingFootage.onClick = function() {
            if (parseInt(version) > 8) {
                makeClickHandler("MissingFootage", ignoreMissingEffectsGroup.missingFootage, dcUtil.toBooleanString);
            }
        }

        // Missing effects functionality + update
        ignoreMissingEffectsGroup.ignoreMissingEffects.onClick = function() {
            makeClickHandler("MissingEffects", ignoreMissingEffectsGroup.ignoreMissingEffects, dcUtil.toBooleanString);
        }

        submitEntireQueueGroup.multiProcess.onClick = function() {
            makeClickHandler("MultiProcess", submitEntireQueueGroup.multiProcess, dcUtil.toBooleanString);
        }

        submitEntireQueueGroup.submitScene.onClick = function() {
            ignoreMissingEffectsGroup.deleteTempXml.enabled = this.value && ignoreMissingLayersGroup.exportAsXml.value;

            // Update value for SubmitScene in deadlineCloudConfiguration
            makeClickHandler("SubmitScene", submitEntireQueueGroup.submitScene, dcUtil.toBooleanString);
        }

        // Export xml functionality
        ignoreMissingLayersGroup.exportAsXml.onClick = function() {
            ignoreMissingEffectsGroup.deleteTempXml.enabled = this.value && submitEntireQueueGroup.submitScene.value;
        }

        // local rendering functionality + update
        failOnExistingProcessGroup.localRendering.onClick = function() {
            makeClickHandler("LocalRendering", failOnExistingProcessGroup.localRendering, dcUtil.toBooleanString);
        }

        // Fail On Existing AE Process functionality
        failOnExistingProcessGroup.OverrideFailOnExistingAEProcess.onClick = function() {
            failOnExistingProcessGroup.FailOnExistingAEProcess.enabled = this.value;
            makeClickHandler("OverrideFailOnExistingAEProcess", failOnExistingProcessGroup.OverrideFailOnExistingAEProcess, dcUtil.toBooleanString);
        }
        failOnExistingProcessGroup.FailOnExistingAEProcess.onClick = function() {
            makeClickHandler("FailOnExistingAEProcess", failOnExistingProcessGroup.FailOnExistingAEProcess, dcUtil.toBooleanString);
        }

        // Ignore GPU Accel warning functionality + update
        ignoreGPUAccelGroup.ignoreGPUAccelWarning.onClick = function() {
            makeClickHandler("IgnoreGPUAccelWarning", ignoreGPUAccelGroup.ignoreGPUAccelWarning, dcUtil.toBooleanString);
        }

        // Include output path functionality
        ignoreGPUAccelGroup.includeOutputPath.onClick = function() {
            // failOnExistingProcessGroup.localRendering.enabled = this.value && !multiMachineGroup.multiMachine.value;
            failOnExistingProcessGroup.localRendering.enabled = this.value;
            makeClickHandler("IncludeOutputPath", ignoreGPUAccelGroup.includeOutputPath, dcUtil.toBooleanString);
        }

        // Output checking options functionality + Update deadlineCloudConfiguration object
        fileSizeGroup.fileSizeSlider.onChange = function() {
            dcUtil.changeTextValue(fileSizeGroup.fileSizeSlider, fileSizeGroup.fileSize, 0, 10000);
            if (fileSizeGroup.fileSizeSlider.value > 0) {
                fileSizeDeleteFileGroup.fileSizeDeleteFile.enabled = true;
            } else if (fileSizeGroup.fileSizeSlider.value == 0) {
                fileSizeDeleteFileGroup.fileSizeDeleteFile.enabled = false;
            }
            makeClickHandler("FileSize", fileSizeGroup.fileSizeSlider, Math.round);
        }
        fileSizeGroup.fileSize.onChange = function() {
            dcUtil.editTextIntValidation(fileSizeGroup.fileSize, fileSizeGroup.fileSizeSlider);
            dcUtil.changeSliderValue(fileSizeGroup.fileSizeSlider, fileSizeGroup.fileSize, 0, 10000);
            if (fileSizeGroup.fileSizeSlider.value > 0) {
                fileSizeDeleteFileGroup.fileSizeDeleteFile.enabled = true;
            } else if (fileSizeGroup.fileSizeSlider.value == 0) {
                fileSizeDeleteFileGroup.fileSizeDeleteFile.enabled = false;
            }
            makeClickHandler("FileSize", fileSizeGroup.fileSizeSlider, Math.round);
        }

        // Delete Files Under min file size functionality + update deadlineCloudConfiguration object
        fileSizeDeleteFileGroup.fileSizeDeleteFile.onClick = function() {
            makeClickHandler("DeleteFile", fileSizeDeleteFileGroup.fileSizeDeleteFile, dcUtil.toBooleanString);
        }

        // Memory management functionality
        memoryManagementGroup.memoryManagement.onClick = function() {
            imageCachePercentageGroup.imageCachePercentageLabel.enabled = this.value;
            imageCachePercentageGroup.imageCachePercentage.enabled = this.value;
            imageCachePercentageGroup.imageCachePercentageSlider.enabled = this.value;
            maxMemoryPercentageGroup.maxMemoryPercentageLabel.enabled = this.value;
            maxMemoryPercentageGroup.maxMemoryPercentage.enabled = this.value;
            maxMemoryPercentageGroup.maxMemoryPercentageSlider.enabled = this.value;

            // Update MemoryManagement key in deadlineCloudConfigurationObject
            makeClickHandler("MemoryManagement", memoryManagementGroup.memoryManagement, dcUtil.toBooleanString);
        }

        // Image Cache Percentage functionality
        imageCachePercentageGroup.imageCachePercentageSlider.onChange = function() {
            dcUtil.changeTextValue(imageCachePercentageGroup.imageCachePercentageSlider, imageCachePercentageGroup.imageCachePercentage, 20, 100);
            makeClickHandler("ImageCachePercentage", imageCachePercentageGroup.imageCachePercentageSlider, Math.round);
        }
        imageCachePercentageGroup.imageCachePercentage.onChange = function() {
            dcUtil.editTextIntValidation(imageCachePercentageGroup.imageCachePercentage, imageCachePercentageGroup.imageCachePercentageSlider);
            dcUtil.changeSliderValue(imageCachePercentageGroup.imageCachePercentageSlider, imageCachePercentageGroup.imageCachePercentage, 20, 100);
            makeClickHandler("ImageCachePercentage", imageCachePercentageGroup.imageCachePercentageSlider, Math.round);
        }

        // Max Memory Percentage functionality
        maxMemoryPercentageGroup.maxMemoryPercentageSlider.onChange = function() {
            dcUtil.changeTextValue(maxMemoryPercentageGroup.maxMemoryPercentageSlider, maxMemoryPercentageGroup.maxMemoryPercentage, 20, 100);
            makeClickHandler("MaxMemoryPercentage", maxMemoryPercentageGroup.maxMemoryPercentageSlider, Math.round);
        }
        maxMemoryPercentageGroup.maxMemoryPercentage.onChange = function() {
            dcUtil.editTextIntValidation(maxMemoryPercentageGroup.maxMemoryPercentage, maxMemoryPercentageGroup.maxMemoryPercentageSlider);
            dcUtil.changeSliderValue(maxMemoryPercentageGroup.maxMemoryPercentageSlider, maxMemoryPercentageGroup.maxMemoryPercentage, 20, 100);
            makeClickHandler("MaxMemoryPercentage", maxMemoryPercentageGroup.maxMemoryPercentageSlider, Math.round);
        }
    }

    function initConnectionsJobSpecific() {
        var queuedCount = dcAeUtil.getQueuedCompCount();
        logger.log("Initializing Job-Specific Connections", _scriptFileAESubmitterName, LOG_LEVEL.INFO);
        // Project path button functionality
        projPathGroup.projButton.onClick = function() {
            var outFolder = Folder.selectDialog();
            if (outFolder != null)
                projPathGroup.projPathText.text = outFolder.fsName;
        }

        // Output path button functionality
        outputFolderGroup.browseButton.onClick = function() {
            var outFolder = Folder.selectDialog();
            if (outFolder != null)
                outputFolderGroup.outputFolderText.text = outFolder.fsName;
        }
        
        // Frame List functionality
        frameListGroup.frameList.onChange = function()
        {
            var text = frameListGroup.frameList.text;
            var filteredText = text.replace(/[^0-9,\-]/g, '');
            if(text !== filteredText)
            {
                frameListGroup.frameList.text = filteredText;
            }
        }

        frameListGroup.frameListLabel.enabled = !initSubmitEntireQueue && !initMultiMachine;
        frameListGroup.frameList.enabled = !initUseCompFrameRange && !initSubmitEntireQueue && !initMultiMachine;
        frameListGroup.useCompFrameList.enabled = !initSubmitEntireQueue && !initMultiMachine;
        frameListGroup.useCompFrameList.onClick = function() {
            frameListGroup.frameList.enabled = !this.value;
            dependentCompsGroup.firstAndLast.enabled = this.value;
            makeClickHandler("UseCompFrame", frameListGroup.useCompFrameList, dcUtil.toBooleanString);
        }

        compSubmissions = new Array(3);
        compSubmissions[0] = selectOne;
        compSubmissions[1] = useQueue;
        compSubmissions[2] = allQueueSep;

        for (var i = 0; i < compSubmissions.length; i++) {
            compSubmissionGroup.compSubmission.add('item', compSubmissions[i]);
        }
        compSubmissionGroup.compSubmission.selection = 2;

        // Comp selection functionality (if Select One)
        for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
            var item = compSelectionGroup.compSelection.add('item', app.project.renderQueue.item(i).comp.name);
            if (i === 1 || item.toString() === initCompSelection) {
                compSelectionGroup.compSelection.selection = item;
            }
        }
        // compSubmission must appear on top of compSelection and dependencies, but compSelection and dependencies must be defined for compSubmission's onChange to be implemented
        compSubmissionGroup.compSubmission.onChange = function() {
            var submissionText = compSubmissionGroup.compSubmission.selection.toString();
            compSelectionGroup.compSelection.enabled = (this.enabled && submissionText == selectOne);
            compSelectionGroup.compSelectionLabel.enabled = (this.enabled && submissionText == selectOne);
            dependentCompsGroup.dependentComps.enabled = (this.enabled && ((totalCount > 1 && submissionText == allQueueSep) || (queuedCount > 1 && submissionText == useQueue)));
            if (compSubmissionGroup.compSubmission.selection != null) {
                deadlineCloudConfiguration["CompSubmissionType"] = compSubmissionGroup.compSubmission.selection.toString();
                logger.log("Set " + "CompSubmissionType" + " to " + compSubmissionGroup.compSubmission.selection.toString(), _scriptFileAESubmitterName, LOG_LEVEL.DEBUG);
            }
        }

        for (var i = 0; i < compSubmissionGroup.compSubmission.items.length; i++) {
            item = compSubmissionGroup.compSubmission.items[i];
            if (i === 1 || item.toString() === initCompSubmissionType) {
                compSubmissionGroup.compSubmission.selection = item;
                submissionText = compSubmissionGroup.compSubmission.selection.toString();
            }
        }

        compSelectionGroup.compSelection.onChange = function() {
            if (compSelectionGroup.compSelection.selection != null) {
                deadlineCloudConfiguration["CompSelection"] = compSelectionGroup.compSelection.selection.toString();
                logger.log("Set " + "CompSelection" + " to " + compSelectionGroup.compSelection.selection.toString(), _scriptFileAESubmitterName, LOG_LEVEL.DEBUG);
            }
        }
    }

    function initConnectionsJobAttachment() {

        logger.log("Initializing Job Attachment Connections", _scriptFileAESubmitterName, LOG_LEVEL.INFO);
        // Auto Detect Footage Checkbox
        listButtonsGroup.autoDetectCheckbox.onClick = function()
        {
            if(listButtonsGroup.autoDetectCheckbox.value == true)
            {
                dcInitData.initAutoDetectFootageItems();
                autoDetectFootageItems();
            }
            else
            {
                removeAutoDetectedItemsFromListBox(listButtonsGroup.itemLabels, dcProperties.jobAttachments.autoDetectedInputFiles.get(), listBoxGroup.attachFilesListBox, dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.SELECTED_FOOTAGE_ITEMS.get());
            }
            
        }

        // Auto Detect Output Checkbox
        outputDirectoriesListButtonsGroup.autoDetectCheckBox.onClick = function()
        {
            if(outputDirectoriesListButtonsGroup.autoDetectCheckBox.value == true)
            {
                dcInitData.initAutoDetectOutputDirectories();
                autoDetectOutputItems();
            }
            else
            {
                removeAutoDetectedItemsFromListBox(outputDirectoriesListButtonsGroup.itemLabels, dcProperties.jobAttachments.autoDetectOutputDirectories.get(), outputDirectoriesListBoxGroup.attachOutputListBox, dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.SELECTED_OUTPUT_ITEMS.get());
            }
        }  
        // Add Button files
        listButtonsGroup.addFileButton.onClick = function() {
            var file = File.openDialog("Select a file", "All Files:*.*", false);
            // Check if a file was selected
            if (file) {
                var itemCount = 0;

                // Check if item is already in the list.
                if (dcProperties.jobAttachments.userAddedInputFiles.get().indexOf(file.fsName) !== -1 || dcProperties.jobAttachments.autoDetectedInputFiles.get().indexOf(file.fsName) !== -1 ) {
                    alert("The item is already available in the list.")
                    logger.debug("File is already in the list: " + file.fsName, _scriptFileAESubmitterName);
                    return;
                }
                dcProperties.jobAttachments.userAddedInputFiles.get().push(file.fsName);
                listBoxGroup.attachFilesListBox.add("item", file.fsName);
                logger.debug("Added " + file.fsName + " to footage list", _scriptFileAESubmitterName);
            }
            dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.set(dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get() + 1);
            updateNumberItemsLabel(listButtonsGroup.itemLabels, listBoxGroup.attachFilesListBox, dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.SELECTED_FOOTAGE_ITEMS.get());
        }

        // Add button input
        directoriesListButtonsGroup.addFileButton.onClick = function()
        {
            var selectedFolder = Folder.selectDialog("Select an input directory to add");
            if(selectedFolder == null)
            {
                logger.debug("No folder was selected.", _scriptFileAESubmitterName);
            }
            else{
                if(dcProperties.jobAttachments.userAddedInputDirectories.get().indexOf(selectedFolder.fsName) !== -1)
                {
                    alert("This item is already available in the list.")
                    logger.debug("File is already in the list: " + selectedFolder.fsName, _scriptFileAESubmitterName);
                    return;
                }
                dcProperties.jobAttachments.userAddedInputDirectories.get().push(selectedFolder.fsName);
                directoriesListBoxGroup.attachInputListBox.add("item", selectedFolder.fsName);
                logger.debug("Added " + selectedFolder.fsName + " to output list", _scriptFileAESubmitterName);
            }
            dcProperties.inputLabels.ADDED_INPUT_ITEMS.set(dcProperties.inputLabels.ADDED_INPUT_ITEMS.get() + 1);
            updateNumberItemsLabel(directoriesListButtonsGroup.itemLabels, directoriesListBoxGroup.attachInputListBox, dcProperties.inputLabels.AUTO_DETECTED_INPUT_ITEMS.get(), dcProperties.inputLabels.ADDED_INPUT_ITEMS.get(), dcProperties.inputLabels.SELECTED_INPUT_ITEMS.get());
        }

        // Add button output
        outputDirectoriesListButtonsGroup.addFileButton.onClick = function () {
            // Use the File.openDialog() method with openDlgParam
            var selectedFolder = Folder.selectDialog("Select an output directory to add");
            if(selectedFolder == null)
            {
                logger.debug("No folder was selected.", _scriptFileAESubmitterName);
            }

            else{
                // Check if a directory was selected
                if (selectedFolder) {
                    // check if output directory is already in the list.
                    if(dcProperties.jobAttachments.userAddedOutputDirectories.get().indexOf(selectedFolder.fsName) !== -1 || dcProperties.jobAttachments.autoDetectOutputDirectories.get().indexOf(selectedFolder.fsName) !== -1 )
                    {
                        alert("The item is already available in the list.")
                        logger.debug("File is already in the list: " + selectedFolder.fsName, _scriptFileAESubmitterName);
                        return;
                    }
                    dcProperties.jobAttachments.userAddedOutputDirectories.get().push(selectedFolder.fsName);
                    outputDirectoriesListBoxGroup.attachOutputListBox.add("item", selectedFolder.fsName);
                    logger.debug("Added " + selectedFolder.fsName + " to output list", _scriptFileAESubmitterName);
                }
                dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.set(dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get() + 1);;
                updateNumberItemsLabel(outputDirectoriesListButtonsGroup.itemLabels, outputDirectoriesListBoxGroup.attachOutputListBox, dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.SELECTED_OUTPUT_ITEMS.get());
            }
        };

        // Remove button files
        listButtonsGroup.removeFileButton.onClick = function()
        {
            removeItemButtonFunctionality (listButtonsGroup.itemLabels, dcProperties.jobAttachments.autoDetectedInputFiles.get(), listBoxGroup.attachFilesListBox, dcProperties.jobAttachments.userAddedInputFiles.get(), dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.SELECTED_FOOTAGE_ITEMS.get());
        }
        // Remove button input
        directoriesListButtonsGroup.removeFileButton.onClick = function()
        {
            removeItemButtonFunctionality (directoriesListButtonsGroup.itemLabels, dcProperties.jobAttachments.autoDetectInputDirectories.get(), directoriesListBoxGroup.attachInputListBox, dcProperties.jobAttachments.userAddedInputDirectories.get(), dcProperties.inputLabels.AUTO_DETECTED_INPUT_ITEMS.get(), dcProperties.inputLabels.ADDED_INPUT_ITEMS.get(), dcProperties.inputLabels.SELECTED_INPUT_ITEMS.get()); 
        }
        // Remove button output
        outputDirectoriesListButtonsGroup.removeFileButton.onClick = function()
        {
            removeItemButtonFunctionality (outputDirectoriesListButtonsGroup.itemLabels, dcProperties.jobAttachments.autoDetectOutputDirectories.get(), outputDirectoriesListBoxGroup.attachOutputListBox, dcProperties.jobAttachments.userAddedOutputDirectories.get(), dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.SELECTED_OUTPUT_ITEMS.get());
        }

        // When selection changes in listbox, update the label showcasing the amount.
        listBoxGroup.attachFilesListBox.onChange = function() {
            if(listButtonsGroup.autoDetectCheckbox.value == false)
            {
                //dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.set(0);
                dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.set(listBoxGroup.attachFilesListBox.items.length);
            }

            updateNumberItemsLabel(listButtonsGroup.itemLabels, listBoxGroup.attachFilesListBox, dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.SELECTED_FOOTAGE_ITEMS.get());
        }

        // When selection changes in listbox, update the label showcasing the amount.
        directoriesListBoxGroup.attachInputListBox.onChange = function()
        {
            updateNumberItemsLabel(directoriesListButtonsGroup.itemLabels, directoriesListBoxGroup.attachInputListBox, dcProperties.inputLabels.AUTO_DETECTED_INPUT_ITEMS.get(), dcProperties.inputLabels.ADDED_INPUT_ITEMS.get(), dcProperties.inputLabels.SELECTED_INPUT_ITEMS.get());
        }

        // When selection changes in listbox, update the label showcasing the amount.
        outputDirectoriesListBoxGroup.attachOutputListBox.onChange = function()
        {
            updateNumberItemsLabel(outputDirectoriesListButtonsGroup.itemLabels, outputDirectoriesListBoxGroup.attachOutputListBox, dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.SELECTED_OUTPUT_ITEMS.get());
        }
    }

    function initConnectionsHostRequirements() {
        logger.info("Initializing Host Requirements Connections", _scriptFileAESubmitterName);
        // Enable and disable panels based on what worker selection checkbox is set to true
        runGroup.runAllWorkersCheckBox.onClick = function() {
            runGroup.runRequirementHostCheckBox.value = !runGroup.runAllWorkersCheckBox.value;
            deadlineCloud.osPanel.enabled = !runGroup.runAllWorkersCheckBox.value;
            deadlineCloud.hardwarePanel.enabled = !runGroup.runAllWorkersCheckBox.value;
            deadlineCloud.customHostRequirementPanel.enabled = !runGroup.runAllWorkersCheckBox.value;
        }

        runGroup.runRequirementHostCheckBox.onClick = function() {
            runGroup.runAllWorkersCheckBox.value = !runGroup.runRequirementHostCheckBox.value
            deadlineCloud.osPanel.enabled = runGroup.runRequirementHostCheckBox.value;
            deadlineCloud.hardwarePanel.enabled = runGroup.runRequirementHostCheckBox.value;
            deadlineCloud.customHostRequirementPanel.enabled = runGroup.runRequirementHostCheckBox.value;
        }

        // When Min and Max values are set, do not allow any characters but numbers(0-9)
        // Do not allow min to be higher than max value, and max value to be lower than min value
        cpuGroup.cpuMinText.onChange = function() {
            dcUtil.spinBoxLimiterMin(cpuGroup.cpuMinText, cpuGroup.cpuMaxText);
        }

        cpuGroup.cpuMaxText.onChange = function() {
            dcUtil.spinBoxLimiterMax(cpuGroup.cpuMinText, cpuGroup.cpuMaxText);
        }

        memoryGroup.memoryMinText.onChange = function() {
            dcUtil.spinBoxLimiterMin(memoryGroup.memoryMinText, memoryGroup.memoryMaxText);
        }

        memoryGroup.memoryMaxText.onChange = function() {
            dcUtil.spinBoxLimiterMax(memoryGroup.memoryMinText, memoryGroup.memoryMaxText);
        }

        gpuGroup.gpuMinText.onChange = function() {
            dcUtil.spinBoxLimiterMin(gpuGroup.gpuMinText, gpuGroup.gpuMaxText);
        }

        gpuGroup.gpuMaxText.onChange = function() {
            dcUtil.spinBoxLimiterMax(gpuGroup.gpuMinText, gpuGroup.gpuMaxText);
        }

        gpuMemoryGroup.gpuMemoryMinText.onChange = function() {
            dcUtil.spinBoxLimiterMin(gpuMemoryGroup.gpuMemoryMinText, gpuMemoryGroup.gpuMemoryMaxText);
        }

        gpuMemoryGroup.gpuMemoryMaxText.onChange = function() {
            dcUtil.spinBoxLimiterMax(gpuMemoryGroup.gpuMemoryMinText, gpuMemoryGroup.gpuMemoryMaxText);
        }

        scratchSpaceGroup.scratchSpaceMinText.onChange = function() {
            dcUtil.spinBoxLimiterMin(scratchSpaceGroup.scratchSpaceMinText, scratchSpaceGroup.scratchSpaceMaxText);
        }

        scratchSpaceGroup.scratchSpaceMaxText.onChange = function() {
            dcUtil.spinBoxLimiterMax(scratchSpaceGroup.scratchSpaceMinText, scratchSpaceGroup.scratchSpaceMaxText);
        }
    }

    // ----- LISTENER CALLBACKS -----
    function initCallbacks(){
        /**
        * Initialize all property callbacks. 
        * 
        * This is called before data is initialized.
        */
        dcProperties.isAPIAvailable.add_listener(onIsApiAvailableChanged);
        dcProperties.isLoggedIn.add_listener(onIsLoggedInChangedMainUI);
        dcProperties.isWindowClosed.add_listener(onIsWindowClosed);
    }

    function onIsLoggedInChangedMainUI(newValue, oldValue){

        dcInitData.initDeadlineConfig();
        // Early exit if state is unchanged.
        if(newValue == oldValue){
            return;
        }

        // Logged in
        if(newValue){
            var _loginWindow = dcInitData.loadingLoginWindow();
            _loginWindow.text = "Logging in to Deadline Cloud Monitor."
            _loginWindow.children[0].text = "Logging in to Deadline Cloud Monitor."
            _loginWindow.update();
            if(dcProperties.farmList.get().length == 0)
            {
                dcInitData.initDeadlineFarmData();
            }
            // Fill farm and queue list again. When we startup and we are logged out the lists are empty
            var result = dcDeadlineCommands.credentialStatus(dcProperties.config.aws_profile.get());
            dcProperties.credentialStatus.source.set(result.source);
            dcProperties.credentialStatus.status.set(result.status);
            dcProperties.credentialStatus.api.set(result.api);
            credsAuthentication.text = dcProperties.credentialStatus.source.get();
            credsAuthentication.graphics.foregroundColor = green;
            if(result.source == "NOT_VALID")
            {
                credsAuthentication.graphics.foregroundColor = red;
            }

            statusAuthentication.text = dcProperties.credentialStatus.status.get();
            statusAuthentication.graphics.foregroundColor = red;
            if(result.status == "AUTHENTICATED")
            {
                statusAuthentication.graphics.foregroundColor = green;
            }

            dcProperties.isAPIAvailable.set(dcProperties.credentialStatus.api.get());

            // enabled submit buttons
            buttonsGroup.submitLayersButton.enabled = true;
            buttonsGroup.submitButton.enabled = true;

            // Set default farm and queue based on if a match of the config found farm_id and queue_id is found
            var farmMatch = dcUtil.getMatchName("Farm", dcProperties.config.farm_id.get());
            var queueMatch = dcUtil.getMatchName("Queue", dcProperties.config.queue_id.get());
            if(farmMatch.match == true)
            {
                farmTimeGroup.farmTimeLabel.text = "Farm: " + farmMatch.keyName;
            }
            else if (farmMatch.match == null)
            {
                alert("No default farm found in console.");
            }
            if(queueMatch.match == true)
            {
                queueGroup.qLabel.text = "Queue: " + queueMatch.keyName;
            }
            else if (queueMatch.match == null)
            {
                alert("No default farm found in console.");
            }
            _loginWindow.close();
            return;
        }
        var _logoutWindow = dcInitData.loadingLoginWindow();
        _logoutWindow.text = "Logging out of Deadline Cloud Monitor."
        _logoutWindow.children[0].text = "Logging out of Deadline Cloud Monitor."
        _logoutWindow.update();
        // Logged out
        dcProperties.farmList.set([]);
        dcProperties.queueList.set([]);
        // disabled submit buttons
        buttonsGroup.submitLayersButton.enabled = false;
        buttonsGroup.submitButton.enabled = false;
        var result = dcDeadlineCommands.credentialStatus(dcProperties.config.aws_profile.get());
        dcProperties.credentialStatus.source.set(result.source);
        dcProperties.credentialStatus.status.set(result.status);
        dcProperties.credentialStatus.api.set(result.api);
        credsAuthentication.text = dcProperties.credentialStatus.source.get();
        credsAuthentication.graphics.foregroundColor = green;
        if(result.source == "NOT_VALID")
        {
            credsAuthentication.graphics.foregroundColor = red;
        }

        statusAuthentication.text = dcProperties.credentialStatus.status.get();
        statusAuthentication.graphics.foregroundColor = red;
        if(result.status == "AUTHENTICATED")
        {
            statusAuthentication.graphics.foregroundColor = green;
        }
        dcProperties.isAPIAvailable.set(dcProperties.credentialStatus.api.get());

        farmTimeGroup.farmTimeLabel.text = "Farm: " + dcProperties.config.farm_id.get();
        queueGroup.qLabel.text = "Queue: " + dcProperties.config.queue_id.get();
        dcProperties.isAPIAvailable.set(false);
        _logoutWindow.close();
    }

    function onIsApiAvailableChanged(newValue, oldValue)
    {
         // Early exit if state is unchanged.
        if(newValue == oldValue){
            return;
        }
        // Logged in
        if(newValue){
            apiAuthentication.text = 'True';
            apiAuthentication.graphics.foregroundColor = green;
            return;
        }
        // Logged out
        apiAuthentication.text = "False";
        apiAuthentication.graphics.foregroundColor = red;
    }

    function onIsWindowClosed(newValue, oldValue)
    {
        if(newValue == false)
        {
            deadlineCloud.aeSubmitterUI.enabled = true;
            if(dcProperties.isLoggedIn.get())
            {
                buttonsGroup.submitLayersButton.enabled = true;
                buttonsGroup.submitButton.enabled = true;
            }
            else
            {
                buttonsGroup.submitLayersButton.enabled = false;
                buttonsGroup.submitButton.enabled = false;
            }
        }
        return;
    }
    // ----- /LISTENER CALLBACKS -----
    
    function exportBundleToJobHistoryDir(renderQueueItem, job_history_dir, itemName)
    {
        /**
         * Export the entire renderQueue or only the selected comp as a bundle.
         */
        var __template = {};
        if(compSubmissionGroup.compSubmission.selection.toString() == useQueue)
        {
            __template = dcSubmitButton.createDataAndParameterTemplateOneJob();
        }
        else{
            __template = dcSubmitButton.createDataAndParameterTemplateSeparateJobs(renderQueueItem, itemName);
        }
        // 3. Create asset reference dict
        jobAssetReferences = dcSubmitButton.generateAssetReferences();
        
        // Create folder at correct job history location
        var exportDir = dcUtil.createExportBundleDir(job_history_dir, jobGroup.jobName.text);
        createBundle(exportDir, __template.jobTemplate, __template.jobParams, jobAssetReferences);
        // Open the created folder
        var os = $.os.toLowerCase();
        if (os.indexOf("win") !== -1) {
            // Windows
            system.callSystem('explorer.exe "' + exportDir + '"');
        } else if (os.indexOf("mac") !== -1) {
            // macOS
            system.callSystem('open "' + exportDir + '"');
        }
    }

    function removeItemButtonFunctionality(labelName, autoDetectedList, listbox, itemList, numberAutoDetected, numberInListBox, numberSelected)
    {
        var selectedItemsArray = listbox.selection;

        if (!selectedItemsArray) {
            alert("Please select an item to delete.");
            return;
        }

        for (var i = 0; i < selectedItemsArray.length; i++) {
            logger.debug("Selected Item: " + selectedItemsArray[i].text, _scriptFileAESubmitterName);

            var selectedItem = selectedItemsArray[i].text;
            if (autoDetectedList.indexOf(selectedItem) !== -1) {
                alert("Selected item is part of the auto detected footage. Cannot be deleted.");
                continue;
            }
            logger.debug("Deleted Item: " + selectedItemsArray[i].text, _scriptFileAESubmitterName);
            listbox.remove(selectedItemsArray[i]);
            var itemIndex = itemList.indexOf(selectedItem);
            var removedItem = itemList.splice(itemIndex, 1);
            if(autoDetectedList == dcProperties.jobAttachments.autoDetectedInputFiles.get())
            {
                dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.set(dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get() - 1);
            }
            else if(autoDetectedList == dcProperties.jobAttachments.autoDetectOutputDirectories.get())
            {
                dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.set(dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get() - 1);
            }
            else{
                dcProperties.inputLabels.ADDED_INPUT_ITEMS.set(dcProperties.inputLabels.ADDED_INPUT_ITEMS.get() - 1);
            }
        }

        if(autoDetectedList == dcProperties.jobAttachments.autoDetectedInputFiles.get())
        {
            logger.debug(dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get(), _scriptFileAESubmitterName);
            updateNumberItemsLabel(labelName, listbox, numberAutoDetected, dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get(), numberSelected);
        }
        else if(autoDetectedList == dcProperties.jobAttachments.autoDetectOutputDirectories.get())
        {
            logger.debug(dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get(), _scriptFileAESubmitterName);
            updateNumberItemsLabel(labelName, listbox, numberAutoDetected, dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get(), numberSelected);
        }
        else{
            logger.debug(dcProperties.inputLabels.ADDED_INPUT_ITEMS.get(), _scriptFileAESubmitterName);
            updateNumberItemsLabel(labelName, listbox, numberAutoDetected, dcProperties.inputLabels.ADDED_INPUT_ITEMS.get(), numberSelected);
        }
    }

    function updateNumberItemsLabel(labelName, listBox, numberAutoDetected, numberInListBox, numberSelected) {
        var items = listBox.selection;
        numberSelected = 0;
        if (items !== null) {
            numberSelected = items.length;
        }

        labelName.text = numberAutoDetected + " auto, " + numberInListBox + " added, " + numberSelected + " selected";
    }

    function autoDetectFootageItems()
    {
        for(item in dcProperties.jobAttachments.autoDetectedInputFiles.get())
        {
            // Check if parseInt returns NaN. For some reason getting the directories also returns functions like every, forEach, reduce, lastIndexOf, etc.
            if(isNaN(parseInt(item)))
            {
                continue;
            }
            listBoxGroup.attachFilesListBox.add("item", dcProperties.jobAttachments.autoDetectedInputFiles.get()[item]);
        }
        dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.set(dcProperties.jobAttachments.autoDetectedInputFiles.get().length);
        updateNumberItemsLabel(listButtonsGroup.itemLabels, listBoxGroup.attachFilesListBox, dcProperties.footageLabels.AUTO_DETECTED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.ADDED_FOOTAGE_ITEMS.get(), dcProperties.footageLabels.SELECTED_FOOTAGE_ITEMS.get());
    }
    
    function autoDetectOutputItems()
    {
        // Fill global list with available output directories from the renderqueue items.
        // If the items already exist in the global list, do not add them to the listbox
        // If the items do not already exist in the global list, add them to the global list and the listbox.

        // Check if parseInt returns NaN. For some reason getting the directories also returns functions like every, forEach, reduce, lastIndexOf, etc.
        dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.set(0);
        for (item in dcProperties.jobAttachments.autoDetectOutputDirectories.get())
        {
            if(isNaN(parseInt(item)))
            {
                continue;
            }
            outputDirectoriesListBoxGroup.attachOutputListBox.add("item", dcProperties.jobAttachments.autoDetectOutputDirectories.get()[item]);
        }
        dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.set(dcProperties.jobAttachments.autoDetectOutputDirectories.get().length);
        updateNumberItemsLabel(outputDirectoriesListButtonsGroup.itemLabels, outputDirectoriesListBoxGroup.attachOutputListBox, dcProperties.outputLabels.AUTO_DETECTED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.ADDED_OUTPUT_ITEMS.get(), dcProperties.outputLabels.SELECTED_OUTPUT_ITEMS.get());
    }

    function removeAutoDetectedItemsFromListBox(labelName, autoDetectedList, listbox, numberAutoDetected, numberInListBox, numberSelected)
    {
        // Loop over auto detected footage list and see if they are available in the listbox, if so remove them from the listbox.
        for (var i =0; i < autoDetectedList.length; i++)
        {
            var currItem = autoDetectedList[i];
            logger.debug(currItem, _scriptFileAESubmitterName);
            // Check if item is in listbox
            for(var j = 0; j < listbox.items.length; j++)
            {
                if(listbox.items[j].text === currItem)
                {
                    listbox.remove(j);
                }
            }
        }
        numberSelected = 0;
        listbox.selection = null;
        labelName.text = numberAutoDetected + " auto, " + numberInListBox + " added, " + numberSelected + " selected";
    }

    function makeClickHandler(paramName, sourceElement, typeToStrFunction) {
        function handler() {
            var paramAsStr = typeToStrFunction(sourceElement.value);
            deadlineCloudConfiguration[paramName] = paramAsStr;
            logger.log("Set " + paramName + " to " + paramAsStr, _scriptFileAESubmitterName, LOG_LEVEL.DEBUG);
        }
        return handler();
    }

    return {
            "createUI": createUI
    }
}
dcSubmitterUi = __generateSubmitterUI();


