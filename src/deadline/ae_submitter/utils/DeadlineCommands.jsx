function __generateDeadlineCommands() {

    // Script name used for logging
    var _scriptName = "DeadlineCommands.jsx";

    function login(profileName, deadlineMonitorPath) {
        var cmd = "deadline auth login";
        logger.debug("System call: " + cmd, _scriptName);
        var loginOutput = dcUtil.wrappedCallSystem(cmd);
        logger.debug(loginOutput, _scriptName)
        var loginParsedData = dcUtil.parseErrorData(loginOutput, "Login");

        logger.debug(loginParsedData.message + " " + loginParsedData.result, _scriptName);
        return {
            "return_code": loginParsedData.return_code,
            "message": loginParsedData.message,
            "result": loginParsedData.result
        }
    }
    
    function logout(profileName, deadlineMonitorPath) {
        var cmd = "deadline auth logout";
        logger.debug("System call: " + cmd, _scriptName);
        var logoutOutput = dcUtil.wrappedCallSystem(cmd);
        logger.debug(logoutOutput, _scriptName)
        var logoutParsedData = dcUtil.parseErrorData(logoutOutput, "Logout");

        logger.debug(logoutParsedData.message + " " + logoutParsedData.result, _scriptName);
        return {
            "return_code": logoutParsedData.return_code,
            "message": logoutParsedData.message,
            "result": logoutParsedData.result
        }
    }

    function listFarm(){
        logger.debug("System call: 'deadline farm list'", _scriptName);
        var listFarmOutput = dcUtil.wrappedCallSystem("deadline farm list");
        logger.debug(listFarmOutput, _scriptName);
        return dcUtil.parseListData(listFarmOutput);
    }

    function listQueue(farmID)
    {
        var cmdListQueue = "deadline queue list --farm-id " + farmID ;
        logger.debug("System call: " + cmdListQueue, _scriptName);
        var listQueueOutput = dcUtil.wrappedCallSystem(cmdListQueue);
        logger.debug(listQueueOutput, _scriptName);
        return dcUtil.parseListData(listQueueOutput);
    }

    function listProfiles()
    {
        logger.debug("System call: 'aws configure list-profiles'", _scriptName);
        var profilesOutput = dcUtil.wrappedCallSystem("aws configure list-profiles");
        logger.debug(profilesOutput, _scriptName)
        var profileList = dcUtil.getAWSProfileList(profilesOutput);
        return profileList;
    }

    function credentialStatus()
    {
        var cmdCreds = "deadline auth status";
        logger.debug("System call: " + cmdCreds, _scriptName);
        var credsOutput = dcUtil.wrappedCallSystem(cmdCreds);
        logger.debug(credsOutput, _scriptName);
        var credsParsedDataObject = dcUtil.parseCredsData(credsOutput);
        return {
            "source": credsParsedDataObject.source,
            "status": credsParsedDataObject.status,
            "api": credsParsedDataObject.api
        };
    }

    function apiProfileCheck(profileName)
    {
        var cmdAPI = "deadline farm list";
        logger.debug("System call: " + cmdAPI, _scriptName);
        var APIOutput = dcUtil.wrappedCallSystem(cmdAPI);
        logger.debug(APIOutput, _scriptName);
        var APIParsedDataObject = dcUtil.parseErrorData(APIOutput, "API Check");
        logger.debug(APIParsedDataObject.message + " " + APIParsedDataObject.result, _scriptName);
        return {
            "return_code": APIParsedDataObject.return_code,
            "message": APIParsedDataObject.message,
            "result": APIParsedDataObject.result
        }
    }

    function loginCheck()
    {
        logger.debug("System call: 'deadline farm list'", _scriptName);
        var cmdAPI = "deadline farm list";
        var APIOutput = dcUtil.wrappedCallSystem(cmdAPI);
        logger.debug(APIOutput, _scriptName);
        var APIParsedDataObject = dcUtil.parseErrorData(APIOutput, "Login Check");
        logger.debug(APIParsedDataObject.message + " " + APIParsedDataObject.result, _scriptName);
        return {
            "return_code": APIParsedDataObject.return_code,
            "message": APIParsedDataObject.message,
            "result": APIParsedDataObject.result
        }
    }
    
    function deadlineVersion()
    {
        logger.debug("System call: 'deadline --version'", _scriptName);
        var cmdVersion = "deadline --version"
        var versionOutput = dcUtil.wrappedCallSystem(cmdVersion);
        logger.debug(versionOutput, _scriptName);
        return dcUtil.parseVersionData(versionOutput);
    }

    return {
        "login": login,
        "logout": logout,
        "listFarm": listFarm,
        "listQueue": listQueue,
        "listProfiles": listProfiles,
        "apiProfileCheck": apiProfileCheck,
        "loginCheck": loginCheck,
        "deadlineVersion": deadlineVersion,
        "credentialStatus": credentialStatus
    }
}

dcDeadlineCommands = __generateDeadlineCommands();