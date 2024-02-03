var LogLevel = {
    ERROR: 1,
    WARNING: 2,
    INFO: 3,
    DEBUG: 4
};

var LogLevelMap = invertObject(LogLevel)

function Logger(moduleName, logFileName, logDirectoryPath, logLevel) {
    // Setting default values
    moduleName = moduleName || "undef"
    logFileName = logFileName || "ae_adaptor.log";
    logDirectoryPath = logDirectoryPath || $.getenv("USERPROFILE") + "\\.deadline\\logs\\aftereffects\\";
    logLevel = logLevel || LogLevel.INFO

    var folderObject = new Folder(logDirectoryPath);
    if (!folderObject.exists) {
        folderObject.create();
    }

    var logFile = File(logDirectoryPath + logFileName);

    function setLogLevel(newLogLevel){
        logLevel = newLogLevel
    }

    function log(msg, level) {
        /**
         * Create logger that based on logging level writes information to logging file.
         * @param {string} msg - Information that needs to be written to log file.
         * @param {int} level - The value for the log level assigned to the message.
         */

        if (level <= logLevel) {

            var levelName = LogLevelMap[level]
            var logMessage = "[" + getCurrentTimeAsStr() + "]" + " [" + moduleName + "] " + "[" + levelName + "] " + msg;

            logFile.open("a");
            logFile.writeln(logMessage);
            logFile.close();
        }
    }

    function debug(msg) {
        log(msg, LogLevel.DEBUG);
    }

    function info(msg) {
        log(msg, LogLevel.INFO);
    }

    function warning(msg) {
        log(msg, LogLevel.WARNING);
    }

    function error(msg) {
        log(msg, LogLevel.ERROR);
    }

    return {
        "debug": debug,
        "info": info,
        "warning": warning,
        "warn": warning,
        "error": error,
        "err": error,
        "_log": log,
        "setLogLevel": setLogLevel,
        "setLevel": setLogLevel
    }
}

function getCurrentTimeAsStr() {
    var date = new Date();
    var currentDate = date.getFullYear().toString() + "-" + (date.getMonth() + 1).toString() + "-" + date.getDate().toString();
    var currentTime = date.toLocaleTimeString();
    var logDateTime = currentDate + " " + currentTime;
    return logDateTime
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