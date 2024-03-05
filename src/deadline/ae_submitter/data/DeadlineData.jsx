function __generateProperties() {

    return {
        "defaultFarm": ObservableProperty(),
        "defaultQueue": ObservableProperty(),
        "isLoggedIn": ObservableProperty(),
        "isAPIAvailable": ObservableProperty(),
        "isWindowClosed": ObservableProperty(),
        "config": {
            aws_profile: ObservableProperty(),
            job_history_dir: ObservableProperty(),
            farm_id: ObservableProperty(),
            queue_id: ObservableProperty(),
            storage_profile_id: ObservableProperty(),
            job_attachments_file_system: ObservableProperty(),
            auto_accept: ObservableProperty(),
            conflict_resolution: ObservableProperty(),
            log_level: ObservableProperty(),
            deadline_cloud_monitor: ObservableProperty(),
        },
        "farmList": ObservableProperty(),
        "queueList": ObservableProperty(),
        "profileList": ObservableProperty(),
        "footageList": ObservableProperty(),
        "deadlineJobParameters": {
            description: ObservableProperty(),
            targetTaskRunStatus: ObservableProperty(),
            maxFailedTasksCount: ObservableProperty(),
            maxRetriesPerTask: ObservableProperty(),
            priority: ObservableProperty()
        },
        "jobAttachments": {
            autoDetectedInputFiles: ObservableProperty(),
            userAddedInputFiles: ObservableProperty(),
            autoDetectInputDirectories: ObservableProperty(), 
            userAddedInputDirectories: ObservableProperty(),
            autoDetectOutputDirectories: ObservableProperty(),
            userAddedOutputDirectories: ObservableProperty()
        },
        "footageLabels": {
            ADDED_FOOTAGE_ITEMS: ObservableProperty(),
            AUTO_DETECTED_FOOTAGE_ITEMS: ObservableProperty(),
            SELECTED_FOOTAGE_ITEMS: ObservableProperty()
        },
        "inputLabels": {
            ADDED_INPUT_ITEMS: ObservableProperty(),
            AUTO_DETECTED_INPUT_ITEMS: ObservableProperty(),
            SELECTED_INPUT_ITEMS: ObservableProperty()
        },
        "outputLabels": {
            ADDED_OUTPUT_ITEMS: ObservableProperty(),
            AUTO_DETECTED_OUTPUT_ITEMS: ObservableProperty(),
            SELECTED_OUTPUT_ITEMS: ObservableProperty()
        }, 
        "compName": ObservableProperty(),
        "credentialStatus": {
            source: ObservableProperty(),
            status: ObservableProperty(),
            api: ObservableProperty()
        }
    }
}

dcProperties = __generateProperties();