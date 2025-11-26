#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# After Effects Submitter User Uninstall Helper - Shell Script Version
# This script removes the Deadline Cloud submitter from After Effects
#
# SCRIPT PURPOSE:
# - Removes Deadline Cloud submitter files from user-specific After Effects preferences
# - Handles multiple After Effects versions (e.g., 24.0, 24.1, 24.2) within a major version
# - Cleans up both original and user-renamed submitter files
# - Provides error handling with optional ignore flags for enterprise environments
#
# CLEANUP STRATEGY:
# - Removes both DeadlineCloudSubmitter.jsx and DeadlineCloudSubmitter(User).jsx files
# - Removes any Deadline Cloud related directories (DeadlineCloud, deadline-cloud)
# - Continues processing remaining versions even if some fail (when ignore flag is set)

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

# ERROR HANDLING FUNCTION:
# Provides centralized error handling with conditional behavior based on ignore flag
# RECOVERY STRATEGY: In enterprise environments, allows uninstallation to continue
# with warnings instead of failing completely when directories are missing or inaccessible
# PARAMETERS: error_msg - descriptive error message for logging and user feedback
handle_error() {
    local error_msg="$1"
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        # GRACEFUL DEGRADATION: Log warning but continue execution
        echo "Warning: $error_msg (ignored due to ignore_minor_version_errors flag)" >&2
        return 0
    else
        # FAIL-FAST: Log error and exit immediately for strict validation
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

# COMMAND LINE ARGUMENT PARSING:
# Process all command line arguments using a while loop with case statement
# Each argument requires a value (shift 2 moves past both flag and value)
# Unknown arguments trigger error with usage display for user guidance
while [[ $# -gt 0 ]]; do
    case $1 in
        --ae_path_for_user)
            AE_PATH_FOR_USER="$2"
            shift 2  # Move past both flag and its value
            ;;
        --major_version)
            MAJOR_VERSION="$2"
            shift 2  # Move past both flag and its value
            ;;
        --ignore_minor_version_errors)
            IGNORE_MINOR_VERSION_ERRORS="$2"
            shift 2  # Move past both flag and its value
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            # ERROR RECOVERY: Unknown arguments display usage and exit with error code
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

# VERSION DIRECTORY DISCOVERY:
# Find all After Effects version directories that match the specified major version
# ITERATION LOGIC: Uses find with null-terminated output to handle directory names with spaces
# PATTERN MATCHING: Regex ^${MAJOR_VERSION}\. matches directories like "24.0", "24.1", "24.2" for major version "24"
# EXPECTED OUTCOME: VERSION_DIRS array contains all matching minor version directories for cleanup
VERSION_DIRS=()
while IFS= read -r -d '' dir; do
    basename_dir=$(basename "$dir")  # Extract directory name from full path
    if [[ "$basename_dir" =~ ^${MAJOR_VERSION}\. ]]; then
        VERSION_DIRS+=("$basename_dir")  # Add matching version to array
    fi
done < <(find "$AE_PATH_FOR_USER" -maxdepth 1 -type d -print0 2>/dev/null)
# NOTE: Process substitution with null-terminated strings prevents issues with spaces in directory names

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

# MULTI-VERSION CLEANUP LOOP:
# Remove submitter files from each discovered After Effects version directory
# ITERATION STRATEGY: Process each version independently to maximize cleanup success
# ERROR TRACKING: Maintain separate arrays for successful and failed removals
REMOVED_FROM=()      # Track successful removal locations for reporting
FAILED_REMOVALS=()   # Track failed removals with detailed error messages

for version_dir in "${VERSION_DIRS[@]}"; do
    # DIRECTORY PATH CONSTRUCTION: Build full path to ScriptUI Panels directory
    ae_version_path="$AE_PATH_FOR_USER/$version_dir"
    scripts_path="$ae_version_path/Scripts"
    scriptui_panels_path="$scripts_path/ScriptUI Panels"
    
    # DIRECTORY EXISTENCE CHECK: Verify ScriptUI Panels directory exists before attempting cleanup
    # RECOVERY ACTION: Skip version if directory doesn't exist (may indicate uninstalled AE version)
    if [[ ! -d "$scriptui_panels_path" ]]; then
        if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
            FAILED_REMOVALS+=("After Effects $version_dir: ScriptUI Panels directory not found")
            echo "Warning: ScriptUI Panels directory not found for After Effects $version_dir, skipping... (continuing due to ignore_minor_version_errors flag)" >&2
            continue  # Skip to next version directory
        else
            echo "ScriptUI Panels directory not found for After Effects $version_dir, skipping..." >&2
            continue  # Skip to next version directory (not considered an error)
        fi
    fi
    
    # FILE REMOVAL OPERATION:
    # Remove both original and user-renamed versions of submitter files
    # CLEANUP STRATEGY: Handle both system and user installation file naming conventions
    files_to_remove=(
        "DeadlineCloudSubmitter.jsx"        # Original system installation filename
        "DeadlineCloudSubmitter(User).jsx"  # User installation renamed filename
    )
    
    files_removed=0  # Counter for successful file removal operations
    
    # ITERATION LOGIC: Process each target file independently
    # EXPECTED OUTCOME: All Deadline Cloud submitter files removed from this version
    for file_name in "${files_to_remove[@]}"; do
        file_path="$scriptui_panels_path/$file_name"
        
        # FILE EXISTENCE CHECK: Only attempt removal if file exists
        if [[ -f "$file_path" ]]; then
            # FILESYSTEM OPERATION: Remove file with error handling
            if rm "$file_path" 2>/dev/null; then
                echo "Removed $file_name from After Effects $version_dir" >&2
                ((files_removed++))  # Increment success counter
            else
                # ERROR SCENARIO: File removal failed (permissions, file in use, etc.)
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
        # NOTE: No action needed if file doesn't exist (already cleaned up)
    done
    
    # DIRECTORY CLEANUP OPERATION:
    # Remove any Deadline Cloud related directories that may contain additional files
    # CLEANUP STRATEGY: Handle different directory naming conventions that may exist
    deadline_dirs=(
        "$scriptui_panels_path/DeadlineCloud"    # Standard directory name
        "$scriptui_panels_path/deadline-cloud"   # Alternative lowercase naming
    )
    
    # ITERATION LOGIC: Process each potential directory independently
    # EXPECTED OUTCOME: All Deadline Cloud directories removed from this version
    for dir_path in "${deadline_dirs[@]}"; do
        # DIRECTORY EXISTENCE CHECK: Only attempt removal if directory exists
        if [[ -d "$dir_path" ]]; then
            # FILESYSTEM OPERATION: Recursive directory removal with error handling
            if rm -rf "$dir_path" 2>/dev/null; then
                echo "Removed directory $(basename "$dir_path") from After Effects $version_dir" >&2
                ((files_removed++))  # Increment success counter
            else
                # ERROR SCENARIO: Directory removal failed (permissions, files in use, etc.)
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
        # NOTE: No action needed if directory doesn't exist (already cleaned up)
    done
    
    # SUCCESS TRACKING: Record successful removals for final reporting
    if [[ $files_removed -gt 0 ]]; then
        REMOVED_FROM+=("After Effects $version_dir")  # Add to successful removals list
    fi
done  # End of version directory processing loop

# CLEANUP RESULTS ANALYSIS:
# Evaluate overall success/failure status and provide appropriate user feedback
# ERROR SCENARIOS: Handle complete failure, partial failure, and success cases differently

if [[ ${#FAILED_REMOVALS[@]} -gt 0 && ${#REMOVED_FROM[@]} -eq 0 ]]; then
    # COMPLETE FAILURE SCENARIO: All removal attempts failed
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        # GRACEFUL DEGRADATION: Report failure but continue with warning status
        echo "Warning: All After Effects $MAJOR_VERSION versions failed to uninstall, but continuing due to ignore_minor_version_errors flag" >&2
        for error in "${FAILED_REMOVALS[@]}"; do
            echo "  $error" >&2  # List all specific failure reasons
        done
        exit_success "After Effects $MAJOR_VERSION cleanup completed with errors (ignored)"
    else
        # FAIL-FAST: Report failure and exit with error code
        echo "Failed to remove from any After Effects versions" >&2
        for error in "${FAILED_REMOVALS[@]}"; do
            echo "  $error" >&2  # List all specific failure reasons
        done
        exit 1
    fi
elif [[ ${#FAILED_REMOVALS[@]} -gt 0 ]]; then
    # PARTIAL FAILURE SCENARIO: Some removals succeeded, some failed
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        echo "Warning: Removal failed for some versions (ignored due to ignore_minor_version_errors flag)" >&2
    else
        echo "Warning: Removal failed for some versions" >&2
    fi
    # DETAILED ERROR REPORTING: List specific failures for troubleshooting
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