#!/bin/bash
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
set -euxo pipefail

process_file() {
    local file="$1"
    if ! head -2 "$file" | grep 'Copyright ' > /dev/null; then
        case $file in
            *.java)
                CONTENT=$(cat "$file")
                cat > "$file" <<EOF
/* Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. */

$CONTENT
EOF
                ;;
            *.py)
                if head -1 "$file" | grep -q '^#!'; then
                    # If file has shebang, preserve it
                    SHEBANG=$(head -1 "$file")
                    CONTENT=$(tail -n +2 "$file")
                    cat > "$file" <<EOF
$SHEBANG
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

$CONTENT
EOF
                else
                    CONTENT=$(cat "$file")
                    cat > "$file" <<EOF
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

$CONTENT
EOF
                fi
                ;;
            *.yml|*.yaml)
                CONTENT=$(cat "$file")
                cat > "$file" <<EOF
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

$CONTENT
EOF
                ;;
            *.xml)
                if head -1 "$file" | grep -q '<?xml'; then
                    # Preserve XML declaration
                    XMLDEC=$(head -1 "$file")
                    CONTENT=$(tail -n +2 "$file")
                    cat > "$file" <<EOF
$XMLDEC
<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->

$CONTENT
EOF
                else
                    CONTENT=$(cat "$file")
                    cat > "$file" <<EOF
<!-- Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved. -->

$CONTENT
EOF
                fi
                ;;
            *.ps1)
                CONTENT=$(cat "$file")
                cat > "$file" <<EOF
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

$CONTENT
EOF
                ;;
            *.sh)
                if head -1 "$file" | grep -q '^#!'; then
                    # If file has shebang, preserve it
                    SHEBANG=$(head -1 "$file")
                    CONTENT=$(tail -n +2 "$file")
                    cat > "$file" <<EOF
$SHEBANG
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

$CONTENT
EOF
                else
                    CONTENT=$(cat "$file")
                    cat > "$file" <<EOF
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

$CONTENT
EOF
                fi
                ;;
            *.cfg|*.ini)
                CONTENT=$(cat "$file")
                cat > "$file" <<EOF
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.

$CONTENT
EOF
                ;;
        esac
    fi
}

# If no arguments provided, process tracked files recursively
if [ $# -eq 0 ]; then
    find . -type f \( -name "*.java" -o -name "*.xml" -o -name "*.py" -o -name "*.yml" \
        -o -name "*.yaml" -o -name "*.cfg" -o -name "*.ini" -o -name "*.ps1" -o -name "*.sh" \) \
        -not -path "./.git/*" -not -path "./.github/*" | \
    while IFS= read -r file; do
        process_file "$file"
    done

else
    # Process specific files provided as arguments
    for file in "$@"; do
        # Skip files in .github directory
        if [[ $file != .github/* ]]; then
            process_file "$file"
        fi
    done
fi
