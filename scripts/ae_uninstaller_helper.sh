#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# After Effects Submitter User Uninstall Helper - Shell Script Version
# This script removes the Deadline Cloud submitter from After Effects

# Default values
AE_PATH_FOR_USER=""
MAJOR_VERSION=""
IGNORE_MINOR_VERSION_ERRORS=0

# Function to show usage
show_usage() {
    echo "Usage: $0 --ae_path_for_user PATH --major_version VERSION [--ignore_minor_version_errors 0|1]"
    echo ""
    echo "Remove Deadline Cloud submitter from After Effects"
    echo ""
    echo "Options:"
    echo "  --ae_path_for_user PATH               Path to the After Effects preferences directory"
    echo "  --major_version VERSION               After Effects major version to remove from (e.g., '24', '25')"
    echo "  --ignore_minor_version_errors 0|1    Ignore minor version uninstall errors (0=false, 1=true)"
    echo "  -h, --help                            Show this help message"
    return 0
}

# Function to handle errors based on ignore flag
handle_error() {
    local error_msg="$1"
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        echo "Warning: $error_msg (ignored due to ignore_minor_version_errors flag)" >&2
        return 0
    else
        echo "Error: $error_msg" >&2
        exit 1
    fi
}

# Function to exit successfully with message
exit_success() {
    local message="$1"
    echo "$message"
    exit 0
    return 0  # This line will never be reached, but satisfies linter
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --ae_path_for_user)
            AE_PATH_FOR_USER="$2"
            shift 2
            ;;
        --major_version)
            MAJOR_VERSION="$2"
            shift 2
            ;;
        --ignore_minor_version_errors)
            IGNORE_MINOR_VERSION_ERRORS="$2"
            shift 2
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            echo "Error: Unknown option $1" >&2
            show_usage >&2
            exit 1
            ;;
    esac
done

# Validate required arguments
if [[ -z "$AE_PATH_FOR_USER" || -z "$MAJOR_VERSION" ]]; then
    handle_error "Missing required arguments"
fi

echo "Removing Deadline Cloud submitter from After Effects $MAJOR_VERSION..." >&2

# Check if AE preferences directory exists
if [[ ! -d "$AE_PATH_FOR_USER" ]]; then
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        exit_success "After Effects $MAJOR_VERSION cleanup completed with errors (ignored)"
    else
        echo "After Effects preferences directory not found: $AE_PATH_FOR_USER" >&2
        echo "Skipping After Effects $MAJOR_VERSION cleanup (directory not found)"
        exit 0
    fi
fi

# Find version directories matching the major version
VERSION_DIRS=()
while IFS= read -r -d '' dir; do
    basename_dir=$(basename "$dir")
    if [[ "$basename_dir" =~ ^${MAJOR_VERSION}\. ]]; then
        VERSION_DIRS+=("$basename_dir")
    fi
done < <(find "$AE_PATH_FOR_USER" -maxdepth 1 -type d -print0 2>/dev/null)

if [[ ${#VERSION_DIRS[@]} -eq 0 ]]; then
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        exit_success "After Effects $MAJOR_VERSION cleanup completed with errors (ignored)"
    else
        echo "No After Effects ${MAJOR_VERSION}.x versions found in: $AE_PATH_FOR_USER" >&2
        echo "Skipping After Effects $MAJOR_VERSION cleanup (no versions found)"
        exit 0
    fi
fi

# Sort version directories
IFS=$'\n' VERSION_DIRS=($(sort <<<"${VERSION_DIRS[*]}"))

# Remove files from each version directory
REMOVED_FROM=()
FAILED_REMOVALS=()

for version_dir in "${VERSION_DIRS[@]}"; do
    ae_version_path="$AE_PATH_FOR_USER/$version_dir"
    scripts_path="$ae_version_path/Scripts"
    scriptui_panels_path="$scripts_path/ScriptUI Panels"
    
    # Check if ScriptUI Panels directory exists
    if [[ ! -d "$scriptui_panels_path" ]]; then
        if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
            FAILED_REMOVALS+=("After Effects $version_dir: ScriptUI Panels directory not found")
            echo "Warning: ScriptUI Panels directory not found for After Effects $version_dir, skipping... (continuing due to ignore_minor_version_errors flag)" >&2
            continue
        else
            echo "ScriptUI Panels directory not found for After Effects $version_dir, skipping..." >&2
            continue
        fi
    fi
    
    # Files to remove (both original and user-renamed versions)
    files_to_remove=(
        "DeadlineCloudSubmitter.jsx"
        "DeadlineCloudSubmitter(User).jsx"
    )
    
    files_removed=0
    
    for file_name in "${files_to_remove[@]}"; do
        file_path="$scriptui_panels_path/$file_name"
        
        if [[ -f "$file_path" ]]; then
            if rm "$file_path" 2>/dev/null; then
                echo "Removed $file_name from After Effects $version_dir" >&2
                ((files_removed++))
            else
                error_msg="Failed to remove $file_name from After Effects $version_dir"
                if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
                    FAILED_REMOVALS+=("After Effects $version_dir: $error_msg")
                    echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
                else
                    FAILED_REMOVALS+=("$error_msg")
                    echo "Warning: $error_msg" >&2
                fi
            fi
        fi
    done
    
    # Remove any Deadline Cloud related directories
    deadline_dirs=(
        "$scriptui_panels_path/DeadlineCloud"
        "$scriptui_panels_path/deadline-cloud"
    )
    
    for dir_path in "${deadline_dirs[@]}"; do
        if [[ -d "$dir_path" ]]; then
            if rm -rf "$dir_path" 2>/dev/null; then
                echo "Removed directory $(basename "$dir_path") from After Effects $version_dir" >&2
                ((files_removed++))
            else
                error_msg="Failed to remove directory $(basename "$dir_path") from After Effects $version_dir"
                if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
                    FAILED_REMOVALS+=("After Effects $version_dir: $error_msg")
                    echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
                else
                    FAILED_REMOVALS+=("$error_msg")
                    echo "Warning: $error_msg" >&2
                fi
            fi
        fi
    done
    
    if [[ $files_removed -gt 0 ]]; then
        REMOVED_FROM+=("After Effects $version_dir")
    fi
done

# Report results
if [[ ${#FAILED_REMOVALS[@]} -gt 0 && ${#REMOVED_FROM[@]} -eq 0 ]]; then
    # All removals failed
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        echo "Warning: All After Effects $MAJOR_VERSION versions failed to uninstall, but continuing due to ignore_minor_version_errors flag" >&2
        for error in "${FAILED_REMOVALS[@]}"; do
            echo "  $error" >&2
        done
        exit_success "After Effects $MAJOR_VERSION cleanup completed with errors (ignored)"
    else
        echo "Failed to remove from any After Effects versions" >&2
        for error in "${FAILED_REMOVALS[@]}"; do
            echo "  $error" >&2
        done
        exit 1
    fi
elif [[ ${#FAILED_REMOVALS[@]} -gt 0 ]]; then
    # Some removals failed, but some succeeded
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        echo "Warning: Removal failed for some versions (ignored due to ignore_minor_version_errors flag)" >&2
    else
        echo "Warning: Removal failed for some versions" >&2
    fi
    for error in "${FAILED_REMOVALS[@]}"; do
        echo "  $error" >&2
    done
fi

if [[ ${#REMOVED_FROM[@]} -eq 0 && "$IGNORE_MINOR_VERSION_ERRORS" != "1" ]]; then
    echo "No Deadline Cloud submitter files found to remove from After Effects $MAJOR_VERSION" >&2
    echo "After Effects $MAJOR_VERSION cleanup completed (no files found)"
    exit 0
fi

# Create success message
if [[ ${#REMOVED_FROM[@]} -gt 0 ]]; then
    version_list=$(IFS=', '; echo "${REMOVED_FROM[*]}")
    echo "Successfully removed Deadline Cloud submitter from: $version_list" >&2
    echo "Removal completed from ${#REMOVED_FROM[@]} location(s)." >&2
    echo "Deadline Cloud submitter removed from After Effects $MAJOR_VERSION"
else
    echo "After Effects $MAJOR_VERSION cleanup completed (no files found)"
fi

exit 0