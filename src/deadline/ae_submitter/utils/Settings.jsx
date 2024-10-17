function __generateSettings() {

// Create variable to use for logger
var scriptFileSettingsName = "Settings.jsx";
var AfterEffectsIniFilename = "";

    function getIniFile() {
        /*
        * Get the init ae init file location.
        * Returns path to the ae init file.
        */

        if (AfterEffectsIniFilename == "") {
            var prefix = app.project.file.parent.fsName;
            var projectName = app.project.file.name.replace(/\.aep$/i, '');
            prefix = prefix.replace(/\n/g, "");
            prefix = prefix.replace(/\r/g, "");
            AfterEffectsIniFilename = prefix + "/" + projectName + ".ae_deadlinecloud_submission.json";
            logger.debug(AfterEffectsIniFilename, scriptFileSettingsName);

            dcUtil.normPath(AfterEffectsIniFilename)
        }
        return AfterEffectsIniFilename;

    }

    function getIniSetting(key, defaultValue) {
        /** 
        * Check if given key exists in the ae init file and get the value for the key
        * Return key value (Setting value)
        * @param {string} key - Key name to look for in the file
        * @param {} defaultValue- Default value for given key
        */

        // Check if deadlineCloudConfiguration is empty
        // if yes, read values from ini file
        // if not empty look for the key in the deadlineCloudConfiguration
        var value = defaultValue;
        // If deadlineCloudConfiguration has not been filled, set it to object type and fill with settings from .ini file
        if (deadlineCloudConfiguration == null) {
            logger.debug("Filling Deadline Cloud Config object", scriptFileSettingsName);
            deadlineCloudConfiguration = {};
            fillConfiguration();
        }
        // If key does not exists in deadlineConfiguration, create the key and add the default value. Return default value.
        if (!(deadlineCloudConfiguration.hasOwnProperty(key))) {
            logger.log("Setting default value for '" + key + "'", scriptFileSettingsName, LOG_LEVEL.DEBUG);
            deadlineCloudConfiguration[key] = value;
            return value;
        }
        // If key exists in deadlineConfiguration, get value out and return it
        logger.log("Setting value for '" + key + "' to: " + deadlineCloudConfiguration[key], scriptFileSettingsName, LOG_LEVEL.DEBUG);
        value = deadlineCloudConfiguration[key];
        return value;

    }

    function fillConfiguration() {
        /**
        * Fill global object with data from ini file. This way we only need to look for the .ini file once.
        */
        var filename;
        filename = getIniFile();
        iniFile = File(filename);
        if(iniFile.exists)
        {
            iniFile.open('r');
            var jsonString = iniFile.read();
            iniFile.close();
            deadlineCloudConfiguration = eval("(" + jsonString + ")");
        }
    }

    function saveIniSettings() {
        /**
        * Save all keys and their values from the Deadline Cloud configuration object to the ini file.
        */
        var outputPath;
        var jsonData = JSON.stringify(deadlineCloudConfiguration, null, 4);
        outputPath = getIniFile();
        outputFile = File(outputPath);
        outputFile.open('w');
        outputFile.write(jsonData);
        outputFile.close();
        logger.log("Writing project specific settings to json file.", scriptFileSettingsName, LOG_LEVEL.DEBUG);        
    }

    return {
        "getIniSetting": getIniSetting,
        "saveIniSettings": saveIniSettings
    }
}

dcSettings = __generateSettings();