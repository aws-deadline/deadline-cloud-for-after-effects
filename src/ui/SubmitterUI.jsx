// Global constants, wrapped with if-blocks to ensure they are only defined once
// to avoid errors due to redeclaration
if (typeof DEADLINECLOUD_SUBMITTER_SETTINGS === "undefined") {
    const DEADLINECLOUD_SUBMITTER_SETTINGS = "Deadline Cloud Submitter";
}
if (typeof DEADLINECLOUD_SEPARATEFRAMESINTOTASKS === "undefined") {
    const DEADLINECLOUD_SEPARATEFRAMESINTOTASKS = "separateFramesIntoTasks";
}
if (typeof DEADLINECLOUD_FRAMESPERTASK === "undefined") {
    const DEADLINECLOUD_FRAMESPERTASK = "framePerTask";
}
if (typeof DEADLINECLOUD_MULTI_FRAME_RENDERING === "undefined") {
    const DEADLINECLOUD_MULTI_FRAME_RENDERING = "multiFrameRendering";
}
if (typeof DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE === "undefined") {
    const DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE = "maxCpuUsagePercentage"
}

// Set up default values for AE job submitter settings
if (!app.settings.haveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK)) {
    app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK, "10");
}

if (!app.settings.haveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING)) {
    app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING, "false");
}

if (!app.settings.haveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE)) {
    app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE, "90");
}


/**
 * Builds the Script UI for the Deadline Cloud Submitter
 **/
function buildUI(thisObj) {
    var submitterPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Submit to AWS Deadline Cloud", undefined, {
        resizable: true
    });

    var root = submitterPanel.add("group");
    root.orientation = "column";
    root.alignment = ['fill', 'fill'];
    root.alignChildren = ['fill', 'top']
    var logoGroup = root.add("group");
    logoGroup.alignment = 'left';
    logoGroup.add("image", undefined, logoData());
    var logoText = logoGroup.add("statictext", undefined, "AWS Deadline Cloud");
    var arialBold24Font = ScriptUI.newFont("Arial", ScriptUI.FontStyle.BOLD, 64);
    logoText.graphics.font = arialBold24Font;
    var headerButtonGroup = root.add("group");
    var focusRenderQueueButton = headerButtonGroup.add("button", undefined, "Open Render Queue");
    focusRenderQueueButton.onClick = function() {
        // we quickly toggle the window to make sure it gains focus
        // sometimes this causes a flicker
        app.project.renderQueue.showWindow(false);
        app.project.renderQueue.showWindow(true);
    }
    var refreshButton = headerButtonGroup.add("button", undefined, "Refresh");
    var listGroup = root.add("panel", undefined, "");
    listGroup.alignment = ['fill', 'fill'];
    listGroup.alignChildren = ['fill', 'fill']
    var list = null;
    const controlsGroup = root.add("group", undefined, "");
    controlsGroup.orientation = 'column';
    controlsGroup.alignment = ['fill', 'bottom'];

    const controlsPanel = controlsGroup.add("panel", undefined, "");
    controlsPanel.alignment = ['fill', 'top'];

    // Container with all settings to modify job submission
    const settingsGroup = controlsPanel.add("group", undefined, "");
    settingsGroup.orientation = "column";
    settingsGroup.alignment = ['fill', 'top'];
    settingsGroup.alignChildren = ['left', 'top'];

    // Setting up frame per task GUI
    const framesPerTaskGroup = settingsGroup.add("group", undefined, "");
    framesPerTaskGroup.orientation = "row";
    framesPerTaskGroup.alignment = ['fill', 'top'];
    framesPerTaskGroup.alignChildren = ['left', 'center'];

    const framesPerTaskLabel = framesPerTaskGroup.add("statictext", undefined, "Frames per task");
    framesPerTaskLabel.alignment = ['left', 'center'];
    framesPerTaskLabel.helpTip = "The number of frames per task. Only affects image sequence output."

    const framesPerTaskTextBox = framesPerTaskGroup.add("edittext", undefined, "");
    framesPerTaskTextBox.alignment = ['fill', 'top'];
    framesPerTaskTextBox.helpTip = framesPerTaskLabel.helpTip;
    framesPerTaskTextBox.onChange = function() {
        const newFramesPerTaskValue = Math.abs(parseInt(framesPerTaskTextBox.text));
        if (isNaN(newFramesPerTaskValue)) {
            framesPerTaskTextBox.text = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK);
        } else if (newFramesPerTaskValue > 9999) {
            framesPerTaskTextBox.text = "9999";
        } else {
            // Need to reassign in case input string is a number followed my random characters
            // since parseInt parses the first number it finds in a provided string.
            framesPerTaskTextBox.text = newFramesPerTaskValue;
        }
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK, framesPerTaskTextBox.text);
    }

    // Multi-frame rendering (MFR) GUI
    const mfrGroup = settingsGroup.add("group", undefined, "");
    mfrGroup.orientation = "column";
    mfrGroup.alignment = ['fill', 'top'];
    mfrGroup.alignChildren = ['left', 'center'];
    mfrGroup.margins = 5;

    const mfrCheckBox = mfrGroup.add("checkbox", undefined, "Enable Multi-Frame Rendering");
    mfrCheckBox.value = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING) === "true";

    const maxCpuUsagePercentageGroup = mfrGroup.add("group", undefined, "");
    maxCpuUsagePercentageGroup.orientation = "row";
    maxCpuUsagePercentageGroup.alignment = ['fill', 'top'];
    mfrGroup.orientation = "column";

    const maxCpuUsagePercentageLabel = maxCpuUsagePercentageGroup.add("statictext", undefined, "Max Allowed CPU Usage Percentage");
    maxCpuUsagePercentageLabel.alignment = ['left', 'center'];
    maxCpuUsagePercentageLabel.helpTip = "If multi-frame rendering is enabled, set the maximum CPU percentage power to use during multi-frame rendering";

    const maxCpuUsagePercentageTextBox = maxCpuUsagePercentageGroup.add("edittext", undefined, "N/A");
    maxCpuUsagePercentageTextBox.alignment = ['fill', 'top'];
    maxCpuUsagePercentageTextBox.helpTip = maxCpuUsagePercentageLabel.helpTip;
    maxCpuUsagePercentageTextBox.enabled = mfrCheckBox.value;
    maxCpuUsagePercentageTextBox.text = maxCpuUsagePercentageTextBox.enabled ? app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE) : "N/A";
    maxCpuUsagePercentageTextBox.onChange = function() {
        const maxCpuUsagePercentageValue = Math.abs(parseInt(maxCpuUsagePercentageTextBox.text));
        if (isNaN(maxCpuUsagePercentageValue) || maxCpuUsagePercentageValue > 100) {
            maxCpuUsagePercentageTextBox.text = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE);
        } else {
            // Need to reassign in case input string is a number followed my random characters
            // since parseInt parses the first number it finds in a provided string.
            maxCpuUsagePercentageTextBox.text = maxCpuUsagePercentageValue;
        }
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE, maxCpuUsagePercentageTextBox.text);
    }

    // Disable max CPU percentage textbox when multi frame rendering is disabled
    mfrCheckBox.onClick = function() {
        const isMfrChecked = mfrCheckBox.value;
        if (!isMfrChecked) {
            maxCpuUsagePercentageTextBox.text = "N/A";
            app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING, "false");
        } else {
            maxCpuUsagePercentageTextBox.text = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE);
            app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING, "true");
        }
        maxCpuUsagePercentageTextBox.enabled = isMfrChecked;
    }

    // If an image sequence was selected, enable frames per task textbox. Otherwise disable it.
    function isFramesPerTaskEnabled(selection) {
        if (selection == null) {
            return false;
        }
        const renderQueueIndex = selection.renderQueueIndex;
        const rqi = app.project.renderQueue.item(renderQueueIndex);
        // Currently we only support one output modele. We have sufficient error handling
        // after submit button is clicked, so this is a sufficient for now
        if (rqi.numOutputModules == 1) {
            var outputModule = rqi.outputModule(1).file;
            if (outputModule != null) {
                const outputFileNameNoRegex = getFileNameNoRegex(outputModule.name);
                const extension = getFileExtension(outputFileNameNoRegex);
                return isImageOutput(extension);
            }
        }
        // Default to true so that we don't block any customers in case we can't
        // sufficiently verify whether they're submitting an image sequence or not
        return true;
    }

    var submitButton = controlsGroup.add("button", undefined, "Submit");
    submitButton.onClick = function() {
        if (getPythonExecutable()) {
            const multiFrameRendering = mfrCheckBox.value ? "ON" : "OFF";
            var maxCpuUsagePercentage = undefined;
            if (mfrCheckBox.value) {
                maxCpuUsagePercentage = parseInt(maxCpuUsagePercentageTextBox.text)
            }
            SubmitSelection(list.selection, parseInt(framesPerTaskTextBox.text), multiFrameRendering, maxCpuUsagePercentage);
            list.selection = null;
        }
    }
    submitButton.alignment = 'right';
    submitButton.enabled = false;

    function updateList() {
        var bounds = list == null ? undefined : list.bounds;
        var newList = listGroup.add("listbox", bounds, "", {
            numberOfColumns: 4,
            showHeaders: true,
            columnTitles: ['#', 'Name', 'Frames', 'Output Path'],
            columnWidths: [32, 160, 120, 240],
        });
        newList.preferredSize.height = 400
        newList.preferredSize.width = 500
        for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
            var rqi = app.project.renderQueue.item(i);
            if (rqi == null) {
                continue;
            }
            if (rqi.status == RQItemStatus.RENDERING || rqi.status == RQItemStatus.WILL_CONTINUE || rqi.status == RQItemStatus.USER_STOPPED || rqi.status == RQItemStatus.ERR_STOPPED || rqi.status == RQItemStatus.DONE) {
                continue;
            }
            var item = newList.add('item', i.toString());
            item.renderQueueIndex = i;
            item.compId = rqi.comp.id;
            item.subItems[0].text = rqi.comp.name;
            var renderSettings = rqi.getSettings(GetSettingsFormat.STRING_SETTABLE);
            var startFrame = Number(timeToFrames(Number(renderSettings["Time Span Start"]), Number(renderSettings["Use this frame rate"])));
            var endFrame = Number(timeToFrames(Number(renderSettings["Time Span End"]), Number(renderSettings["Use this frame rate"]))) - 1; //end frame is inclusive so we subtract 1
            item.subItems[1].text = startFrame == endFrame ? startFrame.toString() : startFrame + "-" + endFrame;
            if (rqi.numOutputModules <= 0) {
                item.subItems[2].text = "<not set>";
            } else if (rqi.numOutputModules == 1) {
                var outputFile = rqi.outputModule(1).file;
                item.subItems[2].text = outputFile == null ? "<not set>" : outputFile.fsName;
            } else {
                item.subItems[2].text = "<multiple output modules>";
            }
        }

        if (list != null) {
            listGroup.remove(list);
        }
        list = newList;
        list.onChange = function() {
            framesPerTaskTextBox.enabled = isFramesPerTaskEnabled(list.selection);
            // If no selection, update list and set text box blank. But if there's a selection
            // and frames per task is disabled, fill textbox with default start-end frame to show that
            // no image chunking will occur. But if there is a selection and frames per task is enabled,
            // set it to their default value.
            if (list.selection == null) {
                updateList();
                framesPerTaskTextBox.text = "";
            } else if (!framesPerTaskTextBox.enabled) {
                framesPerTaskTextBox.text = list.selection.subItems[1].text;
            } else {
                framesPerTaskTextBox.text = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK);
            }

            submitButton.enabled = list.selection != null;
            submitButton.active = false;
            submitButton.active = true;
        };
        list.selection = null;
    }

    updateList();
    framesPerTaskTextBox.enabled = isFramesPerTaskEnabled(list.selection);

    refreshButton.onClick = function() {
        updateList();
    }

    submitterPanel.layout.layout(true);

    submitterPanel.onResizing = function() {
        this.layout.resize();
    }
    if (!(thisObj instanceof Panel)) {
        submitterPanel.center()
        submitterPanel.show();
        submitterPanel.update();
    }

    return submitterPanel;
}