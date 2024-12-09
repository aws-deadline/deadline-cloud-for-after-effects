#include "Utils.jsx"

var LOG_LEVEL = {
    ERROR: 1,
    WARNING: 2,
    INFO: 3,
    DEBUG: 4
};

var LOG_LEVEL_MAP = dcUtil.invertObject(LOG_LEVEL)

// Global log level
// Set the desired logging level
var CURRENT_LOG_LEVEL = LOG_LEVEL.DEBUG;

var _DC_LOGGER_DEFAULT_MAX_BYTES = 10 * 1024 * 1024 // 10 MiB
var _DC_LOGGER_DEFAULT_BACKUP_COUNT = 5

function Logger(logFileName, logDirectoryPath, maxBytes, backupCount) {
    /**
     * Basic logger implementation with file rotation based on byte size.
     * 
     * Rollover implementation is based on Python's RotatingFileHandler for behavioural compatibility
     * with the Python-based submitters.
     *
     * The system will save old log files by appending the extensions ‘.1’, ‘.2’ etc., to the filename. 
     * For example, with a backupCount of 5 and a base file name of app.log, you would get 
     * app.log, app.log.1, app.log.2, up to app.log.5. The file being written to is always app.log. 
     * When this file is filled, it is closed and renamed to app.log.1, 
     * and if files app.log.1, app.log.2, etc. exist, then they are renamed to app.log.2, app.log.3 etc. respectively.
     * 
     * If backupCount or maxBytes are zero or less, rollover behaviour is disabled.
     * 
     * @param {string} logFileName - Log file name.
     * @param {string} logDirectoryPath - Log directory path.
     * @param {int} maxBytes - Number of bytes before a file rotation is performed.
     * @param {int} backupCount - Number of file rotations to keep.
     */

    var logFilePath;
    var logFile;

    function init() {
        maxBytes = maxBytes || _DC_LOGGER_DEFAULT_MAX_BYTES;
        backupCount = backupCount || _DC_LOGGER_DEFAULT_BACKUP_COUNT;
        logDirectoryPath = logDirectoryPath || dcUtil.getUserDirectory() + "/.deadline/logs/submitters";
        logDirectoryPath = dcUtil.normPath(logDirectoryPath);
        var folderObject = new Folder(logDirectoryPath);
        if (!folderObject.exists) {
            folderObject.create();
        }
        logFilePath = logDirectoryPath + "/" + logFileName;
        logFilePath = dcUtil.normPath(logFilePath);
        logFile = new File(logFilePath);
        _fileRotate();
    }
    init();

    function _fileRotate() {
        /* Performs a file rotation if the size of the active log file is higher
         * than maxBytes.
         * 
         * If maxBytes is zero or less, no file rotation will ever occur.
         */
        if (maxBytes <= 0) { // If maxBytes is invalid, don't rotate.
            return;
        }
        if (logFile.length < maxBytes) {
            return;
        }
        doRollover();
    }

    function doRollover() {
        /* Perform a file rollover. See above for the implementation details. */
        if (backupCount <= 0) {
            return;
        }
        // Rollover older files first
        var rolloverFile;
        for (var i = backupCount - 1; i > 0; i--) { // Last file does not need rollover, it is allowed to get overwritten.
            rolloverFile = new File(logDirectoryPath + logFileName + "." + i)
            if (!rolloverFile.exists) {
                continue;
            }
            var j = i + 1;
            var rolloverTargetPath = logDirectoryPath + logFileName + "." + j
            rolloverFile.copy(rolloverTargetPath);
        }
        // Rollover active file
        logFile.copy(logDirectoryPath + logFileName + "." + 1)
        logFile.open("w"); // Erase contents of active log file
        logFile.close();
    }

    function log(msg, src_module, level) {
        /**
         * Create logger that based on logging level writes information to logging file.
         * @param {string} msg - Information that needs to be written to log file.
         * @param {string} src_module - Name of the file where the logging function is being called.
         * @param {int} level - The value for the log level assigned to the message.
         */
        src_module = src_module || "undef";
        if (level <= CURRENT_LOG_LEVEL) {

            var levelName = LOG_LEVEL_MAP[level];
            // Check the length of the string
            var currentLength = levelName.length;

            // If the length is less than the target length, pad with spaces
            if (currentLength < 8) {
                var spacesToAdd = 8 - currentLength;
                for (var i = 0; i < spacesToAdd; i++) {
                    levelName += " ";
                }
            }
            var logMessage = getCurrentTimeAsStr() + " - " + "[" + levelName + "] " + " " + src_module + ": " + msg;

            logFile.open("a");
            logFile.writeln(logMessage);
            logFile.close();
            _fileRotate();
        }
    }

    function debug(msg, src_module) {
        log(msg, src_module, LOG_LEVEL.DEBUG);
    }

    function info(msg, src_module) {
        log(msg, src_module, LOG_LEVEL.INFO);
    }

    function warning(msg, src_module) {
        log(msg, src_module, LOG_LEVEL.WARNING);
    }

    function error(msg, src_module) {
        log(msg, src_module, LOG_LEVEL.ERROR);
    }

    return {
        "debug": debug,
        "info": info,
        "warning": warning,
        "warn": warning,
        "error": error,
        "err": error,
        "log": log,
        "doRollover": doRollover
    }
}

function getCurrentTimeAsStr() {
    var date = new Date();
    var year = date.getFullYear();
    // Zero pad all integers to a length of 2
    var month = ("0" + (date.getMonth() + 1)).slice(-2); // Months are zero-based
    var day = ("0" + date.getDate()).slice(-2);

    var currentDate = year + "-" + month + "-" + day;
    var hours = ("0" + date.getHours()).slice(-2);
    var minutes = ("0" + date.getMinutes()).slice(-2);
    var seconds = ("0" + date.getSeconds()).slice(-2);
    var currentTime = hours + ":" + minutes + ":" + seconds;
    var logDateTime = currentDate + " " + currentTime;
    return logDateTime;
}


// Setup logger
var _scriptFileName = "OpenAeSubmitter.jsx";
var logFileName = "aftereffects.log";
var logDirectoryPath = dcUtil.getUserDirectory() + "/.deadline/logs/submitters/";
var logNormDirectoryPath = dcUtil.normPath(logDirectoryPath)
var logger = Logger(logFileName, logNormDirectoryPath);