/**
 * Builds the Script UI for the Deadline Cloud Submitter
 **/
function buildUI(thisObj) {
    const submitterPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Submit to AWS Deadline Cloud", undefined, {
        resizable: true
    });

    const uiSettingsState = new UiSettingsState();

    const root = submitterPanel.add("group");
    root.orientation = "column";
    root.alignment = ['fill', 'fill'];
    root.alignChildren = ['fill', 'top']
    const logoGroup = root.add("group");
    logoGroup.alignment = 'left';
    logoGroup.add("image", undefined, logoData());
    const logoText = logoGroup.add("statictext", undefined, "AWS Deadline Cloud");
    const arialBold24Font = ScriptUI.newFont("Arial", ScriptUI.FontStyle.BOLD, 64);
    logoText.graphics.font = arialBold24Font;
    const headerButtonGroup = root.add("group");
    const focusRenderQueueButton = headerButtonGroup.add("button", undefined, "Open Render Queue");
    focusRenderQueueButton.onClick = function() {
        // we quickly toggle the window to make sure it gains focus
        // sometimes this causes a flicker
        app.project.renderQueue.showWindow(false);
        app.project.renderQueue.showWindow(true);
    }
    const refreshButton = headerButtonGroup.add("button", undefined, "Refresh");
    const listGroup = root.add("panel", undefined, "");
    listGroup.alignment = ['fill', 'fill'];
    listGroup.alignChildren = ['fill', 'fill']

    const bounds = list == null ? undefined : list.bounds;
    var list = listGroup.add("listbox", bounds, "", {
        multiselect: true,
        numberOfColumns: 4,
        showHeaders: true,
        columnTitles: ['#', 'Name', 'Frames', 'Output Path'],
        columnWidths: [32, 160, 120, 240],
    });
    list.preferredSize.height = 400;
    list.preferredSize.width = 500;

    function onSelectionChange() {
        const selection = list.selection;
        if (selection == null) {
            refreshList(list, uiSettingsState);
            framesPerTaskTextBox.text = "";
            return;
        }
        submitButton.enabled = true;
        submitButton.active = false;
        submitButton.active = true;

        // Disable everything
        framesPerTaskTextBox.enabled = false
        mfrCheckBox.enabled = false
        maxCpuUsagePercentageTextBox.enabled = false

        if (selection.length !== 1) {
            return
        }
        const selectionItem = selection[0]
        logger.warning("Selected Comp is: " + app.project.renderQueue.item(selectionItem.renderQueueIndex).comp.name);
        const imageOutput = isRenderQueueItemImageOutput(app.project.renderQueue.item(selectionItem.renderQueueIndex))
        framesPerTaskTextBox.enabled = imageOutput
        mfrCheckBox.enabled = true
        maxCpuUsagePercentageTextBox.enabled = true

        framesPerTaskTextBox.text = selectionItem.subItems[1].text

        const settings = uiSettingsState.get(selectionItem.compId)
        if (settings === undefined) {
            logger.warning("Could not find settings for : " + selectionItem.compId);
            return
        }

        framesPerTaskTextBox.text = settings.framesPerTask() || selectionItem.subItems[1].text
        mfrCheckBox.value = settings.multiFrameRendering()
        maxCpuUsagePercentageTextBox.value = settings.maxCpuUsagePercentage()

        maxCpuUsagePercentageTextBox.enabled = mfrCheckBox.value
    }

    list.onChange = onSelectionChange;

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

    function onFramesPerTaskChanged() {
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
        for (var s = 0; s < list.selection.length; s++) {
            const selectionItem = list.selection[s];
            uiSettingsState.get(selectionItem.compId).setFramesPerTask(framesPerTaskTextBox.text)
        }
    }
    framesPerTaskTextBox.onChange = onFramesPerTaskChanged;

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

    function onMaxCpuUsagePercentageChanged() {
        const maxCpuUsagePercentageValue = Math.abs(parseInt(maxCpuUsagePercentageTextBox.text));
        if (isNaN(maxCpuUsagePercentageValue) || maxCpuUsagePercentageValue > 100) {
            maxCpuUsagePercentageTextBox.text = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE);
        } else {
            // Need to reassign in case input string is a number followed my random characters
            // since parseInt parses the first number it finds in a provided string.
            maxCpuUsagePercentageTextBox.text = maxCpuUsagePercentageValue;
        }
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE, maxCpuUsagePercentageTextBox.text);
        for (var s = 0; s < list.selection.length; s++) {
            const selectionItem = list.selection[s];
            uiSettingsState.get(selectionItem.compId).setMaxCpuUsagePercentage(maxCpuUsagePercentageTextBox.text)
        }
    }
    maxCpuUsagePercentageTextBox.onChange = onMaxCpuUsagePercentageChanged;

    // Disable max CPU percentage textbox when multi frame rendering is disabled
    function onMfrCheckBoxClicked() {
        const isMfrChecked = mfrCheckBox.value;
        var settingsStateValue = false
        if (!isMfrChecked) {
            maxCpuUsagePercentageTextBox.text = "N/A";
            app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING, "false");
            settingsStateValue = false
        } else {
            maxCpuUsagePercentageTextBox.text = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE);
            app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING, "true");
            settingsStateValue = true
        }

        maxCpuUsagePercentageTextBox.enabled = isMfrChecked;
        for (var s = 0; s < list.selection.length; s++) {
            const selectionItem = list.selection[s];
            uiSettingsState.get(selectionItem.compId).setMultiFrameRendering(settingsStateValue)
        }
    }
    mfrCheckBox.onClick = onMfrCheckBoxClicked;

    function isRenderQueueItemImageOutput(renderQueueItem) {
        if (renderQueueItem.numOutputModules === 1) {
            const outputModule = renderQueueItem.outputModule(1).file;
            if (outputModule != null) {
                const outputFileNameNoRegex = getFileNameNoRegex(outputModule.name);
                const extension = getFileExtension(outputFileNameNoRegex);
                return isImageOutput(extension);
            }
        }
        return false
    }

    // Add Timeouts settings group
    const timeoutsPanel = settingsGroup.add("panel", undefined, "Timeouts");
    timeoutsPanel.orientation = "column";
    timeoutsPanel.alignment = ['fill', 'top'];
    timeoutsPanel.alignChildren = ['left', 'center'];
    timeoutsPanel.margins = 5;

    // Task run timeout
    const taskRunGroup = timeoutsPanel.add("group");
    taskRunGroup.orientation = "row";
    taskRunGroup.alignment = ['fill', 'top'];
    taskRunGroup.alignChildren = ['left', 'center'];

    const taskRunCheckbox = taskRunGroup.add("checkbox", undefined, "Task run");
    taskRunCheckbox.value = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED);

    const taskRunDaysGroup = taskRunGroup.add("group", undefined, "");
    const taskRunDaysInput = taskRunDaysGroup.add("edittext", undefined, app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS));
    taskRunDaysInput.characters = 3;
    taskRunDaysGroup.add("statictext", undefined, "days");

    const taskRunHoursGroup = taskRunGroup.add("group", undefined, "");
    const taskRunHoursInput = taskRunHoursGroup.add("edittext", undefined, app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS));
    taskRunHoursInput.characters = 3;
    taskRunHoursGroup.add("statictext", undefined, "hours");

    const taskRunMinutesGroup = taskRunGroup.add("group", undefined, "");
    const taskRunMinutesInput = taskRunMinutesGroup.add("edittext", undefined, app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES));
    taskRunMinutesInput.characters = 3;
    taskRunMinutesGroup.add("statictext", undefined, "minutes");

    // Function to validate timeout values
    function validateTimeoutValues() {
        // Check if all values are zero when checkbox is checked
        if (taskRunCheckbox.value) {
            var days = parseInt(taskRunDaysInput.text) || 0;
            var hours = parseInt(taskRunHoursInput.text) || 0;
            var minutes = parseInt(taskRunMinutesInput.text) || 0;

            if (days === 0 && hours === 0 && minutes === 0) {
                adcAlert("Timeout cannot be set to zero. Please enter a value greater than zero for days, hours, or minutes.", true);
                // Set days back to default value of 2
                taskRunDaysInput.text = "2";
                app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS, "2");
                return false;
            }
        }
        return true;
    }

    // Add input validation and save values to settings
    taskRunCheckbox.onClick = function() {
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED, dcUtil.toBooleanString(this.value));
        if (this.value) {
            validateTimeoutValues();
        }
    };

    taskRunDaysInput.onChange = function() {
        this.text = this.text.replace(/[^0-9]/g, "");
        if (this.text === "") this.text = "0";
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS, this.text);
        validateTimeoutValues();
    };

    taskRunHoursInput.onChange = function() {
        this.text = this.text.replace(/[^0-9]/g, "");
        if (this.text === "") this.text = "0";
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS, this.text);
        validateTimeoutValues();
    };

    taskRunMinutesInput.onChange = function() {
        this.text = this.text.replace(/[^0-9]/g, "");
        if (this.text === "") this.text = "0";
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES, this.text);
        validateTimeoutValues();
    };

    // If an image sequence was selected, enable frames per task textbox. Otherwise disable it.
    function isFramesPerTaskEnabled(selection) {
        if (selection == null) {
            return false;
        }
        if (duplicateNames.length !== 0) {
            var message = "Selected submission items must have unique names. Found (" + duplicateNames.length * 2 + ") compositions with the same name: "
            for (var i = 0; i < duplicateNames.length; i++) {
                message = message + "\n\t" + duplicateNames[i];
            }
            adcAlert(message, true)
            return true
        }
        return false
    }

    const submitButton = controlsGroup.add("button", undefined, "Submit");
    submitButton.onClick = function() {
        if (getPythonExecutable()) {
            const multiFrameRendering = mfrCheckBox.value ? "ON" : "OFF";
            var maxCpuUsagePercentage = undefined;
            if (mfrCheckBox.value) {
                maxCpuUsagePercentage = parseInt(maxCpuUsagePercentageTextBox.text)
            }
            if (taskRunCheckbox.value) {
                SubmitSelection(list.selection, parseInt(framesPerTaskTextBox.text), multiFrameRendering, maxCpuUsagePercentage, parseInt(taskRunDaysInput.text), parseInt(taskRunHoursInput.text), parseInt(taskRunMinutesInput.text));
            } else {
                SubmitSelection(list.selection, parseInt(framesPerTaskTextBox.text), multiFrameRendering, maxCpuUsagePercentage, 2, 0, 0);
            }
            list.selection = null;
        }
    }
    submitButton.alignment = 'right';
    submitButton.enabled = false;

    function updateList() {
        const bounds = list == null ? undefined : list.bounds;
        const newList = listGroup.add("listbox", bounds, "", {
            multiselect: true,
            numberOfColumns: 4,
            showHeaders: true,
            columnTitles: ['#', 'Name', 'Frames', 'Output Path'],
            columnWidths: [32, 160, 120, 240],
        });
        newList.preferredSize.height = 400
        newList.preferredSize.width = 500
        for (var i = 1; i <= app.project.renderQueue.numItems; i++) {
            const rqi = app.project.renderQueue.item(i);
            if (rqi == null) {
                continue;
            }
            if (rqi.status == RQItemStatus.RENDERING || rqi.status == RQItemStatus.WILL_CONTINUE || rqi.status == RQItemStatus.USER_STOPPED || rqi.status == RQItemStatus.ERR_STOPPED || rqi.status == RQItemStatus.DONE) {
                continue;
            }
            const item = newList.add('item', i.toString());
            item.renderQueueIndex = i;
            item.compId = rqi.comp.id;
            // Create a default entry for each comp as needed.
            uiSettingsState.get(item.compId)
            item.subItems[0].text = rqi.comp.name;

            // Calculate frame range using the utility function
            var frameRange = dcUtil.calculateFrameRange(rqi);
            var startFrame = frameRange.startFrame;
            var endFrame = frameRange.endFrame;

            item.subItems[1].text = startFrame == endFrame ? startFrame.toString() : startFrame + "-" + endFrame;
            if (rqi.numOutputModules <= 0) {
                item.subItems[2].text = "<not set>";
            } else if (rqi.numOutputModules == 1) {
                const outputFile = rqi.outputModule(1).file;
                item.subItems[2].text = outputFile == null ? "<not set>" : outputFile.fsName;
            } else {
                item.subItems[2].text = "<multiple output modules>";
            }
        }

        if (list != null) {
            listGroup.remove(list);
        }
        list = newList;

        function onSelectionChange() {
            const selection = list.selection;
            if (selection == null) {
                updateList();
                framesPerTaskTextBox.text = "";
                return;
            }
            submitButton.enabled = true;
            submitButton.active = false;
            submitButton.active = true;

            // Disable everything
            framesPerTaskTextBox.enabled = false
            mfrCheckBox.enabled = false
            maxCpuUsagePercentageTextBox.enabled = false

            if (selection.length !== 1) {
                return
            }
            const selectionItem = selection[0]
            logger.warning("Selected Comp is: " + app.project.renderQueue.item(selectionItem.renderQueueIndex).comp.name);
            const imageOutput = isRenderQueueItemImageOutput(app.project.renderQueue.item(selectionItem.renderQueueIndex))
            framesPerTaskTextBox.enabled = imageOutput
            mfrCheckBox.enabled = true
            maxCpuUsagePercentageTextBox.enabled = true

            framesPerTaskTextBox.text = selectionItem.subItems[1].text

            const settings = uiSettingsState.get(selectionItem.compId)
            if (settings === undefined) {
                logger.warning("Could not find settings for : " + selectionItem.compId);
                return
            }

            framesPerTaskTextBox.text = settings.framesPerTask() || selectionItem.subItems[1].text
            mfrCheckBox.value = settings.multiFrameRendering()
            maxCpuUsagePercentageTextBox.value = settings.maxCpuUsagePercentage()

            maxCpuUsagePercentageTextBox.enabled = mfrCheckBox.value
        }

        list.onChange = onSelectionChange;
        list.selection = null;
    }

    updateList();
    refreshList(list, uiSettingsState);
    if (list.selection != null && list.selection.length === 1) {
        const selectionItem = list.selection[0]
        const renderQueueItem = app.project.renderQueue.item(selectionItem.renderQueueIndex)
        framesPerTaskTextBox.enabled = isRenderQueueItemImageOutput(renderQueueItem)
    }
    refreshButton.onClick = function() {
        refreshList(list, uiSettingsState);
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