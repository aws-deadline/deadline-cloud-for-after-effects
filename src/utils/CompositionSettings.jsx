function UiSettingsState() {
    /**
     * Container that stores all of the configurable properties in the submitter UI
     */

    // Contains UiSettingsStore objects that store comp-specific settings
    this.settings = {}

    // () -> bool
    this.taskRunTimeoutEnabled = function() {
        return dcUtil.getBoolSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED, DEFAULT_TASK_RUN_TIMEOUT_ENABLED);
    }
    // (value: bool) -> void
    this.setTaskRunTimeoutEnabled = function(value) {
        dcUtil.saveBoolSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED, value);
    }
    // () -> int
    this.taskRunDays = function() {
        return dcUtil.getNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS, DEFAULT_TASK_RUN_TIMEOUT_DAYS);
    }

    this.setTaskRunDays = function(value) {
        dcUtil.saveNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS, value);
    }

    this.taskRunHours = function() {
        return dcUtil.getNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS, DEFAULT_TASK_RUN_TIMEOUT_HOURS);
    }

    this.setTaskRunHours = function(value) {
        dcUtil.saveNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS, value);
    }

    this.taskRunMinutes = function() {
        return dcUtil.getNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES, DEFAULT_TASK_RUN_TIMEOUT_MINUTES);
    }

    this.setTaskRunMinutes = function(value) {
        dcUtil.saveNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES, value);
    }

}

function UiSettingsStore(name) {
    /**
     * Stores comp-specific settings for the comp with given name.
     */
    this.name = name;

    this.framesPerTask = function() {
        return dcUtil.getNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, this.name + "_" + DEADLINECLOUD_FRAMESPERTASK, DEFAULT_FRAMESPERTASK);
    }
    this.setFramesPerTask = function(value) {
        logger.warning("(" + this.name + ") Setting framesPerTask to " + value);
        dcUtil.saveNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, this.name + "_" + DEADLINECLOUD_FRAMESPERTASK, value);
    }

    this.multiFrameRendering = function() {
        return dcUtil.getBoolSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, this.name + "_" + DEADLINECLOUD_MULTI_FRAME_RENDERING, DEFAULT_MULTI_FRAME_RENDERING);
    }
    this.setMultiFrameRendering = function(value) {
        logger.warning("(" + this.name + ") Setting multiFrameRendering to " + value);
        dcUtil.saveBoolSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, this.name + "_" + DEADLINECLOUD_MULTI_FRAME_RENDERING, value);
    }

    this.maxCpuUsagePercentage = function() {
        return dcUtil.getNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, name + "_" + DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE, DEFAULT_MAX_CPU_USAGE_PERCENTAGE);

    }
    this.setMaxCpuUsagePercentage = function(value) {
        logger.warning("(" + this.name + ") Setting maxCpuUsagePercentage to " + value);
        dcUtil.saveNumberSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, name + "_" + DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE, value);
    }
}

UiSettingsState.prototype.create = function(compId, framesPerTask, multiFrameRendering, maxCpuUsagePercentage) {
    /**
     * Adds new UISettingsStore to store settings for the comp associated with compId
     */
    if (!this.settings[compId]) {
        this.settings[compId] = new UiSettingsStore(compId);
    }
    if (framesPerTask !== undefined) {
        this.settings[compId].setFramesPerTask(framesPerTask);
    }
    if (multiFrameRendering !== undefined) {
        this.settings[compId].setMultiFrameRendering(multiFrameRendering);
    }
    if (maxCpuUsagePercentage !== undefined) {
        this.settings[compId].setMaxCpuUsagePercentage(maxCpuUsagePercentage);
    }
}

UiSettingsState.prototype.get = function(compId) {
    /**
     * Gets UISettingsStore associated with given compId, or creates a new default one if it doesn't exit
     */
    if (!this.settings[compId]) {
        this.settings[compId] = new UiSettingsStore(compId);
    }
    return this.settings[compId]
}