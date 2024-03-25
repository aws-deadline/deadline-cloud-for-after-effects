function __generateCloseButton() {
        // Extract the file name
    var scriptFileCloseButtonName = new File($.fileName).name;

    function closeButtonFncMain(windowObj) {
        dcSettings.saveIniSettings();
        logger.log("Pressed main close button, closing ScriptUI.", scriptFileCloseButtonName, LOG_LEVEL.INFO);
        windowObj.close();
    }

    function closeButtonFncSettings(windowObj) {
        
        logger.log("Pressed SettingsWindow close button.", scriptFileCloseButtonName, LOG_LEVEL.INFO);
        windowObj.close();
    }

    return {
        "closeButtonFncMain": closeButtonFncMain,
        "closeButtonFncSettings": closeButtonFncSettings,
    }
}

dcCloseButton = __generateCloseButton();