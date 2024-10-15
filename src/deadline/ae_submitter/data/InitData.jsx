function __generateInitData()
{
    var scriptFileInitDataName = "InitData.jsx";
    
    function initDeadlineConfig()
    {
        // Retrieve the config data on startup.
        // Check if config is available and parse out result
        _dcConfig = dcUtil.wrappedCallSystem("deadline config show");
    
        dcProperties.config.aws_profile.set(dcUtil.getConfigSettingData(_dcConfig, "defaults.aws_profile_name"));
        // If job history has backslashes, `deadline auth login` will mangle the config path
        var _job_history = dcUtil.getConfigSettingData(_dcConfig, "settings.job_history_dir")
        _job_history = dcUtil.enforceForwardSlashes(_job_history)
        dcProperties.config.job_history_dir.set(_job_history);
        dcProperties.config.farm_id.set(dcUtil.getConfigSettingData(_dcConfig, "defaults.farm_id"));
        dcProperties.config.queue_id.set(dcUtil.getConfigSettingData(_dcConfig, "defaults.queue_id"));
        dcProperties.config.storage_profile_id.set(dcUtil.getConfigSettingData(_dcConfig, "settings.storage_profile_id"));
        dcProperties.config.job_attachments_file_system.set(dcUtil.getConfigSettingData(_dcConfig, "defaults.job_attachments_file_system"));
        dcProperties.config.auto_accept.set(dcUtil.getConfigSettingData(_dcConfig, "settings.auto_accept"));
        dcProperties.config.conflict_resolution.set(dcUtil.getConfigSettingData(_dcConfig, "settings.conflict_resolution"));
        dcProperties.config.log_level.set(dcUtil.getConfigSettingData(_dcConfig, "settings.log_level"));
        dcProperties.config.deadline_cloud_monitor.set(dcUtil.getConfigSettingData(_dcConfig, "deadline-cloud-monitor.path"));
    
        logger.debug("Config here ----------------------: \n" + _dcConfig, scriptFileInitDataName);
        logger.debug("Aws profile name: " + dcProperties.config.aws_profile.get(), scriptFileInitDataName);
        logger.debug("Job History Directory output: " + dcProperties.config.job_history_dir.get(), scriptFileInitDataName);
        logger.debug("Farm id output: " + dcProperties.config.farm_id.get(), scriptFileInitDataName);
        logger.debug("Queue id output: " + dcProperties.config.queue_id.get(), scriptFileInitDataName);
        logger.debug("Storage Profile output: " + dcProperties.config.storage_profile_id.get(), scriptFileInitDataName);
        logger.debug("Job Attachments FileSystem Options output: " + dcProperties.config.job_attachments_file_system.get(), scriptFileInitDataName);
        logger.debug("Auto Accept output: " + dcProperties.config.auto_accept.get(), scriptFileInitDataName);
        logger.debug("Conflict Resolution output: " + dcProperties.config.conflict_resolution.get(), scriptFileInitDataName);
        logger.debug("Log Level output: " + dcProperties.config.log_level.get(), scriptFileInitDataName);
        logger.debug("Deadline cloud monitor path: " + dcProperties.config.deadline_cloud_monitor.get(), scriptFileInitDataName);
    
        // Set logging level to the default setting found in the config
        var loggingIndex = LOG_LEVEL[dcProperties.config.log_level.get()];
        CURRENT_LOG_LEVEL = loggingIndex;
        logger.error("Logging level changed to: " + dcProperties.config.log_level.get(), scriptFileInitDataName);
    }
    
    function initDeadlineFarmData(){
        // result = empty object if unsuccessful
        var result = dcDeadlineCommands.listFarm();
        dcProperties.farmList.set(result);
        if(!Object.keys(result).length){
            // No farm list means we don't need to query queues.
            dcProperties.queueList.set({})
            return
        }
        var farmId = dcProperties.config.farm_id.get();
        var result = dcDeadlineCommands.listQueue(farmId);
        dcProperties.queueList.set(result);
    }
    
    function initDeadlineProfiles(){
        // Query Available Deadline Cloud Profiles
        var result = dcDeadlineCommands.listProfiles();
        dcProperties.profileList.set(result);
    }

    function initAutoDetectFootageItems()
    {
        dcProperties.jobAttachments.autoDetectedInputFiles.set([]);
        var detectedItemsList = [];
        if (dcProperties.jobAttachments.autoDetectedInputFiles.get().indexOf(projectPath) == -1) {
            detectedItemsList.push(projectPath);
            logger.debug("Added project file path to auto detect list:  " + projectPath, scriptFileInitDataName);
        }

        for (var i = 1; i < app.project.numItems; i++) {
            var item = app.project.item(i);
            var directoryPath = item.file;
            if (item instanceof FootageItem) {
                // Check if footage item has a file associated with it. If not, do not add to list.
                if (directoryPath) {
                    var key = directoryPath.fsName;
                    // Check if item is already in the list.
                    if (detectedItemsList.indexOf(key) !== -1) {
                        // Do nothing and go to the next item. I will not add an alert, or this will get very spammy.
                        logger.debug("Auto detected footage is already in the list:  " + key, scriptFileInitDataName);
                        continue;
                    }
                    detectedItemsList.push(key);
                    logger.debug("Auto Detected Footage: " + key, scriptFileInitDataName);
                }
            }
        }
        var fontReferences = generateFontReferences();
        logger.debug("Get Fonts: " + key, scriptFileInitDataName);
        for (var i = 0; i < fontReferences.length; i++) {
            detectedItemsList.push(fontReferences[i]);
        }
        dcProperties.jobAttachments.autoDetectedInputFiles.set(detectedItemsList);
    }

    function _generateFontReferences() {
        var fontLocations = [];
        var usedList = app.project.usedFonts;
        for (var i = 0; i < usedList.length; i++) {
            var font = usedList[i].font;
            var fontFamilyName = font.familyName;
            var familyStyle = font.styleName;
            var fontName = fontFamilyName + " " + familyStyle + ".otf";
            var fontLocation = font.location;
            fontLocations.push([fontName, fontLocation]);
        }
        return fontLocations
    }

    function _oldGenerateFontReferences() {
        var fontLocations = [];
        var items = app.project.items;
        for (var i = items.length; i >= 1; i--) {
            var myItem = app.project.item(i);
            if (myItem instanceof CompItem) {
                for (var j = myItem.layers.length; j >= 1; j--) {
                    var myLayer = myItem.layers[j];
                    if (myLayer instanceof TextLayer){
                        var textDocument = myLayer.text.sourceText.value;
                        var fontLocation = textDocument.fontLocation;
                        var fontFamilyName = textDocument.fontFamily;
                        var familyStyle = textDocument.fontStyle;
                        var fontName = fontFamilyName + " " + familyStyle + ".otf";
                        fontLocations.push([fontName, fontLocation]);
                    }
                }
            }
        }
        return fontLocations
    }

    function generateFontReferences() {
        var rawFontPaths = [];
        if (parseInt(app.version[0] + app.version[1]) >= 24) {
            rawFontPaths = _generateFontReferences();
        } else {
            rawFontPaths = _oldGenerateFontReferences();
        }
        var _tempFilePath = dcUtil.normPath(Folder.temp.fsName + "/" + "tempFonts");
        var formattedFontPaths = [];
        var tempFontPath = new Folder(_tempFilePath);
        if (!tempFontPath.exists) {
            tempFontPath.create();
        }


        for (var i = 0; i < rawFontPaths.length; i++) {
            var fontName = rawFontPaths[i][0];
            var fontLocation = rawFontPaths[i][1];
            if (fontLocation.indexOf("C:\\Windows\\Fonts") !== -1) {
                // We are filtering out fonts installed in C:\Windows\Fonts potentially here.
                //   I would make the argument that if a font is installed to the system (not an Adobe Font), that
                //   it should be managed on a system level not through the submitter.
                continue
            }
            var fontFile = File(fontLocation);
            var _filePath = dcUtil.normPath(_tempFilePath + "/" + fontName);
            fontFile.copy(_filePath);
            formattedFontPaths.push(_filePath);
        }
        return formattedFontPaths;
    }

    function initAutoDetectOutputDirectories()
    {
        var detectedOutputDirectories= [];
        // reset list
        dcProperties.jobAttachments.autoDetectOutputDirectories.set([]);

        for (var i = 1; i <= app.project.renderQueue.numItems; i++)
        {
            // Get output directory for current renderQueueItem
            var renderQItem = app.project.renderQueue.item(i);
            var itemPath = dcSubmitButton.getCompleteDirectory(renderQItem);
            logger.debug("Selected item path:" + itemPath, scriptFileInitDataName);
            if(detectedOutputDirectories.indexOf(itemPath) !== -1)
            {
                // File is already in the list, do not add it and continue to the next item
                continue;
            }
            detectedOutputDirectories.push(itemPath);
        }
        dcProperties.jobAttachments.autoDetectOutputDirectories.set(detectedOutputDirectories);
    }

    function loadingUIWindow()
    {
        // Create a new window
        var dialog = new Window("palette", "Loading UI", undefined, {resizeable: true});
        dialog.size = [250,100];
        label = dialog.add("statictext", undefined, "Loading UI in progress.")
        label.size = [200, 20];
        // Create Progress Bar for Submission Button
        progressBar = dialog.add('progressbar', undefined, '');
        progressBar.size = [200, 20];
        progressBar.value = 0;

        // Show the window
        dialog.show();
        return dialog;
    }
    
    function loadingLoginWindow()
    {
        // Create a new window
        var loginWindow = new Window("palette", " ", undefined, {resizeable: true});
        loginWindow.size = [250,50];
        label = loginWindow.add("statictext", undefined, "Logging in to Deadline Cloud Monitor.")
        label.size = [200, 20];

        // Show the window
        loginWindow.show();
        return loginWindow;
    }
    
    return {
        "initDeadlineConfig": initDeadlineConfig,
        "initDeadlineFarmData": initDeadlineFarmData,
        "initDeadlineProfiles": initDeadlineProfiles,
        "initAutoDetectFootageItems": initAutoDetectFootageItems,
        "initAutoDetectOutputDirectories": initAutoDetectOutputDirectories,
        "loadingUIWindow": loadingUIWindow,
        "loadingLoginWindow": loadingLoginWindow
    }
}

dcInitData = __generateInitData();
