#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# After Effects Submitter User Install Helper - Shell Script Version
# This script installs the Deadline Cloud submitter to After Effects without requiring Python

# Default values
INSTALLATION_SCOPE=""
AE_PATH_FOR_USER=""
MAJOR_VERSION=""
SUBMITTER_SRC_PATH=""
IGNORE_MINOR_VERSION_ERRORS=0

# Function to show usage
show_usage() {
    echo "Usage: $0 --installation_scope SCOPE --ae_path_for_user PATH --major_version VERSION --submitter_src_path PATH [--ignore_minor_version_errors 0|1]"
    echo ""
    echo "Install Deadline Cloud submitter to After Effects"
    echo ""
    echo "Options:"
    echo "  --installation_scope SCOPE        Installation scope (must be 'user' to perform operations)"
    echo "  --ae_path_for_user PATH           Path to the After Effects preferences directory"
    echo "  --major_version VERSION           After Effects major version to install to (e.g., '24', '25')"
    echo "  --submitter_src_path PATH         Directory containing Deadline Cloud submitter files"
    echo "  --ignore_minor_version_errors 0|1 Ignore minor version installation errors (0=false, 1=true)"
    echo "  -h, --help                        Show this help message"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --installation_scope)
            INSTALLATION_SCOPE="$2"
            shift 2
            ;;
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
            echo "Error: Unknown option $1" >&2
            show_usage >&2
            exit 1
            ;;
    esac
done

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
}

# Validate required arguments
if [[ -z "$INSTALLATION_SCOPE" || -z "$AE_PATH_FOR_USER" || -z "$MAJOR_VERSION" || -z "$SUBMITTER_SRC_PATH" ]]; then
    handle_error "Missing required arguments"
fi

# Only proceed if installation scope is "user"
if [[ "$INSTALLATION_SCOPE" != "user" ]]; then
    exit_success ""
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
        exit_success "After Effects $MAJOR_VERSION installation completed with errors (ignored)"
    else
        handle_error "No After Effects ${MAJOR_VERSION}.x versions found in: $AE_PATH_FOR_USER"
    fi
fi

# Sort version directories
IFS=$'\n' VERSION_DIRS=($(sort <<<"${VERSION_DIRS[*]}"))

# Install to each version directory
COPIED_TO=()
FAILED_COPIES=()

for version_dir in "${VERSION_DIRS[@]}"; do
    ae_version_path="$AE_PATH_FOR_USER/$version_dir"
    scripts_path="$ae_version_path/Scripts"
    scriptui_panels_path="$scripts_path/ScriptUI Panels"
    
    # Create directory structure if it doesn't exist
    if ! mkdir -p "$scriptui_panels_path" 2>/dev/null; then
        error_msg="Failed to create ScriptUI Panels directory: $scriptui_panels_path"
        if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
            FAILED_COPIES+=("After Effects $version_dir: $error_msg")
            echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
            continue
        else
            handle_error "$error_msg"
        fi
    fi
    
    # Check write permissions
    if [[ ! -w "$scriptui_panels_path" ]]; then
        error_msg="No write permission to ScriptUI Panels directory: $scriptui_panels_path"
        if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
            FAILED_COPIES+=("After Effects $version_dir: $error_msg")
            echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
            continue
        else
            handle_error "$error_msg"
        fi
    fi
    
    # Copy files from source to destination
    files_copied=0
    copy_failed=false
    
    for item in "$SUBMITTER_SRC_PATH"/*; do
        if [[ ! -e "$item" ]]; then
            continue  # Skip if no files match
        fi
        
        item_name=$(basename "$item")
        
        # Rename DeadlineCloudSubmitter.jsx to DeadlineCloudSubmitter(User).jsx
        if [[ "$item_name" == "DeadlineCloudSubmitter.jsx" ]]; then
            dst_item_name="DeadlineCloudSubmitter(User).jsx"
            echo "Renaming $item_name to $dst_item_name for user installation" >&2
        else
            dst_item_name="$item_name"
        fi
        
        dst_item_path="$scriptui_panels_path/$dst_item_name"
        
        if [[ -f "$item" ]]; then
            # Remove read-only attribute if destination exists
            if [[ -f "$dst_item_path" ]]; then
                chmod u+w "$dst_item_path" 2>/dev/null || true
            fi
            
            if cp "$item" "$dst_item_path" 2>/dev/null; then
                ((files_copied++))
                echo "Installed $dst_item_name to After Effects $version_dir" >&2
            else
                error_msg="Failed to copy $item_name to After Effects $version_dir"
                if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
                    FAILED_COPIES+=("After Effects $version_dir: $error_msg")
                    echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
                    copy_failed=true
                    break
                else
                    handle_error "$error_msg"
                fi
            fi
        elif [[ -d "$item" ]]; then
            # Remove existing directory if it exists
            if [[ -d "$dst_item_path" ]]; then
                rm -rf "$dst_item_path" 2>/dev/null || true
            fi
            
            if cp -r "$item" "$dst_item_path" 2>/dev/null; then
                ((files_copied++))
                echo "Installed directory $item_name to After Effects $version_dir" >&2
            else
                error_msg="Failed to copy directory $item_name to After Effects $version_dir"
                if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
                    FAILED_COPIES+=("After Effects $version_dir: $error_msg")
                    echo "Warning: $error_msg (continuing due to ignore_minor_version_errors flag)" >&2
                    copy_failed=true
                    break
                else
                    handle_error "$error_msg"
                fi
            fi
        fi
    done
    
    if [[ "$copy_failed" == "true" ]]; then
        continue
    fi
    
    if [[ $files_copied -eq 0 ]]; then
        echo "Warning: No files were copied to After Effects $version_dir" >&2
    else
        COPIED_TO+=("$scriptui_panels_path")
    fi
done

# Report results
if [[ ${#FAILED_COPIES[@]} -gt 0 && ${#COPIED_TO[@]} -eq 0 ]]; then
    # All copies failed
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        echo "Warning: All After Effects $MAJOR_VERSION versions failed to install, but continuing due to ignore_minor_version_errors flag" >&2
        for error in "${FAILED_COPIES[@]}"; do
            echo "  $error" >&2
        done
        exit_success "After Effects $MAJOR_VERSION installation completed with errors (ignored)"
    else
        echo "Error: Failed to install to any After Effects versions" >&2
        for error in "${FAILED_COPIES[@]}"; do
            echo "  $error" >&2
        done
        exit 1
    fi
elif [[ ${#FAILED_COPIES[@]} -gt 0 ]]; then
    # Some copies failed, but some succeeded
    if [[ "$IGNORE_MINOR_VERSION_ERRORS" == "1" ]]; then
        echo "Warning: Installation failed for some versions (ignored due to ignore_minor_version_errors flag)" >&2
    else
        echo "Warning: Installation failed for some versions" >&2
    fi
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