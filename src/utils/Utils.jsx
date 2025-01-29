var scriptFolder = Folder.current.fsName;

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

function systemCallWithErrorAlerts(cmd) {
    var output = "";
    if ($.os.toString().slice(0, 7) === "Windows") {
        var tempBatFile = new File(
            Folder.temp.fsName + "/DeadlineCloudAESubmission.bat"
        );
        tempBatFile.open("w");
        tempBatFile.writeln("@echo off");
        tempBatFile.writeln("echo:"); //this empty print statement is required to circumvent a weird bug
        tempBatFile.writeln(cmd);
        tempBatFile.writeln("IF %ERRORLEVEL% NEQ 0 (");
        tempBatFile.writeln(" echo ERROR CODE: %ERRORLEVEL% ");
        tempBatFile.writeln(")");
        tempBatFile.close();

        output = system.callSystem(tempBatFile.fsName);
    } else {
        // MacOS
        output = system.callSystem(cmd + ' || echo "\nERROR CODE: $?"');
    }

    if (output.indexOf("\nERROR CODE: ", 0) >= 0) {
        adcAlert(
            "ERROR: Command failed!\n\nFull Command:\n" +
            cmd +
            "\n" +
            output +
            "\n\nEnsure the command can be run manually in a non-elevated command prompt or terminal and try again.", true
        );
    }
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