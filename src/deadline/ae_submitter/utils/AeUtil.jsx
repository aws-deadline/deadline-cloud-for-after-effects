function __generateAeUtil() {

    function checkForIllegalCharCompName() {
        /*
        * Ensure no illegal chars are used in filePath/Name of comp name, 
        * and trim illegal characters.
        * Returns the new comp name without illegal characters
        */
        var results = [];

        var compItem;
        for (i = 1; i <= app.project.renderQueue.numItems; ++i) {
            if (app.project.renderQueue.item(i).status != RQItemStatus.QUEUED)
                continue;

            compItem = app.project.renderQueue.item(i).comp;
            if (compItem.name.length != (dcUtil.trimIllegalChars(compItem.name)).length) {
                results.push(compItem.name);

            }
        }
        return results;
    }

    function checkForWhiteSpaceCompName() {
        /*
        * Ensure no whitespace at start/end of comp name, and trim whitespace
        * Returns new comp name without whitespace
        */
        var results = [];

        var compItem;
        for (i = 1; i <= app.project.renderQueue.numItems; ++i) {
            // if (app.project.renderQueue.item(i).status != RQItemStatus.QUEUED)
            //     continue;

            compItem = app.project.renderQueue.item(i).comp;
            if (compItem.name.length != (dcUtil.trim(compItem.name)).length) {
                results.push(compItem.name);
            }
        }
        return results;
    }

    function getQueuedCompCount() {
        /*
        * Returns amount of items in the renderQueue
        */

        var count = 0;
        for (i = 1; i <= app.project.renderQueue.numItems; ++i) {
            if (app.project.renderQueue.item(i).status == RQItemStatus.QUEUED)
                count = count + 1;
        }
        return count;
    }

    function containsDuplicateComps() {
        /*
        * Ensure that no 2 queued comps in the Render Queue have the same name
        * Returns false if none found, returns true if duplicate name found
        */
        var duplicateFound = false;

        var compItem1;
        var compItem2;
        for (i = 1; i < app.project.renderQueue.numItems; ++i) {
            if (app.project.renderQueue.item(i).status != RQItemStatus.QUEUED)
                continue;
            compItem1 = app.project.renderQueue.item(i).comp;
            for (j = i + 1; j <= app.project.renderQueue.numItems; ++j) {
                
                if (app.project.renderQueue.item(j).status != RQItemStatus.QUEUED)
                    continue;

                compItem2 = app.project.renderQueue.item(j).comp;
                if (compItem1.name == compItem2.name) {
                    return true;
                }
            }
        }

        return duplicateFound;
    }

    function isLocal(path) {
        /** 
        * Checks if the given path is local or not => Function needs to be changed to work on other OS than windows
        * Possibly fix issue with hashing, assuming file is local
        * Returns false if path is not local, returns true if path is local
        * @param {string} path - Directory for file that needs to be checked
        */
        if (path.length >= 2) {
            var drive = path.substring(0, 1).toLowerCase();
            if (drive == "c" || drive == "d" || drive == "e")
                return true;
        }

        return false;
    }

    function checkCompOutputs(compIndex) {
        /**
        * Checks if path of the available comp items. 
        * Depending on if it is found or if it is local return warning string
        * @param {int} compIndex - Index of the specified comp in the list of renderQueue items
        */
        var outputWarnings = "";
        var compName = app.project.renderQueue.item(compIndex).comp.name;
        // Check output module(s)
        for (j = 1; j <= app.project.renderQueue.item(compIndex).numOutputModules; ++j) {
            var outputPath = app.project.renderQueue.item(compIndex).outputModule(j).file.fsName;

            var outputFile = File(outputPath);
            var outputFolder = Folder(outputFile.path);
            if (!outputFolder.exists)
                outputWarnings += "\n" + compName + ": The path for the output file \"" + outputPath + "\" does not exist.\n";
            else if (isLocal(outputPath))
                outputWarnings += "\n" + compName + ": The output file \"" + outputPath + "\" is local.\n";
        }

        return outputWarnings;
    }

    function runChecks()
    /**************** CHECKS ****************/
    {
        /** 
        * Functionality previously available in submitter. 
        * Produces warnings to tell user to do certain things before proceeding.
        */

        if(safeToRunScript)
        {
            runDeadlineVersionCheck();
        }
        
        // Check 1 - Ensure we are running at least version 8 (CS3).
        if (safeToRunScript) {
            while (version.indexOf('.') != version.lastIndexOf('.'))
                version = version.substring(0, version.lastIndexOf('.'));

            if (parseInt(version) < 8)
                safeToRunScript = false;

            if (!safeToRunScript)
                alert("This script only supports After Effects CS3 and later.");
        }

        // Check 2 - Ensure a project is open.
        if (safeToRunScript) {
            safeToRunScript = app.project != null;
            if (!app.project)
                alert("A project must be open to run this script.");
        }

        // Check 3 - Ensure the project has been saved in the past.
        if (safeToRunScript) {
            if (!app.project.file) {
                alert("This project must be saved before running this script.");
                safeToRunScript = false;
            }
        }

        // Check 4 - Ensure that at least 1 comp is queued, or that at least 1 layer is selected.
        if (safeToRunScript) {
            var queuedCount = getQueuedCompCount();
            var activeComp = app.project.activeItem;
            if(activeComp == null)
            {
                safeToRunScript = false;
                alert("You do not have any active composition.");
            }
        }

        // Check 5 - Ensure that no 2 comps in the Render Queue have the same name.
        if (safeToRunScript) {

            safeToRunScript = !containsDuplicateComps();
            if (!safeToRunScript)
                alert("At least 2 of your items in the Render Queue have the same name. Please ensure that all of your items have unique names.");
        }

        // Check 6 - Ensure no comp names contain whitespace at start or end of comp name.
        if (safeToRunScript) {
            var compNames = checkForWhiteSpaceCompName();
            if (compNames.length > 0)
            {
                safeToRunScript = false;
                alert("The following comp names contain starting/trailing whitespace characters. Ensure whitespace is removed prior to job submission:\n" + compNames.join());
            }
        }

        // Check 7 - Ensure no comp names contain any illegal file path characters.
        if (safeToRunScript) {
            var compNames = checkForIllegalCharCompName();
            if (compNames.length > 0)
            {
                safeToRunScript = false;
                alert("The following comp names contain illegal characters in their name. Ensure any invalid file path characters are removed prior to job submission:\n\n" + compNames.join());
            }
        }
        return safeToRunScript;
    }

    function runDeadlineVersionCheck() {
        var currentDeadlineVersion = dcDeadlineCommands.deadlineVersion();
        if(currentDeadlineVersion.length == 0)
        {
            safeToRunScript = false;
            alert("'deadline' is not recognized as an internal or external command, operable program or batch file.");
            return;
        }
        var errMsg = "The available Deadline version " +  currentDeadlineVersion[0] + "." + currentDeadlineVersion[1] + "." + currentDeadlineVersion[2] + " is not above target version " + __DEADLINE_CLOUD_MINIMUM_VERSION__[0] + "." + __DEADLINE_CLOUD_MINIMUM_VERSION__[1] + "." + __DEADLINE_CLOUD_MINIMUM_VERSION__[2];
        if (currentDeadlineVersion[0] < __DEADLINE_CLOUD_MINIMUM_VERSION__[0]) {
            safeToRunScript = false;
            alert(errMsg);
            return;
        }
        if (currentDeadlineVersion[1] < __DEADLINE_CLOUD_MINIMUM_VERSION__[1]) {
            safeToRunScript = false;
            alert(errMsg);
            return;
        }
        if (currentDeadlineVersion[2] < __DEADLINE_CLOUD_MINIMUM_VERSION__[2]) {
            safeToRunScript = false;
            alert(errMsg);
            return;
        }
    }

    return {
        "checkForIllegalCharCompName": checkForIllegalCharCompName,
        "checkForWhiteSpaceCompName": checkForWhiteSpaceCompName,
        "getQueuedCompCount": getQueuedCompCount,
        "containsDuplicateComps": containsDuplicateComps,
        "isLocal": isLocal,
        "checkCompOutputs": checkCompOutputs,
        "runChecks": runChecks
    }
}

dcAeUtil = __generateAeUtil();