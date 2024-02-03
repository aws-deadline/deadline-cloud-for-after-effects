#include "utils/Logger.jsx"

// Setup logger
var _scriptFileName = "OpenAeSubmitter.jsx";
var logFileName =  "aftereffects" + ".log";
var logDirectoryPath = dcUtil.getUserDirectory() + "/.deadline/logs/submitters/";
logDirectoryPath = dcUtil.normPath(logDirectoryPath)

var logger = Logger(logFileName, logDirectoryPath);
logger.log("Running driver file", _scriptFileName, LOG_LEVEL.INFO);

#include "Imports.jsx"

// Variables for runChecks
var safeToRunScript = true;
var version = app.version.substring(0, app.version.indexOf('x'));

// Global scoped progress window.
var dcLoadingWindow; 

if(dcAeUtil.runChecks())
{
    #include "utils/Settings.jsx"
    #include "UI/AESubmitterUI.jsx"
    #include "UI/SubmitLayersWindow.jsx"
    initData();
    dcLoadingWindow.update();
    dcLoadingWindow.close();
    dcSubmitterUi.createUI();
}
// INIT DATA TO FILL PROPERTIES
function initData(){
    /**
    * Initializes data on startup. Performs system calls to query for
    *  relevant deadline configuration information.
    */
    dcLoadingWindow = dcInitData.loadingUIWindow();
    dcLoadingWindow.children[1].value = (1 * 100) / (5 + 1);
    dcLoadingWindow.children[0].text = "Loading Deadline Config in progress.";
    dcLoadingWindow.update();
    dcInitData.initDeadlineConfig();
    dcLoadingWindow.children[1].value = (2 * 100) / (5 + 1);
    dcLoadingWindow.children[0].text = "Loading Deadline Farms in progress.";
    dcLoadingWindow.update();
    dcInitData.initDeadlineFarmData();
    dcLoadingWindow.children[1].value = (3 * 100) / (5 + 1);
    dcLoadingWindow.children[0].text = "Loading Deadline Profiles in progress.";
    dcLoadingWindow.update();
    dcInitData.initDeadlineProfiles();
    dcLoadingWindow.children[1].value = (4 * 100) / (5 + 1);
    dcLoadingWindow.children[0].text = "Loading FootageItems in progress.";
    dcLoadingWindow.update();
    dcInitData.initAutoDetectFootageItems();
    dcLoadingWindow.children[1].value = (5 * 100) / (5 + 1);
    dcLoadingWindow.children[0].text = "Loading OutputDirectories in progress.";
    dcLoadingWindow.update();
    dcInitData.initAutoDetectOutputDirectories();
}