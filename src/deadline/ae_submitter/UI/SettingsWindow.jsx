var deadlineCloudSettings = {};
var farmResult;
var queueResult;

function __generateSettingsWindow() {
    // Extract the file name
    var scriptFileSettingsWindowName = "SettingsWindow.jsx";

    var LABEL_SIZE_SETTINGS = [150, 20];
    var TEXT_SIZE_SETTINGS = [350, 18];
    var BTN_SIZE_SETTINGS = [100, 30];

    // UI copy of selected config data
    var configDataSelections = {}

    function initDeadlineCloudSettingsWindow() {
        dcProperties.isWindowClosed.set(true);
        initData();
        initSettings();
        initCallbacks();
        deadlineCloudSettings.settingsWindow.show();
    }

    function initData(){
        configDataSelections = {
            aws_profile: dcProperties.config.aws_profile.get(),
            job_history_dir: dcProperties.config.job_history_dir.get(),
            farm_id: dcProperties.config.farm_id.get(),
            queue_id: dcProperties.config.queue_id.get(),
            storage_profile_id: dcProperties.config.storage_profile_id.get(),
            job_attachments_file_system: dcProperties.config.job_attachments_file_system.get(),
            auto_accept: dcProperties.config.auto_accept.get(),
            conflict_resolution: dcProperties.config.conflict_resolution.get(),
            log_level: dcProperties.config.log_level.get(),
            deadline_cloud_monitor: dcProperties.config.deadline_cloud_monitor.get()
        }

        awsProfileList = dcProperties.profileList.get();
    }
    
    function initSettings() {
        /**
         * Open Settings window that enables Deadline Cloud Workstation Configuration
         */
        // Create main window
        deadlineCloudSettings.settingsWindow = new Window("window", "Deadline Cloud Workstation Configuration");


        // add color values to window graphics
        deadlineCloudSettings.winGraphics = deadlineCloudSettings.settingsWindow.graphics;
        red = deadlineCloudSettings.winGraphics.newPen(deadlineCloudSettings.winGraphics.BrushType.SOLID_COLOR, [1, 0, 0], 1);
        green = deadlineCloudSettings.winGraphics.newPen(deadlineCloudSettings.winGraphics.BrushType.SOLID_COLOR, [0, 1, 0], 1);
    
        // Create main panel
        deadlineCloudSettings.mainPanel = deadlineCloudSettings.settingsWindow.add("panel", undefined, "");
    
        // Create global settings panel
        globalSettingsPanel = deadlineCloudSettings.mainPanel.add("panel", undefined, "Global Settings");
        globalSettingsPanel.orientation = "column";
        globalSettingsPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
    
        // Create label and dropdown menu group
        awsProfileGroup = globalSettingsPanel.add("group", undefined);
        awsProfileGroup.orientation = "row";
        awsProfileGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        awsProfileGroup.awsProfileLabel = awsProfileGroup.add("statictext", undefined, "AWS Profile");
        awsProfileGroup.awsProfileLabel.size = LABEL_SIZE_SETTINGS;
        awsProfileGroup.dropdownAwsProfile = awsProfileGroup.add("dropdownlist", undefined);
        awsProfileGroup.dropdownAwsProfile.size = TEXT_SIZE_SETTINGS;
        // Populate profileList
        for(var i =0; i < awsProfileList.length; i++)
        {
            awsProfileGroup.dropdownAwsProfile.add("item", awsProfileList[i]);
            if(awsProfileList[i] == configDataSelections.aws_profile)
            {
                awsProfileGroup.dropdownAwsProfile.selection = i;
            }
            logger.debug(awsProfileList[i], scriptFileSettingsWindowName);
        }
        // Create profile settings panel
        profileSettingsPanel = deadlineCloudSettings.mainPanel.add("panel", undefined, "Profile Settings");
        profileSettingsPanel.orientation = "column";
        profileSettingsPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
    
        // Create Job history label, dir, file dialog button
        jobHistoryGroup = profileSettingsPanel.add("group", undefined);
        jobHistoryGroup.orientation = "row";
        jobHistoryGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        jobHistoryGroup.jobHistoryLabel = jobHistoryGroup.add("statictext", undefined, "Job History Dir");
        jobHistoryGroup.jobHistoryLabel.size = LABEL_SIZE_SETTINGS;
        jobHistoryGroup.jobHistoryText = jobHistoryGroup.add("edittext", undefined);
        jobHistoryGroup.jobHistoryText.size = TEXT_SIZE_SETTINGS;
        jobHistoryGroup.jobHistoryButton = jobHistoryGroup.add('button', undefined, "...");
        jobHistoryGroup.jobHistoryButton.size = [36,20];
    
        // Create default farm group and widgets
        farmGroup = profileSettingsPanel.add("group", undefined);
        farmGroup.orientation = "row";
        farmGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        farmGroup.farmLabel = farmGroup.add("statictext", undefined, "Default Farm");
        farmGroup.farmLabel.size = LABEL_SIZE_SETTINGS;
        farmGroup.defaultFarmDropdown = farmGroup.add("dropdownlist", undefined);
        farmGroup.defaultFarmDropdown.size = TEXT_SIZE_SETTINGS;
        farmGroup.defaultFarmDropdown.selection = 0;
        // Add refresh button to default queue
        farmGroup.farmRefreshButton = farmGroup.add("button", undefined, "Refresh");
        farmGroup.farmRefreshButton.size = [36,20];
    
        // Create farm settings panel
        farmSettingsPanel = deadlineCloudSettings.mainPanel.add("panel", undefined, "Farm Settings");
        farmSettingsPanel.orientation = "column";
        farmSettingsPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        // Create Default Queue group and widgets
        defaultQueueGroup = farmSettingsPanel.add("group", undefined);
        defaultQueueGroup.orientation = "row";
        defaultQueueGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        defaultQueueGroup.defQLabel = defaultQueueGroup.add("statictext", undefined, "Default Queue");
        defaultQueueGroup.defQLabel.size = LABEL_SIZE_SETTINGS;
        defaultQueueGroup.defQDropdown = defaultQueueGroup.add("dropdownlist", undefined);
        defaultQueueGroup.defQDropdown.size = TEXT_SIZE_SETTINGS;
        defaultQueueGroup.defQDropdown.selection = 0;

        // Add refresh button to default queue
        defaultQueueGroup.defQRefreshButton = defaultQueueGroup.add("button", undefined, "Refresh");
        defaultQueueGroup.defQRefreshButton.size = [36,20];

        // Create Default Storage Profile group and widgets
        defaultStorageGroup = farmSettingsPanel.add("group", undefined);
        defaultStorageGroup.orientation = "row";
        defaultStorageGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        defaultStorageGroup.defStorageLabel = defaultStorageGroup.add("statictext", undefined, "Default Storage Profile");
        defaultStorageGroup.defStorageLabel.size = LABEL_SIZE_SETTINGS;
        defaultStorageGroup.defStorageDropdown = defaultStorageGroup.add("dropdownlist", undefined);
        defaultStorageGroup.defStorageDropdown.size = TEXT_SIZE_SETTINGS;
        defaultStorageGroup.defStorageDropdown.selection = 0;

        // Add refresh button to default queue
        defaultStorageGroup.defStorageRefreshButton = defaultStorageGroup.add("button", undefined, "Refresh");
        defaultStorageGroup.defStorageRefreshButton.size = [36,20];

        // FileSystem Options
        fileOptionsGroup = farmSettingsPanel.add("group", undefined);
        fileOptionsGroup.orientation = "row";
        fileOptionsGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        fileOptionsGroup.fileSystemOptions = fileOptionsGroup.add("statictext", undefined, "Job Attachments FileSystem Options");
        fileOptionsGroup.fileSystemOptions.size = LABEL_SIZE_SETTINGS;
        fileOptionsGroup.fileSystemOptions = fileOptionsGroup.add("dropdownlist", undefined, ["COPIED", "VIRTUAL"]);
        fileOptionsGroup.fileSystemOptions.size = TEXT_SIZE_SETTINGS;
        fileOptionsGroup.fileSystemOptions.selection = 0;

        // Create general settings panel
        generalSettingsPanel = deadlineCloudSettings.mainPanel.add("panel", undefined, "General Settings");
        generalSettingsPanel.orientation = "column";
        generalSettingsPanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
    
        // Create auto accept group and widgets
        autoAcceptGroup = generalSettingsPanel.add("group", undefined);
        autoAcceptGroup.orientation = "row";
        autoAcceptGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        autoAcceptGroup.aALabel = autoAcceptGroup.add("statictext", undefined, "Auto Accept Confirmation Prompts");
        autoAcceptGroup.aALabel.size = [170, 20];
        autoAcceptGroup.aACheckbox = autoAcceptGroup.add("checkbox", undefined, "");

        // FileSystem Options
        conflictResolutionGroup = generalSettingsPanel.add("group", undefined);
        conflictResolutionGroup.orientation = "row";
        conflictResolutionGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        conflictResolutionGroup.option = conflictResolutionGroup.add("statictext", undefined, "Conflict Resolution Option");
        conflictResolutionGroup.option.size = LABEL_SIZE_SETTINGS;
        conflictResolutionGroup.option = conflictResolutionGroup.add("dropdownlist", undefined, ["NOT_SELECTED", "SKIP", "OVERWRITE", "CREATE_COPY"]);
        conflictResolutionGroup.option.size = TEXT_SIZE_SETTINGS;
        conflictResolutionGroup.option.selection = 0;

        // Create logging level group and widgets
        loggingGroup = generalSettingsPanel.add("group", undefined);
        loggingGroup.orientation = "row";
        loggingGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        loggingGroup.loggingLabel = loggingGroup.add("statictext", undefined, " Current Logging Level");
        loggingGroup.loggingLabel.size = LABEL_SIZE_SETTINGS;
        loggingGroup.loggingDropdown = loggingGroup.add("dropdownlist", undefined, ["DEBUG", "INFO", "WARNING", "ERROR"]);
        loggingGroup.loggingDropdown.size = TEXT_SIZE_SETTINGS;
        loggingGroup.loggingDropdown.selection = 0;
    
        // Create authentication group and widgets
        authenticateGroup = deadlineCloudSettings.mainPanel.add("group", undefined);
        authenticateGroup.orientation = "row";
    
        authenticateGroup.credsLabel = authenticateGroup.add("statictext", undefined, "Creds: ");
        authenticateGroup.credsLabel.size = [40, 20];
        authenticateGroup.credsAuthentication = authenticateGroup.add("statictext", undefined, "NOT_VALID");
        authenticateGroup.credsAuthentication.graphics.foregroundColor = red;
        authenticateGroup.credsAuthentication.size = [200, 20];

        authenticateGroup.statusLabel = authenticateGroup.add("statictext", undefined, "Status:");
        authenticateGroup.statusLabel.size = [40, 20];
        
        authenticateGroup.statusAuthentication = authenticateGroup.add("statictext", undefined, "NEEDS_LOGIN");
        authenticateGroup.statusAuthentication.graphics.foregroundColor = red;
        authenticateGroup.statusAuthentication.size = [140, 20];

        authenticateGroup.apiStatusLabel = authenticateGroup.add("statictext", undefined, "Deadline Cloud API: ");
        authenticateGroup.apiStatusLabel.size = [110, 20];

        authenticateGroup.apiAuthentication = authenticateGroup.add("statictext", undefined, "False");
        authenticateGroup.apiAuthentication.graphics.foregroundColor = red;
        authenticateGroup.apiAuthentication.size = [140, 20];

        // Create button group and widgets
        buttonsGroupSettingsWindow = deadlineCloudSettings.mainPanel.add("group", undefined);
        buttonsGroupSettingsWindow.orientation = "row";
        buttonsGroupSettingsWindow.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
    
        buttonsGroupSettingsWindow.loginBtn = buttonsGroupSettingsWindow.add("button", undefined, "Login");
        buttonsGroupSettingsWindow.loginBtn.size = BTN_SIZE_SETTINGS;
    
        buttonsGroupSettingsWindow.logoutBtn = buttonsGroupSettingsWindow.add("button", undefined, "Logout");
        buttonsGroupSettingsWindow.logoutBtn.size = BTN_SIZE_SETTINGS;
    
        buttonsGroupSettingsWindow.labelSpacer = buttonsGroupSettingsWindow.add("statictext", undefined, "");
        buttonsGroupSettingsWindow.labelSpacer.size = [150, 30];
    
        buttonsGroupSettingsWindow.okBtn = buttonsGroupSettingsWindow.add("button", undefined, "OK");
        buttonsGroupSettingsWindow.okBtn.size = BTN_SIZE_SETTINGS;
    
        buttonsGroupSettingsWindow.cancelBtn = buttonsGroupSettingsWindow.add("button", undefined, "Cancel");
        buttonsGroupSettingsWindow.cancelBtn.size = BTN_SIZE_SETTINGS;
    
        buttonsGroupSettingsWindow.applyBtn = buttonsGroupSettingsWindow.add("button", undefined, "Apply");
        buttonsGroupSettingsWindow.applyBtn.size = BTN_SIZE_SETTINGS;
    
        // Call connections
        initDeadlineCloudSettingsWindowConnections();
    }
    
    function initDeadlineCloudSettingsWindowConnections() {

        awsProfileGroup.dropdownAwsProfile.onChange = function()
        {
            var result = dcDeadlineCommands.logout(configDataSelections.aws_profile, configDataSelections.deadline_cloud_monitor);
            if(result.return_code == 0){
                dcProperties.isLoggedIn.set(false);
            } else{
                dcProperties.isLoggedIn.set(false);
            }
        }

        jobHistoryGroup.jobHistoryText.onChange = function()
        {
            logger.info("exportBundleDir changed to: " + configDataSelections.job_history_dir, scriptFileSettingsWindowName);
        }
        loggingGroup.loggingDropdown.onChange = function () {
            var selectedLogginglevel = loggingGroup.loggingDropdown.selection.text;
            var loggingIndex = LOG_LEVEL[selectedLogginglevel];
            CURRENT_LOG_LEVEL = loggingIndex;
            logger.info("Logging level changed to: " + selectedLogginglevel, scriptFileSettingsWindowName);
        }
    
        jobHistoryGroup.jobHistoryButton.onClick = function()
        {
            var outFolder = Folder.selectDialog();
            if (outFolder != null)
            {
                jobHistoryGroup.jobHistoryText.text = outFolder.fsName;
                exportBundleDir = outFolder.fsName;
                logger.info("exportBundleDir changed to: " + exportBundleDir, scriptFileSettingsWindowName);
            }
        }
        // Default Farm Refresh Button
        farmGroup.farmRefreshButton.onClick = function()
        {
            // Clear ListBox before we populate it again.
            farmGroup.defaultFarmDropdown.removeAll();
            dcInitData.initDeadlineFarmData();
            populateFarmData();
        }
        // Default Queue Refresh Button
        defaultQueueGroup.defQRefreshButton.onClick = function()
        {
            // Clear ListBox before we populate it again.
            defaultQueueGroup.defQDropdown.removeAll();
            var farmId = dcProperties.config.farm_id.get();
            var result = dcDeadlineCommands.listQueue(farmId);
            dcProperties.queueList.set(result);
            populateQueueListBox();
        }
        // Saving variables to ae_submission file should also happen on apply/ok!
        buttonsGroupSettingsWindow.loginBtn.onClick = function () {
            var result = dcDeadlineCommands.login(dcProperties.config.aws_profile.get(), dcProperties.config.deadline_cloud_monitor.get());
            if(result.return_code == 0){
                dcProperties.isLoggedIn.set(true);
            } else{
                dcProperties.isLoggedIn.set(false);
            }
        }
        buttonsGroupSettingsWindow.logoutBtn.onClick = function () {
            var result = dcDeadlineCommands.logout(dcProperties.config.aws_profile.get(), dcProperties.config.deadline_cloud_monitor.get());
            if(result.return_code == 0){
                dcProperties.isLoggedIn.set(false);
            } else{
                dcProperties.isLoggedIn.set(false);
            }
        }
        buttonsGroupSettingsWindow.cancelBtn.onClick = function () {
            logger.log("Closing Settings Window", scriptFileSettingsWindowName, LOG_LEVEL.INFO);
            dcCloseButton.closeButtonFncSettings(deadlineCloudSettings.settingsWindow);
            dcProperties.isAPIAvailable.remove_listener(onIsApiAvailableChanged);
            dcProperties.isLoggedIn.remove_listener(onIsLoggedInChanged);
            dcProperties.isWindowClosed.set(false);
        }
    
        buttonsGroupSettingsWindow.applyBtn.onClick = function () {
            applyConfigSettings();
        }

        buttonsGroupSettingsWindow.okBtn.onClick = function () {
            logger.log("Clicked OK button in Settings Window", scriptFileSettingsWindowName, LOG_LEVEL.INFO);
            applyConfigSettings();
            deadlineCloudSettings.settingsWindow.close();
            dcProperties.isAPIAvailable.remove_listener(onIsApiAvailableChanged);
            dcProperties.isLoggedIn.remove_listener(onIsLoggedInChanged);
            dcProperties.isWindowClosed.set(false);
        }

        // When selection for farm is changed -> Queue needs to be populated accordingly
        // First check if the farm is valid, if so proceed to fill.
        farmGroup.defaultFarmDropdown.onChange = function()
        {
            
            if (farmGroup.defaultFarmDropdown.selection)
            {
                logger.debug("farmGroup.defaultFarmDropdown.onChange: " + farmGroup.defaultFarmDropdown.selection.text, scriptFileSettingsWindowName);
                dcProperties.defaultFarm.set(farmGroup.defaultFarmDropdown.selection.text);
                // Clear ListBox before we populate it again.
                defaultQueueGroup.defQDropdown.removeAll();
                var farmId = dcProperties.config.farm_id.get();
                var result = dcDeadlineCommands.listQueue(farmId);
                dcProperties.queueList.set(result);
                populateQueueListBox();
            }
        }

        // Update Property when selection in listbox changes
        defaultQueueGroup.defQDropdown.onChange = function()
        {
            if(defaultQueueGroup.defQDropdown.selection)
            {
                if(defaultQueueGroup.defQDropdown.selection.text !== "<none selected>")
                {
                    dcProperties.defaultQueue.set(defaultQueueGroup.defQDropdown.selection.text);
                }
            }
        }
    }

    // ----- LISTENER CALLBACKS -----
    function initCallbacks(){
        dcProperties.isAPIAvailable.add_listener(onIsApiAvailableChanged);
        onIsApiAvailableChanged(dcProperties.isAPIAvailable.get());
        dcProperties.isLoggedIn.add_listener(onIsLoggedInChanged);
        onIsLoggedInChanged(dcProperties.isLoggedIn.get());
    }

    function onIsLoggedInChanged(newValue, oldValue){
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
            logger.debug("[onIsLoggedInChanged] SETTINGS WINDOW LOGIN CALLBACK", scriptFileSettingsWindowName);
            // Set Button States
            farmGroup.farmRefreshButton.enabled = true;
            defaultQueueGroup.defQRefreshButton.enabled = true;
            defaultStorageGroup.defStorageRefreshButton.enabled = true;
            buttonsGroupSettingsWindow.applyBtn.enabled = true;
            buttonsGroupSettingsWindow.okBtn.enabled = true;

            authenticateGroup.credsAuthentication.text = dcProperties.credentialStatus.type.get();
            authenticateGroup.credsAuthentication.graphics.foregroundColor = green;
            if(dcProperties.credentialStatus.type.get() == "NOT_VALID")
            {
            authenticateGroup.credsAuthentication.graphics.foregroundColor = red;
            }

            authenticateGroup.statusAuthentication.text =  dcProperties.credentialStatus.status.get();
            authenticateGroup.statusAuthentication.graphics.foregroundColor = red;
            if(dcProperties.credentialStatus.status.get() == "AUTHENTICATED")
            {
                authenticateGroup.statusAuthentication.graphics.foregroundColor = green;
            }

            dcProperties.isAPIAvailable.set(dcProperties.credentialStatus.api.get());
            
            // logger.debug("[onIsLoggedInChanged] farmGroup.defaultFarmDropdown.removeAll()", scriptFileSettingsWindowName);
            farmGroup.defaultFarmDropdown.removeAll();
            // logger.debug("[onIsLoggedInChanged] defaultQueueGroup.defQDropdown.removeAll()", scriptFileSettingsWindowName);
            defaultQueueGroup.defQDropdown.removeAll();
            // logger.debug("[onIsLoggedInChanged] defaultStorageGroup.defStorageDropdown.removeAll()", scriptFileSettingsWindowName);
            defaultStorageGroup.defStorageDropdown.removeAll();
            // If already logged in through main window, fetch farm and queue data to fill relevant UI items.
            // logger.debug("[onIsLoggedInChanged] populateFarmData()", scriptFileSettingsWindowName);
            populateFarmData();
            if(farmGroup.defaultFarmDropdown.selection.text !== "<none selected>")
            {
                dcProperties.defaultFarm.set(farmGroup.defaultFarmDropdown.selection.text);
            }
            // logger.debug("[onIsLoggedInChanged] populateQueueListBox()", scriptFileSettingsWindowName);
            // populateFarmData triggers farmGroup.defaultFarmDropdown.onChange which populates the queue dropdown
            defaultQueueGroup.defQDropdown.removeAll();
            populateQueueListBox();
            dcProperties.defaultQueue.set(defaultQueueGroup.defQDropdown.selection.text);
            populateConfigData();
            // Update properties on startup of settings window
            jobHistoryGroup.jobHistoryText.text = configDataSelections.job_history_dir;
            _loginWindow.close();
            return;
        }
        
        // Logged out
        var _logoutWindow = dcInitData.loadingLoginWindow();
        _logoutWindow.text = "Logging out of Deadline Cloud Monitor."
        _logoutWindow.children[0].text = "Logging out of Deadline Cloud Monitor."
        _logoutWindow.update();
        logger.debug("SETTINGS WINDOW LOGOUT CALLBACK", scriptFileSettingsWindowName);
        // Set button states
        farmGroup.farmRefreshButton.enabled = false;
        defaultQueueGroup.defQRefreshButton.enabled = false;
        defaultStorageGroup.defStorageRefreshButton.enabled = false;
        buttonsGroupSettingsWindow.applyBtn.enabled = false;
        buttonsGroupSettingsWindow.okBtn.enabled = false;
        jobHistoryGroup.jobHistoryText.text = configDataSelections.job_history_dir;

        authenticateGroup.credsAuthentication.text = dcProperties.credentialStatus.type.get();
        authenticateGroup.credsAuthentication.graphics.foregroundColor = green;
        if(dcProperties.credentialStatus.type.get() == "NOT_VALID")
        {
        authenticateGroup.credsAuthentication.graphics.foregroundColor = red;
        }

        authenticateGroup.statusAuthentication.text =  dcProperties.credentialStatus.status.get();
        authenticateGroup.statusAuthentication.graphics.foregroundColor = red;
        if(dcProperties.credentialStatus.status.get() == "AUTHENTICATED")
        {
            authenticateGroup.statusAuthentication.graphics.foregroundColor = green;
        }
        dcProperties.isAPIAvailable.set(dcProperties.credentialStatus.api.get());


        farmGroup.defaultFarmDropdown.removeAll();
        defaultQueueGroup.defQDropdown.removeAll();
        defaultStorageGroup.defStorageDropdown.removeAll();

        // Add none selected as option
        farmGroup.defaultFarmDropdown.add("item", "<none selected>");
        farmGroup.defaultFarmDropdown.selection = 0;
        defaultQueueGroup.defQDropdown.add("item", "<none selected>");
        defaultQueueGroup.defQDropdown.selection = 0;
        defaultStorageGroup.defStorageDropdown.add("item", "<none selected>");
        defaultStorageGroup.defStorageDropdown.selection = 0;

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
            authenticateGroup.apiAuthentication.text = 'True';
            authenticateGroup.apiAuthentication.graphics.foregroundColor = green;
            return;
        }
        // Logged out
        authenticateGroup.apiAuthentication.text = "False";
        authenticateGroup.apiAuthentication.graphics.foregroundColor = red;
    }
    // ----- /LISTENER CALLBACKS -----


    function populateFarmData(){
        farmResult = dcUtil.invertObject(dcProperties.farmList.get());
        var keys = Object.keys(farmResult);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            farmGroup.defaultFarmDropdown.add("item", key.replace(/[\x0A\x0D]/g, ''));
            farmResult[key] = farmResult[key].replace(/[\x0A\x0D]/g, '');
        }
        // Set selection in listbox
        farmGroup.defaultFarmDropdown.selection = 0;  // Default fallback
        for (var i = 0; i < keys.length; i++) {
            // Check if configDataSelections.farm_id is part of the larger string gotten from the parse(contains spaces and \n).
            var key = keys[i];
            if(configDataSelections.farm_id.indexOf(farmResult[key]) !== -1)
            {
                // default farm id has been found in the object -> set as default queue selection in listbox
                farmGroup.defaultFarmDropdown.selection = i;
                logger.debug("Default farm-id has been found in object: " + farmResult[key], scriptFileSettingsWindowName);
                break;
            }
        }
    }
    
    function populateQueueListBox()
    {
        // Clear out array to not add extra items to the list.
        queueResult = dcUtil.invertObject(dcProperties.queueList.get());
        var keys = Object.keys(queueResult)
        // Fill the queue listbox with possible item found with systemCall
        for (var i = 0; i < keys.length; i ++)
        {
            var key = keys[i];
            defaultQueueGroup.defQDropdown.add("item", key);
            // remove r\n from the string
            queueResult[key] = queueResult[key].replace(/[\x0A\x0D]/g, '');
            logger.debug("Filling listbox with item: " + key, scriptFileSettingsWindowName);
            if(configDataSelections.queue_id.indexOf(queueResult[key]) !== -1)
            {
                // If queue and default queue are the same, set the queue as the selected item in the listbox.
                defaultQueueGroup.defQDropdown.selection = i;
            }
            if(configDataSelections.queue_id.length === 0)
            {
                defaultQueueGroup.defQDropdown.selection = 0;
                alert("No default queue found in console, setting selection to first object in listbox.");
                logger.debug("No default queue found in console, setting selection to first object in listbox.", scriptFileSettingsWindowName);
            }
        }
    }

    function populateConfigData()
    {
        // Clear all the listboxes first, otherwise we might get duplication
        defaultStorageGroup.defStorageDropdown.removeAll();

        // Profile
        jobHistoryGroup.jobHistoryText.text = configDataSelections.job_history_dir;
        defaultStorageGroup.defStorageDropdown.add("item", configDataSelections.storage_profile_id);
        defaultStorageGroup.defStorageDropdown.selection = 0;
        autoAcceptGroup.aACheckbox.value = dcUtil.parseBool(configDataSelections.auto_accept);

        // Set Default Storage selection
        //dcUtil.setListBoxSelection(defaultStorageGroup.defStorageDropdown, configDataSelections.storage_profile_id);

        // Set file system options selection
        dcUtil.setListBoxSelection(fileOptionsGroup.fileSystemOptions, configDataSelections.job_attachments_file_system);

        // Conflict Resolution Options selection
        dcUtil.setListBoxSelection(conflictResolutionGroup.option, configDataSelections.conflict_resolution);

        // Set logging group selection
        dcUtil.setListBoxSelection(loggingGroup.loggingDropdown, configDataSelections.log_level);
    }

    function getItemID(itemName, dataObject)
    {
        // Get the farm-id of the current selected item in the default farm listbox.
        var items = Object.keys(dataObject);
        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            if(itemName.indexOf(item) !== -1)
            {
                var id = dataObject[item];
                id = dcUtil.removeLineBreak(id);
                break;
            }
        }
        return id;
    }

    function applyConfigSettings()
    {
        logger.log("Applying chosen settings in Settings Window", scriptFileSettingsWindowName, LOG_LEVEL.INFO);

        var combinedCommand = "";

        if(configDataSelections.job_history_dir !== jobHistoryGroup.jobHistoryText.text)
        {
            var newHistoryDir = jobHistoryGroup.jobHistoryText.text
            if (newHistoryDir.indexOf('~') === 0){  // Contains a leading ~
                newHistoryDir = dcUtil.getUserDirectory() + newHistoryDir.substring(1)
            }
            newHistoryDir = dcUtil.enforceForwardSlashes(newHistoryDir)
            combinedCommand += "deadline config set settings.job_history_dir \"" + newHistoryDir + "\"";
            configDataSelections.job_history_dir = newHistoryDir;
            dcProperties.config.job_history_dir.set(configDataSelections.job_history_dir);
            logger.debug("Changed job_history_dir to: " + newHistoryDir, scriptFileSettingsWindowName);
        }

        if(configDataSelections.farm_id !== getItemID(farmGroup.defaultFarmDropdown.selection.text, farmResult))
        {
            combinedCommand += " && deadline config set defaults.farm_id " + getItemID(farmGroup.defaultFarmDropdown.selection.text, farmResult);
            configDataSelections.farm_id = getItemID(farmGroup.defaultFarmDropdown.selection.text, farmResult);
            dcProperties.config.farm_id.set(configDataSelections.farm_id);
            logger.debug("Changed farm_id to: "+ configDataSelections.farm_id, scriptFileSettingsWindowName);
        }
        
        if(configDataSelections.queue_id !== getItemID(defaultQueueGroup.defQDropdown.selection.text, queueResult))
        {
            combinedCommand += " && deadline config set defaults.queue_id " + getItemID(defaultQueueGroup.defQDropdown.selection.text, queueResult);
            configDataSelections.queue_id = getItemID(defaultQueueGroup.defQDropdown.selection.text, queueResult);
            dcProperties.config.queue_id.set(configDataSelections.queue_id);
            logger.debug("Changed queue_id to: "+ configDataSelections.queue_id, scriptFileSettingsWindowName);
        }


        if(configDataSelections.job_attachments_file_system !== fileOptionsGroup.fileSystemOptions.selection.text)
        {
            combinedCommand += " && deadline config set defaults.job_attachments_file_system " + fileOptionsGroup.fileSystemOptions.selection.text;
            configDataSelections.job_attachments_file_system = fileOptionsGroup.fileSystemOptions.selection.text;
            dcProperties.config.job_attachments_file_system.set(configDataSelections.job_attachments_file_system);
            logger.debug("Changed job_attachments_file_system to: "+ configDataSelections.job_attachments_file_system, scriptFileSettingsWindowName);
        }

        if(configDataSelections.auto_accept !== autoAcceptGroup.aACheckbox.value)
        {
            if(autoAcceptGroup.aACheckbox.value == true)
            {
                combinedCommand += " && deadline config set settings.auto_accept True";
                configDataSelections.auto_accept = "True";
                dcProperties.config.auto_accept.set(configDataSelections.auto_accept);
            }
            else{
                combinedCommand += " && deadline config set settings.auto_accept False";
                configDataSelections.auto_accept = "False";
                dcProperties.config.auto_accept.set(configDataSelections.auto_accept);
            }
            logger.debug("Changed auto_accept to: "+ configDataSelections.auto_accept, scriptFileSettingsWindowName);
        }

        if(configDataSelections.conflict_resolution !== conflictResolutionGroup.option.selection.text)
        {
            combinedCommand += " && deadline config set settings.conflict_resolution " + conflictResolutionGroup.option.selection.text;
            configDataSelections.conflict_resolution = conflictResolutionGroup.option.selection.text;
            dcProperties.config.conflict_resolution.set(configDataSelections.conflict_resolution);
            logger.debug("Changed conflict_resolution to: "+ configDataSelections.conflict_resolution, scriptFileSettingsWindowName);
        }

        if(configDataSelections.log_level !== loggingGroup.loggingDropdown.selection.text)
        {
            combinedCommand += " && deadline config set settings.log_level " + loggingGroup.loggingDropdown.selection.text;
            configDataSelections.log_level = loggingGroup.loggingDropdown.selection.text;
            dcProperties.config.log_level.set(configDataSelections.log_level);
            logger.debug("Changed log_level to: "+ configDataSelections.log_level, scriptFileSettingsWindowName);
        }
        // If some values are the same, the command will have '&& ' at the start
        if(combinedCommand.indexOf(" && ") === 0)
        {
            combinedCommand = combinedCommand.slice(4);
        }
        var setNewDefaults = dcUtil.wrappedCallSystem(combinedCommand);
        logger.debug(setNewDefaults, scriptFileSettingsWindowName);
    }

    return {
        "initDeadlineCloudSettingsWindow": initDeadlineCloudSettingsWindow
    }
}

dcSettingsWindow = __generateSettingsWindow();