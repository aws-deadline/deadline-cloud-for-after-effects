#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# After Effects Submitter User Install Helper for MacOS - Shell Script Version
#
# SCRIPT PURPOSE:
# This macOS-specific script installs Deadline Cloud submitter files to user-specific
# After Effects preferences directory. Only user-scope installation is supported on macOS.
#
# USAGE EXAMPLES:
#
# Basic installation to After Effects 2024 (version 24):
#   ./ae_installer_helper.sh \
#     --ae_path_for_user "/Users/username/Library/Preferences/Adobe/After Effects" \
#     --major_version 24 \
#     --submitter_src_path "/Users/username/DeadlineCloudSubmitter/After Effects/AE2025"
#
# Installation with error tolerance (useful in enterprise environments):
#   ./ae_installer_helper.sh \
#     --ae_path_for_user "/Users/username/Library/Preferences/Adobe/After Effects" \
#     --major_version 25 \
#     --submitter_src_path "/Users/username/DeadlineCloudSubmitter/After Effects/AE2025" \
#     --ignore_minor_version_errors 1
#
# Show help:
#   ./ae_installer_helper.sh --help
#
# SCRIPT PURPOSE:
# - Installs Deadline Cloud submitter files to user-specific After Effects preferences
# - Handles multiple After Effects versions (e.g., 24.0, 24.1, 24.2) within a major version
# - Provides error handling with optional ignore flags for enterprise environments
# - Creates necessary directory structure and sets appropriate permissions
#
# ERROR HANDLING STRATEGY:
# - Uses IGNORE_MINOR_VERSION_ERRORS flag to allow graceful degradation in restricted environments
# - Continues processing remaining versions even if some fail (when ignore flag is set)
# - Provides detailed error messages for troubleshooting installation issues

# Default values
AE_PATH_FOR_USER=""
MAJOR_VERSION=""
SUBMITTER_SRC_PATH=""
IGNORE_MINOR_VERSION_ERRORS=0

# Function to show usage
show_usage() {
    echo "Usage: $0 --ae_path_for_user PATH --major_version VERSION --submitter_src_path PATH [--ignore_minor_version_errors 0|1]"
    echo ""
    echo "Install Deadline Cloud submitter to After Effects (macOS user-scope only)"
    echo ""
    echo "Options:"
    echo "  --ae_path_for_user PATH           Path to the After Effects preferences directory"
    echo "  --major_version VERSION           After Effects major version to install to (e.g., '24', '25')"
    echo "  --submitter_src_path PATH         Directory containing Deadline Cloud submitter files"
    echo "  --ignore_minor_version_errors 0|1 Ignore minor version installation errors (0=false, 1=true)"
    echo "  -h, --help                        Show this help message"
    return 0
}

# COMMAND LINE ARGUMENT PARSING:
# Process all command line arguments using a while loop with case statement
# Each argument requires a value (shift 2 moves past both flag and value)
# Unknown arguments trigger error with usage display for user guidance
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
        --submitter_src_path)
            SUBMITTER_SRC_PATH="$2"
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
            # ERROR RECOVERY: Unknown arguments display usage and exit with error code
            echo "Error: Unknown option $1" >&2
            show_usage >&2
            exit 1
            ;;
    esac
done

# ERROR HANDLING FUNCTION:
# Provides centralized error handling with conditional behavior based on ignore flag
# RECOVERY STRATEGY: In enterprise environments with restricted access, allows installation
# to continue with warnings instead of failing completely
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

# Validate required arguments
if [[ -z "$AE_PATH_FOR_USER" || -z "$MAJOR_VERSION" || -z "$SUBMITTER_SRC_PATH" ]]; then
    handle_error "Missing required arguments"
fi

echo "Installing Deadline Cloud submitter to After Effects $MAJOR_VERSION..." >&2

# Validate source directory
if [[ ! -d "$SUBMITTER_SRC_PATH" ]]; then
    handle_error "Submitter source path is not a directory: $SUBMITTER_SRC_PATH"
fi

# Check if source directory has files
if [[ -z "$(ls -A "$SUBMITTER_SRC_PATH" 2>/dev/null)" ]]; then
    handle_error "No submitter files found to install: $SUBMITTER_SRC_PATH"
fi

# Validate AE preferences directory
if [[ ! -d "$AE_PATH_FOR_USER" ]]; then
    handle_error "After Effects preferences directory not found: $AE_PATH_FOR_USER"
fi

# VERSION DIRECTORY DISCOVERY:
# Find all After Effects version directories that match the specified major version
# ITERATION LOGIC: Uses find with null-terminated output to handle directory names with spaces
# PATTERN MATCHING: Regex ^${MAJOR_VERSION}\. matches directories like "24.0", "24.1", "24.2" for major version "24"
# EXPECTED OUTCOME: VERSION_DIRS array contains all matching minor version directories for installation
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
        exit_success "After Effects $MAJOR_VERSION installation completed with errors (ignored)"
    else
        handle_error "No After Effects ${MAJOR_VERSION}.x versions found in: $AE_PATH_FOR_USER"
    fi
fi

# Sort version directories
IFS=$'\n' VERSION_DIRS=($(sort <<<"${VERSION_DIRS[*]}"))

# MULTI-VERSION INSTALLATION LOOP:
# Install submitter files to each discovered After Effects version directory
# ITERATION STRATEGY: Process each version independently to maximize success rate
# ERROR TRACKING: Maintain separate arrays for successful and failed installations
COPIED_TO=()      # Track successful installation paths for reporting
FAILED_COPIES=()  # Track failed installations with detailed error messages

for version_dir in "${VERSION_DIRS[@]}"; do
    # DIRECTORY PATH CONSTRUCTION: Build full path to ScriptUI Panels directory
    ae_version_path="$AE_PATH_FOR_USER/$version_dir"
    scripts_path="$ae_version_path/Scripts"
    scriptui_panels_path="$scripts_path/ScriptUI Panels"
    
    # FILESYSTEM OPERATION: Create directory structure if it doesn't exist
    # RECOVERY ACTION: If directory creation fails, log error and continue to next version (when ignore flag set)
    if ! mkdir -p "$scriptui_panels_path" 2>/dev/null; then
        error_msg="Failed to create ScriptUI Panels directory: $scriptui_panels_path"
        if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
            FAILED_COPIES+=("After Effects $version_dir: $error_msg")
            echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
            continue  # Skip to next version directory
        else
            handle_error "$error_msg"  # Exit immediately if strict validation enabled
        fi
    fi
    
    # PERMISSION VALIDATION: Verify write access to target directory
    # ENTERPRISE SCENARIO: Network-mounted home directories may have restricted permissions
    if [[ ! -w "$scriptui_panels_path" ]]; then
        error_msg="No write permission to ScriptUI Panels directory: $scriptui_panels_path"
        if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
            FAILED_COPIES+=("After Effects $version_dir: $error_msg")
            echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
            continue  # Skip to next version directory
        else
            handle_error "$error_msg"  # Exit immediately if strict validation enabled
        fi
    fi
    
    # FILE COPY OPERATION LOOP:
    # Copy all submitter files from source directory to target ScriptUI Panels directory
    # ITERATION LOGIC: Process each file/directory in source path independently
    # EXPECTED OUTCOME: All source files copied to destination with appropriate renaming
    files_copied=0    # Counter for successful file operations
    copy_failed=false # Flag to track if any copy operation failed in this version
    
    for item in "$SUBMITTER_SRC_PATH"/*; do
        # VALIDATION CHECK: Skip if glob pattern doesn't match any files
        if [[ ! -e "$item" ]]; then
            continue  # No files found matching pattern, continue to next iteration
        fi
        
        item_name=$(basename "$item")  # Extract filename from full path
        
        # SPECIAL HANDLING: Rename main submitter file for user installation
        # PURPOSE: Distinguish user installation from system installation in After Effects UI
        if [[ "$item_name" == "DeadlineCloudSubmitter.jsx" ]]; then
            dst_item_name="DeadlineCloudSubmitter(User).jsx"
            echo "Renaming $item_name to $dst_item_name for user installation" >&2
        else
            dst_item_name="$item_name"  # Keep original name for other files
        fi
        
        dst_item_path="$scriptui_panels_path/$dst_item_name"
        
        # FILE COPY OPERATION: Handle regular files
        if [[ -f "$item" ]]; then
            # PERMISSION PREPARATION: Remove read-only attribute from existing destination file
            # RECOVERY ACTION: Allows overwriting protected files from previous installations
            if [[ -f "$dst_item_path" ]]; then
                chmod u+w "$dst_item_path" 2>/dev/null || true  # Ignore chmod failures
            fi
            
            # FILESYSTEM OPERATION: Copy file with error handling
            if cp "$item" "$dst_item_path" 2>/dev/null; then
                ((files_copied++))  # Increment success counter
                echo "Installed $dst_item_name to After Effects $version_dir" >&2
            else
                # ERROR SCENARIO: File copy failed (permissions, disk space, etc.)
                error_msg="Failed to copy $item_name to After Effects $version_dir"
                if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
                    FAILED_COPIES+=("After Effects $version_dir: $error_msg")
                    echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
                    copy_failed=true
                    break  # Stop processing files for this version, move to next version
                else
                    handle_error "$error_msg"  # Exit immediately if strict validation
                fi
            fi
        # DIRECTORY COPY OPERATION: Handle subdirectories recursively
        elif [[ -d "$item" ]]; then
            # CLEANUP OPERATION: Remove existing directory to ensure clean installation
            if [[ -d "$dst_item_path" ]]; then
                rm -rf "$dst_item_path" 2>/dev/null || true  # Ignore removal failures
            fi
            
            # FILESYSTEM OPERATION: Recursive directory copy with error handling
            if cp -r "$item" "$dst_item_path" 2>/dev/null; then
                ((files_copied++))  # Increment success counter
                echo "Installed directory $item_name to After Effects $version_dir" >&2
            else
                # ERROR SCENARIO: Directory copy failed (permissions, disk space, etc.)
                error_msg="Failed to copy directory $item_name to After Effects $version_dir"
                if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
                    FAILED_COPIES+=("After Effects $version_dir: $error_msg")
                    echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
                    copy_failed=true
                    break  # Stop processing files for this version, move to next version
                else
                    handle_error "$error_msg"  # Exit immediately if strict validation
                fi
            fi
        fi
    done
    
    # POST-COPY VALIDATION: Check results of file copy operations for this version
    if [[ "$copy_failed" == "true" ]]; then
        continue  # Skip to next version if any copy operation failed
    fi
    
    # SUCCESS TRACKING: Record successful installations for final reporting
    if [[ $files_copied -eq 0 ]]; then
        echo "Warning: No files were copied to After Effects $version_dir" >&2
    else
        COPIED_TO+=("$scriptui_panels_path")  # Add to successful installations list
    fi
done  # End of version directory processing loop

# INSTALLATION RESULTS ANALYSIS:
# Evaluate overall success/failure status and provide appropriate user feedback
# ERROR SCENARIOS: Handle complete failure, partial failure, and success cases differently

if [[ ${#FAILED_COPIES[@]} -gt 0 && ${#COPIED_TO[@]} -eq 0 ]]; then
    # COMPLETE FAILURE SCENARIO: All installation attempts failed
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        # GRACEFUL DEGRADATION: Report failure but continue with warning status
        echo "Warning: All After Effects $MAJOR_VERSION versions failed to install, but continuing due to ignore_minor_version_errors flag" >&2
        for error in "${FAILED_COPIES[@]}"; do
            echo "  $error" >&2  # List all specific failure reasons
        done
        exit_success "After Effects $MAJOR_VERSION installation completed with errors (ignored)"
    else
        # FAIL-FAST: Report failure and exit with error code
        echo "Error: Failed to install to any After Effects versions" >&2
        for error in "${FAILED_COPIES[@]}"; do
            echo "  $error" >&2  # List all specific failure reasons
        done
        exit 1
    fi
elif [[ ${#FAILED_COPIES[@]} -gt 0 ]]; then
    # PARTIAL FAILURE SCENARIO: Some installations succeeded, some failed
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        echo "Warning: Installation failed for some versions (ignored due to ignore_minor_version_errors flag)" >&2
    else
        echo "Warning: Installation failed for some versions" >&2
    fi
    # DETAILED ERROR REPORTING: List specific failures for troubleshooting
    for error in "${FAILED_COPIES[@]}"; do
        echo "  $error" >&2
    done
fi

if [[ ${#COPIED_TO[@]} -eq 0 && "$IGNORE_MINOR_VERSION_ERRORS" != "1" ]]; then
    handle_error "No files were successfully installed"
fi

# Create success message
version_list=$(IFS=', '; echo "${VERSION_DIRS[*]}")
success_message="Deadline Cloud submitter is successfully installed to AE $MAJOR_VERSION minor versions: $version_list"

echo "Successfully installed to After Effects versions: $version_list" >&2
echo "Installation completed to ${#COPIED_TO[@]} location(s)." >&2

# Return the success message for InstallBuilder to display
echo "$success_message"