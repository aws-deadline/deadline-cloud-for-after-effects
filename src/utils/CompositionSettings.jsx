function UiSettingsState() {
    /**
     * Container that stores all of the configurable properties in the submitter UI.
     * Every setting here applies to the job as a whole rather than to an individual
     * render queue item.
     */

    this.xmpPath = dcUtil.composeXMPPath(DEADLINECLOUD_SETTINGS_ROOT, "UiSettingsState");

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

    this.framesPerTask = function () {
        return dcUtil.getNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_FRAMESPERTASK), DEFAULT_FRAMESPERTASK);
    }
    this.setFramesPerTask = function (value) {
        logger.warning("Setting framesPerTask to " + value);
        dcUtil.saveNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_FRAMESPERTASK), value);
    }

    this.multiFrameRendering = function () {
        return dcUtil.getBoolMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_MULTI_FRAME_RENDERING), DEFAULT_MULTI_FRAME_RENDERING);
    }
    this.setMultiFrameRendering = function (value) {
        logger.warning("Setting multiFrameRendering to " + value);
        dcUtil.saveBoolMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_MULTI_FRAME_RENDERING), value);
    }

    this.maxCpuUsagePercentage = function () {
        return dcUtil.getNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE), DEFAULT_MAX_CPU_USAGE_PERCENTAGE);
    }
    this.setMaxCpuUsagePercentage = function (value) {
        logger.warning("Setting maxCpuUsagePercentage to " + value);
        dcUtil.saveNumberMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE), value);
    }

    this.ignoreMissingDependencies = function () {
        return dcUtil.getBoolMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_IGNORE_MISSING_DEPENDENCIES), DEFAULT_IGNORE_MISSING_DEPENDENCIES);
    }
    this.setIgnoreMissingDependencies = function (value) {
        logger.warning("Setting ignoreMissingDependencies to " + value);
        dcUtil.saveBoolMetadata(dcUtil.composeXMPPath(this.xmpPath, DEADLINECLOUD_IGNORE_MISSING_DEPENDENCIES), value);
    }
}
