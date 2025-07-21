function UiSettingsState() {
    this.settings = {}
}
function UiSettingsStore(name) {
    this.name = name;
    // _framesPerTask: string
    this._framesPerTask = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK);
    // _multiFrameRendering: bool
    this._multiFrameRendering = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING);
    // _maxCpuUsagePercentage: string
    this._maxCpuUsagePercentage = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE);

    // _taskRunTimeout: bool
    this._taskRunTimeout = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED);
    // _taskRunDays: string
    this._taskRunDays = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS);
    // _taskRunHours: string
    this._taskRunHours = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS);
    // _taskRunMinutes: string
    this._taskRunMinutes = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES);

    this.framesPerTask = function () {
        return this._framesPerTask
    }
    this.setFramesPerTask = function (value) {
        logger.warning("(" + this.name + ") Setting framesPerTask to " + value)
        this._framesPerTask = typeof value === "string" ? value : value.toString()
    }

    this.multiFrameRendering = function () {
        return this._multiFrameRendering
    }
    this.setMultiFrameRendering = function (value) {
        logger.warning("(" + this.name + ") Setting multiFrameRendering to " + value)
        this._multiFrameRendering = typeof value === "boolean" ? value : (value === "true")
    }

    this.maxCpuUsagePercentage = function () {
        return this._maxCpuUsagePercentage
    }
    this.setMaxCpuUsagePercentage = function (value) {
        logger.warning("(" + this.name + ") Setting maxCpuUsagePercentage to " + value)
        this._maxCpuUsagePercentage = typeof value === "string" ? value : value.toString()
    }

    this.taskRunTimeout = function () {
        return this._taskRunTimeout
    }
    this.setTaskRunTimeout = function (value) {
        logger.warning("(" + this.name + ") Setting taskRunTimeout to " + value)
        this._taskRunTimeout = typeof value === "boolean" ? value : (value === "true")
    }

    this.taskRunDays = function () {
        return this._taskRunDays
    }
    this.setTaskRunDays = function (value) {
        logger.warning("(" + this.name + ") Setting taskRunDays to " + value)
        this._taskRunDays = typeof value === "boolean" ? value : (value === "true")
    }

    this.taskRunHours = function () {
        return this._taskRunHours
    }
    this.setTaskRunHours = function (value) {
        logger.warning("(" + this.name + ") Setting taskRunHours to " + value)
        this._taskRunHours = typeof value === "boolean" ? value : (value === "true")
    }

    this.taskRunMinutes = function () {
        return this._taskRunMinutes
    }
    this.setTaskRunMinutes = function (value) {
        logger.warning("(" + this.name + ") Setting taskRunMinutes to " + value)
        this._taskRunMinutes = typeof value === "boolean" ? value : (value === "true")
    }
}

UiSettingsState.prototype.create = function (compId, framesPerTask, multiFrameRendering, maxCpuUsagePercentage, taskRunTimeout, taskRunTimeoutDays, taskRunTimeoutHours, taskRunTimeoutMinutes) {
    if (!this.settings[compId]) {
        this.settings[compId] = new UiSettingsStore(compId)
    }
    if (framesPerTask === undefined) {
        framesPerTask = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK);
    }
    if (multiFrameRendering === undefined) {
        multiFrameRendering = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING);
    }
    if (maxCpuUsagePercentage === undefined) {
        maxCpuUsagePercentage = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE);
    }
    if (taskRunTimeout === undefined) {
        taskRunTimeout = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_ENABLED);
    }
    if (taskRunTimeoutDays === undefined) {
        taskRunTimeoutDays = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_DAYS);
    }
    if (taskRunTimeoutHours === undefined) {
        taskRunTimeoutHours = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_HOURS);
    }
    if (taskRunTimeoutMinutes === undefined) {
        taskRunTimeoutMinutes = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_TASK_RUN_TIMEOUT_MINUTES);
    }

    this.settings[compId].setFramesPerTask(framesPerTask);
    this.settings[compId].setMultiFrameRendering(multiFrameRendering);
    this.settings[compId].setMaxCpuUsagePercentage(maxCpuUsagePercentage);
    this.settings[compId].setTaskRunTimeout(taskRunTimeout);
    this.settings[compId].setTaskRunDays(taskRunTimeoutDays);
    this.settings[compId].setTaskRunHours(taskRunTimeoutHours);
    this.settings[compId].setTaskRunMinutes(taskRunTimeoutMinutes);
}

UiSettingsState.prototype.get = function(compId) {
    if (!this.settings[compId]) {
        this.settings[compId] = new UiSettingsStore(compId)
    }
    return this.settings[compId]
}
