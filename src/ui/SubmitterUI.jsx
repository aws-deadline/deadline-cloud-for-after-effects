/**
 * Builds the Script UI for the Deadline Cloud Submitter
 **/
function buildUI(thisObj) {
    const submitterPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Submit to AWS Deadline Cloud", undefined, {
        resizable: true
    });
    submitterPanel.orientation = "row";
    submitterPanel.spacing = submitterPanel.margins.right;

    const uiSettingsState = new UiSettingsState();

    const root = submitterPanel.add("group");
    root.orientation = "column";
    root.margins.bottom = 10;
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
    focusRenderQueueButton.onClick = function () {
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

    // These settings apply to the whole submission, not to individual render queue items. Not named
    // "Render Settings" because After Effects already uses that for a per-item concept.
    const jobRenderOptionsPanel = controlsPanel.add("panel", undefined, "Job Render Options");
    jobRenderOptionsPanel.orientation = "column";
    jobRenderOptionsPanel.alignment = ['fill', 'top'];
    jobRenderOptionsPanel.alignChildren = ['left', 'top'];

    // Setting up frame per task GUI
    const framesPerTaskGroup = jobRenderOptionsPanel.add("group", undefined, "");
    framesPerTaskGroup.orientation = "row";
    framesPerTaskGroup.alignment = ['fill', 'top'];
    framesPerTaskGroup.alignChildren = ['left', 'center'];

    // Always enabled, because this is a project level setting rather than a per composition one.
    // The label says which outputs it affects so video-only artists do not expect an effect.
    const framesPerTaskLabel = framesPerTaskGroup.add("statictext", undefined, "Frames per task (img seq only)");
    framesPerTaskLabel.alignment = ['left', 'center'];
    framesPerTaskLabel.helpTip = "The number of frames per task, applied to every image sequence in the submission. Has no effect on video output.";

    const framesPerTaskTextBox = framesPerTaskGroup.add("edittext", undefined, "");
    framesPerTaskTextBox.alignment = ['fill', 'top'];
    framesPerTaskTextBox.helpTip = framesPerTaskLabel.helpTip;
    framesPerTaskTextBox.text = uiSettingsState.framesPerTask();

    function onFramesPerTaskChanged() {
        // Frames per task is submitted as the ChunkSize job parameter, which the job template
        // declares with a minimum of 1, and is used as the stride of the step's frame range.
        // Strip non-digits so a stray minus sign or trailing text can't reach the template, then
        // floor the result so an explicit "0" can't produce an invalid range such as "1-100:0".
        const minFramesPerTask = 1;
        const maxFramesPerTask = 9999;
        framesPerTaskTextBox.text = framesPerTaskTextBox.text.replace(/[^0-9]/g, "");
        var newFramesPerTaskValue = parseInt(framesPerTaskTextBox.text);
        if (isNaN(newFramesPerTaskValue)) {
            newFramesPerTaskValue = uiSettingsState.framesPerTask();
        }
        if (newFramesPerTaskValue < minFramesPerTask) {
            newFramesPerTaskValue = minFramesPerTask;
        }
        if (newFramesPerTaskValue > maxFramesPerTask) {
            newFramesPerTaskValue = maxFramesPerTask;
        }
        framesPerTaskTextBox.text = newFramesPerTaskValue.toString();
        uiSettingsState.setFramesPerTask(newFramesPerTaskValue);
    }
    framesPerTaskTextBox.onChange = onFramesPerTaskChanged;

    // Multi-frame rendering (MFR) GUI
    const mfrGroup = jobRenderOptionsPanel.add("group", undefined, "");
    mfrGroup.orientation = "column";
    mfrGroup.alignment = ['fill', 'top'];
    mfrGroup.alignChildren = ['left', 'center'];
    mfrGroup.margins = 5;

    const mfrCheckBox = mfrGroup.add("checkbox", undefined, "Enable Multi-Frame Rendering");
    mfrCheckBox.value = uiSettingsState.multiFrameRendering();

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

    // Max CPU usage is only meaningful while MFR is on, so the control follows the checkbox. This
    // only reads the stored percentage, so toggling MFR off and back on does not disturb it.
    function refreshMaxCpuUsagePercentageControl() {
        maxCpuUsagePercentageTextBox.enabled = mfrCheckBox.value;
        maxCpuUsagePercentageTextBox.text = mfrCheckBox.value ?
            uiSettingsState.maxCpuUsagePercentage().toString() :
            "N/A";
    }
    refreshMaxCpuUsagePercentageControl();

    function onMaxCpuUsagePercentageChanged() {
        // The job template declares MaxCpuUsagePercentage with a minimum of 1, so reject 0 along
        // with non-numeric and out-of-range input rather than persisting a value the template rejects.
        const minMaxCpuUsagePercentage = 1;
        const maxCpuUsagePercentageValue = Math.abs(parseInt(maxCpuUsagePercentageTextBox.text));
        if (isNaN(maxCpuUsagePercentageValue) || maxCpuUsagePercentageValue < minMaxCpuUsagePercentage || maxCpuUsagePercentageValue > 100) {
            maxCpuUsagePercentageTextBox.text = DEFAULT_MAX_CPU_USAGE_PERCENTAGE;
        } else {
            // Need to reassign in case input string is a number followed my random characters
            // since parseInt parses the first number it finds in a provided string.
            maxCpuUsagePercentageTextBox.text = maxCpuUsagePercentageValue;
        }
        uiSettingsState.setMaxCpuUsagePercentage(parseInt(maxCpuUsagePercentageTextBox.text));
    }
    maxCpuUsagePercentageTextBox.onChange = onMaxCpuUsagePercentageChanged;

    // Disable max CPU percentage textbox when multi frame rendering is disabled
    function onMfrCheckBoxClicked() {
        uiSettingsState.setMultiFrameRendering(mfrCheckBox.value);
        refreshMaxCpuUsagePercentageControl();
    }
    mfrCheckBox.onClick = onMfrCheckBoxClicked;

    // Ignore Missing Dependencies GUI
    const ignoreMissingDepsGroup = jobRenderOptionsPanel.add("group", undefined, "");
    ignoreMissingDepsGroup.orientation = "column";
    ignoreMissingDepsGroup.alignment = ['fill', 'top'];
    ignoreMissingDepsGroup.alignChildren = ['left', 'center'];

    const ignoreMissingDepsCheckBox = ignoreMissingDepsGroup.add("checkbox", undefined, "Ignore Missing Dependencies");
    ignoreMissingDepsGroup.orientation = "column";
    ignoreMissingDepsCheckBox.value = uiSettingsState.ignoreMissingDependencies();

    // Ignore Missing Dependencies Checkbox
    function onIgnoreMissingDepsCheckBoxClicked() {
        uiSettingsState.setIgnoreMissingDependencies(ignoreMissingDepsCheckBox.value);
    }
    ignoreMissingDepsCheckBox.onClick = onIgnoreMissingDepsCheckBoxClicked;

    // Re-reads the render options from the project, which is needed because they go stale when a
    // different project is opened. Reading a setting the project never stored seeds it with its
    // default, which marks the project dirty.
    function refreshRenderSettingControls() {
        framesPerTaskTextBox.text = uiSettingsState.framesPerTask();
        mfrCheckBox.value = uiSettingsState.multiFrameRendering();
        ignoreMissingDepsCheckBox.value = uiSettingsState.ignoreMissingDependencies();
        refreshMaxCpuUsagePercentageControl();
    }

    // Add Timeouts settings group
    const timeoutsPanel = controlsPanel.add("panel", undefined, "Timeouts");
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
    submitButton.onClick = function () {
        if (getPythonExecutable()) {
            // The button is deliberately always enabled; SubmitSelection reports what is wrong, so
            // an unexpected UI state cannot leave the artist with a button that does nothing.
            SubmitSelection(list.selection, uiSettingsState);
            list.selection = null;
        }
    }
    submitButton.alignment = 'right';

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

        // The settings apply to the job rather than to individual render queue items, and they
        // persist across submissions, so they stay editable even while the render queue is empty.
        // Repopulate them here because they are stored in the project and a different project may
        // have been opened since the last refresh.
        refreshRenderSettingControls();
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

        if (list != null) {
            listGroup.remove(list);
        }
        list = newList;

        // No onChange handler needed: nothing in the panel depends on which items are selected.
        list.selection = null;
    }

    updateList();
    refreshButton.onClick = function () {
        updateList();
    }

    //For some reason the color of the scrollbar and the color of the defautl panel background are the same so the scrollbar is almost invisible unless you draw an outline around it
    const scrollbarOutline = submitterPanel.add('group');
    scrollbarOutline.alignment = ['left', 'top'];
    const scrollbar = scrollbarOutline.add('scrollbar', undefined, {stepdelta: 20});
    scrollbar.alignment = ['left', 'fill'];
    scrollbar.minvalue = 0;
    scrollbar.preferredSize.width = 16;
    scrollbarOutline.margins = 1;
    scrollbarOutline.graphics.backgroundColor = scrollbarOutline.graphics.newBrush(
        scrollbarOutline.graphics.BrushType.SOLID_COLOR,
        [0.3, 0.3, 0.3],
        1
    );
    submitterPanel.layout.layout(true);
    root.minimumSize.height = root.size.height;

    submitterPanel.onResizing = function () {
        //has to happen before resize
        var panelHeight = submitterPanel.size.height - submitterPanel.margins.top - submitterPanel.margins.bottom;
        var panelWidth = submitterPanel.size.width - submitterPanel.margins.left - submitterPanel.margins.right - submitterPanel.spacing;
        if(panelHeight >= root.minimumSize.height){
            //nothing is cut off, so we don't need a scrollbar. Hide it.
            scrollbar.hide();
            scrollbarOutline.size.width = 0;
            scrollbarOutline.size.height = submitterPanel.size.height;
            root.size.width = panelWidth;
            root.location.y = 0;
            scrollbar.value = 0;
        } else {
            scrollbar.show();
            scrollbarOutline.size.width = scrollbar.size.width + 1;
            scrollbarOutline.size.height = panelHeight;
            root.size.width = panelWidth - scrollbarOutline.size.width;

            scrollbar.maxvalue = root.minimumSize.height - panelHeight;
            root.location.y = -scrollbar.value;
        }
        this.layout.resize();

        //has to happen after resize
        root.location.y = -scrollbar.value;
    }

    scrollbar.onChanging = function() {
        root.location.y = -this.value;
    }

    if (!(thisObj instanceof Panel)) {
        submitterPanel.center();
        submitterPanel.show();
        submitterPanel.update();
    }

    return submitterPanel;
}
