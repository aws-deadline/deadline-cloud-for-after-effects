var deadlineCloudSubmitLayers = {};
var renderQueueDuplicateBool = false;

function __generateSubmitLayerButton() {
    //get the saved defaults from the ini file
    var initPreserveCam = dcUtil.parseBool(dcSettings.getIniSetting("Layers_PreserveCamera", "true"));
    var initPreserveLights = dcUtil.parseBool(dcSettings.getIniSetting("Layers_PreserveLights", "true"));
    var initPreserveAdjustments = dcUtil.parseBool(dcSettings.getIniSetting("Layers_PreserveAdjustments", "true"));
    var initPreserveAV = dcUtil.parseBool(dcSettings.getIniSetting("Layers_PreserveAV", "true"));
    var initPreserveUnselected = dcUtil.parseBool(dcSettings.getIniSetting("Layers_PreserveUnselected", "true"));
    var initRenderSettings = dcSettings.getIniSetting("Layers_RenderSettings", "");
    var initOutputModule = dcSettings.getIniSetting("Layers_OutputModule", "");
    var initOutputFolder = dcSettings.getIniSetting("Layers_OutputFolder", "");
    var initOutputFormat = dcSettings.getIniSetting("Layers_OutputFormat", "[compName]_[layerName]");
    var initUseSubfolders = dcUtil.parseBool(dcSettings.getIniSetting("Layers_UseSubfolders", "false"));
    var initSubfolderFormat = dcSettings.getIniSetting("Layers_SubfolderFormat", "[layerName]");
    var initLayerNameParse = dcSettings.getIniSetting("Layers_NameParsing", "");

    var LAYER_CHECKBOX_SIZE = [180, 20];
    var SUBMIT_LAYER_LABEL_SIZE = [120, 20];
    var LAYER_TEXT_SIZE = [300, 20];
    var LAYER_BROWSE_TEXT_SIZE = [250, 20];
    var LAYER_BUTTON_SIZE = [36, 20];
    var LAYER_COMBO_SIZE = [300, 20];

    // Create file name for logger
    var _scriptFileSubmitLayersName = "SubmitLayersWindow.jsx";

    function SubmitLayersToDeadline() {
        /**
         * Opens window that enables user to set specific settings for selected layers only.
         * Afterwards submit selected layers to Deadline Cloud for rendering.
         */
        // Init called inside alerts if all checks pass
        logger.info("Submitting Layers to Deadline Pressed", _scriptFileSubmitLayersName);
        initAlerts();
    }

    function initAlerts() {
        /**
         * Push alerts to after effects base on activeItem
         */
        logger.log("Initializing Submit Layer Alerts", _scriptFileSubmitLayersName, LOG_LEVEL.INFO);
        var activeComp = app.project.activeItem;

        if (!(activeComp instanceof CompItem || activeComp instanceof AVLayer)) {
            alert("You do not have a composition selected. Please select a composition and layers first.");
        } else if (activeComp.selectedLayers.length == 0) {
            alert("You do not have any selected layers in the active composition!");
        } else {
            for (i = 1; i <= app.project.renderQueue.numItems; ++i) {
                if (activeComp == app.project.renderQueue.item(i).comp && app.project.renderQueue.item(i).status == RQItemStatus.QUEUED) {
                    alert("The active comp is already in the render queue and is set to render. Please remove the comp from the render queue.");
                    return;
                }
            }
            // CALL INIT
            initSubmitLayers();
            deadlineCloudSubmitLayers.layersDialog.show();
        }
    }

    function initSubmitLayers() {
        /**
         * Initialize all widgets
         */

        logger.log("Initializing Submit Layer Window", _scriptFileSubmitLayersName, LOG_LEVEL.INFO);
        // Create main window
        deadlineCloudSubmitLayers.layersDialog = new Window('dialog', 'Submit Selected Layers to Deadline');

        // Create description group, and label
        descriptionGroupSettings = deadlineCloudSubmitLayers.layersDialog.add('group', undefined);
        descriptionGroupSettings.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        descriptionGroupSettings.descriptionLabel = descriptionGroupSettings.add('statictext', undefined, 'This will submit all selected layers to Deadline as separate Jobs. Settings set in the submission dialog will be used, but comps currently in the render queue will NOT be submitted by this dialog.', {
            multiline: true
        });
        descriptionGroupSettings.descriptionLabel.size = [400, 45];

        // Create preservation panel, group, and widgets(if enabled, these layers will be rendered with each of the selected layers)
        deadlineCloudSubmitLayers.preservePanel = deadlineCloudSubmitLayers.layersDialog.add('panel', undefined, 'Choose Unselected Layers To Include In The Render');
        deadlineCloudSubmitLayers.preservePanel.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        preserveUnselectedGroup = deadlineCloudSubmitLayers.preservePanel.add('group', undefined);
        preserveUnselectedGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        preserveUnselectedGroup.preserveUnselected = preserveUnselectedGroup.add('checkbox', undefined, 'All Unselected Layers');
        preserveUnselectedGroup.preserveUnselected.value = initPreserveUnselected;
        preserveUnselectedGroup.preserveUnselected.size = LAYER_CHECKBOX_SIZE;
        preserveUnselectedGroup.preserveUnselected.helpTip = 'Render all unselected layers with each of the selected layers.';

        preserveCameraGroup = deadlineCloudSubmitLayers.preservePanel.add('group', undefined);
        preserveCameraGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        preserveCameraGroup.orientation = "row";
        preserveCameraGroup.preserveCamera = preserveCameraGroup.add('checkbox', undefined, 'Topmost Camera Layer');
        preserveCameraGroup.preserveCamera.value = initPreserveCam;
        preserveCameraGroup.preserveCamera.enabled = !initPreserveUnselected;
        preserveCameraGroup.preserveCamera.size = LAYER_CHECKBOX_SIZE;
        preserveCameraGroup.preserveCamera.helpTip = 'Render the topmost camera layer with each of the selected layers.';
        preserveCameraGroup.preserveLights = preserveCameraGroup.add('checkbox', undefined, 'Light Layers');
        preserveCameraGroup.preserveLights.value = initPreserveLights;
        preserveCameraGroup.preserveLights.enabled = !initPreserveUnselected;
        preserveCameraGroup.preserveLights.size = LAYER_CHECKBOX_SIZE;
        preserveCameraGroup.preserveLights.helpTip = 'Render the light layers with each of the selected layers.';

        preserveAVGroup = deadlineCloudSubmitLayers.preservePanel.add('group', undefined);
        preserveAVGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        preserveAVGroup.orientation = "row";
        preserveAVGroup.preserveAV = preserveAVGroup.add('checkbox', [20, 30, 210, 50], 'Audio/Video Layers');
        preserveAVGroup.preserveAV.value = initPreserveAV;
        preserveAVGroup.preserveAV.enabled = !initPreserveUnselected;
        preserveAVGroup.preserveAV.size = LAYER_CHECKBOX_SIZE;
        preserveAVGroup.preserveAV.helpTip = 'Render the Audio/Video layers with each of the selected layers.';
        preserveAVGroup.preserveAdjustments = preserveAVGroup.add('checkbox', [210, 30, 370, 50], 'Adjustment Layers');
        preserveAVGroup.preserveAdjustments.value = initPreserveAdjustments;
        preserveAVGroup.preserveAdjustments.enabled = !initPreserveUnselected;
        preserveAVGroup.preserveAdjustments.size = LAYER_CHECKBOX_SIZE;
        preserveAVGroup.preserveAdjustments.helpTip = 'Render the Adjustment layers with each of the selected layers.';

        // Create options panel, group, and widgets
        deadlineCloudSubmitLayers.optionalPanel = deadlineCloudSubmitLayers.layersDialog.add('panel', undefined, 'Optional Settings');
        parseLayerNamesGroup = deadlineCloudSubmitLayers.optionalPanel.add('group', undefined);
        parseLayerNamesGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        parseLayerNamesGroup.orientation = "row";
        parseLayerNamesGroup.parseLayerNamesLabel = parseLayerNamesGroup.add('statictext', undefined, 'Layer Name Parsing')
        parseLayerNamesGroup.parseLayerNamesLabel.size = SUBMIT_LAYER_LABEL_SIZE;
        parseLayerNamesGroup.parseLayerNamesLabel.helpTip = 'Allows you to specify how the layer names should be formatted. You can then grab parts of the formatting and stick them in either the output name or the subfolder format box with square brackets. So, for example, if you are naming your layers something like "ops024_a_diff", you could put "<graphic>_<layer>_<pass>" in this box. Then in the subfolder box, you could put "[graphic]\\[layer]\\v001\\[pass]", which would give you "ops024\\a\\v001\\diff" as the subfolder structure.';
        parseLayerNamesGroup.parseLayerNames = parseLayerNamesGroup.add('edittext', undefined, initLayerNameParse)
        parseLayerNamesGroup.parseLayerNames.size = LAYER_TEXT_SIZE;

        // Create Output settings panel, groups, and widgets to use for the comps (needed since we're not grabbing stuff already in the queue)
        deadlineCloudSubmitLayers.outputPanel = deadlineCloudSubmitLayers.layersDialog.add('panel', undefined, 'Output Settings');

        renderSettingsGroup = deadlineCloudSubmitLayers.outputPanel.add('group', undefined);
        renderSettingsGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        renderSettingsGroup.renderSettingsLabel = renderSettingsGroup.add('statictext', undefined, 'Render Settings');
        renderSettingsGroup.renderSettingsLabel.size = SUBMIT_LAYER_LABEL_SIZE;
        renderSettingsGroup.renderSettingsLabel.helpTip = 'Select which render settings to use.';
        renderSettingsGroup.renderSettings = renderSettingsGroup.add('dropdownlist', undefined);
        renderSettingsGroup.renderSettings.size = LAYER_COMBO_SIZE;

        outputModuleGroup = deadlineCloudSubmitLayers.outputPanel.add('group', undefined);
        outputModuleGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        outputModuleGroup.outputModuleLabel = outputModuleGroup.add('statictext', undefined, 'Output Module');
        outputModuleGroup.outputModuleLabel.size = SUBMIT_LAYER_LABEL_SIZE;
        outputModuleGroup.outputModuleLabel.helpTip = 'Select which output module to use.';
        outputModuleGroup.outputModule = outputModuleGroup.add('dropdownlist', undefined);
        outputModuleGroup.outputModule.size = LAYER_COMBO_SIZE;

        outputFormatGroup = deadlineCloudSubmitLayers.outputPanel.add('group', undefined);
        outputFormatGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        outputFormatGroup.outputFormatLabel = outputFormatGroup.add('statictext', undefined, 'Output Format');
        outputFormatGroup.outputFormatLabel.size = SUBMIT_LAYER_LABEL_SIZE;
        outputFormatGroup.outputFormatLabel.helpTip = 'Specify how the output file name should be formatted.';
        // REMARK: Format is quite specific: desired_file_name => not desired_file_name_[####].extension ====> both the file numbering and extension will be added based on the template
        outputFormatGroup.outputFormat = outputFormatGroup.add('edittext', undefined, initOutputFormat);
        outputFormatGroup.outputFormat.size = LAYER_TEXT_SIZE;

        outputFolderGroup = deadlineCloudSubmitLayers.outputPanel.add('group', undefined);
        outputFolderGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        outputFolderGroup.outputFolderLabel = outputFolderGroup.add('statictext', undefined, 'Output Folder');
        outputFolderGroup.outputFolderLabel.size = SUBMIT_LAYER_LABEL_SIZE;
        outputFolderGroup.outputFolderLabel.helpTip = 'Specify where the output files should be rendered to.';
        outputFolderGroup.outputFolder = outputFolderGroup.add('edittext', undefined, initOutputFolder);
        outputFolderGroup.outputFolder.size = LAYER_BROWSE_TEXT_SIZE;
        outputFolderGroup.browseButton = outputFolderGroup.add('button', undefined, '...');
        outputFolderGroup.browseButton.size = LAYER_BUTTON_SIZE;

        // Create use folder group, and widgets
        useSubfoldersGroup = deadlineCloudSubmitLayers.outputPanel.add('group', undefined);
        useSubfoldersGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];
        useSubfoldersGroup.useSubfolders = useSubfoldersGroup.add('checkbox', undefined, 'Use Subfolders');
        useSubfoldersGroup.useSubfolders.value = initUseSubfolders;
        useSubfoldersGroup.useSubfolders.size = SUBMIT_LAYER_LABEL_SIZE;
        useSubfoldersGroup.useSubfolders.helpTip = ' Enable this to render each layer to its own subfolder. If this is enabled, you must also specify the subfolder format.';

        useSubfoldersGroup.subfolderFormat = useSubfoldersGroup.add('edittext', undefined, initSubfolderFormat);
        useSubfoldersGroup.subfolderFormat.enabled = initUseSubfolders;
        useSubfoldersGroup.subfolderFormat.size = LAYER_TEXT_SIZE;

        // Create button group, and widgets
        buttonGroup = deadlineCloudSubmitLayers.layersDialog.add('group', undefined);
        buttonGroup.alignment = [ScriptUI.Alignment.FILL, ScriptUI.Alignment.TOP];

        buttonGroup.progressBar = buttonGroup.add('progressbar', undefined, '');
        buttonGroup.progressBar.size = [262, 20];
        buttonGroup.progressBar.value = 0;

        //submit button
        buttonGroup.submitButton = buttonGroup.add('button', undefined, 'Submit');

        //close button
        buttonGroup.closeButton = buttonGroup.add('button', undefined, 'Close');

        initConnectionsLayers();
    }

    function initConnectionsLayers() {
        /**
         * Connect initialized widgets from initSubmitLayers to their functionality(ex. button press -> exe function)
         */

        // Preserved group functionality
        preserveUnselectedGroup.preserveUnselected.onClick = function() {
            var enableOthers = !preserveUnselectedGroup.preserveUnselected.value;

            preserveCameraGroup.preserveCamera.enabled = enableOthers;
            preserveCameraGroup.preserveLights.enabled = enableOthers;
            preserveAVGroup.preserveAV.enabled = enableOthers;
            preserveAVGroup.preserveAdjustments.enabled = enableOthers;
            makeClickHandlerSubmitLayer("Layers_PreserveUnselected", preserveUnselectedGroup.preserveUnselected, dcUtil.toBooleanString);
        }

        // Preserve camera  functionality + update
        preserveCameraGroup.preserveCamera.onClick = function() {
            makeClickHandlerSubmitLayer("Layers_PreserveCamera", preserveCameraGroup.preserveCamera, dcUtil.toBooleanString);
        }

        //Preserve lights functionality + update
        preserveCameraGroup.preserveLights.onClick = function() {
            makeClickHandlerSubmitLayer("Layers_PreserveLights", preserveCameraGroup.preserveLights, dcUtil.toBooleanString);
        }

        // Preserve adjustments functionality + update
        preserveAVGroup.preserveAdjustments.onClick = function() {
            makeClickHandlerSubmitLayer("Layers_PreserveAdjustments", preserveAVGroup.preserveAdjustments, dcUtil.toBooleanString);
        }

        // preserve AV  functionality + update
        preserveAVGroup.preserveAV.onClick = function() {
            makeClickHandlerSubmitLayer("Layers_PreserveAV", preserveAVGroup.preserveAV, dcUtil.toBooleanString);
        }

        // Output folder browse button functionality
        outputFolderGroup.browseButton.onClick = function() {
            var outFolder = Folder.selectDialog();
            if (outFolder != null)
                outputFolderGroup.outputFolder.text = outFolder.fsName;
            deadlineCloudConfiguration["Layers_OutputFolder"] = outputFolderGroup.outputFolder.text;
            logger.log("Set " + "Layers_OutputFolder" + " to " + outputFolderGroup.outputFolder.text, _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
        }

        // Output Folder functionality and update
        outputFolderGroup.outputFolder.onChange = function() {
            deadlineCloudConfiguration["Layers_OutputFolder"] = outputFolderGroup.outputFolder.text;
            logger.log("Set " + "Layers_OutputFolder" + " to " + outputFolderGroup.outputFolder.text, _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
        }

        // Output format functionality and update
        outputFormatGroup.outputFormat.onChange = function() {
            deadlineCloudConfiguration["Layers_OutputFormat"] = outputFormatGroup.outputFormat.text;
            logger.log("Set " + "Layers_OutputFormat" + " to " + outputFormatGroup.outputFormat.text, _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
        }

        // Use folders checkbox functionality + update
        useSubfoldersGroup.useSubfolders.onClick = function() {
            useSubfoldersGroup.subfolderFormat.enabled = useSubfoldersGroup.useSubfolders.value;
            makeClickHandlerSubmitLayer("Layers_UseSubfolders", useSubfoldersGroup.useSubfolders, dcUtil.toBooleanString);
        }

        // Sub folder format functionality + update
        useSubfoldersGroup.subfolderFormat.onChange = function() {
            deadlineCloudConfiguration["Layers_SubfolderFormat"] = useSubfoldersGroup.subfolderFormat.text;
            logger.log("Set " + "Layers_SubfolderFormat" + " to " + useSubfoldersGroup.subfolderFormat.text, _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
        }

        // Layer Name Parsing Functionality + update
        parseLayerNamesGroup.parseLayerNames.onChange = function() {
            deadlineCloudConfiguration["Layers_NameParsing"] = parseLayerNamesGroup.parseLayerNames.text;
            logger.log("Set " + "Layers_NameParsing" + " to " + parseLayerNamesGroup.parseLayerNames.text, _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
        }

        //need to grab the values from the dropdown list (make a temp addition to render queue and grab from there)
        var rqItem = app.project.renderQueue.items.add(app.project.activeItem);

        for (var i = 0; i < rqItem.templates.length; i++) {
            if (rqItem.templates[i].substring(0, 7) != '_HIDDEN')
                renderSettingsGroup.renderSettings.add("item", rqItem.templates[i]);
        }
        var item = renderSettingsGroup.renderSettings.find(initRenderSettings);
        if (item != null)
            renderSettingsGroup.renderSettings.selection = item;
        else if (rqItem.templates.length > 0) {
            var item = renderSettingsGroup.renderSettings.find(rqItem.templates[0]);
            if (item != null)
                renderSettingsGroup.renderSettings.selection = item;
        }

        // Render Settings on change functionality + update
        renderSettingsGroup.renderSettings.onChange = function() {
            if (renderSettingsGroup.renderSettings.selection != undefined) {
                deadlineCloudConfiguration["Layers_RenderSettings"] = renderSettingsGroup.renderSettings.selection.toString();
                logger.log("Set " + "Layers_RenderSettings" + " to " + renderSettingsGroup.renderSettings.selection.toString(), _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
            }
        }

        //available output modules
        var outMod = rqItem.outputModule(1);
        for (var i = 0; i < outMod.templates.length; i++) {
            if (outMod.templates[i].substring(0, 7) != '_HIDDEN')
                outputModuleGroup.outputModule.add("item", outMod.templates[i]);
        }
        item = outputModuleGroup.outputModule.find(initOutputModule);
        if (item != null)
            outputModuleGroup.outputModule.selection = item;
        else if (outMod.templates.length > 0) {
            item = outputModuleGroup.outputModule.find(outMod.templates[0]);
            if (item != null)
                outputModuleGroup.outputModule.selection = item;
        }
        outputModuleGroup.outputModule.onChange = function() {
            if (outputModuleGroup.outputModule.selection != undefined) {
                deadlineCloudConfiguration["Layers_OutputModule"] = outputModuleGroup.outputModule.selection.toString();
                logger.log("Set " + "Layers_OutputModule" + " to " + outputModuleGroup.outputModule.selection.toString(), _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
            }
        }
        rqItem.remove();

        // Submit button functionality
        buttonGroup.submitButton.onClick = submitLayersButton;

        // Close button functionality
        buttonGroup.closeButton.onClick = clsButton;
    }

    function submitLayersButton() {
        logger.info("Clicked Submit button!", _scriptFileSubmitLayersName);
        var activeCompSubmit = app.project.activeItem;
        results = "";
        errors = "";
        logger.info("Chosen Render Settings: " + renderSettingsGroup.renderSettings.selection.text, _scriptFileSubmitLayersName);
        if (renderSettingsGroup.renderSettings.selection == null)
            errors += "Please select an entry for the Render Settings.\n";

        if (outputModuleGroup.outputModule.selection == null)
            errors += "Please select an entry for the Output Module.\n";
        // Validate frame ranges given
        var __frameList = frameListGroup.frameList.text;
        __frameList = dcUtil.getDuplicateFrames(__frameList);
        if(__frameList.length != 0)
        {
            errors += "\nPlease give a correct frame list. Current frame list has duplicate frames and/or is wrong.\n";
        }

        if (errors != "") {
            errors += "\nPlease fix these errors before submitting your job to Deadline.";
            alert(errors);
            return;
        }
        
        //Grabs the layer parsing string if it's there
        var parsingRegexs = {};
        parseString = parseLayerNamesGroup.parseLayerNames.text;
        parseString = parseString.replace(/([\(\)\[\]\{\}\.\*\+\?\|\/\\])/g, '\\$1'); //replace special regex chars with their escaped equivalents
        regexp = /<(.*?)>/;

        while (parseString.match(regexp) !== null) {
            var tempString = parseString;
            var varName = RegExp.$1;

            replaceRegex = new RegExp("<" + varName + ">", "ig");
            tempString = tempString.replace(replaceRegex, "(.*?)");
            tempString = tempString.replace(/<.*?>/g, ".*?");
            parsingRegexs[varName] = "^" + tempString + "$";
            parseString = parseString.replace(replaceRegex, ".*?");
        }
        //create a duplicate comp, so we don't accidentally mess with settings
        var duplicateComp = activeCompSubmit.duplicate();

        var renderCam = preserveCameraGroup.preserveCamera.value;
        var renderLights = preserveCameraGroup.preserveLights.value;

        var renderAdjustments = preserveAVGroup.preserveAdjustments.value;
        var renderAV = preserveAVGroup.preserveAV.value;
        var renderUnselected = preserveUnselectedGroup.preserveUnselected.value;
        var topCam = true;
        var invalidCharLayers = "";
        var submitCount = 0;
        duplicateComp.name = activeCompSubmit.name;
        //go through all the layers in the active comp and disable the ones we're not ALWAYS rendering
        for (var i = 1; i <= duplicateComp.layers.length; i++) {
            var currLayer = duplicateComp.layers[i];

            if (activeCompSubmit.layers[i].selected)
                currLayer.selected = true;

            if (currLayer.matchName == "ADBE Camera Layer" && renderCam && topCam) //only topmost camera layer is rendered (if option is specified)
            {
                topCam = false;
                //do nothing else, since we want this layer enabled
            } else {
                //figure out if this is an unselected layer we are going to render
                alwaysRender = renderUnselected; //always render if unselected and option specified
                //alwaysRender = alwaysRender || (currLayer("Light Options") != null && renderLights); //always render if light layer and option specified
                alwaysRender = alwaysRender || (currLayer.matchName == "ADBE Light Layer" && renderLights); //always render if light layer and option specified
                alwaysRender = alwaysRender || (currLayer.adjustmentLayer && renderAdjustments); //always render if adjustment layer and option specified
                alwaysRender = alwaysRender || ((currLayer.hasVideo || currLayer.hasAudio) && renderAV); //always render if AV layer and option specified

                if (currLayer.selected || !alwaysRender) //unless one of the above conditions were met (or if layer is selected), disable layer
                {
                    currLayer.enabled = false;
                    currLayer.audioEnabled = false;

                    fixedLayerName = currLayer.name.replace(/([\*\?\|:\"<>\/\\%£])/g, '_'); //replace invalid path characters with an underscore

                    if (fixedLayerName != currLayer.name)
                        invalidCharLayers = invalidCharLayers + currLayer.name + "\n";
                }
            }
        }

        if (invalidCharLayers.length == 0 || confirm("The following layers contain invalid path characters:\n\n" + invalidCharLayers + "\nThe following are considered invalid characters: *, ?, |, :, \", <, >, /, \\, %, £\nIf you chose to continue, invalid characters in the output path will be replaced by an underscore '_'. \nContinue?")) {
            var deleteTempXmlFile = false;
            var restoreProjectPath = false;
            var projectPath = app.project.file.fsName;
            var oldProjectPath = projectPath;
            var oldGPUAccelType = dcUtil.checkGPUAccelType(true);

            // See if we need to save the current scene as an aepx file first.
            if (ignoreMissingLayersGroup.exportAsXml.value && projectPath.indexOf(".aep", projectPath.length - 4) != -1) {
                app.project.save(File(projectPath.substring(0, projectPath.length - 4) + ".aepx"));
                restoreProjectPath = true;
                if (dialog.deleteTempXml.value && dialog.submitScene.value) {
                    deleteTempXmlFile = true;
                }
            } else {
                app.project.save(app.project.file);
            }

            buttonGroup.progressBar.value = 0;
            
            var selectedRenderSettings = renderSettingsGroup.renderSettings.selection;
            var selectedOutputModule = outputModuleGroup.outputModule.selection;

            //go through selected layers and render them one at a time
            for (var i = 0; i < duplicateComp.selectedLayers.length; i++) {
                buttonGroup.progressBar.value = ((i + 1) * 100) / (duplicateComp.selectedLayers.length + 1);

                var currLayer = duplicateComp.selectedLayers[i];
                //if it's already enabled, it means we're always rendering the layer, so skip it (unless it's the last one and we haven't submitted anything yet)
                if (!currLayer.enabled || (submitCount == 0 && i == duplicateComp.selectedLayers.length)) {
                    currLayer.enabled = true;
                    if (currLayer.hasAudio)
                        currLayer.audioEnabled = true;

                    var parsedTokens = {};
                    var layerName = currLayer.name;
                    for (var varName in parsingRegexs) {
                        parsingRE = new RegExp(parsingRegexs[varName], "i");
                        if (!parsingRE.test(layerName)) {
                            alert("The layer name \"" + layerName + "\" does not match the parsing string.\nParsing will not be performed for this layer name.");
                            break;
                        } else {
                            parsedTokens[varName] = RegExp.$1;
                        }
                    }
                    var rqItem = app.project.renderQueue.items.add(duplicateComp);



                    var outMod = rqItem.outputModule(1);
                    var outputFolder = dcUtil.trim(outputFolderGroup.outputFolder.text);

                    // \ / : * ? " < > |
                    var fixedLayerName = currLayer.name.replace(/([\*\?\|:\"<>\/\\%£])/g, '_'); //replace invalid path characters with an underscore

                    if (useSubfoldersGroup.useSubfolders.value) {

                        outputFolder = outputFolder + "/" + dcUtil.trim(useSubfoldersGroup.subfolderFormat.text);
                        outputFolder = outputFolder.replace("\[layerName\]", dcUtil.trim(fixedLayerName));
                        for (var varName in parsedTokens)
                            outputFolder = outputFolder.replace("\[" + varName + "\]", dcUtil.trim(parsedTokens[varName]));

                        //set the folder as the file for the output module temporarily - this makes it replace the [compName], etc. templates.
                        //the dummy extension is added, since AE will automatically add an extension if one isn't provided.
                        //outMod.file = new Folder(outputFolder + "._DUMMY_");
                        outMod.file = new Folder(outputFolder);
                        //outputFolder = outputFolder.replace("._DUMMY_", "");

                        //creates the subfolder
                        subFolder = new Folder(outputFolder);
                        if (subFolder.exists) {
                            alert("Specified Sub Folder already exists, please pick a unique name. Canceling submission");
                            return buttonGroup.progressBar.value = 0;
                        }
                        subFolder.create();
                    }

                    var outputFormat = outputFormatGroup.outputFormat.text;
                    outputFormat = outputFormat.replace("\[layerName\]", fixedLayerName);
                    for (var varName in parsedTokens)
                        outputFormat = outputFormat.replace("\[" + varName + "\]", parsedTokens[varName]);
                    outMod.file = new File(outputFolder + "/" + outputFormat);

                    // Set template after we set the outputfolder
                    rqItem.applyTemplate(selectedRenderSettings);
                    outMod.applyTemplate(selectedOutputModule);
                    // Check if Skip Existing Files is enabled -> Later on add functionality to it actually changing when a specific file extension is used.
                    var renderSettings = rqItem.getSettings();

                    //need to save project between every pass, since we're submitting the scene file (otherwise it'll just render the same thing each time)
                    app.project.save(app.project.file);

                    if (renderSettings["Skip Existing Files"] == "false") {
                        var newSettings = {
                            "Skip Existing Files": true
                        };
                        rqItem.setSettings(newSettings);
                        logger.info("Forced Skip Existing Files on.", _scriptFileSubmitLayersName);
                    }
                    if(i == 0 && dcProperties.config.auto_accept.get() == "False" && !dcUtil.validateAutoAccept())
                    {
                        rqItem.remove();
                        currLayer.enabled = false;
                        currLayer.audioEnabled = false;
                        logger.info("Pressed cancel upload job attachments, aborting entire submission process.", _scriptFileSubmitLayersName);
                        break;
                    }
                    // Fixed layer name is not allowed to have illegal characters(for now only checking on '.', should be updated later if others come up)
                    // Change '.' into '_', ' ' into '_'

                    fixedLayerName = dcUtil.removeIllegalCharacters(fixedLayerName);
                    var submissionResult = dcSubmitButton.submitRenderQueueToDeadlineCloud(rqItem, fixedLayerName);
                    if(!submissionResult)
                    {
                        rqItem.remove();
                        currLayer.enabled = false;
                        currLayer.audioEnabled = false;
                        alert("Failed to submit job for " + fixedLayerName + ".")
                        continue;
                    }
                    submitCount++;
                    rqItem.remove();
                    currLayer.enabled = false;
                    currLayer.audioEnabled = false;

                }
            }

            buttonGroup.progressBar.value = 100;
            alert("Completed submission.\n" + submitCount + " of " + duplicateComp.selectedLayers.length + " jobs were submitted successfully.");
            duplicateComp.remove();
            app.project.save(app.project.file);

            if (renderSettings["Skip Existing Files"] == "true") {
                buttonGroup.progressBar.value = 100;

                //remove the duplicate comp, and save project again
                duplicateComp.remove();
                app.project.save(app.project.file);
                // Restore the original project path if necessary.
                if (restoreProjectPath) {
                    //Delete temp aepx project file if generated by Deadline job submission prior to restoring project path.
                    if (deleteTempXmlFile) {
                        var tempXmlFile = File(projectPath);
                        tempXmlFile.remove();
                    }
                    app.open(File(oldProjectPath));
                    projectName = app.project.file.name; //reset to current projectName for subsequent job submissions.
                    projectPath = app.project.file.fsName; //reset to current projectPath for subsequent job submissions.
                } else if (oldGPUAccelType != null) {
                    app.project.gpuAccelType = oldGPUAccelType;
                }
            }

        }
        if (results.length > 0)
            alert(results);
    }

    function clsButton() {
        /**
         * Close Submit Layers Window
         */

        logger.log("Closing Submit Layer Window", _scriptFileSubmitLayersName, LOG_LEVEL.INFO);
        deadlineCloudSubmitLayers.layersDialog.close();
    }

    // This function will need to be changed so it is accessible for multiple files!
    function makeClickHandlerSubmitLayer(paramName, sourceElement, typeToStrFunction) {
        function handler() {
            var paramAsStr = typeToStrFunction(sourceElement.value);
            deadlineCloudConfiguration[paramName] = paramAsStr;
            logger.log("Set " + paramName + " to " + paramAsStr, _scriptFileSubmitLayersName, LOG_LEVEL.DEBUG);
        }
        return handler();
    }

    return {
        "SubmitLayersToDeadline": SubmitLayersToDeadline
    }
}

dcSubmitLayerButton = __generateSubmitLayerButton();