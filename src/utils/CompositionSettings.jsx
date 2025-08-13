function UiSettingsState() {
    /**
     * Container that stores all of the configurable properties in the submitter UI
     */

    // Contains UiSettingsStore objects that store comp-specific settings
    this.settings = {}

    this.xmpPath = dcUtil.composeXMPPath(DEADLINECLOUD_SETTINGS_ROOT, "UiSettingsState");
    this.rqiXmpPath = dcUtil.composeXMPPath(this.xmpPath, "rqiSpecificSettings");

    // () -> bool
    this.taskRunTimeoutEnabled = function() {
        return dcUtil.getBoolMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED), DEFAULT_TASK_RUN_TIMEOUT_ENABLED);
    }
    // (value: bool) -> void
    this.setTaskRunTimeoutEnabled = function(value) {
        dcUtil.saveBoolMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED), value);
    }
    // () -> int
    this.taskRunDays = function() {
        return dcUtil.getNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS), DEFAULT_TASK_RUN_TIMEOUT_DAYS);
    }

    this.setTaskRunDays = function(value) {
        dcUtil.saveNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS), value);
    }

    this.taskRunHours = function() {
        return dcUtil.getNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS), DEFAULT_TASK_RUN_TIMEOUT_HOURS);
    }

    this.setTaskRunHours = function(value) {
        dcUtil.saveNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS), value);
    }

    this.taskRunMinutes = function() {
        return dcUtil.getNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES), DEFAULT_TASK_RUN_TIMEOUT_MINUTES);
    }

    this.setTaskRunMinutes = function(value) {
        dcUtil.saveNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES), value);
    }

}

function UiSettingsStore(xmpPathPrefix, name) {
    /**
     * Stores comp-specific settings for the comp with given name.
     */
    this.name = name;
    this.xmpPathPrefix = dcUtil.composeXMPPath(xmpPathPrefix, name);

    this.framesPerTask = function() {
        return dcUtil.getNumberMetadata(dcUtil.composeXMPPath(this.xmpPathPrefix, DEADLINECLOUD_FRAMESPERTASK), DEFAULT_FRAMESPERTASK);
    }
    this.setFramesPerTask = function(value) {
        logger.warning("(" + this.name + ") Setting framesPerTask to " + value);
        dcUtil.saveNumberMetadata(dcUtil.composeXMPPath(this.xmpPathPrefix, DEADLINECLOUD_FRAMESPERTASK), value);
    }

    this.multiFrameRendering = function() {
        return dcUtil.getBoolMetadata(dcUtil.composeXMPPath(this.xmpPathPrefix, DEADLINECLOUD_MULTI_FRAME_RENDERING), DEFAULT_MULTI_FRAME_RENDERING);
    }
    this.setMultiFrameRendering = function(value) {
        logger.warning("(" + this.name + ") Setting multiFrameRendering to " + value);
        dcUtil.saveBoolMetadata(dcUtil.composeXMPPath(this.xmpPathPrefix, DEADLINECLOUD_MULTI_FRAME_RENDERING), value);
    }

    this.maxCpuUsagePercentage = function() {
        return dcUtil.getNumberMetadata(dcUtil.composeXMPPath(this.xmpPathPrefix, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE), DEFAULT_MAX_CPU_USAGE_PERCENTAGE);

    }
    this.setMaxCpuUsagePercentage = function(value) {
        logger.warning("(" + this.name + ") Setting maxCpuUsagePercentage to " + value);
        dcUtil.saveNumberMetadata(dcUtil.composeXMPPath(this.xmpPathPrefix, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE), value);
    }
}

UiSettingsState.prototype.get = function(RQIID) {
    /**
     * Gets UISettingsStore associated with given RQIID, or creates a new default one if it doesn't exit
     */
    if (!this.settings[RQIID]) {
        this.settings[RQIID] = new UiSettingsStore(this.rqiXmpPath, RQIID);
    }
    return this.settings[RQIID]
}