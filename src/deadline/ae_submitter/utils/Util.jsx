function __generateUtil() {

    var scriptFileUtilName = "Util.jsx";

    function deadlineStringToArray(str) {
        /**
         * Turn given string into array.
         * @param {string} str - String to turn into an array
         * Return converted string as an array.
         */
        str = str.replace("\r", "");
        var tempArray = str.split('\n');
        var array;

        if (tempArray.length > 0) {
            array = new Array(tempArray.length - 1);

            // Only loop to second last item in tempArray, because the last item is always empty.
            for (var i = 0; i < tempArray.length - 1; i++)
                array[i] = tempArray[i].replace("\n", "").replace("\r", "");
        } else
            array = new Array(0);

        return array;
    }

    function toBooleanString(value) {
        /**
         * Check if given value is true or false.
         * Return result
         * @param {string} value - "true" or "false" given as a string.
         */
        if (value)
            return "true";
        else
            return "false";
    }

    function parseBool(value) {
        /**
        * Changes string given value into a boolean and return it.
        * @param {string} value - Given value to transform in boolean type.
        * Returns boolean transformed value
        */
        value = value.toLowerCase();
        if (value == "1" || value == "t" || value == "true")
            return true;

        return false;
    }

    function trim(stringToTrim) {
        /**
        * Changes certain characters to empty string("")
        * @param {stringToTrim} stringToTrim - Given string to replace illegal characters with "".
        * Returns trimmed string
        */
        return stringToTrim.replace(/^\s+|\s+$/g, "");
    }

    function trimIllegalChars(stringToTrim) {
        /**
        * Trims certain characters out of a given string
        * @param {string} stringToTrim - Given string to trim illegal characters from.
        * Returns trimmed string
        */
        // \ / : * ? " < > |
        return stringToTrim.replace(/([\*\?\|:\"<>\/\\%£])/g, "");
    }

    function sliderTextSync(sliderObj, textObj, minValue, maxValue) {
        /**
        * Create a link between slider value and text value. If you change one the other changes with the same value.
        * @param {slider} sliderObj - Slider object
        * @param {edittext} textObj - Text object
        * @param {int} minValue - Minimum value that the slider/edittext can have.
        * @param {int} maxValue - Maximum value that the slider/edittext can have
        */
        textObj.onChange = function() {
            var newValue = parseFloat(textObj.text);
            if (!isNaN(newValue) && newValue >= minValue && newValue <= maxValue) {
                sliderObj.value = newValue;
                logger.log("Changed editText(" + textObj.name + ") value to: " + newValue, scriptFileUtilName, LOG_LEVEL.DEBUG);
            }
        }
        //this.text = Math.round( sliderObj.value ); 


        sliderObj.onChange = function() {
            textObj.text = Math.round(this.value);
            logger.log("Changed sliderObject(" + sliderObj.name + ") value to: " + Math.round(this.value), scriptFileUtilName, LOG_LEVEL.DEBUG);
        }
    }

    function changeTextValue(sliderObj, textObj, minValue, maxValue) {
        /**
        * Create a link between slider value and text value. If you change one the other changes with the same value.
        * @param {slider} sliderObj - Slider object
        * @param {edittext} textObj - Text object
        * @param {int} minValue - Minimum value that the slider/edittext can have.
        * @param {int} maxValue - Maximum value that the slider/edittext can have
        */
        var sliderValue = Math.round(sliderObj.value);
        if (!isNaN(sliderValue) && sliderValue >= minValue && sliderValue <= maxValue) {
            textObj.text = sliderValue;
        }

    }

    function changeSliderValue(sliderObj, textObj, minValue, maxValue) {
        /**
        * Create a link between slider value and text value. If you change one the other changes with the same value.
        * @param {slider} sliderObj - Slider object
        * @param {edittext} textObj - Text object
        * @param {int} minValue - Minimum value that the slider/edittext can have.
        * @param {int} maxValue - Maximum value that the slider/edittext can have
        */

        var newValue = parseFloat(textObj.text);
        if (newValue < minValue) {
            textObj.text = minValue;
            sliderObj.value = minValue;
        } else if (newValue > maxValue) {
            textObj.text = maxValue;
            sliderObj.value = maxValue;
        }
        if (!isNaN(newValue) && newValue >= minValue && newValue <= maxValue) {
            sliderObj.value = newValue;
        }
    }

    function spinBoxLimiterMin(minValue, maxValue) {
        /**
        * Limits spinbox minimum value.
        * @param {int} minValue - Minimum value allowed for the spinbox.
        * @param {int} maxValue - Maximum value allowed for the spinbox.
        */
        minValue.text = minValue.text.replace(/[^\d]/g, '');

        if (parseInt(minValue.text) > parseInt(maxValue.text)) {
            minValue.text = maxValue.text;
        }
    }

    function spinBoxLimiterMax(minValue, maxValue) {
        /**
        * Limits spinbox maximum value.
        * @param {int} minValue - Minimum value allowed for the spinbox.
        * @param {int} maxValue - Maximum value allowed for the spinbox.
        */
        maxValue.text = maxValue.text.replace(/[^\d]/g, '');
        if (parseInt(maxValue.text) < parseInt(minValue.text)) {
            maxValue.text = minValue.text
        }
    }

    function editTextIntValidation(editTextObject, sliderObject) {
        /**
        * Validates edit text widget data to be able to use in slider object.
        * @param {Object} editTextObject - Target object to set data for.
        * @param {Object} sliderObject - Source object to retrieve data from.
        */
        editTextObject.text = editTextObject.text.replace(/[^\d]/g, '');
        if (editTextObject.text == "") {
            editTextObject.text = Math.round(sliderObject.value);
        }
    }

    function getAssetsInScene(listBox) {
        /**
        * Gets available assets in the scene that have been previously added to a listbox,
        * and adds the; into a list
        * @param {Object} listBox - Source object to retrieve data from.
        * Returns array with assets available in the scene.
        */
        var _assetsList = []
        for (var i = 0; i < listBox.items.length; i++) {
            _assetsList.push(listBox.items[i].text);
        }
        return _assetsList;
    }

    function validateSkipExistingFrames(renderQueueItem, renderSettings, renderValidation) {
        /**
        * For given renderQueueItem checks if option 'Skip Existing Frame' has been enabled or not.
        * If disabled, force enable.
        * @param {Object} renderQueueItem - Target renderQueueItem.
        * @param {Object} renderSettings - Target renderQueueItem Settings.
        * @param {boolean} renderValidation
        * Returns boolean to proceed or halt the submission process.
        */
        if (renderSettings["Skip Existing Files"] == "false") {
            var skipWindow = new Window("dialog", "Skip Existing Files Setting");
            var skipText = skipWindow.add("statictext", undefined, "Skip Existing Files has not been enabled in the Render Settings for the RenderQueueItem. Please enable to continue.");
            skipWindow.skipButtonsGroup = skipWindow.add("group", undefined);
            skipWindow.skipButtonsGroup.orientation = "row";

            var buttonContinue = skipWindow.skipButtonsGroup.add("button", undefined, "Continue");
            buttonContinue.size = [60, 20];
            var buttonCancel = skipWindow.skipButtonsGroup.add("button", undefined, "Cancel");
            buttonCancel.size = [60, 20];

            buttonCancel.onClick = function() {
                renderValidation = false;
                skipWindow.close();
            }

            buttonContinue.onClick = function() {
                // Update Skip Existing Files to true.
                var newSettings = {
                    "Skip Existing Files": true
                };
                renderQueueItem.setSettings(newSettings);
                renderValidation = true;
                skipWindow.close();
            }
            skipWindow.center();
            skipWindow.show();
            return renderValidation;
        }
        return true;
    }

    function validateAutoAccept() {
        /**
        * Opens up window that shows how many items will be uploaded with the submission.
        * Allows user to accept or decline. Based on choice return boolean value.
        */
        var amountFiles = dcProperties.jobAttachments.userAddedInputFiles.get().concat(dcProperties.jobAttachments.autoDetectedInputFiles.get());
        var autoAcceptValidation = false;
        var autoAcceptWindow = new Window("dialog", "Job Attachments Upload Confirmation");
        var labelText = 'Job submission contains ' + amountFiles.length + " files. All files will be uploaded to S3 if they are not already present in the job attachments bucket."
        var autoAcceptLabel = autoAcceptWindow.add('statictext', undefined, labelText);
        autoAcceptWindow.skipButtonsGroup = autoAcceptWindow.add("group", undefined);
        autoAcceptWindow.skipButtonsGroup.orientation = "row";

        var buttonOK = autoAcceptWindow.skipButtonsGroup.add("button", undefined, "OK");
        buttonOK.size = [60, 20];
        var buttonCancel = autoAcceptWindow.skipButtonsGroup.add("button", undefined, "Cancel");
        buttonCancel.size = [60, 20];

        buttonCancel.onClick = function() {
            autoAcceptValidation = false;
            autoAcceptWindow.close();
        }

        buttonOK.onClick = function() {
            autoAcceptValidation = true;
            autoAcceptWindow.close();
        }
        autoAcceptWindow.center();
        autoAcceptWindow.show();

        return autoAcceptValidation;
    }

    function getDescription() {
        /**
        * Get description data from UI.
        * Returns either data or empty string, depending on the user given description.
        */
        if (descriptionGroup.textComment.text) {
            return descriptionGroup.textComment.text;
        }
        return "";
    }

    function checkGPUAccelType(submitScene, ignoreGPUAccelWarning) {
        var gpuType = app.project.gpuAccelType;
        var changeGPUType = false;

        if (!ignoreGPUAccelWarning && typeof gpuType != "undefined" && gpuType != GpuAccelType.SOFTWARE) {
            if (submitScene) {
                if (confirm("This After Effects project is currently configured to take advantage of gpu acceleration, which means every machine NEEDS a mercury enabled gpu.\n\nWould you like to disable this by changing it to 'Mercury Software Only'? Click 'YES' to temporarily convert this project to use CPU processing only. Click 'NO' to leave the setting as is and continue submission.\n\nThis warning can be disabled by toggling 'Ignore GPU Acceleration Warning' under the 'Advanced' tab.")) {
                    changeGPUType = true;
                }
            } else {
                if (confirm("This After Effects project is currently configured to take advantage of gpu acceleration, which means every machine NEEDS a mercury enabled gpu.\n\nWould you like to disable this by changing it to 'Mercury Software Only'? Click 'YES' to convert this project to use CPU processing only. Click 'NO' to leave the setting as is and continue submission.\n\nThis WILL NOT be reverted automatically after submission.\n\nThis warning can be disabled by toggling 'Ignore GPU Acceleration Warning' under the 'Advanced' tab.")) {
                    changeGPUType = true;
                    gpuType = null; // Since we don't want to restore the old value
                }
            }
            if (changeGPUType) {
                app.project.gpuAccelType = GpuAccelType.SOFTWARE;
            } else {
                gpuType = null;
            }
        } else {
            gpuType = null;
        }
        return gpuType;
    }

    function invertObject(jsObject) {
        /**
        * Inverts a given JavaScript object.
        * Only inverts the first level, does not handle nested objects properly.
        */
        var ret = {};
        for (var key in jsObject) {
            ret[jsObject[key]] = key;
        }
        return ret;
    }

    function getTempFile(fileName){
        /**
        * Return File instance from temporary directory with the given name.
        */
        var _tempFilePath = normalizePath(Folder.temp.fsName + "/" + fileName);
        var _tempFile = File(_tempFilePath);
        return _tempFile;
    }

    function wrappedCallSystem(cmd) {
        /**
        * Wraps system.callSystem command as required to get output from it.
        *
        * For Windows, wraps it into __two__ "cmd /c " calls.
        *
        * For MacOS, returns the command as-is.
        */
        if (system.osName == "MacOS") {
            return _wrappedCallSystemMac(cmd);
        }
        return _wrappedCallSystemWindows(cmd);
    }

    function _wrappedCallSystemWindows(cmd){

        var tempOutputFile = getTempFile("deadline_cloud_ae_pipe.txt");
        var tempBootstrapBatFile = getTempFile("aeCallSystemBootstrap.bat");
        var tempBatFile = getTempFile("aeCallSystem.bat");
        logger.debug("Command output path: " + tempOutputFile.fsName, scriptFileUtilName);
        _makeBootstrapBatFile(tempBootstrapBatFile, tempBatFile);
        // Wrapped command with error code output
        cmd = cmd + " > " + tempOutputFile.fsName;
        cmd += "\nIF %ERRORLEVEL% NEQ 0 ("
        cmd += "\n echo ERROR CODE: %ERRORLEVEL% >> " + tempOutputFile.fsName
        cmd += "\n)"
        cmd += "\nexit"
        tempBatFile.open("w");
        tempBatFile.writeln(cmd);
        tempBatFile.close();
        
        logger.debug("Running command (file):", scriptFileUtilName);
        logger.debug(tempBootstrapBatFile.fsName, scriptFileUtilName);
        logger.debug("Command: ", scriptFileUtilName);
        logger.debug(cmd, scriptFileUtilName);
        // Call bootstrap script and return result via intermediary file.
        system.callSystem(tempBootstrapBatFile.fsName);
        var output = system.callSystem("cmd /c \"type " + tempOutputFile.fsName + "\"");
        return output;
    }

    function _makeBootstrapBatFile(bootstrapFile, tempFile){
        var _cmd = "@echo off" + "\nstart /min /wait " + tempFile.fsName + "\nexit"
        bootstrapFile.open("w");
        bootstrapFile.writeln(_cmd);
        bootstrapFile.close();
    }

    function _wrappedCallSystemMac(cmd){
        // Add error code in the output if the command errors.
        cmd = cmd + " || echo \"ERROR CODE: $?\"";
        return system.callSystem(cmd);
    }

    function parseErrorData(output, cmd) {
        /**
        * Parses output string gotten from login/logout.
        * Depending on error code found or not return return_code, error message, result.
        * @param {string} output: String gotten from wrappedCallSystem. Contains error code and message.
        * @param {string} cmd: name of the command that calls upon this function. Used to write message.
        */

        var result = "";
        var message = "";
        var return_code = 0;
        var errorIndex = output.indexOf("ERROR CODE:");
        if (errorIndex !== -1) {
            // Extract the word and everything behind it
            result = output.substring(errorIndex);
            message = cmd + " Failed. Error has occurred.";
            var regex = /ERROR CODE:(.*)/;
            return_code = regex.exec(result);
            return {
                "return_code": return_code,
                "message": message,
                "result": result
            }
        }
        result = "";
        message = cmd + " Successful."
        return {
            "return_code": return_code,
            "message": message,
            "result": result
        }
    }
    
    function parseCredsData(output)
    {
        /**
        * Parses output string gotten from deadline creds status command.
        * @param {string} output: String gotten from wrappedCallSystem. Contains error code, data, and message.
        * Returns object with authentication status for credentials, status, and api.
        */
        var sourceRegex = /Source:\s*(.*?)(\n|$)/;
        var statusRegex = /Status:\s*(.*?)(\n|$)/;
        var apiRegex = /API Availability:\s*(.*?)(\n|$)/;

        var sourceMatch = getMatch(output, sourceRegex);
        var statusMatch = getMatch(output, statusRegex);
        var apiMatch = getMatch(output, apiRegex);
        return {
            "source": sourceMatch,
            "status": statusMatch,
            "api": apiMatch
        };
    }

    function parseListData(output) {
        /** Return object of <id>: <name> of some given CLI output. */

        var parsedObject = {};
        // Split string in array if lines
        var lines = output.split("\n");

        // loop through each line, and look for specific data.
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            // Check if the line contains a dash '-'
            if (line.indexOf('-') === 0) {
                // Look for 'queueID:' and 'displayName:' on the next lines
                var nextLineItemID = lines[i];
                var nextLineDisplayName = lines[i + 1];

                // Extract the data after 'queueID:' and 'displayName:'
                var itemIDData = nextLineItemID.substring(nextLineItemID.indexOf(':') + 1);
                itemIDData = itemIDData.replace(" ", "").trim();
                var displayNameData = nextLineDisplayName.substring(nextLineDisplayName.indexOf(':') + 1);
                displayNameData = displayNameData.replace(" '", "").replace("'", "").trim();

                parsedObject[itemIDData] = displayNameData;
                logger.debug('itemID found after dash: ' + itemIDData, scriptFileUtilName);
                logger.debug('DisplayName found after dash: ' + displayNameData, scriptFileUtilName);
            }
        }
        return parsedObject
    }

    function parseVersionData(output)
    {
        /**
        * Returns list of version numbers in the following order:
        [MAJOR, MINOR, PATCH]
        */
        // Regular expression to match "version " followed by version number
        var regex = /version\s+(\d+)\.(\d+)\.(\d+)/i;

        // Test if the inputString matches the pattern
        var parsedVersionNumberOutput = output.match(regex);

        // Output the result
        if (parsedVersionNumberOutput) 
        {
            var versionNumbers = [
                parseInt(parsedVersionNumberOutput[1]),  // Major
                parseInt(parsedVersionNumberOutput[2]),  // Minor
                parseInt(parsedVersionNumberOutput[3])  // Path
            ];
            return versionNumbers;
        } else
        {
            return [];
        }
    }

    function createExportBundleDir(exportBundleDir, fileName) {
        /**
        * Creates export bundle directory based on given job history directory and the name of the job.
        * Depending on error code found or not return return_code, error message, result.
        * @param {string} exportBundleDir: Job history directory
        * @param {string} fileName: Job name
        * Returns export directory
        */
        var partialDir = getPartialExportDir(exportBundleDir);
        var dir = getPath(partialDir, fileName, exportBundleDir);
        return dir.fsName;
    }

    function getConfigSettingData(config, setting) {
        /**
        * Parses config for specific setting name and returns data linked to the setting.
        * Depending on error code found or not return return_code, error message, result.
        * @param {Object} config: Config object.
        * @param {string} setting: Name of the setting to get data from
        * Returns data linked to setting name.
        */
        // Create a regular expression pattern with the search string
        var regexPattern = new RegExp(setting, 'g');

        // Use the match method to find all matches
        var matches = config.match(regexPattern);

        // If matches are found
        if (matches) {
            // Loop through each match
            for (var i = 0; i < matches.length; i++) {
                var match = matches[i];

                // Get the index of the match
                var matchIndex = config.indexOf(match);

                // Find the index of the next line break after the match
                var nextLineBreakIndex = config.indexOf('\n', matchIndex);

                // If a line break is found after the match
                if (nextLineBreakIndex !== -1) {
                    // Extract the next line after the match
                    var nextLine = config.substring(nextLineBreakIndex + 1, config.indexOf('\n', nextLineBreakIndex + 1));

                    // Return the next line
                    nextLine = nextLine.replace(/[\x0A\x0D]/g, '');
                    nextLine = trim(nextLine);
                    if (nextLine.length == 0) return null;
                    return nextLine;
                }
            }
        }
        // If no match is found, return null
        return null;
    }

    function getAWSProfileList(profilesString) {
        /**
        * Parses string data into an array.
        * @param {string} profilesString: Config object.
        * Returns array that contains all available profiles.
        */
        // Split the multi-line string into an array of lines
        var lines = profilesString.split('\n');

        // Create a list to store the lines
        var lineList = [];

        // Loop over each line and add it to the list
        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            line = line.replace(/[\x0A\x0D]/g, '');
            line = trim(line);
            if (line == "default") {
                continue;
            }
            if (line.length == 0) {
                continue;
            }
            lineList.push(line);
        }
        return lineList;
    }

    function removeLineBreak(string) {
        /**
        * Replaces illegal characters in given string
        * @param {string} string: String that contains \n and \r
        * Returns parsed string with no illegal characters.
        */
        var newStr = "";

        // Loop and traverse string
        for (var i = 0; i < string.length; i++) {
            if (!(string[i] == "\n" || string[i] == "\r")) {
                newStr += string[i];
            }
        }
        return newStr;
    }

    function getMatchName(type, config_search_id) {
        /**
        * Looks for id match in list of possible id's. This for either 'Farm' or 'Queue' type.
        * @param {string} type: String that tells function to either check in farm list or queue list
        * @param {string} config_search_id: Farm or Queue id to check in id list.
        * Returns Object that contains boolean(match found or not) and farm/queue name the matched id is linked to
        */
        var result;
        var itemList = [];
        itemList.length = 0;
        if (type == "Farm") {
            logger.info('Retrieving data from dcProperties', scriptFileUtilName);
            result = dcUtil.invertObject(dcProperties.farmList.get());
        } else {
            result = dcUtil.invertObject(dcProperties.queueList.get());
        }
        var keys = Object.keys(result);
        for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            itemList.push(key);
            result[key] = result[key].replace(/[\x0A\x0D]/g, '');
            if (config_search_id.indexOf(result[key]) !== -1) {
                logger.debug("Match found", scriptFileUtilName);
                return {
                    "match": true,
                    "keyName": key
                };
            }
            if (config_search_id.length === 0) {
                logger.debug("No default setting value found in config", scriptFileUtilName);
                return null;
            }
        }
        logger.debug("No Match found", scriptFileUtilName);
        return {
            "match": false,
            "keyName": null
        };
    }

    function setListBoxSelection(listbox, configData) {
        /**
        * Sets correct item selection in given listbox when name of the item matches config data name.
        * @param {Object} listbox: Listbox object that contains all possible farms/queues
        * @param {string} configData: Name of the default farm/queue
        */
        for (var i = 0; i < listbox.items.length; i++) {
            if (configData == listbox.items[i].text) {
                listbox.selection = i;
            }
        }
    }

    function getPath(toCheckDir, fileName, rootDir)
    {
        // 1. Find highest sequence number used for today.
        var splitDir = toCheckDir.split("//");
        var toCheckFolderName = splitDir[splitDir.length -1];
        var parentDir = toCheckDir.replace(toCheckFolderName, "");
        var mainDir = new Folder(parentDir);
        var subFolders = mainDir.getFiles();
        // var filePrefix = "2024-01-04-" // <-- this should come from today (new Date()... ?)
        var regex = new RegExp(toCheckFolderName + "(\\d+)-.*");
        // identical to /2024-01-04-(\d+)-.*/
        var maxSeqNumber = 0;
        var folderName = "";
        for (var idx = 0; idx < subFolders.length; idx++) {
            folderName = subFolders[idx].fullName
            var match = folderName.match(regex)
            if (!match) {
                continue;
            }
            var seqNr = parseInt(match[1]) // Convert first capture group to int
            if (seqNr > maxSeqNumber){
                maxSeqNumber = seqNr
            }
        }
        // 2. Create new export directory with next sequence number
        var nextSeqNumber = maxSeqNumber + 1
        // Sequence numbers under 10 are zero-padded.
        if(nextSeqNumber < 10)
        {
            nextSeqNumber = "0" + nextSeqNumber;
        }
        var folder = new Folder(toCheckDir + nextSeqNumber + "-AfterEffects-" + fileName);
        if(!folder.exists)
        {
            folder.create();
        }
        return folder;   
    }

    function getPartialExportDir(job_history_dir)
    {
        /**
        * Creates string with correct name and format to be used in job history directory creation.
        * @param {string} job_history_dir: Directory where job bundles is written to on submission.
        * Returns partial job history directory.
        */
        var currentDate = new Date();
        var year = currentDate.getFullYear();
        // Zero pad all integers to a length of 2
        var month = ("0" + (currentDate.getMonth() + 1)).slice(-2); // Months are zero-based
        var day = ("0" + currentDate.getDate()).slice(-2);
        // Create the formatted string
        var formattedYearMonth = year + '-' + month;
        var formattedDate = year + '-' + month + '-' + day;
        var dir = job_history_dir + "//" + formattedYearMonth + "//" + formattedDate + "-";
        return dir;
    }

    function collectHostRequirements()
    {
        // Remark: gpu memory and worker memory need to be scaled with *1024, for some of the amount capabilities, the unit displayed on the UI is different
        // then the unit used within template, so use this factor to scale the input values.

        var hostRequirements = {
            "attributes": [
                {
                    "name": "attr.worker.os.family",
                    "anyOf": [
                        osGroup.OSDropdownList.selection.text.toLowerCase()
                    ]
                },
                {
                    "name": "attr.worker.cpu.arch",
                    "anyOf": [
                        cpuArchGroup.cpuDropdownList.selection.text
                    ]
                }
            ],
            "amounts": [
                {
                    "name": "amount.worker.vcpu",
                    "min": parseInt(cpuGroup.cpuMinText.text),
                    "max": parseInt(cpuGroup.cpuMaxText.text)
                },
                {
                    "name": "amount.worker.memory",
                    "min": parseInt(memoryGroup.memoryMinText.text) * 1024,
                    "max": parseInt(memoryGroup.memoryMaxText.text) * 1024
                },
                {
                    "name": "amount.worker.gpu",
                    "min": parseInt(gpuGroup.gpuMinText.text),
                    "max": parseInt(gpuGroup.gpuMaxText.text)
                },
                {
                    "name": "amount.worker.gpu.memory",
                    "min": parseInt(gpuMemoryGroup.gpuMemoryMinText.text) * 1024,
                    "max": parseInt(gpuMemoryGroup.gpuMemoryMaxText.text) * 1024
                },
                {
                    "name": "amount.worker.disk.scratch",
                    "min": parseInt(scratchSpaceGroup.scratchSpaceMinText.text),
                    "max": parseInt(scratchSpaceGroup.scratchSpaceMaxText.text)
                }
            ]
        }

        if(cpuArchGroup.cpuDropdownList.selection == 0 && osGroup.OSDropdownList.selection == 0)
        {
            delete hostRequirements.attributes;
        }
        else if(cpuArchGroup.cpuDropdownList.selection == 0)
        {
            hostRequirements.attributes.splice(1,1);
        }
        else if(osGroup.OSDropdownList.selection == 0)
        {
            hostRequirements.attributes.splice(0,1);
        }
        
        return hostRequirements;   
    }

    function deepCopy(obj) {
        /**
        * Creates deep copy of given object to avoid 2 copies overwriting one another.
        * @param {Object} obj: Given object that has to be copied. Extendscript does not have deep copy.
        * Returns deep copy of an object
        */
        if (obj === null || typeof obj !== 'object') {
          return obj;
        }
      
        if (obj instanceof Array) {
          var copyArray = [];
          for (var i = 0; i < obj.length; i++) {
            copyArray[i] = deepCopy(obj[i]);
          }
          return copyArray;
        }
      
        if (obj instanceof Object) {
          var copyObject = {};
          for (var key in obj) {
            if (obj.hasOwnProperty(key)) {
              copyObject[key] = deepCopy(obj[key]);
            }
          }
          return copyObject;
        }
    }

    function getActiveComp(itemName)
    {
        /**
        * Get the active comp item that matches given name.
        * @param {string} itemName: Target comp name.
        * Returns comp object that matches target comp name.
        */
        // If submit layers pressed -> itemName is not comp name and therefore comp will not be found with render command
        // Check if itemName is an available comp in the project, if not, it is a layer submission
        var comp = itemName;
        var compList = [];
        for (var i = 1; i <= app.project.rootFolder.items.length; i++) {
            var item = app.project.rootFolder.items[i];

            if (item instanceof CompItem ) {
                compList.push(app.project.activeItem.name);
            }
        }
        if(compList.indexOf(itemName) !== -1)
        {
            comp = app.project.activeItem.name;
        }
        return comp;
    }
    
    function normalizePath(path)
    {
        var _file = new File(path);
        if (system.osName == "MacOS") {
            _file.changePath(_file.fsName.replace(/\\/g, "/"));
            return _file.fsName;
        }
        // else: Windows
        _file.changePath(_file.fsName.replace(/\//g, "\\"));
        return _file.fsName;
    }

    function enforceForwardSlashes(path){
         return path.replace(/(\\)+/g, "/");
    }

    function removeIllegalCharacters(inputString)
    {
        var outputString = inputString.replace(/[.\-\s]/g, "_");

        return outputString;
    }
    
    function removePercentageFromFileName(fileName)
    {
        var fileName = fileName.replace(/%20/g, " ");
        return fileName;
    }

    function getDuplicateFrames(frameList)
    {
        /**
        * Checks for given frame list if duplicate frames are present.
        * @param {string} frameList: List of frames given in the UI or entire frame range of the comp.
        * Returns either array filled with duplicates, or if no duplicates have been found empty string.
        */
        var duplicates = [];
        var framesToRender = [];
        var splitList = frameList.split(",");

        for(var i = 0; i < splitList.length; i++)
        {
            if(splitList[i].indexOf("-") == -1)
            {
                if (arrayIncludes(framesToRender, parseInt(splitList[i])))
                {
                    duplicates.push(parseInt(splitList[i]));
                }
                else{
                    framesToRender.push(parseInt(splitList[i]));
                }
            }
            else
            {
                var numbers = splitList[i].split("-");
                if(parseInt(numbers[0]) > parseInt(numbers[1]))
                {
                    // Frame range is wrong, first frame is larger than second
                    duplicates.push(numbers[0]);
                    return duplicates;
                }
                for(var j = parseInt(numbers[0]); j < parseInt(numbers[1]) - parseInt(numbers[0]) + 1; j++)
                {
                   if(arrayIncludes(framesToRender, j))
                   {
                    duplicates.push(j);
                   }
                   else{
                    framesToRender.push(j);
                   }
                }
            }
        }
        return duplicates;
    }

    function arrayIncludes(array, value)
    {
        for (var i = 0; i < array.length; i++) {
            if (array[i] === value) {
                return true;
            }
        }
        return false;
    }

    function getMatch(string, regex)
    {
        // Remove illegal characters from given string
        var match = string.match(regex);
        if(match && match[1])
        {
            var result = match[1].replace("\n", "").replace("\r", "");
        }
        return result;
    }

    function getUserDirectory(){
        /* Return OS specific user home directory. */
        if (system.osName == "MacOS") {
            return $.getenv("HOME")
        }
        // Windows:
        return $.getenv("USERPROFILE");
    }

    return {
        "invertObject": invertObject,
        "deadlineStringToArray": deadlineStringToArray,
        "toBooleanString": toBooleanString,
        "parseBool": parseBool,
        "trim": trim,
        "trimIllegalChars": trimIllegalChars,
        "sliderTextSync": sliderTextSync,
        "changeTextValue": changeTextValue,
        "changeSliderValue": changeSliderValue,
        "checkGPUAccelType": checkGPUAccelType,
        "spinBoxLimiterMin": spinBoxLimiterMin,
        "spinBoxLimiterMax": spinBoxLimiterMax,
        "getAssetsInScene": getAssetsInScene,
        "editTextIntValidation": editTextIntValidation,
        "getDescription": getDescription,
        "validateSkipExistingFrames": validateSkipExistingFrames,
        "validateAutoAccept": validateAutoAccept,
        "wrappedCallSystem": wrappedCallSystem,
        "parseErrorData": parseErrorData,
        "parseVersionData": parseVersionData,
        "parseCredsData": parseCredsData,
        "createExportBundleDir": createExportBundleDir,
        "parseListData": parseListData,
        "removeLineBreak": removeLineBreak,
        "getConfigSettingData": getConfigSettingData,
        "getMatchName": getMatchName,
        "getAWSProfileList": getAWSProfileList,
        "setListBoxSelection": setListBoxSelection,
        "getPath": getPath,
        "getPartialExportDir": getPartialExportDir,
        "collectHostRequirements": collectHostRequirements,
        "deepCopy": deepCopy,
        "getActiveComp": getActiveComp,
        "normalizePath": normalizePath,
        "normPath": normalizePath,
        "enforceForwardSlashes": enforceForwardSlashes,
        "removeIllegalCharacters": removeIllegalCharacters,
        "removePercentageFromFileName": removePercentageFromFileName,
        "getDuplicateFrames": getDuplicateFrames,
        "getTempFile": getTempFile,
        "getUserDirectory": getUserDirectory
    }
}

dcUtil = __generateUtil();
