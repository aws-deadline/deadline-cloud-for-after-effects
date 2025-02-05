// THIS FILE HAS BEEN AUTO-GENERATED.
// Manual changes in this file may be overwritten by a new installation.
// Please change the source files and regenerate this file instead.

var scriptFolder = Folder.current.fsName;

function readFile(filePath) {
    var f = new File(filePath);
    f.encoding = "UTF-8";
    f.open("r");
    var fileContents = f.read();
    f.close();
    return fileContents;
}

function writeFile(filePath, fileContents) {
    var f = new File(filePath);
    f.encoding = "UTF-8";
    f.open("w");
    f.write(fileContents);
    f.close();
    return;
}

function timeToFrames(time, fps) {
    //temporarily change display format so we can convert seconds to frames
    //We could perform the math ourselves, but using After Effects's internal methods ensure that we don't lose precision due to floating point errors
    var prevFrameDisplay = app.project.timeDisplayType;
    var prevFeetFrames = app.project.framesUseFeetFrames;
    app.project.timeDisplayType = TimeDisplayType.FRAMES;
    app.project.framesUseFeetFrames = false;
    var frame = timeToCurrentFormat(time, fps, false);
    app.project.timeDisplayType = prevFrameDisplay;
    app.project.framesUseFeetFrames = prevFeetFrames;
    return frame;
}

function sanitizeOutputs(outputPaths) {
    var sanitized = [];
    var sanitizedPath = "";
    for (var i = 0; i < outputPaths.length; i++) {
        sanitizedPath = sanitizeFilePath(outputPaths[i]);
        if (sanitizedPath) {
            sanitized.push(sanitizedPath);
        }
    }
    return sanitized;
}

function sanitizeFilePath(filePath) {
    return filePath
        .replace(/^\s+/, "")
        .replace(/\s+$/, "")
        .replace(/([\/\\])\s+/, "$1")
        .replace(/\s+([\/\\])/, "$1");
}

// Binary data for the Deadline Cloud logo
function logoData() {
    return '\u0089PNG\r\n\x1A\n\x00\x00\x00\rIHDR\x00\x00\x00 \x00\x00\x00 \b\x02\x00\x00\x00\u00FC\x18\u00ED\u00A3\x00\x00\x00\tpHYs\x00\x00\x17\u009F\x00\x00\x17\u009F\x01K\u009C3R\x00\x00\x00\x19tEXtSoftware\x00www.inkscape.org\u009B\u00EE<\x1A\x00\x00\x05\u008CIDATH\u00C7uVilTU\x14\u00FE\u00CE\u009B\u00D7Y\u0099\u00EECiR\x02B\u0084H\n"P\u0091}QQ\tT\x14\u00A5\x14!"FH\u0091\x02)5\u00FC!1\x18\x13PP\x14\u00C5\x10!\u0080&\u0084E\x01\u00A51\u0090\u00B2\x05e\u0084\x10\u00DB\u008AHY\\J)e)\u00C5af\u00DA\u00E9L\u00DF\u00CC\x1C\x7F\u00DC\u00B7\u00CE\u00B4\u00FF\u00EE\u00BB\u00EFl\u00F7\u00DC\u00F3}\u00F7\u00A3\u00A6U\u00D9D\x001\x11\u0088@\u00C4 \x101\x11\u00F4\x05A7\x10\x7F\u00D3\fL\u00FBV\x03\u0096\u0099\x01\u0080@\f\x06\x00\x10\u0081\x19\x040\x01\x10\u00FB\u00A4\x1B\x10\u0081!\u00B6T\x03\u00E1&\u00BC\u00D4\u0085\u00B6\t\x02\u00C9\x001\u00B3\u00F8\u0080\u00C9H\u00840\u00E7\u00D6\u00C2\x11\u0088\tj\x0Epzh\u0091[\u00F5\u0092\u0099Ad\r\u00AD\u009EI+\u00DF\u00C8\u00ADVm9\x1F\u00B1Q>\u00EB\x06\u00D0\u00BDdp\u00DA\x19\u0089\u008D\u00D0\u00AC\u00B7\x0E\u00A9\u00A1\u00B5c\x19\u00E5\u0093Q>\u00D4BIb&0\u0098!\x16\u00DA\x1A`b-\u00B78\u00B8\\4&o\u00F9\u00CF\u00B9\u00CB\u00FDr\u00FF\u00B1\u0086\u0081\u00E1Elrg\x16^\u0090t#6\u008CH\u00CF!\u00F6\u00C9\u0099\u009D5\u00E7\u00B3\u00FC\u008AS$;\u00C8\u0096\u0091\u00FB\u00CE\t\u00EF\u009C/\u00C9\u0095\u009B\x16\u009A\u00CC^"\u00ACme\u0089\x0B\x04q\x0F\u00E2\x1AE\u00FB\u00D45I\u009E\u00D1\u00F3\u00F3\x17\u00EF\u00B7\u00F7\x1F\u00DDq\u00E6\u0093\u00E0\u00C1\u00A5\u009D\x17wr\u00F4\u0091\u00E7\u0099\n\u00D7\u00D8eH\u00C4\u0094\u00D6:\x02\x0BWS\x042\x167*\u00F2R\u0086\x1A\u00DA\u00EC\u00DB\x0B\u0087\u00E6\u00BE\u00F6\u00A9c\u00D0\u00F8\u00AE?k\u0082G\u00D7&\u0082\u00B7\u00C9&K\u0092\u00C4\u00C9\u0098\u009C]\u00949\u00EB#\u00C7\u00B0R\u00A5\u00F9|\u00C7O\u00AB\x12mWL\u008E\x16(\u00D8*\u00C7\u00B8\u00F5\u00FCz\u00F9\u0092\u00DD\u00955\u00A3:\x7F\u00E1\u00D7\x00\x1E\u00EE[\x1A:\u00B9\u0089\u00A3a\u00D7\x13/\u00E5/9\u00E4\u0099T\u0099\u00EC|\u00A8\u00DC\u00F4G/\x1FV\u009A\u00FD\u00CE\u00E1\u00AF\u00BA\'U\u0093+Oi9\u008FD\u00B7:%\u00A2\x03D \u00D0\u00F5ey)\u0098t\x0Ez\u00BA\u00EF\u00E2\u009D6\u00AF/x\u00FA\u008B\u00D0\u00A9\u00CD\u0088G\u00E5\u009C\u00A2\u009C9\x1B]\u00C5\u00B3\u00A2W\u008F!\u00A18\u008BKc\u00D7kC5\u00D5\u0089@\u0093dwz\u00A6T\u00BB\'\u00AE\u00E6H{\u00F8\u00FB\u00C5\u00F1\x16\x7F\n\u00D4m+\u00C6xR\u00DA\u00973cuF\u00C1\u0090\u00BB[^\u0088\\\u00FA\u0081H\u00F2N}\u00D7\u00F7\u00E67\u00E4\u00CC\u00FC\u00EF@E\u00E8\u00C4\u0086\u00AE?\u008E\u00C4o\u00D7\u00B9G\u0095{&\u00AF&\u0092\u0094\u00E6\x0B\u00DD\u00FF\u009C\u008E]9\u00E2zj\x01\u00C9\u00AE\u00EE\x1B\u00C7\u00B4PjWd\x15\u008C\x1A\r\u0088\u00F9\u0089\x07Z\u0095\u00FB\x7F;\x1E+\u00F1\u0095o\u0095}\u0083\u00C3g\u00B7\x05O|\f%"\u00C0\u00DAu\u00AD6\u00F6\u00EFX\u00EF\u00B45\u009E\u00A9\u00EF9G\u00CE\x0F\u00FFX\u00D9}\u00F3\u0097D\u00F0\u00B6\x00z\n\x1E%1a0\r/4\u0086\u00C9/\u00DB\u00C2\t\u00E5\u00CE\u00A6\u00C9\u0081\u009A\u00F5\x1C\u008B\u0098\x06\u009A\u0092\u00DD]\u00A1\u00DA\x0F\u00DB\u00B7\u008E\u00E7h0\u00F3\u0095\u00AF\x04^X\u00C30\u0083\u00F4\u00B0\u0092\x19/\u00E6\x1C\u00CC\x00\u00D9"\u008D\'\u0095{\u00D7\x18*L5|\u00A8XQ\u00DA\u00FE\u008A^\u00AB\u0085dS\u00E1\x06\x03\x13\x00\t/\u0089\u00CD\u00E5k\u00FF\x00\u009D+M\u00B9\u00D5k"\x06\u00E4\u0082a\u0094\u00E1a\x06\u008B\u00C9\x11^\u00A6\u00DCzX\u00D9`\x12\u00D6\tR\u00FD\u00A7\u00F6\u0094\u00CDL\x05\u009B\u00B7 {\u00F6z\u00CF\u00A8\u00B2D\u00E8n\u00E8\u00F8\x07\x1Dg?O<ja6u\x06\x16n7\u00C8N\'a\u0086A\u00F3jg\u00B4\u00F1\u00F6NX\u0092=s\x1D\u00C7c\u0081\u00C3U\u00CE\u00A1\u00CF\u00E6\u0094mw\u008Dx9x\u00B4\u00DA\u00F02\u00C8_\u00F5\u0092\u00D2\u00D9\n:\u00EF3;\u008A\u008A\u00C9\u00D1G\x18\u00B8G\u0094\u00E6\u00CE\u00DD\u00D4Y\x7F\u00E8\u00CE\u00C6\u0092\u00F0\u00AF\u00BB\u00DB\u00F7,l\u00DFU\u0096Q8<g\u00FE.X\u008F\u00AB\u00DE\x19\u00D4KNg+\u00F5\u0092\x03\u00A7\u00B7;\x07\u008F\u00EB\u00BF\u00EE\u0082{d)\x03\u00E4\u00F0\x00x\u00F8\u00DD\u009Ad$$bu5\x1E\u008F\u00D4\x1F$\u00BB\u0087\u00F5\u00B2\u008C)\x0031 1\u00AC\u00A1\x19\u00CCl\u00CB.\u00CC\u00C8\x1B\x10\u00F4\u00EFm^?.\u00DAT\u00D7\u00EF\u00ED=\u00CE!SL\u0087S\x0B\x14!\u00A01\u00A8:\x1A\u00D6\u008A%\u00D5H\x1B\x0Ff\n\u00FA\u00F7qwt\u00E0\u00FB\u00FE\u00DC\x17\u00AB\x12\u00E1\u00F6\u00BB;\u00DE\u00BA\u00B3m^\u00B2#\u00A0\u00DD\u008Ad\u00CC\u00AB\u00F1Z \x11\u00B8\u00D5\u00F9\u00DB^\u00D3\u00FC\u00A89l\x15O\u00F6!\u008D&\b\x04B<x?x\u00EE[p2of\u0095\u00B7d\u00AEr\u00EFF\u00E4\u00EA\u0099D\u00A8M\u00CE\u00EC\u00EB-y\u00DD\u00F5\u00F8\u00C4hs}\u00B2\u00A3]\u00B2\u00D9\u00BD\u00D3*\u00B3\u00A6\u00ADR\u00EE5v\u00D6\x1F\u00EC\u00BAR\u0093\f\u00B6\x1A\x1C\u00A7>\u0099\u00A0K\u008B\n4\u00F2\u00E3\x14=b\u00F7\r((\u00DF\u00E8)~\u00AE\u00F3r\u00ED\u0083\x03\u00D5\u00F1@\u00AB{\u00C8\x04_\u00D9f\u00D970|n\u00B7k\u00E8\x14\u00D97(t\u00E6\u008B\u00D0\u00A9\u00CDP\u00BAz\u00D6;\x04[\u00C5\b\u00AFQ\u00BE\u0089\u00A4\x00JF\x1E\u0085/\x1E\u008A\u00B5\\\u00CA\x1C_\u009E\u00F3\u00FCJp2\\w8\u00EC\u00DF\u00C3\u00D1`\u00D6\u00F4\x15\u00F1\u00F6\u00A6\u00B6\u009D\u00E5\u0091\u0086#H(\u00A6GF\x7Fy\u00B4\u00AE\u00FC\u00BE\u00B0\u009FZ>z\u00C8/\u008Ees\u00BA\u00F3f\u00AF\u00CD\u009E\u00BE\u00B4\u00BB\u00B5\u00F1\u00C1\u00FE\u00AA\u00D8\u00AD\x06\u00C9\u00EE@<\u00AA?M\u00E6\u00F2\u00CD2\x0E\u00C4\u00D4\u00F0F\u00BF\x1E4\x1Dz\u0090l\u00CE\u00A2a\u00BEy\x1B\u00C0\u00C9{;\x16%c!\u00EAE\u00CA\u0089[0\u00A4b\u00C3\u0082\u00C2\u00DE\u00DA\u00D7\u00E3\x13\u00D8\u00BB\\L-\u009FH\x13^=\u00CBE\x1D\u00EEd\u0095l\u00DC\u009B\\4T\u009A\u00A1B\u0089e\u00E8\u00A2\u00CE*\u00E5\f%\n\u00EB\x1Bb\u0095r)J\u00D4\u00AA\x04\x01@6\u0098\u00C7*\u00E5\u00C8\u00B4o\u00D5t=K\u00B9\u00DE\x04\u00AEl\u00C0?MH\u008B\u00D7\'\u00ADuFg,J\u00B4\x17\u0081\u00FB?\x0B\u00ED\u00A7Pm-\u00EE\x14\x00\x00\x00\x00IEND\u00AEB`\u0082';
}

function recursiveDelete(folder) {
    // AE's internal getFiles() returns null objects for some reason so we need to use system calls
    if (folder == null || !folder.exists) {
        return;
    }
    var command;
    if (Folder.fs == "Windows") {
        command = 'cmd.exe /c "rmdir /s /q ^"' + folder.fsName + '^""';
    } else {
        command = "/bin/sh -c 'rm -rf \"" + folder.fsName + "\"'";
    }
    system.callSystem(command);
}

function recursiveCopy(src, dst) {
    // AE's internal getFiles() returns null objects for some reason so we need to use system calls
    if (src == null || !src.exists || dst == null || !dst.exists) {
        return;
    }
    var command;
    if (Folder.fs == "Windows") {
        command =
            'cmd.exe /c "robocopy /s ^"' +
            src.fsName +
            '^" ^"' +
            dst.fsName +
            '^""';
    } else {
        command =
            "/bin/sh -c 'cp -r " +
            src.fsName.replace(/ /g, "\\ ") +
            "/* " +
            dst.fsName.replace(/ /g, "\\ ") +
            "/'";
    }
    system.callSystem(command);
}


/**
 * Creates alerts for Deadline Cloud Submitter
 **/
function adcAlert(message, errorIcon) {
    alert(message, "Deadline Cloud Submitter", errorIcon);
}

function __generateUtil() {

    var scriptFileUtilName = "Util.jsx";


    function toBooleanString(value) {
        /**
         * Check if given value is true or false.
         * Return result
         * @param {string} value - "true" or "false" given as a string.
         */
        if (value)
            return "true";
        else
            return "false";
    }

    function parseBool(value) {
        /**
         * Changes string given value into a boolean and return it.
         * @param {string} value - Given value to transform in boolean type.
         * Returns boolean transformed value
         */
        value = value.toLowerCase();
        if (value == "1" || value == "t" || value == "true")
            return true;

        return false;
    }

    function trimIllegalChars(stringToTrim) {
        /**
         * Trims certain characters out of a given string
         * @param {string} stringToTrim - Given string to trim illegal characters from.
         * Returns trimmed string
         */
        // \ / : * ? " < > |
        return stringToTrim.replace(/([\*\?\|:\"<>\/\\%£])/g, "");
    }

    function sliderTextSync(sliderObj, textObj, minValue, maxValue) {
        /**
         * Create a link between slider value and text value. If you change one the other changes with the same value.
         * @param {slider} sliderObj - Slider object
         * @param {edittext} textObj - Text object
         * @param {int} minValue - Minimum value that the slider/edittext can have.
         * @param {int} maxValue - Maximum value that the slider/edittext can have
         */
        textObj.onChange = function() {
            var newValue = parseFloat(textObj.text);
            if (!isNaN(newValue) && newValue >= minValue && newValue <= maxValue) {
                sliderObj.value = newValue;
                logger.log("Changed editText(" + textObj.name + ") value to: " + newValue, scriptFileUtilName, LOG_LEVEL.DEBUG);
            }
        }


        sliderObj.onChange = function() {
            textObj.text = Math.round(this.value);
            logger.log("Changed sliderObject(" + sliderObj.name + ") value to: " + Math.round(this.value), scriptFileUtilName, LOG_LEVEL.DEBUG);
        }
    }

    function changeTextValue(sliderObj, textObj, minValue, maxValue) {
        /**
         * Create a link between slider value and text value. If you change one the other changes with the same value.
         * @param {slider} sliderObj - Slider object
         * @param {edittext} textObj - Text object
         * @param {int} minValue - Minimum value that the slider/edittext can have.
         * @param {int} maxValue - Maximum value that the slider/edittext can have
         */
        var sliderValue = Math.round(sliderObj.value);
        if (!isNaN(sliderValue) && sliderValue >= minValue && sliderValue <= maxValue) {
            textObj.text = sliderValue;
        }

    }

    function changeSliderValue(sliderObj, textObj, minValue, maxValue) {
        /**
         * Create a link between slider value and text value. If you change one the other changes with the same value.
         * @param {slider} sliderObj - Slider object
         * @param {edittext} textObj - Text object
         * @param {int} minValue - Minimum value that the slider/edittext can have.
         * @param {int} maxValue - Maximum value that the slider/edittext can have
         */

        var newValue = parseFloat(textObj.text);
        if (newValue < minValue) {
            textObj.text = minValue;
            sliderObj.value = minValue;
        } else if (newValue > maxValue) {
            textObj.text = maxValue;
            sliderObj.value = maxValue;
        }
        if (!isNaN(newValue) && newValue >= minValue && newValue <= maxValue) {
            sliderObj.value = newValue;
        }
    }

    function spinBoxLimiterMin(minValue, maxValue) {
        /**
         * Limits spinbox minimum value.
         * @param {int} minValue - Minimum value allowed for the spinbox.
         * @param {int} maxValue - Maximum value allowed for the spinbox.
         */
        minValue.text = minValue.text.replace(/[^\d]/g, '');

        if (parseInt(minValue.text) > parseInt(maxValue.text)) {
            minValue.text = maxValue.text;
        }
    }

    function spinBoxLimiterMax(minValue, maxValue) {
        /**
         * Limits spinbox maximum value.
         * @param {int} minValue - Minimum value allowed for the spinbox.
         * @param {int} maxValue - Maximum value allowed for the spinbox.
         */
        maxValue.text = maxValue.text.replace(/[^\d]/g, '');
        if (parseInt(maxValue.text) < parseInt(minValue.text)) {
            maxValue.text = minValue.text
        }
    }

    function editTextIntValidation(editTextObject, sliderObject) {
        /**
         * Validates edit text widget data to be able to use in slider object.
         * @param {Object} editTextObject - Target object to set data for.
         * @param {Object} sliderObject - Source object to retrieve data from.
         */
        editTextObject.text = editTextObject.text.replace(/[^\d]/g, '');
        if (editTextObject.text == "") {
            editTextObject.text = Math.round(sliderObject.value);
        }
    }

    function getAssetsInScene(listBox) {
        /**
         * Gets available assets in the scene that have been previously added to a listbox,
         * and adds the; into a list
         * @param {Object} listBox - Source object to retrieve data from.
         * Returns array with assets available in the scene.
         */
        var _assetsList = []
        for (var i = 0; i < listBox.items.length; i++) {
            _assetsList.push(listBox.items[i].text);
        }
        return _assetsList;
    }

    function getDescription() {
        /**
         * Get description data from UI.
         * Returns either data or empty string, depending on the user given description.
         */
        if (descriptionGroup.textComment.text) {
            return descriptionGroup.textComment.text;
        }
        return "";
    }

    function checkGPUAccelType(submitScene, ignoreGPUAccelWarning) {
        var gpuType = app.project.gpuAccelType;
        var changeGPUType = false;

        if (!ignoreGPUAccelWarning && typeof gpuType != "undefined" && gpuType != GpuAccelType.SOFTWARE) {
            if (submitScene) {
                if (confirm("This After Effects project is currently configured to take advantage of gpu acceleration, which means every machine NEEDS a mercury enabled gpu.\n\nWould you like to disable this by changing it to 'Mercury Software Only'? Click 'YES' to temporarily convert this project to use CPU processing only. Click 'NO' to leave the setting as is and continue submission.\n\nThis warning can be disabled by toggling 'Ignore GPU Acceleration Warning' under the 'Advanced' tab.")) {
                    changeGPUType = true;
                }
            } else {
                if (confirm("This After Effects project is currently configured to take advantage of gpu acceleration, which means every machine NEEDS a mercury enabled gpu.\n\nWould you like to disable this by changing it to 'Mercury Software Only'? Click 'YES' to convert this project to use CPU processing only. Click 'NO' to leave the setting as is and continue submission.\n\nThis WILL NOT be reverted automatically after submission.\n\nThis warning can be disabled by toggling 'Ignore GPU Acceleration Warning' under the 'Advanced' tab.")) {
                    changeGPUType = true;
                    gpuType = null; // Since we don't want to restore the old value
                }
            }
            if (changeGPUType) {
                app.project.gpuAccelType = GpuAccelType.SOFTWARE;
            } else {
                gpuType = null;
            }
        } else {
            gpuType = null;
        }
        return gpuType;
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

    function getTempFile(fileName) {
        /**
         * Return File instance from temporary directory with the given name.
         */
        var _tempFilePath = normalizePath(Folder.temp.fsName + "/" + fileName);
        var _tempFile = File(_tempFilePath);
        return _tempFile;
    }

    function wrappedCallSystem(cmd) {
        /**
         * Wraps system.callSystem command as required to get output from it.
         *
         * For Windows, wraps it into __two__ "cmd /c " calls.
         *
         * For MacOS, returns the command as-is.
         */
        if (system.osName == "MacOS") {
            return _wrappedCallSystemMac(cmd);
        }
        return _wrappedCallSystemWindows(cmd);
    }

    function _wrappedCallSystemWindows(cmd) {

        var tempOutputFile = getTempFile("deadline_cloud_ae_pipe.txt");
        var tempBootstrapBatFile = getTempFile("aeCallSystemBootstrap.bat");
        var tempBatFile = getTempFile("aeCallSystem.bat");
        logger.debug("Command output path: " + tempOutputFile.fsName, scriptFileUtilName);
        _makeBootstrapBatFile(tempBootstrapBatFile, tempBatFile);
        // Wrapped command with error code output
        cmd = cmd + " > " + tempOutputFile.fsName;
        cmd += "\nIF %ERRORLEVEL% NEQ 0 ("
        cmd += "\n echo ERROR CODE: %ERRORLEVEL% >> " + tempOutputFile.fsName
        cmd += "\n)"
        cmd += "\nexit"
        tempBatFile.open("w");
        tempBatFile.writeln(cmd);
        tempBatFile.close();

        logger.debug("Running command (file):", scriptFileUtilName);
        logger.debug(tempBootstrapBatFile.fsName, scriptFileUtilName);
        logger.debug("Command: ", scriptFileUtilName);
        logger.debug(cmd, scriptFileUtilName);
        // Call bootstrap script and return result via intermediary file.
        system.callSystem(tempBootstrapBatFile.fsName);
        var output = system.callSystem("cmd /c \"type " + tempOutputFile.fsName + "\"");
        return output;
    }

    function _makeBootstrapBatFile(bootstrapFile, tempFile) {
        var _cmd = "@echo off" + "\nstart /min /wait " + tempFile.fsName + "\nexit"
        bootstrapFile.open("w");
        bootstrapFile.writeln(_cmd);
        bootstrapFile.close();
    }

    function _wrappedCallSystemMac(cmd) {
        // Add error code in the output if the command errors.
        cmd = cmd + " || echo \"ERROR CODE: $?\"";
        return system.callSystem(cmd);
    }

    function parseErrorData(output, cmd) {
        /**
         * Parses output string gotten from login/logout.
         * Depending on error code found or not return return_code, error message, result.
         * @param {string} output: String gotten from wrappedCallSystem. Contains error code and message.
         * @param {string} cmd: name of the command that calls upon this function. Used to write message.
         */

        var result = "";
        var message = "";
        var return_code = 0;
        var errorIndex = output.indexOf("ERROR CODE:");
        if (errorIndex !== -1) {
            // Extract the word and everything behind it
            result = output.substring(errorIndex);
            message = cmd + " Failed. Error has occurred.";
            var regex = /ERROR CODE:(.*)/;
            return_code = regex.exec(result);
            return {
                "return_code": return_code,
                "message": message,
                "result": result
            }
        }
        result = "";
        message = cmd + " Successful."
        return {
            "return_code": return_code,
            "message": message,
            "result": result
        }
    }


    function parseVersionData(output) {
        /**
         * Returns list of version numbers in the following order:
         * [MAJOR, MINOR, PATCH]
         */
        // Regular expression to match "version " followed by version number
        var regex = /version\s+(\d+)\.(\d+)\.(\d+)/i;

        // Test if the inputString matches the pattern
        var parsedVersionNumberOutput = output.match(regex);

        // Output the result
        if (parsedVersionNumberOutput) {
            var versionNumbers = [
                parseInt(parsedVersionNumberOutput[1]), // Major
                parseInt(parsedVersionNumberOutput[2]), // Minor
                parseInt(parsedVersionNumberOutput[3]) // Path
            ];
            return versionNumbers;
        } else {
            return [];
        }
    }

    function createExportBundleDir(exportBundleDir, fileName) {
        /**
         * Creates export bundle directory based on given job history directory and the name of the job.
         * Depending on error code found or not return return_code, error message, result.
         * @param {string} exportBundleDir: Job history directory
         * @param {string} fileName: Job name
         * Returns export directory
         */
        var partialDir = getPartialExportDir(exportBundleDir);
        var dir = getPath(partialDir, fileName, exportBundleDir);
        return dir.fsName;
    }

    function removeLineBreak(string) {
        /**
         * Replaces illegal characters in given string
         * @param {string} string: String that contains \n and \r
         * Returns parsed string with no illegal characters.
         */
        var newStr = "";

        // Loop and traverse string
        for (var i = 0; i < string.length; i++) {
            if (!(string[i] == "\n" || string[i] == "\r")) {
                newStr += string[i];
            }
        }
        return newStr;
    }

    function setListBoxSelection(listbox, configData) {
        /**
         * Sets correct item selection in given listbox when name of the item matches config data name.
         * @param {Object} listbox: Listbox object that contains all possible farms/queues
         * @param {string} configData: Name of the default farm/queue
         */
        for (var i = 0; i < listbox.items.length; i++) {
            if (configData == listbox.items[i].text) {
                listbox.selection = i;
            }
        }
    }

    function getPath(toCheckDir, fileName, rootDir) {
        // 1. Find highest sequence number used for today.
        var splitDir = toCheckDir.split("//");
        var toCheckFolderName = splitDir[splitDir.length - 1];
        var parentDir = toCheckDir.replace(toCheckFolderName, "");
        var mainDir = new Folder(parentDir);
        var subFolders = mainDir.getFiles();
        var regex = new RegExp(toCheckFolderName + "(\\d+)-.*");
        var maxSeqNumber = 0;
        var folderName = "";
        for (var idx = 0; idx < subFolders.length; idx++) {
            folderName = subFolders[idx].fullName
            var match = folderName.match(regex)
            if (!match) {
                continue;
            }
            var seqNr = parseInt(match[1]) // Convert first capture group to int
            if (seqNr > maxSeqNumber) {
                maxSeqNumber = seqNr
            }
        }
        // 2. Create new export directory with next sequence number
        var nextSeqNumber = maxSeqNumber + 1
        // Sequence numbers under 10 are zero-padded.
        if (nextSeqNumber < 10) {
            nextSeqNumber = "0" + nextSeqNumber;
        }
        var folder = new Folder(toCheckDir + nextSeqNumber + "-AfterEffects-" + fileName);
        if (!folder.exists) {
            folder.create();
        }
        return folder;
    }

    function getPartialExportDir(job_history_dir) {
        /**
         * Creates string with correct name and format to be used in job history directory creation.
         * @param {string} job_history_dir: Directory where job bundles is written to on submission.
         * Returns partial job history directory.
         */
        var currentDate = new Date();
        var year = currentDate.getFullYear();
        // Zero pad all integers to a length of 2
        var month = ("0" + (currentDate.getMonth() + 1)).slice(-2); // Months are zero-based
        var day = ("0" + currentDate.getDate()).slice(-2);
        // Create the formatted string
        var formattedYearMonth = year + '-' + month;
        var formattedDate = year + '-' + month + '-' + day;
        var dir = job_history_dir + "//" + formattedYearMonth + "//" + formattedDate + "-";
        return dir;
    }

    function collectHostRequirements() {
        // Remark: gpu memory and worker memory need to be scaled with *1024, for some of the amount capabilities, the unit displayed on the UI is different
        // then the unit used within template, so use this factor to scale the input values.

        var hostRequirements = {
            "attributes": [{
                    "name": "attr.worker.os.family",
                    "anyOf": [
                        osGroup.OSDropdownList.selection.text.toLowerCase()
                    ]
                },
                {
                    "name": "attr.worker.cpu.arch",
                    "anyOf": [
                        cpuArchGroup.cpuDropdownList.selection.text
                    ]
                }
            ],
            "amounts": [{
                    "name": "amount.worker.vcpu",
                    "min": parseInt(cpuGroup.cpuMinText.text),
                    "max": parseInt(cpuGroup.cpuMaxText.text)
                },
                {
                    "name": "amount.worker.memory",
                    "min": parseInt(memoryGroup.memoryMinText.text) * 1024,
                    "max": parseInt(memoryGroup.memoryMaxText.text) * 1024
                },
                {
                    "name": "amount.worker.gpu",
                    "min": parseInt(gpuGroup.gpuMinText.text),
                    "max": parseInt(gpuGroup.gpuMaxText.text)
                },
                {
                    "name": "amount.worker.gpu.memory",
                    "min": parseInt(gpuMemoryGroup.gpuMemoryMinText.text) * 1024,
                    "max": parseInt(gpuMemoryGroup.gpuMemoryMaxText.text) * 1024
                },
                {
                    "name": "amount.worker.disk.scratch",
                    "min": parseInt(scratchSpaceGroup.scratchSpaceMinText.text),
                    "max": parseInt(scratchSpaceGroup.scratchSpaceMaxText.text)
                }
            ]
        }

        if (cpuArchGroup.cpuDropdownList.selection == 0 && osGroup.OSDropdownList.selection == 0) {
            delete hostRequirements.attributes;
        } else if (cpuArchGroup.cpuDropdownList.selection == 0) {
            hostRequirements.attributes.splice(1, 1);
        } else if (osGroup.OSDropdownList.selection == 0) {
            hostRequirements.attributes.splice(0, 1);
        }

        return hostRequirements;
    }

    function deepCopy(obj) {
        /**
         * Creates deep copy of given object to avoid 2 copies overwriting one another.
         * @param {Object} obj: Given object that has to be copied. Extendscript does not have deep copy.
         * Returns deep copy of an object
         */
        if (obj === null || typeof obj !== 'object') {
            return obj;
        }

        if (obj instanceof Array) {
            var copyArray = [];
            for (var i = 0; i < obj.length; i++) {
                copyArray[i] = deepCopy(obj[i]);
            }
            return copyArray;
        }

        if (obj instanceof Object) {
            var copyObject = {};
            for (var key in obj) {
                if (obj.hasOwnProperty(key)) {
                    copyObject[key] = deepCopy(obj[key]);
                }
            }
            return copyObject;
        }
    }

    function getActiveComp(itemName) {
        /**
         * Get the active comp item that matches given name.
         * @param {string} itemName: Target comp name.
         * Returns comp object that matches target comp name.
         */
        // If submit layers pressed -> itemName is not comp name and therefore comp will not be found with render command
        // Check if itemName is an available comp in the project, if not, it is a layer submission
        var comp = itemName;
        var compList = [];
        for (var i = 1; i <= app.project.rootFolder.items.length; i++) {
            var item = app.project.rootFolder.items[i];

            if (item instanceof CompItem) {
                compList.push(app.project.activeItem.name);
            }
        }
        if (compList.indexOf(itemName) !== -1) {
            comp = app.project.activeItem.name;
        }
        return comp;
    }

    function normalizePath(path) {
        var _file = new File(path);
        if (system.osName == "MacOS") {
            _file.changePath(_file.fsName.replace(/\\/g, "/"));
            return _file.fsName;
        }
        // else: Windows
        _file.changePath(_file.fsName.replace(/\//g, "\\"));
        return _file.fsName;
    }

    function enforceForwardSlashes(path) {
        return path.replace(/(\\)+/g, "/");
    }

    function removeIllegalCharacters(inputString) {
        var outputString = inputString.replace(/[.\-\s]/g, "_");

        return outputString;
    }

    /**
     * Replace %20 percentage back to space from the file name for Windows os.
     */
    function removePercentageFromFileName(fileName) {
        var fileName = fileName.replace(/%20/g, " ");
        return fileName;
    }

    function getUserDirectory() {
        /* Return OS specific user home directory. */
        if (system.osName == "MacOS") {
            return $.getenv("HOME")
        }
        // Windows:
        return $.getenv("USERPROFILE");
    }

    function getAEVersion() {
        /* Return After Effects version as float. */
        var versionAsString = app.version.substring(0, 4);
        var version = parseFloat(versionAsString);
        return version
    }

    return {
        "invertObject": invertObject,
        "toBooleanString": toBooleanString,
        "parseBool": parseBool,
        "trimIllegalChars": trimIllegalChars,
        "sliderTextSync": sliderTextSync,
        "changeTextValue": changeTextValue,
        "changeSliderValue": changeSliderValue,
        "checkGPUAccelType": checkGPUAccelType,
        "spinBoxLimiterMin": spinBoxLimiterMin,
        "spinBoxLimiterMax": spinBoxLimiterMax,
        "getAssetsInScene": getAssetsInScene,
        "editTextIntValidation": editTextIntValidation,
        "getDescription": getDescription,
        "wrappedCallSystem": wrappedCallSystem,
        "parseErrorData": parseErrorData,
        "parseVersionData": parseVersionData,
        "createExportBundleDir": createExportBundleDir,
        "removeLineBreak": removeLineBreak,
        "setListBoxSelection": setListBoxSelection,
        "getPath": getPath,
        "getPartialExportDir": getPartialExportDir,
        "collectHostRequirements": collectHostRequirements,
        "deepCopy": deepCopy,
        "getActiveComp": getActiveComp,
        "normalizePath": normalizePath,
        "normPath": normalizePath,
        "enforceForwardSlashes": enforceForwardSlashes,
        "removeIllegalCharacters": removeIllegalCharacters,
        "removePercentageFromFileName": removePercentageFromFileName,
        "getTempFile": getTempFile,
        "getUserDirectory": getUserDirectory,
        "getAEVersion": getAEVersion
    }
}

dcUtil = __generateUtil();


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



var jobTemplateHelperFile = "JobTemplateHelper.json";
/**
 * Generates the basic parameterValue file for the job template
 **/
function parameterValues(
    renderQueueIndex,
    projectFile,
    outputDir,
    outputFileName,
    isImageSeq,
    startFrame,
    endFrame,
    chunkSize
) {
    var parameterValuesList = [{
            name: "deadline:targetTaskRunStatus",
            value: "READY",
        },
        {
            name: "deadline:maxFailedTasksCount",
            value: 20,
        },
        {
            name: "deadline:maxRetriesPerTask",
            value: 5,
        },
        {
            name: "deadline:priority",
            value: 50,
        },
        {
            name: "ProjectFile",
            value: projectFile,
        },
        {
            name: "RenderQueueIndex",
            value: renderQueueIndex,
        },
        {
            name: "OutputDir",
            value: outputDir,
        },
        {
            name: "OutputFileName",
            value: outputFileName,
        },
        {
            name: "Frames",
            value: startFrame.toString() + "-" + endFrame.toString(),
        }
    ];
    if (isImageSeq) {
        parameterValuesList.push({
            name: "ChunkSize",
            value: chunkSize,
        });
    }
    return {
        parameterValues: parameterValuesList
    };
}

/**
 * Generates the basic format of the asset reference for job template.
 **/
function jobAttachmentsJson(inputFiles, outputFolder) {
    return {
        assetReferences: {
            inputs: {
                directories: [],
                filenames: inputFiles,
            },
            outputs: {
                directories: [outputFolder],
            },
            referencedPaths: [],
        },
    };
}

/**
 * Breadth first sweep through the root composition to find all footage and font references
 * More efficient than just iterating through items in the project when
 * there is a lot of unused footage in the project
 **/
function findJobAttachments(rootComp) {
    if (rootComp == null) {
        return [];
    }
    var attachments = [];
    var exploredItems = {}; // using this object as a set because AE doesn't support sets
    attachments.push(app.project.file.fsName);
    exploredItems[rootComp.id] = true;
    var queue = [rootComp];
    while (queue.length > 0) {
        var comp = queue.pop();
        var shouldShowPopup = true; // only show the popup once per comp so the user doesn't get spammed if there's a lot of missing media
        for (var i = 1; i <= comp.numLayers; i++) {
            var layer = comp.layer(i);
            if (
                layer != null &&
                layer instanceof AVLayer &&
                layer.source != null
            ) {
                var src = layer.source;
                if (src.id in exploredItems) {
                    continue;
                }
                exploredItems[src.id] = true;
                if (src instanceof CompItem) {
                    queue.push(src);
                } else if (
                    src instanceof FootageItem &&
                    src.mainSource instanceof FileSource
                ) {
                    if (src.footageMissing) {
                        if (shouldShowPopup) {
                            adcAlert(
                                "Missing Footage: " +
                                src.name +
                                " (" +
                                src.missingFootagePath +
                                ")",
                                false
                            );
                            shouldShowPopup = false;
                        }
                    } else {
                        attachments.push(src.file.fsName);
                    }
                }
            }
        }
    }

    var fontsInProject = getFontsFromFile();

    if (fontsInProject.length > 0) {
        // Notify the user if any fonts are missing or are substituted during the session.
        // A substituted font is a font that was already missing when the project is opened.
        // A missing font is a font that went missing (e.g. font was uninstalled) while the project was open.
        if (app.fonts.missingOrSubstitutedFonts != "") {
            adcAlert("Missing fonts in project: " + (app.fonts.missingOrSubstitutedFonts).toString(), false);
        }
        // Formatting collected fonts
        var fontReferences = generateFontReferences(fontsInProject);
        for (var i = 0; i < fontReferences.length; i++) {
            attachments.push(fontReferences[i]);
        }
    }

    return attachments;
}

/**
 * Collects all fonts from the project.
 * @return an array of font metadata, each item containing the font's temp copy name and the actual location of that font file
 **/
function getFontsFromFile() {
    var fontLocations = [];
    // app.project.usedFonts was introduced in 24.5. Fall back to scanning text layers if version is older
    if (dcUtil.getAEVersion() >= 24.5) {
        var usedList = app.project.usedFonts;
        for (var i = 0; i < usedList.length; i++) {
            var font = usedList[i].font;
            var fontPostScriptName = font.postScriptName;
            var fontLocation = font.location || getLocationForFont(fontPostScriptName);
            if (!fontLocation) {
                adcAlert(
                    "The path to the font " + fontPostScriptName + " couldn't be identified.\n" +
                    "Please install the font for non-Adobe apps in Creative Cloud Desktop before submitting this project.", false
                );
                continue;
            }
            var fontName = createFontFilename(fontLocation, fontPostScriptName);
            if (fontName) {
                fontLocations.push([fontName, fontLocation]);
            }
        }
    } else {
        fontLocations = getFontsFromFileLegacy();
    }

    return fontLocations;
}

/**
 * Checks that the system has Python installed and version >= 3
 * @return String with executable name corresponding to Python 3, or an empty string if not found
 **/
function getPythonExecutable() {
    var pythonExecutables = ["python3", "python"];

    for (var i = 0; i < pythonExecutables.length; i++) {
        // Search for python executable
        var pythonExecutable = pythonExecutables[i];
        var findCommand = "which " + pythonExecutable;
        var findSuccess = "/" + pythonExecutable;
        var os = $.os.toLowerCase();
        if (os.indexOf("windows") !== -1) {
            findCommand = "where " + pythonExecutable;
            findSuccess = "\\" + pythonExecutable;
        }
        var outputWhere = null;
        try {
            outputWhere = system.callSystem(findCommand);
            if (!outputWhere || outputWhere.indexOf(findSuccess) === -1) {
                logger.warning("Couldn't find Python with executable name '" + pythonExecutable + "'");
                continue;
            }
        } catch (e) {
            logger.error(e.message, jobTemplateHelperFile);
            logger.debug("Where command output: " + outputWhere, jobTemplateHelperFile);
        }

        // Python executable was found, verify Python version
        var output = null;
        try {
            output = system.callSystem(pythonExecutable + " --version");
            if (output && output.indexOf("Python ") !== -1) {
                var pythonVersion = parseInt(output.substring(output.indexOf(" ") + 1));
                if (pythonVersion >= 3) {
                    return pythonExecutable;
                }
            }
        } catch (e) {
            logger.error(e.message, jobTemplateHelperFile);
            logger.debug("Command output: " + output, jobTemplateHelperFile);
        }
    }

    // If reaching here, this means python version was too low or executable was not found
    var errorMessage =
        "Error: Couldn't find Python 3 or higher on your PATH.\n" +
        "\n" +
        "Please ensure that Python 3 or higher is installed correctly and added to your PATH.";
    logger.error(errorMessage, jobTemplateHelperFile);
    adcAlert(errorMessage, true);
    return "";
}

/**
 * Scans user font paths for user-installed fonts and parses their name metadata.
 * @return Font metadata object, or null if there was an error
 **/
function getFontPaths() {
    var errorMessage = "";
    // Ensure Python exists and is at least version 3
    var pythonExecutable = getPythonExecutable();
    if (!pythonExecutable) {
        return null;
    }
    var scriptPath = scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate/scripts/get_user_fonts.py";
    var scriptFile = new File(scriptPath);
    if (!scriptFile.exists) {
        errorMessage =
            "Error: Missing font script at " + scriptFile.fsName + "\n" +
            "\n" +
            "Please ensure that the Deadline Cloud Submitter is installed correctly.";
        adcAlert(errorMessage, true);
        return null;
    }

    var output = {};
    try {
        var outputRaw = system.callSystem(pythonExecutable + " \"" + scriptFile.fsName + "\"");
        output = JSON.parse(outputRaw);
    } catch (e) {
        logger.error(e.message, jobTemplateHelperFile);
        logger.debug("Command output: " + output, jobTemplateHelperFile);
        adcAlert(
            "Error when finding fonts:\n" +
            "\n" +
            e.message,
            true
        );
    }
    if ("error" in output) {
        adcAlert(
            output["error"],
            true
        );
        return null;
    }
    return output;
}

/**
 * Gets the path to a user-installed font whose PostScript name is fontPostScriptName.
 * @return The path to that font file or null if the path was not found
 **/
function getLocationForFont(fontPostScriptName) {
    var fontPath = null;
    try {
        // Get user-installed fonts
        var fontPaths = getFontPaths();
        if (!fontPaths) {
            return null;
        }
        for (var path in fontPaths) {
            if (fontPaths[path]["postscript_name"] == fontPostScriptName) {
                // Found path that matches the given font's name
                fontPath = path;
                break;
            }
        }
    } catch (e) {
        logger.error(e.message, jobTemplateHelperFile);
    }
    return fontPath;
}

/**
 * Generates a font filename based on the font name and the extension of the font filename.
 * @return a string with the font filename
 **/
function createFontFilename(fontLocation, fontPostScriptName) {
    var fileExtension = "";
    var lastDotIndex = fontLocation.lastIndexOf('.');
    var extensionRegex = /\.[a-zA-Z]+$/;

    var fontName = "";

    var validExtension = true;
    var fontExtensions = [".otf", ".ttf"];

    // Windows also supports .fon files
    var os = $.os.toLowerCase();
    if (os.indexOf("windows") !== -1) {
        fontExtensions.push(".fon");
    }

    // Some Adobe Fonts files have a dot followed by numbers as its name with no extension (e.g. ".52741")
    if (extensionRegex.test(fontLocation)) {
        fileExtension = fontLocation.substring(lastDotIndex).toLowerCase();
        var fontExtensionsAsString = fontExtensions.toString();
        if (fontExtensionsAsString.indexOf(fileExtension) == -1) {
            adcAlert(
                "font with an unsupported extension '" + fileExtension +
                "' was found: " + fontPostScriptName + ".\n" +
                "This font won't be added to the job.", false
            );
            validExtension = false;
        }
    }

    if (validExtension) {
        var fontName = fontPostScriptName + fileExtension;
    }

    return fontName;
}

/**
 * Collects all fonts from the project. After Effects versions < 24.5 do not have app.usedFonts.
 * @return an array of font metadata, each item containing the font's temp copy name and the actual location of that font file
 **/
function getFontsFromFileLegacy() {
    var fontLocations = [];
    var items = app.project.items;
    for (var i = items.length; i >= 1; i--) {
        var item = app.project.item(i);
        // Only look at CompItems
        if (!(item instanceof CompItem)) {
            continue;
        }
        for (var j = item.layers.length; j >= 1; j--) {
            var layer = item.layers[j];
            // Only look at TextLayers
            if (!(layer instanceof TextLayer)) {
                continue;
            }
            var sourceText = layer.text.sourceText;
            // Check if the sourceText property has keys.
            // If it has keys, the font can change over time and we need to check all keys for their font
            if (sourceText.numKeys) {
                var oldLocation = "";
                for (var k = 1; k <= sourceText.numKeys; k++) {
                    var textDocument = sourceText.keyValue(k);
                    var fontPostScriptName = "";
                    try {
                        fontPostScriptName = textDocument.fontObject.postScriptName;
                    } catch (e) {
                        logger.error(e.message, jobTemplateHelperFile);
                    }
                    var fontLocation = textDocument.fontLocation || getLocationForFont(fontPostScriptName);
                    if (oldLocation == fontLocation) {
                        continue;
                    }
                    if (!fontLocation) {
                        adcAlert(
                            "The path to the font " + fontPostScriptName + " couldn't be identified.\n" +
                            "Please install the font for non-Adobe apps in Creative Cloud Desktop before submitting this project.", false
                        );
                        continue;
                    }
                    var fontName = createFontFilename(fontLocation, fontPostScriptName);
                    if (fontName) {
                        fontLocations.push([fontName, fontLocation]);
                    }
                    oldLocation = fontLocation;
                }
            } else {
                var textDocument = sourceText.value;
                var fontPostScriptName = "";
                try {
                    fontPostScriptName = textDocument.fontObject.postScriptName;
                } catch (e) {
                    logger.error(e.message, jobTemplateHelperFile);
                }
                var fontLocation = textDocument.fontLocation || getLocationForFont(fontPostScriptName);
                if (!fontLocation) {
                    adcAlert(
                        "The path to the font " + fontPostScriptName + " couldn't be identified.\n" +
                        "Please install the font for non-Adobe apps in Creative Cloud Desktop before submitting this project.", false
                    );
                    continue;
                }
                var fontName = createFontFilename(fontLocation, fontPostScriptName);
                if (fontName) {
                    fontLocations.push([fontName, fontLocation]);
                }
            }
        }
    }
    return fontLocations;
}

/**
 * Copies given fonts to a temp folder.
 * @param fontPaths an array of font metadata, each item containing the font's temp copy name and the actual location of that font file
 * @return an array of the temp font paths that were created
 **/
function generateFontReferences(fontPaths) {
    // Create a temp folder where all used fonts get gathered
    var _tempFontsFolder = dcUtil.normPath(Folder.temp.fsName + '/' + "tempFonts");
    var formattedFontsPaths = [];
    var tempFontPath = new Folder(_tempFontsFolder);
    if (!tempFontPath.exists) {
        tempFontPath.create();
    }

    // Copy the font files to the temp folder
    for (var i = 0; i < fontPaths.length; i++) {
        var fontName = fontPaths[i][0];
        var fontLocation = fontPaths[i][1];

        var fontFile = File(fontLocation);
        var _tempFontPath = dcUtil.normPath(_tempFontsFolder + "/" + fontName);
        var fontCopied = fontFile.copy(_tempFontPath);
        // Check if font file was actually copied.
        if (fontCopied) {
            formattedFontsPaths.push(_tempFontPath);
        }
    }
    return formattedFontsPaths;
}


function isVideoOutput(extension) {
    const VideoOutputExtensions = ["avi", "mp4", "mov"];
    return VideoOutputExtensions.indexOf(extension) >= 0;
}

function isAudioOutput(extension) {
    const AudioOutputExtensions = ["aif", "mp3", "wav"];
    return AudioOutputExtensions.indexOf(extension) >= 0;
}

function isImageOutput(extension) {
    const FrameOutputExtensions = ["dpx", "iff", "jpg", "jpeg", "exr", "png", "psd", "hdr", "sgi", "tif", "tiff", "tga"];
    return FrameOutputExtensions.indexOf(extension) >= 0;
}



/**
 * Submit the selected render queue item
 **/
function SubmitSelection(selection, framesPerTask) {
    const submitBundleFile = "SubmitButton.jsx";
    // first we must verify that our selection is valid
    if (selection == null) {
        adcAlert("Error: No selection", true);
        return;
    }

    var renderQueueIndex = selection.renderQueueIndex;
    var rqi;

    // because our panel is updated independently of the render queue, the two may become out of sync
    // we need to verify that the selection made actually matches what is in the render queue
    if (
        renderQueueIndex < 1 ||
        renderQueueIndex > app.project.renderQueue.numItems
    ) {
        adcAlert(
            "Error: Render Queue has changed since last refreshing. Refreshing panel now. Please try again.", true
        );
        updateList();
        return;
    }
    rqi = app.project.renderQueue.item(renderQueueIndex);
    if (rqi == null || rqi.comp.id != selection.compId) {
        adcAlert(
            "Error: Render Queue has changed since last refresh. Refreshing panel now. Please try again.", true
        );
        updateList();
        return;
    }
    if (rqi.numOutputModules > 1) {
        adcAlert(
            "Warning: Multiple output modules detected. It is not supported in current submitter. Please raise an issue on Github repo for feature request.", false
        );
        return;
    }

    //We have a valid selection
    var confirmation = confirm("Project must be saved before submitting. Continue?");
    if (!confirmation) {
        return;
    } else {
        app.project.save();
    }
    if (app.project.file == null) {
        // If the user hit yes to the prompt, but the file had never been saved, a second prompt would appear asking where they would want to save the project.
        // If they hit cancel on the second prompt, the project file should be null and we should cancel the submission.
        return;
    }
    var outputPath = "";
    var outputFile = "";
    var outputFolder = "";
    for (var j = 1; j <= rqi.numOutputModules; j++) {
        var outputModule = rqi.outputModule(j).file;
        if (outputModule == null) {
            if (rqi.numOutputModules > 1) {
                adcAlert("Error: Output module does not have its output file set", true);
            } else {
                adcAlert(
                    "Error: One of your output modules does not have its output file set", true
                );
            }
            return;
        } else {
            outputPath = outputModule.fsName;
            outputFile = outputModule.name;
            outputFolder = outputModule.parent.fsName;
            logger.debug("OutputPath is: " + outputPath, submitBundleFile);
            logger.debug("OutputFile is: " + outputFile, submitBundleFile);
            logger.debug("outputFolder is: " + outputFolder, submitBundleFile);
        }
    }
    var renderSettings = rqi.getSettings(GetSettingsFormat.STRING_SETTABLE);
    var startFrame = Number(
        timeToFrames(
            Number(renderSettings["Time Span Start"]),
            Number(renderSettings["Use this frame rate"])
        )
    );
    var endFrame =
        Number(
            timeToFrames(
                Number(renderSettings["Time Span End"]),
                Number(renderSettings["Use this frame rate"])
            )
        ) - 1; // end frame is inclusive so we subtract 1

    var dependencies = findJobAttachments(rqi.comp); // list of filenames
    var compName = dcUtil.removeIllegalCharacters(rqi.comp.name);

    function generateAssetReferences(bundlePath, sanitizedOutputFolder) {
        // Write the asset_references.json file
        var jobAttachmentsContents = jobAttachmentsJson(
            dependencies,
            sanitizedOutputFolder
        );
        var assetReferencesOutDir = bundlePath + "/asset_references.json";
        writeFile(assetReferencesOutDir, JSON.stringify(jobAttachmentsContents, null, 4));
    }

    /**
     * Generates parameter_values json file
     **/
    function generateParameterValues(bundlePath, outputFolder, outputFileName, isImageSeq) {
        var parametersOutDir = bundlePath + "/parameter_values.json";
        writeFile(
            parametersOutDir,
            JSON.stringify(
                parameterValues(
                    renderQueueIndex,
                    app.project.file.fsName,
                    outputFolder,
                    outputFileName,
                    isImageSeq,
                    startFrame,
                    endFrame,
                    framesPerTask
                ),
                null,
                4,
            )
        );
    }

    /**
     * Generates job template json file
     **/
    function generateTemplate(bundlePath, isImageSeq) {
        // Open the template depending on the output type
        var path = bundlePath + "/video_template.json";
        if (isImageSeq) {
            path = bundlePath + "/image_template.json";
        }
        var templateContents = readFile(path);
        // Parse the template string to a JSON object
        var templateObject = JSON.parse(templateContents);
        templateObject.name = File.decode(app.project.file.name) + " [" + compName + "]";
        logger.debug("The template name is " + templateObject.name, submitBundleFile);
        try {
            if (templateObject.steps[0].name) {
                templateObject.steps[0].name = compName;
                logger.debug("The step name is " + templateObject.steps[0].name, submitBundleFile);
            }
        } catch (e) {
            adcAlert("Error accessing the template's steps name. \nPlease check your template.json and make sure you have name under steps.", true);
            logger.debug("Error accessing the template's steps name. " + error, submitBundleFile);
        }
        const aftereffectsVersion = app.version[0] + app.version[1];
        logger.debug("The major version of After Effects is " + aftereffectsVersion, submitBundleFile);

        var paramDefCopy = templateObject.parameterDefinitions;

        for (var i = paramDefCopy.length - 1; i >= 0; i--) {
            if (paramDefCopy[i].name == "CondaPackages") {
                paramDefCopy[i].default = "aftereffects=" + aftereffectsVersion;
            }
        }
        writeFile(bundlePath + "/template.json", JSON.stringify(templateObject, null, 4));
        logger.debug("Wrote the template.json file to the bundle folder " + bundlePath, submitBundleFile);
    }

    /**
     * Generates the job bundle, including template.json, parameter_values.json
     * and asset_references.json
     **/
    function generateBundle() {
        // create the job bundle folder
        var bundleRoot = new Folder(
            Folder.temp.fsName + "/DeadlineCloudAESubmission"
        ); //forward slash works on all operating systems
        recursiveDelete(bundleRoot);
        bundleRoot.create();
        var bundlePath = bundleRoot.fsName;

        var sanitizedOutputFolder = sanitizeFilePath(outputFolder);

        // The image sequence output file has the pattern "[#####]" which will be printed out as
        // "%5B#####%5D" so we need to replace them.
        var regex = new RegExp('\\b' + "%5B#####%5D" + '\\b', 'g');
        var outputFileNameNoRegex = outputFile.replace(regex, "[#####]");
        // Split the file name to extract the file name and extension
        // Create lastIndex and regex to remove unwanted parts in the name.
        var lastIndex = outputFileNameNoRegex.lastIndexOf(".");
        var extension = outputFileNameNoRegex.substring(lastIndex + 1);
        logger.debug("extension set to: " + extension, submitBundleFile);
        var sanitizedOutputFileName = dcUtil.removePercentageFromFileName(outputFileNameNoRegex);
        logger.debug("sanitizedOutputFileName is " + sanitizedOutputFileName, submitBundleFile);
        var isImageSeq = isImageOutput(extension);

        generateAssetReferences(bundlePath, sanitizedOutputFolder);
        generateParameterValues(bundlePath, sanitizedOutputFolder, sanitizedOutputFileName, isImageSeq);

        var jobTemplateSourceFolder = new Folder(
            scriptFolder + "/DeadlineCloudSubmitter_Assets/JobTemplate"
        );
        if (!jobTemplateSourceFolder.exists) {
            adcAlert(
                "Error: Missing job template at " + jobTemplateSourceFolder.fsName, true
            );
            return null;
        }
        recursiveCopy(jobTemplateSourceFolder, bundleRoot);

        generateTemplate(bundlePath, isImageSeq);
        return bundleRoot;
    }
    var bundle = generateBundle();

    // Runs a bat script that requires extra permissions but will not block the After Effects UI while submitting.
    var cmd =
        'deadline bundle gui-submit "' + bundle.fsName + "\" --output json --install-gui";
    var logFile = new File(Folder.temp.fsName + "/submitter_output.log");
    logFile.open("w"); // Erase contents of active log file
    logFile.close();
    var submitScriptContents = "";
    var output = "";
    if ($.os.toString().slice(0, 7) === "Windows") {
        var tempBatFile = new File(
            Folder.temp.fsName + "/DeadlineCloudAESubmission.bat"
        );
        submitScriptContents = cmd + " > " + Folder.temp.fsName + "\\submitter_output.log 2>&1";
        tempBatFile.open("w");
        tempBatFile.writeln("@echo off");
        tempBatFile.writeln("echo:"); //this empty print statement is required to circumvent a weird bug
        tempBatFile.writeln(submitScriptContents);
        tempBatFile.writeln("IF %ERRORLEVEL% NEQ 0 (");
        tempBatFile.writeln(" echo ERROR CODE: %ERRORLEVEL% >>" + logFile.fsName);
        tempBatFile.writeln(")");
        tempBatFile.close();
        system.callSystem(tempBatFile.fsName);
        if (logFile.exists) {
            logFile.open("r");
            output = logFile.read();
            logFile.close();
        }
    } else {
        // Execute the command using a bash in the interactive mode so it loads the bash profile to set
        // the PATH correctly.
        var shellPath = $.getenv("SHELL") || "/bin/bash";
        submitScriptContents = shellPath + " -i -c '" + cmd + "'";
        output = system.callSystem(submitScriptContents + ' || echo "\nERROR CODE: $?"');
    }
    if (output.indexOf("\nERROR CODE: ", 0) >= 0) {
        adcAlert(
            "ERROR:" + output, true
        );
        logger.error("Error when launching Deadline GUI submitter: " + output, "Utils.jsx");
    }
}


/**
This file is sourced from https://github.com/ExtendScript/extendscript-es5-shim .

This file is provided under the MIT license which is reproduced here:

  The MIT License (MIT)

  Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

//indexOf.js
/*
https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/indexOf#Polyfill
*/
// Production steps of ECMA-262, Edition 5, 15.4.4.14
// Reference: http://es5.github.io/#x15.4.4.14
if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {
        // 1. Let o be the result of calling ToObject passing
        //    the this value as the argument.
        if (this === void 0 || this === null) {
            throw new TypeError(
                "Array.prototype.indexOf called on null or undefined"
            );
        }

        var k;
        var o = Object(this);

        // 2. Let lenValue be the result of calling the Get
        //    internal method of o with the argument "length".
        // 3. Let len be ToUint32(lenValue).
        var len = o.length >>> 0;

        // 4. If len is 0, return -1.
        if (len === 0) {
            return -1;
        }

        // 5. If argument fromIndex was passed let n be
        //    ToInteger(fromIndex); else let n be 0.
        var n = +fromIndex || 0;

        if (Math.abs(n) === Infinity) {
            n = 0;
        }

        // 6. If n >= len, return -1.
        if (n >= len) {
            return -1;
        }

        // 7. If n >= 0, then Let k be n.
        // 8. Else, n<0, Let k be len - abs(n).
        //    If k is less than 0, then let k be 0.
        k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

        // 9. Repeat, while k < len
        while (k < len) {
            // a. Let Pk be ToString(k).
            //   This is implicit for LHS operands of the in operator
            // b. Let kPresent be the result of calling the
            //    HasProperty internal method of o with argument Pk.
            //   This step can be combined with c
            // c. If kPresent is true, then
            //    i.  Let elementK be the result of calling the Get
            //        internal method of o with the argument ToString(k).
            //   ii.  Let same be the result of applying the
            //        Strict Equality Comparison Algorithm to
            //        searchElement and elementK.
            //  iii.  If same is true, return k.
            if (k in o && o[k] === searchElement) {
                return k;
            }
            k++;
        }
        return -1;
    };
}
//json2.js
//  json2.js
//  2017-06-12
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(
//                         +a[1], +a[2] - 1, +a[3], +a[4], +a[5], +a[6]
//                      ));
//                  }
//                  return value;
//              }
//          });

//          myData = JSON.parse(
//              "[\"Date(09/09/2001)\"]",
//              function (key, value) {
//                  var d;
//                  if (
//                      typeof value === "string"
//                      && value.slice(0, 5) === "Date("
//                      && value.slice(-1) === ")"
//                  ) {
//                      d = new Date(value.slice(5, -1));
//                      if (d) {
//                          return d;
//                      }
//                  }
//                  return value;
//              }
//          );

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
    eval, for, this
*/

/*property
    JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/

// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
    JSON = {};
}

(function() {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three =
        /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable =
        /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous =
        /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10 ? "0" + n : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {
        Date.prototype.toJSON = function() {
            return isFinite(this.valueOf()) ?
                this.getUTCFullYear() +
                "-" +
                f(this.getUTCMonth() + 1) +
                "-" +
                f(this.getUTCDate()) +
                "T" +
                f(this.getUTCHours()) +
                ":" +
                f(this.getUTCMinutes()) +
                ":" +
                f(this.getUTCSeconds()) +
                "Z" :
                null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;

    function quote(string) {
        // If the string contains no control characters, no quote characters, and no
        // backslash characters, then we can safely slap some quotes around it.
        // Otherwise we must also replace the offending characters with safe escape
        // sequences.

        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string) ?
            '"' +
            string.replace(rx_escapable, function(a) {
                var c = meta[a];
                return typeof c === "string" ?
                    c :
                    "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) +
            '"' :
            '"' + string + '"';
    }

    function str(key, holder) {
        // Produce a string from holder[key].

        var i; // The loop counter.
        var k; // The member key.
        var v; // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

        // If the value has a toJSON method, call it to obtain a replacement value.

        if (
            value &&
            typeof value === "object" &&
            typeof value.toJSON === "function"
        ) {
            value = value.toJSON(key);
        }

        // If we were called with a replacer function, then call the replacer to
        // obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

        // What happens next depends on the value's type.

        switch (typeof value) {
            case "string":
                return quote(value);

            case "number":
                // JSON numbers must be finite. Encode non-finite numbers as null.

                return isFinite(value) ? String(value) : "null";

            case "boolean":
            case "null":
                // If the value is a boolean or null, convert it to a string. Note:
                // typeof null does not produce "null". The case is included here in
                // the remote chance that this gets fixed someday.

                return String(value);

                // If the type is "object", we might be dealing with an object or an array or
                // null.

            case "object":
                // Due to a specification blunder in ECMAScript, typeof null is "object",
                // so watch out for that case.

                if (!value) {
                    return "null";
                }

                // Make an array to hold the partial results of stringifying this object value.

                gap += indent;
                partial = [];

                // Is the value an array?

                if (Object.prototype.toString.apply(value) === "[object Array]") {
                    // The value is an array. Stringify every element. Use null as a placeholder
                    // for non-JSON values.

                    length = value.length;
                    for (i = 0; i < length; i += 1) {
                        partial[i] = str(i, value) || "null";
                    }

                    // Join all of the elements together, separated with commas, and wrap them in
                    // brackets.

                    v =
                        partial.length === 0 ?
                        "[]" :
                        gap ?
                        "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]" :
                        "[" + partial.join(",") + "]";
                    gap = mind;
                    return v;
                }

                // If the replacer is an array, use it to select the members to be stringified.

                if (rep && typeof rep === "object") {
                    length = rep.length;
                    for (i = 0; i < length; i += 1) {
                        if (typeof rep[i] === "string") {
                            k = rep[i];
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ": " : ":") + v);
                            }
                        }
                    }
                } else {
                    // Otherwise, iterate through all of the keys in the object.

                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = str(k, value);
                            if (v) {
                                partial.push(quote(k) + (gap ? ": " : ":") + v);
                            }
                        }
                    }
                }

                // Join all of the member texts together, separated with commas,
                // and wrap them in braces.

                v =
                    partial.length === 0 ?
                    "{}" :
                    gap ?
                    "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}" :
                    "{" + partial.join(",") + "}";
                gap = mind;
                return v;
        }
    }

    // If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {
            // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            '"': '\\"',
            "\\": "\\\\",
        };
        JSON.stringify = function(value, replacer, space) {
            // The stringify method takes a value and an optional replacer, and an optional
            // space parameter, and returns a JSON text. The replacer can be a function
            // that can replace values, or an array of strings that will select the keys.
            // A default replacer method can be provided. Use of the space parameter can
            // produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

            // If the space parameter is a number, make an indent string containing that
            // many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

                // If the space parameter is a string, it will be used as the indent string.
            } else if (typeof space === "string") {
                indent = space;
            }

            // If there is a replacer, it must be a function or an array.
            // Otherwise, throw an error.

            rep = replacer;
            if (
                replacer &&
                typeof replacer !== "function" &&
                (typeof replacer !== "object" || typeof replacer.length !== "number")
            ) {
                throw new Error("JSON.stringify");
            }

            // Make a fake root object containing our value under the key of "".
            // Return the result of stringifying the value.

            return str("", {
                "": value
            });
        };
    }

    // If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function(text, reviver) {
            // The parse method takes a text and an optional reviver function, and returns
            // a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {
                // The walk method is used to recursively walk the resulting structure so
                // that modifications can be made.

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }

            // Parsing happens in four stages. In the first stage, we replace certain
            // Unicode characters with escape sequences. JavaScript handles many characters
            // incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function(a) {
                    return "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

            // In the second stage, we run the text against regular expressions that look
            // for non-JSON patterns. We are especially concerned with "()" and "new"
            // because they can cause invocation, and "=" because it can cause mutation.
            // But just to be safe, we want to reject all unexpected forms.

            // We split the second stage into 4 regexp operations in order to work around
            // crippling inefficiencies in IE's and Safari's regexp engines. First we
            // replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
            // replace all simple value tokens with "]" characters. Third, we delete all
            // open brackets that follow a colon or comma or that begin the text. Finally,
            // we look to see that the remaining characters are only whitespace or "]" or
            // "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text.replace(rx_two, "@").replace(rx_three, "]").replace(rx_four, "")
                )
            ) {
                // In the third stage we use the eval function to compile the text into a
                // JavaScript structure. The "{" operator is subject to a syntactic ambiguity
                // in JavaScript: it can begin a block or an object literal. We wrap the text
                // in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

                // In the optional fourth stage, we recursively walk the new structure, passing
                // each name/value pair to a reviver function for possible transformation.

                return typeof reviver === "function" ? walk({
                    "": j
                }, "") : j;
            }

            // If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
})();





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
    var framesPerTaskValue = framesPerTaskGroup.add("edittext", undefined, persistentFramesPerTask);

    framesPerTaskValue.alignment = ['fill', 'top'];
    framesPerTaskValue.onChange = function() {
        var newFramesPerTaskValue = String(Math.abs(parseInt(framesPerTaskValue.text)));
        if (newFramesPerTaskValue == "NaN") {
            framesPerTaskValue.text = "10";
        }
        if (Math.abs(parseInt(newFramesPerTaskValue) > 9999)) {
            framesPerTaskValue.text = "9999";
        }
        app.settings.saveSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK, framesPerTaskValue.text);
    }

    var submitButton = controlsGroup.add("button", undefined, "Submit");
    submitButton.onClick = function() {
        SubmitSelection(list.selection, parseInt(framesPerTaskValue.text));
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
            if (list.selection == null) {
                updateList();
            }
            submitButton.enabled = list.selection != null;
            submitButton.active = false;
            submitButton.active = true;
        };
        list.selection = null;
    }

    updateList()

    refreshButton.onClick = function() {
        updateList();
    }

    submitterPanel.addEventListener('click', function() {
        updateList();
    }, true);

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


function isSecurityPrefSet() {
    var securitySetting = app.preferences.getPrefAsLong(
        "Main Pref Section",
        "Pref_SCRIPTING_FILE_NETWORK_SECURITY"
    );
    return securitySetting == 1;
}

if (isSecurityPrefSet()) {
    buildUI(this);
} else {
    //Print an error message and instructions for changing security preferences
    var submitterPanel =
        this instanceof Panel ?
        this :
        new Window(
            "palette",
            "Submit Queue to AWS Deadline Cloud",
            undefined, {
                resizable: true,
                closeButton: true,
            }
        );
    var root = submitterPanel.add("group");
    root.orientation = "column";
    root.alignment = ["fill", "fill"];
    root.alignChildren = ["fill", "top"];
    var errorText = root.add("statictext", undefined, "", {
        multiline: true,
    });
    errorText.graphics.foregroundColor = errorText.graphics.newPen(
        errorText.graphics.PenType.SOLID_COLOR,
        [1.0, 1.0, 0.0],
        1
    );
    errorText.text = "Update Script Permissions";
    var errorText2 = root.add("statictext", undefined, "", {
        multiline: true,
    });
    errorText2.text = [
        "In order for the Deadline Cloud submitter to execute, you need to update your script permissions to allow script networking and file access. To do this, follow the instructions below",
        "  1)  For Windows User: Select Edit > Preferences > Scripting & Expressions > select Allow Scripts To Write Files And Access Network",
        "       For macOS User: Select After Effects > Settings > Scripting & Expressions > select Allow Scripts To Write Files And Access Network",
        '  2)  Check "Allow Scripts to Write Files and Access Network"',
        '  3)  (Optional) To disable warnings every time you submit a job with the submitter, you can deselect "Warn User When Executing Files"',
        "  4)  Close this window and try again.",
    ].join("\n");
    errorText2.alignment = ["fill", "fill"];
    errorText2.minimumSize.height = 300;

    submitterPanel.layout.layout(true);
    submitterPanel.onResizing = function() {
        this.layout.resize();
    };
}