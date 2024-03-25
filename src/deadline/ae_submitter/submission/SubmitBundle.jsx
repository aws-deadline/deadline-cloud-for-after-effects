var farmID = "";
var queueID = "";

var _submitSubmitBundle = "SubmitBundle.jsx";

function createSubmission(jobTemplate, jobParameters, jobAssetReferences, job_history_dir, fileName) {
    // Force save the file, because certain settings are not applied when not saved.
    app.project.save();

    var jobHistoryFolderDirectory = createJobHistoryFolders(job_history_dir, fileName);
    logger.debug(jobHistoryFolderDirectory.fsName, _submitSubmitBundle);
    createBundle(jobHistoryFolderDirectory.fsName, jobTemplate, jobParameters, jobAssetReferences);
    var submissionResult = submitBundle(jobHistoryFolderDirectory.fsName);
    return submissionResult;
}

function createBundle(target_directory, jobTemplate, jobParameters, jobAssetReferences) {
    /**
     * Create necessary files and folders for the job bundle
     * @param {string} target_directory: Bundle files in provided directory
     */
    var templateOutDir = dcUtil.normPath(target_directory + "/template.json");
    var paramOutDir = dcUtil.normPath(target_directory + "/parameter_values.json");
    var assetRefOutDir = dcUtil.normPath(target_directory + "/asset_references.json");
    writeJSONFile(jobTemplate, templateOutDir);
    writeJSONFile(jobParameters, paramOutDir);
    writeJSONFile(jobAssetReferences, assetRefOutDir);
}

function writeJSONFile(jsonData, filePath) {
    /**
     * @param {object} jsonData: Object containing data from UI that needs to overwrite existing parameter_value.json data
     * @param {string} filePath: Temporary files/folder location
     */
    var file = File(filePath);
    file.open('w');
    file.write(JSON.stringify(jsonData, null, 4));
    file.close();
}

function submitBundle(bundle_dir) {
    /**
     * Submit job bundle to Deadline Cloud through commandline call.
     * @param {string} bundle_dir: Template files/folder location
     */
    farmID = dcProperties.config.farm_id.get();
    queueID = dcProperties.config.queue_id.get();

    var command = 'deadline bundle submit \"' + bundle_dir + '\" --farm-id ' + farmID + ' --queue-id ' + queueID + ' --yes ';
    logger.debug("Calling command: " + command, _submitSubmitBundle);

    var commandOutput = dcUtil.wrappedCallSystem(command);
    logger.debug("Command Output: " + commandOutput, _submitSubmitBundle);
    // Parsing output
    var submitParsedData = dcUtil.parseErrorData(commandOutput, "Submit");
    logger.debug(submitParsedData.message + " " + submitParsedData.result, _submitSubmitBundle);
    return submitParsedData.return_code == 0
}

function deleteDirectory(target_dir) {
    /**
     * Checks if specific folder and files in a directory exist, if so deletes them.
     * @param {stromg} target_dir: Temporary files/folder location
     */

    var destinationFolder = new Folder(target_dir);
    var fileList = destinationFolder.getFiles();
    for (var i = 0; i < fileList.length; i++) {
        if (fileList[i].exists) {
            fileList[i].remove();
        }
    }
    if (destinationFolder.exists) {
        destinationFolder.remove();
        logger.info("Deleted given temp directory folder.", _submitSubmitBundle);
    }
}

function createJobHistoryFolders(job_history_dir, fileName) {
    /**
     * Creates folders based on given directory. If folders exists do not exist, create the;.
     * Returns the directory string.
     */
    var partialDir = dcUtil.getPartialExportDir(job_history_dir);
    var dir = dcUtil.getPath(partialDir, fileName);
    return dir;
}

function copyFiles(source, destination) {
    /**
     * Will copy template.yaml and parameter_values.json from target location into temporary location.
     * @param {string} source: Source directory path
     * @param {string} destination: Destination directory path for created temp folder and files.
     */

    var sourceFolder = new Folder(source);
    var destinationFolder = new Folder(destination);

    // Check if the source folder exists
    if (!sourceFolder.exists) {
        alert("Source folder does not exist!");
    }

    // Create the destination folder if it doesn't exist
    if (!destinationFolder.exists) {
        destinationFolder.create();
    }

    // Get all files and subfolders in the source folder
    var files = sourceFolder.getFiles();
    // Loop through files and folders
    for (var i = 0; i < files.length; i++) {
        if (files[i] instanceof File) {
            // Copy files
            var _filePath = dcUtil.normPath(destination + "/" + files[i].name);
            files[i].copy(_filePath);
        } else if (files[i] instanceof Folder) {
            // Recursively copy subfolders
            copyFiles(files[i].fsName, destinationFolder.fsName + "/" + files[i].name);
        }
    }
}