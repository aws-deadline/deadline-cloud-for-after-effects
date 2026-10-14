// Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
// DeadlineCloudAutoSubmit.jsx
// Place in: Scripts/Startup/ folder of After Effects
//
// On each AE launch, checks for a config file.
// If found, opens the project, populates settings, calls SubmitSelection,
// writes a structured result file, and quits.
// If config is missing, does nothing (normal AE usage).

(function () {
    // The driver's real work runs inside main(), deferred onto AE's idle loop by the
    // scheduling tail at the bottom. Running heavy submitter calls (eval of the
    // submitter, SubmitSelection) directly from a Startup script races AE's init and,
    // on a cold launch, AE throws "internal verification failure {no current context}"
    // — the app has not yet established a project/UI context. scheduleTask fires only
    // after launch completes, when the context exists.
    function main() {
        // Any uncaught throw would otherwise leave no result and no .done marker, and
        // the harness would retry a deterministic failure as a timeout.
        try {
            mainBody();
        } catch (e) {
            if (!$.global.__deadlineDriverSignalled && $.global.__deadlineDriverFail) {
                $.global.__deadlineDriverFail("Uncaught driver error: " + e.message + " (line " + e.line + ")");
            }
        }
    }

    function mainBody() {
    $.global.__deadlineDriverSignalled = false;
    // The .deadline dir lives under the user's home on every platform (the real
    // deadline CLI uses ~/.deadline). On Windows that is %USERPROFILE%\.deadline,
    // which is where the Python harness (config.get_config_path) writes the config.
    // Folder.userData resolves to %APPDATA% (…\AppData\Roaming), a *different* dir,
    // so the driver never found the config and silently returned before running.
    var CONFIG_PATH = "~/.deadline/headless_submit_config.json";
    if ($.os.indexOf("Windows") !== -1) {
        CONFIG_PATH = $.getenv("USERPROFILE") + "\\.deadline\\headless_submit_config.json";
    }

    var RESULT_PATH = "/tmp/deadline_headless_result.json";
    if ($.os.indexOf("Windows") !== -1) {
        RESULT_PATH = Folder.temp.fsName + "\\deadline_headless_result.json";
    }

    var configFile = new File(CONFIG_PATH);
    if (!configFile.exists) {
        return;  // normal AE usage: driver is inert without the headless config
    }

    // --- Headless-mode breadcrumb: proves the Startup driver reached execution
    //     (vs. being blocked by a crash dialog) and records the live AE version.
    //     Only written in test mode, so normal AE launches are untouched.
    try {
        var _bc = new File("/tmp/deadline_driver_started.txt");
        if ($.os.indexOf("Windows") !== -1) _bc = new File(Folder.temp.fsName + "\\deadline_driver_started.txt");
        _bc.encoding = "UTF-8";
        _bc.open("w");
        _bc.write("started=" + new Date().toString() + "\nappVersion=" + app.version + "\n");
        _bc.close();
    } catch (_e) {}

    // --- Timing ---
    var startTime = new Date().getTime();
    $.global.__deadlineDriverFail = function (msg) {
        writeResult("failure", msg, null, null);
    };

    // --- Helper: escape string for JSON ---
    function jsonEscape(str) {
        if (!str) return "";
        return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    }

    // --- Helper: write result file (full version with submit output) ---
    function writeResultFull(status, error, bundlePath, rqItems, submitOutput, submitExitCode) {
        var duration = new Date().getTime() - startTime;
        var result = '{\n';
        result += '  "status": "' + status + '",\n';
        result += '  "error": ' + (error ? '"' + jsonEscape(error) + '"' : 'null') + ',\n';
        result += '  "bundlePath": ' + (bundlePath ? '"' + bundlePath.replace(/\\/g, '/') + '"' : 'null') + ',\n';
        result += '  "duration_ms": ' + duration + ',\n';
        result += '  "submitOutput": ' + (submitOutput ? '"' + jsonEscape(submitOutput) + '"' : 'null') + ',\n';
        result += '  "submitExitCode": ' + (submitExitCode !== null && submitExitCode !== undefined ? submitExitCode : 'null') + ',\n';
        result += '  "alerts": [';
        var al = (typeof alerts !== "undefined" && alerts) ? alerts : [];
        for (var ai = 0; ai < al.length; ai++) {
            result += (ai > 0 ? ', ' : '') + '"' + jsonEscape(al[ai]) + '"';
        }
        result += '],\n';
        result += '  "renderQueueItems": [';
        if (rqItems && rqItems.length > 0) {
            for (var i = 0; i < rqItems.length; i++) {
                if (i > 0) result += ',';
                result += '\n    ' + rqItems[i];
            }
            result += '\n  ';
        }
        result += ']\n}';
        var f = new File(RESULT_PATH);
        f.encoding = "UTF-8";
        f.open("w");
        f.write(result);
        f.close();
    }

    // --- Shorthand for early failures (no submit output) ---
    // Also signals completion. Without the .done marker the harness would wait out
    // the full drive timeout and then retry a deterministic failure as a flake.
    function writeResult(status, error, bundlePath, rqItems) {
        closeProjectQuietly();
        writeResultFull(status, error, bundlePath, rqItems, null, null);
        signalDone();
    }

    function signalDone() {
        $.global.__deadlineDriverSignalled = true;
        try {
            var doneFile = new File(CONFIG_PATH + ".done");
            if (doneFile.exists) doneFile.remove();
            if (configFile.exists) configFile.rename(configFile.name + ".done");
        } catch (e) {}
    }

    // Messages the submitter tried to show via adcAlert (stubbed below). They are the
    // submitter's validation failures, so they belong in a failure result.
    var alerts = [];

    // Recursively delete a folder. Used to clear the previous case's bundle.
    function removeTree(folder) {
        if (!folder.exists) return;
        var items = folder.getFiles();
        for (var ri = 0; ri < items.length; ri++) {
            if (items[ri] instanceof Folder) removeTree(items[ri]);
            else items[ri].remove();
        }
        folder.remove();
    }

    // --- Discard in-memory project changes so quit never prompts to save ---
    // SubmitSelection dirties the open project. Because the harness force-quits AE
    // the moment it sees the completion marker, a lingering "Save changes?" dialog
    // (and the not-cleanly-closed state it leaves behind, which makes the *next*
    // launch throw a Startup-script error) would otherwise appear. We close without
    // saving: the bundle is already on disk. (The .aep may still have been saved
    // earlier: the driver saves a project that opens dirty, and SubmitSelection saves
    // it again after the settings are applied.)
    function closeProjectQuietly() {
        try {
            if (app.project && app.project.file) {
                app.project.close(CloseOptions.DO_NOT_SAVE_CHANGES);
            }
        } catch (e) {}
    }

    // --- Read config ---
    configFile.encoding = "UTF-8";
    configFile.open("r");
    var configText = configFile.read();
    configFile.close();

    var config;
    try {
        config = eval("(" + configText + ")");
    } catch (e) {
        writeResult("failure", "Config parse error: " + e.message, null, null);
        return;
    }

    // --- Validate ---
    if (!config.projectFile) {
        writeResult("failure", "projectFile is required in config", null, null);
        return;
    }

    var projFile = new File(config.projectFile);
    if (!projFile.exists) {
        writeResult("failure", "Project not found: " + config.projectFile, null, null);
        return;
    }

    // --- Open project ---
    app.open(projFile);
    if (!app.project || !app.project.file) {
        writeResult("failure", "Failed to open project", null, null);
        return;
    }

    if (app.project.dirty) {
        app.project.save();
    }

    // --- Load submitter ---
    // Prefer the exact path resolved by the harness; otherwise search the
    // ScriptUI Panels folder for DeadlineCloudSubmitter*.jsx (the installed name
    // may be "DeadlineCloudSubmitter.jsx" or "DeadlineCloudSubmitter(User).jsx").
    var submitterFile = null;
    if (config.submitterPath) {
        var explicit = new File(config.submitterPath);
        if (explicit.exists) submitterFile = explicit;
    }
    if (!submitterFile) {
        var panelsPath;
        if ($.os.indexOf("Windows") === -1) {
            panelsPath = "~/Library/Preferences/Adobe/After Effects/"
                + app.version.substring(0, 4) + "/Scripts/ScriptUI Panels";
        } else {
            panelsPath = Folder.userData.fsName + "\\Adobe\\After Effects\\"
                + app.version.substring(0, 4) + "\\Scripts\\ScriptUI Panels";
        }
        var panels = new Folder(panelsPath);
        var candidates = [
            new File(panels.fsName + "/DeadlineCloudSubmitter.jsx"),
            new File(panels.fsName + "/DeadlineCloudSubmitter(User).jsx")
        ];
        for (var ci = 0; ci < candidates.length; ci++) {
            if (candidates[ci].exists) { submitterFile = candidates[ci]; break; }
        }
        if (!submitterFile && panels.exists) {
            var found = panels.getFiles("DeadlineCloudSubmitter*.jsx");
            if (found && found.length > 0) submitterFile = found[0];
        }
    }

    if (!submitterFile || !submitterFile.exists) {
        writeResult("failure", "Submitter not found (config.submitterPath or ScriptUI Panels/DeadlineCloudSubmitter*.jsx)", null, null);
        return;
    }

    submitterFile.encoding = "UTF-8";
    submitterFile.open("r");
    var submitterCode = submitterFile.read();
    submitterFile.close();

    // Strip UI section
    var uiBlockStart = submitterCode.indexOf("if (isSecurityPrefSet())");
    if (uiBlockStart > 0) {
        submitterCode = submitterCode.substring(0, uiBlockStart);
    }

    // --- Neutralize the submitter's gui-submit launcher (deterministic) ---
    // The submitter writes every bundle file to disk *before* it shells out to
    // `deadline bundle gui-submit` (which pops a Terminal window on macOS / a
    // console on Windows). In bundle-only mode Python owns submission, so that
    // launch is pure noise — and left running it spawns a Terminal window per
    // case that steals focus and can block the next headless launch. We rewrite
    // the launch expressions to no-ops before eval. This is deterministic, unlike
    // the runtime `system.callSystem` override below, which ExtendScript can
    // silently drop when reassigning a method on the host `system` object.
    submitterCode = submitterCode.replace(
        /output\s*=\s*system\.callSystem\('osascript[\s\S]*?> \/dev\/null'\);/,
        'output = ""; /* gui-submit launch neutralized by headless driver */'
    );
    submitterCode = submitterCode.replace(
        /system\.callSystem\(tempBatFile\.fsName\);/,
        '/* gui-submit launch neutralized by headless driver */'
    );

    // Set Folder.current for asset discovery
    var originalFolder = Folder.current;
    Folder.current = submitterFile.parent;

    try {
        eval(submitterCode);
    } catch (e) {
        Folder.current = originalFolder;
        writeResult("failure", "Error loading submitter: " + e.message + " (line " + e.line + ")", null, null);
        return;
    }

    // --- Suppress interactive popups ---
    updateList = function () {};
    confirm = function () { return true; };
    adcAlert = function (msg) { alerts.push(String(msg)); };

    // --- Force save ---
    if (app.project.dirty) {
        app.project.save();
    }

    // --- Determine render queue items ---
    var rqIndices = config.renderQueueIndices || [];
    if (rqIndices.length === 0) {
        for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
            if (app.project.renderQueue.item(i).status === RQItemStatus.QUEUED) {
                rqIndices.push(i);
            }
        }
    }

    if (rqIndices.length === 0) {
        writeResult("failure", "No QUEUED render queue items found", null, null);
        closeProjectQuietly();
        if (config.quitAfterSubmit) app.quit();
        return;
    }

    // --- Build selection ---
    var selection = [];
    var rqItemDescriptions = [];
    for (var i = 0; i < rqIndices.length; i++) {
        var rqi = app.project.renderQueue.item(rqIndices[i]);
        selection.push({ renderQueueIndex: rqIndices[i], compId: rqi.comp.id });

        var frameInfo = "";
        try {
            var startFrame = Number(Math.floor((rqi.comp.displayStartTime + rqi.timeSpanStart) * rqi.comp.frameRate)) + app.project.displayStartFrame;
            var numFrames = Number(Math.ceil(rqi.timeSpanDuration * rqi.comp.frameRate));
            var endFrame = startFrame + numFrames - 1;
            frameInfo = startFrame + "-" + endFrame;
        } catch (e) {
            frameInfo = "unknown";
        }

        var outputType = "unknown";
        try {
            var outFile = rqi.outputModule(1).file;
            if (outFile) {
                var ext = outFile.name.split(".").pop().toLowerCase();
                var imageExts = ["png", "jpg", "jpeg", "tif", "tiff", "exr", "psd", "tga", "bmp", "dpx"];
                outputType = imageExts.indexOf(ext) >= 0 ? "image_sequence" : "video";
            }
        } catch (e) {}

        rqItemDescriptions.push('{"index": ' + rqIndices[i] + ', "comp": "' + jsonEscape(rqi.comp.name) + '", "frames": "' + jsonEscape(String(frameInfo)) + '", "output": "' + outputType + '"}');
    }

    // --- Build UiSettingsState ---
    // The submitter persists its settings in the project's XMP, and SubmitSelection
    // saves the project, so every earlier run leaves its settings baked into the .aep.
    // Clear them first. Otherwise a case that sets nothing inherits an old case's
    // values, and a driver that stopped applying a setting would still "pass".
    try {
        var xmpMeta = new XMPMeta(app.project.xmpPacket);
        // Only the settings sub-struct: the parent also holds ignoreVersionWarning,
        // which SubmitSelection reads with no default and throws if it is missing.
        xmpMeta.deleteProperty(XMPConst.NS_XMP, "DeadlineCloudSubmitter/xmp:UiSettingsState");
        app.project.xmpPacket = xmpMeta.serialize();
    } catch (e) {
        writeResult("failure", "Could not clear sticky submitter settings: " + e.message, null, rqItemDescriptions);
        return;
    }

    var uiSettingsState = new UiSettingsState();

    // Render options are job-wide as of the breaking "Make render options job-wide"
    // change (#322): apply every setting directly to UiSettingsState. The former
    // per-render-queue-item API (dcUtil.getRenderQueueItemID +
    // uiSettingsState.get(rqiId).set...) was removed; calling it on a current
    // submitter throws and wedges the headless drive. SubmitSelection now reads
    // these job-wide getters directly.
    if (config.taskRunTimeoutDays !== undefined) uiSettingsState.setTaskRunDays(config.taskRunTimeoutDays);
    if (config.taskRunTimeoutHours !== undefined) uiSettingsState.setTaskRunHours(config.taskRunTimeoutHours);
    if (config.taskRunTimeoutMinutes !== undefined) uiSettingsState.setTaskRunMinutes(config.taskRunTimeoutMinutes);
    if (config.framesPerTask !== undefined) uiSettingsState.setFramesPerTask(config.framesPerTask);
    if (config.multiFrameRendering !== undefined) uiSettingsState.setMultiFrameRendering(config.multiFrameRendering);
    if (config.maxCpuUsagePercentage !== undefined) uiSettingsState.setMaxCpuUsagePercentage(config.maxCpuUsagePercentage);
    if (config.ignoreMissingDependencies !== undefined) uiSettingsState.setIgnoreMissingDependencies(config.ignoreMissingDependencies);

    // --- Always intercept gui-submit so the Terminal popup never fires ---
    var originalCallSystem = system.callSystem;
    system.callSystem = function (cmd) {
        // Block any gui-submit or osascript Terminal calls from the submitter
        if (cmd.indexOf("gui-submit") !== -1 || cmd.indexOf("osascript") !== -1) {
            return "";
        }
        return originalCallSystem(cmd);
    };

    // --- Generate the bundle via SubmitSelection ---
    var bundlePath = null;
    // Delete any previous bundle first. SubmitSelection returns early (via the stubbed
    // adcAlert) on validation failures, and a leftover bundle from the last case would
    // then be reported as this case's success.
    var staleBundles = [dcUtil.getTempFolder() + "/DeadlineCloudAESubmission",
                        "/tmp/DeadlineCloudAESubmission",
                        Folder.temp.fsName + "/DeadlineCloudAESubmission"];
    for (var sb = 0; sb < staleBundles.length; sb++) {
        try { removeTree(new Folder(staleBundles[sb])); } catch (e) {}
        if (new Folder(staleBundles[sb]).exists) {
            writeResult("failure", "Could not delete stale bundle: " + staleBundles[sb], null, rqItemDescriptions);
            return;
        }
    }
    try {
        SubmitSelection(selection, uiSettingsState);
        // The submitter writes the bundle to dcUtil.getTempFolder()/DeadlineCloudAESubmission
        bundlePath = dcUtil.getTempFolder() + "/DeadlineCloudAESubmission";
        var bundleFolder = new Folder(bundlePath);
        if (!bundleFolder.exists) {
            // Fallback: check /tmp and Folder.temp
            var fallbacks = ["/tmp/DeadlineCloudAESubmission", Folder.temp.fsName + "/DeadlineCloudAESubmission"];
            bundlePath = null;
            for (var fb = 0; fb < fallbacks.length; fb++) {
                var fbFolder = new Folder(fallbacks[fb]);
                if (fbFolder.exists) {
                    bundlePath = fallbacks[fb];
                    break;
                }
            }
        }
    } catch (e) {
        writeResult("failure", "SubmitSelection error: " + e.message + " (line " + e.line + ")", null, rqItemDescriptions);
        closeProjectQuietly();
        if (config.quitAfterSubmit) app.quit();
        return;
    }

    if (!bundlePath) {
        writeResult("failure", "Bundle was not generated", null, rqItemDescriptions);
        closeProjectQuietly();
        if (config.quitAfterSubmit) app.quit();
        return;
    }

    // The folder alone is not proof of a bundle: the submitter creates it and copies
    // the default template first, then can still stop with an alert (no output file,
    // too many parameters, ...) before writing the rest. Require every bundle file.
    var bundleFiles = ["template.json", "parameter_values.json", "asset_references.json"];
    for (var bf = 0; bf < bundleFiles.length; bf++) {
        if (!new File(bundlePath + "/" + bundleFiles[bf]).exists) {
            writeResult("failure", "Bundle incomplete: no " + bundleFiles[bf] + " (submitter stopped early)", null, rqItemDescriptions);
            if (config.quitAfterSubmit) app.quit();
            return;
        }
    }

    // --- If submitAfterBundle is false, we're done (bundle-only mode) ---
    if (config.submitAfterBundle === false) {
        Folder.current = originalFolder;
        // Close before signalling completion: the harness force-quits on the .done
        // marker, so the project must already be non-dirty by the time we write it.
        closeProjectQuietly();
        writeResultFull("success", null, bundlePath, rqItemDescriptions, null, null);
        signalDone();
        if (config.quitAfterSubmit) app.quit();
        return;
    }

    // --- Run headless submission: deadline bundle submit ---
    var deadlineCli = config.deadlineCli || "deadline";
    var submitCmd = '"' + deadlineCli + '" bundle submit "' + bundlePath + '" --yes';
    submitCmd += ' --submitter-name "After Effects"';
    if (config.farmId) submitCmd += ' --farm-id "' + config.farmId + '"';
    if (config.queueId) submitCmd += ' --queue-id "' + config.queueId + '"';
    if (config.jobName) submitCmd += ' --name "' + config.jobName + '"';
    if (config.priority) submitCmd += ' --priority ' + config.priority;
    if (config.storageProfileId) submitCmd += ' --storage-profile-id "' + config.storageProfileId + '"';

    // Capture output to a temp file (system.callSystem returns stdout directly on macOS)
    var submitOutput = "";
    var submitExitCode = 0;
    try {
        // Restore original callSystem for our own use
        system.callSystem = originalCallSystem;

        if ($.os.indexOf("Windows") === -1) {
            // macOS: run command and capture both stdout+stderr, append exit code
            var fullCmd = submitCmd + ' 2>&1; echo "EXIT_CODE:$?"';
            submitOutput = system.callSystem(fullCmd);
        } else {
            // Windows: use temp file for output
            var outFile = new File(Folder.temp.fsName + "\\deadline_submit_output.txt");
            var batCmd = submitCmd + ' > "' + outFile.fsName + '" 2>&1';
            batCmd += '\necho EXIT_CODE:%ERRORLEVEL% >> "' + outFile.fsName + '"';
            var batFile = new File(Folder.temp.fsName + "\\deadline_submit.bat");
            batFile.open("w");
            batFile.writeln("@echo off");
            batFile.writeln(batCmd);
            batFile.close();
            system.callSystem(batFile.fsName);
            if (outFile.exists) {
                outFile.open("r");
                submitOutput = outFile.read();
                outFile.close();
            }
        }

        // Parse exit code from output
        var exitCodeMatch = submitOutput.match(/EXIT_CODE:(\d+)/);
        if (exitCodeMatch) {
            submitExitCode = parseInt(exitCodeMatch[1]);
            submitOutput = submitOutput.replace(/EXIT_CODE:\d+\s*$/, "").replace(/\s+$/, "");
        }
    } catch (e) {
        submitOutput = "Exception running deadline CLI: " + e.message;
        submitExitCode = -1;
    }

    // --- Determine success/failure ---
    var submitStatus = (submitExitCode === 0) ? "success" : "failure";
    var submitError = (submitExitCode !== 0) ? submitOutput : null;

    // --- Clean up, then signal: the harness force-quits on the .done marker ---
    Folder.current = originalFolder;
    closeProjectQuietly();
    writeResultFull(submitStatus, submitError, bundlePath, rqItemDescriptions, submitOutput, submitExitCode);
    signalDone();

    // --- Quit ---
    if (config.quitAfterSubmit) {
        app.quit();
    }
    }  // end main

    // Run main() once AE has finished launching. app.scheduleTask defers execution to
    // the idle loop, by which point AE has a valid context; invoking the submitter
    // directly from Startup runs too early on a cold launch and AE throws "internal
    // verification failure {no current context}". scheduleTask takes a code *string*
    // (not a function reference), so main is stashed on $.global and called by name.
    // Falls back to a direct call if scheduling is unavailable.
    var scheduled = false;
    try {
        if (typeof app !== "undefined" && app.scheduleTask) {
            $.global.__deadlineDriverMain = main;
            app.scheduleTask("$.global.__deadlineDriverMain()", 1000, false);
            scheduled = true;
        }
    } catch (schedErr) {}
    if (!scheduled) main();
})();
