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
        [1.0, 1.0, 0.0],
        1
    );
    errorText.text = "Update Script Permissions";
    var errorText2 = root.add("statictext", undefined, "", {
        multiline: true,
    });
    errorText2.text = [
        "In order for the Deadline Cloud submitter to execute, you need to update your script permissions to allow script networking and file access. To do this, follow the instructions below",
        "  1)  For Windows User: Select Edit > Preferences > Scripting & Expressions > select Allow Scripts To Write Files And Access Network",
        "       For macOS User: Select After Effects > Settings > Scripting & Expressions > select Allow Scripts To Write Files And Access Network",
        '  2)  Check "Allow Scripts to Write Files and Access Network"',
        '  3)  (Optional) To disable warnings every time you submit a job with the submitter, you can deselect "Warn User When Executing Files"',
        "  4)  Close this window and try again.",
    ].join("\n");
    errorText2.alignment = ["fill", "fill"];
    errorText2.minimumSize.height = 300;

    submitterPanel.layout.layout(true);
    submitterPanel.onResizing = function() {
        this.layout.resize();
    };
}