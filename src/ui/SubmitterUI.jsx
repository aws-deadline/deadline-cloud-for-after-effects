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
    root.alignChildren = ['fill', 'top'];
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
    listGroup.alignment = ['fill', 'top'];
    listGroup.alignChildren = ['fill', 'top'];
    listGroup.orientation = "column";
    var multiCompLabel = listGroup.add("statictext", undefined, "Shift+Click, Command+Click (Mac), or Ctrl+Click (Windows) can be used to select multiple render queue items and group them together as a single job submission", {
        multiline: true
    });
    // Label height needs to be set manually because ExtendScript does not accurately calculate the height of multiline text objects.
    multiCompLabel.maximumSize.height = 30;
    multiCompLabel.alignment = ['fill', 'top'];
    // The list can't be populated until everything else is defined but we still need the variable set
    // So it can be referenced by other UI elements
    var list = null;

    const controlsGroup = root.add("group", undefined, "");
    controlsGroup.orientation = 'column';
    controlsGroup.alignment = ['fill', 'bottom'];

    const controlsPanel = controlsGroup.add("panel", undefined, "");
    controlsPanel.alignment = ['fill', 'top'];

    // Container with settings to modify comp-specific settings
    const perCompSettingsGroup = controlsPanel.add("panel", undefined, "Render Queue Item Settings");
    perCompSettingsGroup.orientation = "column";
    perCompSettingsGroup.alignment = ['fill', 'top'];
    perCompSettingsGroup.alignChildren = ['left', 'top'];

    // Setting up frame per task GUI
    const framesPerTaskGroup = perCompSettingsGroup.add("group", undefined, "");
    framesPerTaskGroup.orientation = "row";
    framesPerTaskGroup.alignment = ['fill', 'top'];
    framesPerTaskGroup.alignChildren = ['left', 'center'];

    const framesPerTaskLabel = framesPerTaskGroup.add("statictext", undefined, "Frames per task");
    framesPerTaskLabel.alignment = ['left', 'center'];
    framesPerTaskLabel.helpTip = "The number of frames per task. Only affects image sequence output.";

    const framesPerTaskTextBox = framesPerTaskGroup.add("edittext", undefined, "");
    framesPerTaskTextBox.alignment = ['fill', 'top'];
    framesPerTaskTextBox.helpTip = framesPerTaskLabel.helpTip;

    function onFramesPerTaskChanged() {
        if (list.selection == null) {
            return;
        }
        const selectionItem = dcUtil.getSelection(list);
        if (selectionItem) {
            var newFramesPerTaskValue = parseInt(framesPerTaskTextBox.text);
            if (isNaN(newFramesPerTaskValue)) {
                newFramesPerTaskValue = uiSettingsState.get(dcUtil.getRenderQueueItemID(selectionItem.renderQueueIndex)).framesPerTask();
            }
            if (newFramesPerTaskValue > 9999) {
                newFramesPerTaskValue = 9999;
            }
            framesPerTaskTextBox.text = newFramesPerTaskValue.toString();
            uiSettingsState.get(dcUtil.getRenderQueueItemID(selectionItem.renderQueueIndex)).setFramesPerTask(newFramesPerTaskValue);
        }
    }
    framesPerTaskTextBox.onChange = onFramesPerTaskChanged;

    // Multi-frame rendering (MFR) GUI
    const mfrGroup = perCompSettingsGroup.add("group", undefined, "");
    mfrGroup.orientation = "column";
    mfrGroup.alignment = ['fill', 'top'];
    mfrGroup.alignChildren = ['left', 'center'];
    mfrGroup.margins = 5;

    const mfrCheckBox = mfrGroup.add("checkbox", undefined, "Enable Multi-Frame Rendering");
    mfrCheckBox.value = DEFAULT_MULTI_FRAME_RENDERING;

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
    maxCpuUsagePercentageTextBox.text = maxCpuUsagePercentageTextBox.enabled ? DEFAULT_MAX_CPU_USAGE_PERCENTAGE : "N/A";

    function onMaxCpuUsagePercentageChanged() {
        const maxCpuUsagePercentageValue = Math.abs(parseInt(maxCpuUsagePercentageTextBox.text));
        if (isNaN(maxCpuUsagePercentageValue) || maxCpuUsagePercentageValue > 100) {
            maxCpuUsagePercentageTextBox.text = DEFAULT_MAX_CPU_USAGE_PERCENTAGE;
        } else {
            // Need to reassign in case input string is a number followed my random characters
            // since parseInt parses the first number it finds in a provided string.
            maxCpuUsagePercentageTextBox.text = maxCpuUsagePercentageValue;
        }
        const selectionItem = dcUtil.getSelection(list);
        if (selectionItem) {
            uiSettingsState.get(dcUtil.getRenderQueueItemID(selectionItem.renderQueueIndex)).setMaxCpuUsagePercentage(parseInt(maxCpuUsagePercentageTextBox.text));
        }
    }
    maxCpuUsagePercentageTextBox.onChange = onMaxCpuUsagePercentageChanged;

    // Disable max CPU percentage textbox when multi frame rendering is disabled
    function onMfrCheckBoxClicked() {
        const isMfrChecked = mfrCheckBox.value;
        const selectionItem = dcUtil.getSelection(list);
        if (selectionItem) {
            var RQIID = dcUtil.getRenderQueueItemID(selectionItem.renderQueueIndex);
            if (!isMfrChecked) {
                maxCpuUsagePercentageTextBox.text = "N/A";
                uiSettingsState.get(RQIID).setMultiFrameRendering(false);
            } else {
                maxCpuUsagePercentageTextBox.text = uiSettingsState.get(RQIID).maxCpuUsagePercentage();
                uiSettingsState.get(RQIID).setMultiFrameRendering(true);
            }
        }
        maxCpuUsagePercentageTextBox.enabled = isMfrChecked;
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
        return false;
    }

    const globalSettingsGroup = controlsPanel.add("panel", undefined, "Global Job Settings");
    globalSettingsGroup.orientation = "column";
    globalSettingsGroup.alignment = ['fill', 'top'];
    globalSettingsGroup.alignChildren = ['left', 'top'];
    // Add Timeouts settings group
    const timeoutsPanel = globalSettingsGroup.add("panel", undefined, "Timeouts");
    timeoutsPanel.orientation = "column";
    timeoutsPanel.alignment = ['fill', 'top'];
    timeoutsPanel.alignChildren = ['left', 'center'];
    timeoutsPanel.margins = 10;

    // Task run timeout
    const taskRunGroup = timeoutsPanel.add("group");
    taskRunGroup.orientation = "row";
    taskRunGroup.alignment = ['fill', 'top'];
    taskRunGroup.alignChildren = ['left', 'center'];
    const taskRunCheckbox = taskRunGroup.add("checkbox", undefined, "Task run");
    taskRunCheckbox.value = uiSettingsState.taskRunTimeoutEnabled();

    const taskRunDaysGroup = taskRunGroup.add("group", undefined, "");
    const taskRunDaysInput = taskRunDaysGroup.add("edittext", undefined, uiSettingsState.taskRunDays());
    taskRunDaysInput.characters = 3;
    taskRunDaysGroup.add("statictext", undefined, "days");
    taskRunDaysInput.text = uiSettingsState.taskRunDays();

    const taskRunHoursGroup = taskRunGroup.add("group", undefined, "");
    const taskRunHoursInput = taskRunHoursGroup.add("edittext", undefined, uiSettingsState.taskRunHours());
    taskRunHoursInput.characters = 3;
    taskRunHoursGroup.add("statictext", undefined, "hours");
    taskRunHoursInput.text = uiSettingsState.taskRunHours();

    const taskRunMinutesGroup = taskRunGroup.add("group", undefined, "");
    const taskRunMinutesInput = taskRunMinutesGroup.add("edittext", undefined, uiSettingsState.taskRunMinutes());
    taskRunMinutesInput.characters = 3;
    taskRunMinutesGroup.add("statictext", undefined, "minutes");
    taskRunMinutesInput.text = uiSettingsState.taskRunMinutes();

    function onTaskRunCheckboxClicked() {
        if (taskRunCheckbox.value) {
            if (!dcUtil.validateTimeoutValues(taskRunCheckbox.value, taskRunDaysInput.text, taskRunHoursInput.text, taskRunMinutesInput.text)) {
                uiSettingsState.setTaskRunDays(DEFAULT_TASK_RUN_TIMEOUT_DAYS);
                taskRunDaysInput.text = DEFAULT_TASK_RUN_TIMEOUT_DAYS;
                uiSettingsState.setTaskRunHours(DEFAULT_TASK_RUN_TIMEOUT_HOURS);
                taskRunHoursInput.text = DEFAULT_TASK_RUN_TIMEOUT_HOURS;
                uiSettingsState.setTaskRunMinutes(DEFAULT_TASK_RUN_TIMEOUT_MINUTES);
                taskRunMinutesInput.text = DEFAULT_TASK_RUN_TIMEOUT_MINUTES;
            } else {
                onTaskRunDaysChanged();
                onTaskRunHoursChanged();
                onTaskRunMinutesChanged();
            }
        }
        taskRunDaysInput.enabled = taskRunCheckbox.value;
        taskRunHoursInput.enabled = taskRunCheckbox.value;
        taskRunMinutesInput.enabled = taskRunCheckbox.value;
        uiSettingsState.setTaskRunTimeoutEnabled(taskRunCheckbox.value);
    }
    taskRunCheckbox.onClick = onTaskRunCheckboxClicked;
    onTaskRunCheckboxClicked();

    function onTaskRunDaysChanged() {
        taskRunDaysInput.text = taskRunDaysInput.text.replace(/[^0-9]/g, "");
        var newValue = parseInt(taskRunDaysInput.text);
        if (taskRunDaysInput.text === "") newValue = 0;
        if (dcUtil.validateTimeoutValues(taskRunCheckbox.value, taskRunDaysInput.text, taskRunHoursInput.text, taskRunMinutesInput.text)) {
            if (!isNaN(newValue)) {
                uiSettingsState.setTaskRunDays(newValue);
            }
        }
        taskRunDaysInput.text = uiSettingsState.taskRunDays();
    }
    taskRunDaysInput.onChange = onTaskRunDaysChanged;

    function onTaskRunHoursChanged() {
        taskRunHoursInput.text = taskRunHoursInput.text.replace(/[^0-9]/g, "");
        var newValue = parseInt(taskRunHoursInput.text);
        if (taskRunHoursInput.text === "") newValue = 0;
        if (dcUtil.validateTimeoutValues(taskRunCheckbox.value, taskRunDaysInput.text, taskRunHoursInput.text, taskRunMinutesInput.text)) {
            if (!isNaN(newValue)) {
                uiSettingsState.setTaskRunHours(newValue);
            }
        }
        taskRunHoursInput.text = uiSettingsState.taskRunHours();
    }
    taskRunHoursInput.onChange = onTaskRunHoursChanged;

    function onTaskRunMinutesChanged() {
        taskRunMinutesInput.text = taskRunMinutesInput.text.replace(/[^0-9]/g, "");
        var newValue = parseInt(taskRunMinutesInput.text);
        if (taskRunMinutesInput.text === "") newValue = 0;
        if (dcUtil.validateTimeoutValues(taskRunCheckbox.value, taskRunDaysInput.text, taskRunHoursInput.text, taskRunMinutesInput.text)) {
            if (!isNaN(newValue)) {
                uiSettingsState.setTaskRunMinutes(newValue);
            }
        }
        taskRunMinutesInput.text = uiSettingsState.taskRunMinutes();
    }
    taskRunMinutesInput.onChange = onTaskRunMinutesChanged;

    const submitButton = controlsGroup.add("button", undefined, "Submit");
    submitButton.onClick = function() {
        if (getPythonExecutable()) {
            if (list.selection === null) {
                return;
            }
            SubmitSelection(list.selection, uiSettingsState);
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
        newList.preferredSize.height = 200;
        newList.preferredSize.width = 500;

        // Disable all controls if the render queue is empty
        // This forces the user to click "refresh" when a new project is opened and populate the list
        controlsGroup.enabled = app.project.renderQueue.numItems > 0;
        // Also populate timeout settings because the values could be stale if a new project has been opened since the last refresh
        taskRunDaysInput.text = uiSettingsState.taskRunDays();
        taskRunHoursInput.text = uiSettingsState.taskRunHours();
        taskRunMinutesInput.text = uiSettingsState.taskRunMinutes();

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
            // Create a default entry for each comp as needed.
            uiSettingsState.get(i);
            item.subItems[0].text = rqi.comp.name;

            // Calculate frame range using the utility function
            var frameRange = dcUtil.calculateFrameRange(rqi);
            var startFrame = frameRange.startFrame;
            var endFrame = frameRange.endFrame;

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

        dcUtil.deleteUnusedMetadata(uiSettingsState.rqiXmpPath);

        if (list != null) {
            listGroup.remove(list);
        }
        list = newList;

        function onSelectionChange() {
            const selection = list.selection;
            perCompSettingsGroup.enabled = false;

            framesPerTaskTextBox.text = "";
            mfrCheckBox.value = false;
            maxCpuUsagePercentageTextBox.text = "";

            if (selection === null) {
                submitButton.enabled = false;
            } else {
                submitButton.enabled = true;
            }

            if (selection === null || selection.length !== 1) {
                return;
            }
            const selectionItem = selection[0];
            perCompSettingsGroup.enabled = true;
            logger.warning("Selected Comp is: " + app.project.renderQueue.item(selectionItem.renderQueueIndex).comp.name);

            const settings = uiSettingsState.get(dcUtil.getRenderQueueItemID(selectionItem.renderQueueIndex));
            if (settings === undefined) {
                logger.warning("Could not find settings for : " + selectionItem.compId);
                return;
            }

            const imageOutput = isRenderQueueItemImageOutput(app.project.renderQueue.item(selectionItem.renderQueueIndex));
            if (imageOutput) {
                framesPerTaskTextBox.text = settings.framesPerTask();
                framesPerTaskTextBox.enabled = true;
                framesPerTaskTextBox.onChange();
            } else {
                framesPerTaskTextBox.text = "Selection is not image sequence";
                framesPerTaskTextBox.enabled = false;
            }
            maxCpuUsagePercentageTextBox.text = settings.maxCpuUsagePercentage();
            maxCpuUsagePercentageTextBox.onChange();
            mfrCheckBox.value = settings.multiFrameRendering();
            mfrCheckBox.onClick();
        }
        list.onChange = onSelectionChange;
        list.selection = null;
        onSelectionChange();
    }

    updateList();
    if (list.selection != null && list.selection.length === 1) {
        const selectionItem = list.selection[0];
        const renderQueueItem = app.project.renderQueue.item(selectionItem.renderQueueIndex);
        framesPerTaskTextBox.enabled = isRenderQueueItemImageOutput(renderQueueItem);
    }
    refreshButton.onClick = function() {
        updateList();
    }

    submitterPanel.layout.layout(true);

    submitterPanel.onResizing = function() {
        this.layout.resize();
    }
    if (!(thisObj instanceof Panel)) {
        submitterPanel.center();
        submitterPanel.show();
        submitterPanel.update();
    }

    return submitterPanel;
}