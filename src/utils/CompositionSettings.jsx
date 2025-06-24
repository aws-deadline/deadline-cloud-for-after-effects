function UiSettingsState() {
    this.settings = {}
}
function UiSettingsStore(name) {
    this.name = name;
    this._framesPerTask = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_FRAMESPERTASK);;
    this._multiFrameRendering = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MULTI_FRAME_RENDERING);
    this._maxCpuUsagePercentage = app.settings.getSetting(DEADLINECLOUD_SUBMITTER_SETTINGS, DEADLINECLOUD_MAX_CPU_USAGE_PERCENTAGE);

    this.framesPerTask = function () {
        return this._framesPerTask
    }
    this.setFramesPerTask = function (value) {
        logger.warning("(" + this.name + ") Setting framesPerTask to " + value)
        this._framesPerTask = value
    }

    this.multiFrameRendering = function () {
        return this._multiFrameRendering
    }
    this.setMultiFrameRendering = function (value) {
        logger.warning("(" + this.name + ") Setting multiFrameRendering to " + value)
        this._multiFrameRendering = value
    }

    this.maxCpuUsagePercentage = function () {
        return this._maxCpuUsagePercentage
    }
    this.setMaxCpuUsagePercentage = function (value) {
        logger.warning("(" + this.name + ") Setting maxCpuUsagePercentage to " + value)
        this._maxCpuUsagePercentage = value
    }
}

UiSettingsState.prototype.create = function (compId, framesPerTask, multiFrameRendering, maxCpuUsagePercentage) {
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
    this.settings[compId].setFramesPerTask(framesPerTask);
    this.settings[compId].setMultiFrameRendering(multiFrameRendering);
    this.settings[compId].setMaxCpuUsagePercentage(maxCpuUsagePercentage);
}

UiSettingsState.prototype.get = function(compId) {
    if (!this.settings[compId]) {
        this.settings[compId] = new UiSettingsStore(compId)
    }
    return this.settings[compId]
}
