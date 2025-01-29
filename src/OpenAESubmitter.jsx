#include "utils/Logger.jsx"

#include "Imports.jsx"

#include "UI/SubmitterUI.jsx"

function isSecurityPrefSet() {
    var securitySetting = app.preferences.getPrefAsLong(
        "Main Pref Section",
        "Pref_SCRIPTING_FILE_NETWORK_SECURITY"
    );
    return securitySetting == 1;
}

if (isSecurityPrefSet()) {
    buildUI(this);
} else {
    //Print an error message and instructions for changing security preferences
    var submitterPanel =
        this instanceof Panel ?
        this :
        new Window(
            "palette",
            "Submit Queue to AWS Deadline Cloud",
            undefined, {
                resizable: true,
                closeButton: true,
            }
        );
    var root = submitterPanel.add("group");
    root.orientation = "column";
    root.alignment = ["fill", "fill"];
    root.alignChildren = ["fill", "top"];
    var errorText = root.add("statictext", undefined, "", {
        multiline: true,
    });
    errorText.graphics.foregroundColor = errorText.graphics.newPen(
        errorText.graphics.PenType.SOLID_COLOR,
        [1.0, 0.2, 0.2],
        1
    );
    errorText.text = "ERROR: Insufficient Script Permissions";
    var errorText2 = root.add("statictext", undefined, "", {
        multiline: true,
    });
    errorText2.text = [
        "Please allow script networking and file access:",
        '  1)  Go to "Edit > Preferences > Scripting & Expressions"',
        '  2)  Check "Allow Scripts to Write Files and Access Network"',
        '  3)  (Optional) Deselect "Warn User When Executing Files"',
        "  3)  Close this window and try again.",
    ].join("\n");
    errorText2.alignment = ["fill", "fill"];
    errorText2.minimumSize.height = 300;

    submitterPanel.layout.layout(true);
    submitterPanel.onResizing = function() {
        this.layout.resize();
    };
}