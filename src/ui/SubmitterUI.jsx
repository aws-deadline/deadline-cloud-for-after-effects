// global constant
if (typeof DEADLINECLOUD_SUBMITTER_SETTINGS === "undefined") {
    const DEADLINECLOUD_SUBMITTER_SETTINGS = "Deadline Cloud Submitter";
}
if (typeof DEADLINECLOUD_SEPARATEFRAMESINTOTASKS === "undefined") {
    const DEADLINECLOUD_SEPARATEFRAMESINTOTASKS = "separateFramesIntoTasks";
}
if (typeof DEADLINECLOUD_FRAMESPERTASK === "undefined") {
    const DEADLINECLOUD_FRAMESPERTASK = "framePerTask";
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
    var controlsGroup = root.add("group", undefined, "");
    controlsGroup.orientation = 'column';
    controlsGroup.alignment = ['fill', 'bottom'];

    var controlsPanel = controlsGroup.add("panel", undefined, "");
    controlsPanel.alignment = ['fill', 'top'];

    var persistentFramesPerTask = app.settings.haveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK) ? app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK) : "10";

    var framesPerTaskGroup = controlsPanel.add("group", undefined, "");
    framesPerTaskGroup.orientation = "row";
    framesPerTaskGroup.alignment = ['fill', 'top'];
    framesPerTaskGroup.alignChildren = ['left', 'top'];

    var framesPerTaskLabel = framesPerTaskGroup.add("statictext", undefined, "Frames per task");
    framesPerTaskLabel.alignment = ['left', 'center'];
    framesPerTaskLabel.helpTip = "The number of frames per task. Only affects image sequence output."

    const framesPerTaskTextBox = framesPerTaskGroup.add("edittext", undefined, "");
    framesPerTaskTextBox.alignment = ['fill', 'top'];
    framesPerTaskTextBox.helpTip = framesPerTaskLabel.helpTip;
    framesPerTaskTextBox.onChange = function() {
        const newFramesPerTaskValue = String(Math.abs(parseInt(framesPerTaskTextBox.text)));
        if (newFramesPerTaskValue == "NaN") {
            framesPerTaskTextBox.text = persistentFramesPerTask;
        }
        if (Math.abs(parseInt(newFramesPerTaskValue) > 9999)) {
            framesPerTaskTextBox.text = "9999";
        }
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK, framesPerTaskTextBox.text);
    }

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
        // sufficient verify whether they're submitting an image sequence or not
        return true;
    }

    var submitButton = controlsGroup.add("button", undefined, "Submit");
    submitButton.onClick = function() {
        SubmitSelection(list.selection, parseInt(framesPerTaskTextBox.text));
        list.selection = null;
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
        newList.preferredSize.height = 400;
        newList.preferredSize.width = 500;
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
                framesPerTaskTextBox.text = persistentFramesPerTask;
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