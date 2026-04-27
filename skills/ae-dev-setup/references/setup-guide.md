# After Effects Dev Setup — Agent Workflow

Step-by-step workflow the agent follows to automate environment setup. Execute each step, validate, and only prompt the user when required.

> **Source of truth:** The canonical setup instructions live in
> [DEVELOPMENT.md](../../../DEVELOPMENT.md) and [README.md](../../../README.md).
> This guide tells the agent *how to automate* those steps — refer to the source docs for full details.

## Step 0: Detect OS

**Action:** Determine the operating system.

**Windows:**
```powershell
[System.Environment]::OSVersion.Platform
```

**macOS:**
```bash
uname -s
```

Store the OS for use in subsequent steps (paths and commands differ per platform).

After Effects is only available on Windows and macOS. If Linux is detected, inform the user and stop. Do not proceed with any setup steps.

## Step 1: Verify Python 3.9+

**Action:** Check Python version.

```bash
python3 --version
```

On Windows, also try:
```powershell
python --version
```

**If missing or < 3.9:** Inform user to install Python 3.9+ from https://www.python.org/downloads/. Wait for confirmation.

## Step 2: Detect After Effects Installation

**Action:** Search for After Effects at default install locations.

**Windows:**
```powershell
Get-ChildItem "C:\Program Files\Adobe" -Directory | Where-Object {$_.Name -match "^Adobe After Effects"} | Sort-Object Name -Descending
```

**macOS:**
```bash
ls -d /Applications/Adobe\ After\ Effects* 2>/dev/null | sort -rV
```

**If found:** Use the newest version. Display it and confirm with user. Store the AE install path and version.

**If not found:** Prompt user to install After Effects (2024, 2025, or 2026) or enter a custom path.

Determine the ScriptUI Panels path:
- **Windows:** `C:\Program Files\Adobe\Adobe After Effects <version>\Support Files\Scripts\Script UI Panels`
- **macOS:** `/Applications/Adobe After Effects <version>/Scripts/Script UI Panels`

## Step 3: Install Hatch

**Action:** Check if hatch is installed.

```bash
hatch --version
```

**If not installed:**
```bash
python3 -m pip install hatch
```

On Windows:
```powershell
python -m pip install hatch
```

Verify installation:
```bash
hatch --version
```

## Step 4: Install Dependencies

**Action:** Sync project dependencies using hatch.

```bash
hatch run sync
```

Also install the `fonttools` runtime dependency:
```bash
python3 -m pip install fonttools
```

On Windows:
```powershell
python -m pip install fonttools
```

## Step 5: Build the Submitter Script

**Action:** Bundle the ExtendScript source into the distributable submitter script.

```bash
python jsxbundler.py --source src/OpenAESubmitter.jsx --destination dist/DeadlineCloudSubmitter.jsx
```

On Windows:
```powershell
python jsxbundler.py --source src/OpenAESubmitter.jsx --destination dist/DeadlineCloudSubmitter.jsx
```

Verify output exists:
- `dist/DeadlineCloudSubmitter.jsx`
- `dist/DeadlineCloudSubmitter_Assets/` directory

## Step 6: Copy to ScriptUI Panels (Optional)

**Note:** This step is only needed if you are NOT using the submitter installer. The installer handles this automatically.

**Action:** Copy the built submitter files to After Effects.

**Windows:**
```powershell
Copy-Item "dist\DeadlineCloudSubmitter.jsx" "<AE_SCRIPTUI_PANELS_PATH>\"
Copy-Item "dist\DeadlineCloudSubmitter_Assets" "<AE_SCRIPTUI_PANELS_PATH>\" -Recurse
```

**macOS:**
```bash
cp dist/DeadlineCloudSubmitter.jsx "<AE_SCRIPTUI_PANELS_PATH>/"
cp -r dist/DeadlineCloudSubmitter_Assets "<AE_SCRIPTUI_PANELS_PATH>/"
```

## Step 7: Display Summary

```
✓ After Effects Dev Setup Complete!

Installed:
- Python: [VERSION]
- Hatch: [VERSION]
- After Effects: [VERSION] at [PATH]
- Submitter built: dist/DeadlineCloudSubmitter.jsx

Next Steps:
1. Launch After Effects — open the submitter via Window > DeadlineCloudSubmitter.jsx
2. Run tests: hatch run test
3. Run linting: hatch run lint
4. Run lint check: hatch run lint-check
5. Make code changes in src/, rebuild with: python jsxbundler.py --source src/OpenAESubmitter.jsx --destination dist/DeadlineCloudSubmitter.jsx
```

## Troubleshooting

### Python Not Found
If After Effects submitter can't find Python, ensure it's on your PATH:

**macOS:**
```bash
which python3
export PATH=$PATH:/Library/Frameworks/Python.framework/Versions/3.13/bin
```

**Windows:**
Search for "Manage app execution aliases" and disable the `python3.exe` and `python.exe` aliases if they point to the Microsoft Store.

### Deadline Not Found
Ensure `deadline` CLI is installed and on PATH:
```bash
deadline --version
```

If missing, install via pip:
```bash
python3 -m pip install deadline
```

### Missing Job Template Error
If you see "Missing job template at .../DeadlineCloudSubmitter_Assets/JobTemplate", ensure the `DeadlineCloudSubmitter_Assets` folder is in the same directory as `DeadlineCloudSubmitter.jsx`.

### Hatch Not Found After Install
Restart your terminal or add the scripts directory to PATH:
```bash
# macOS
export PATH="$HOME/.local/bin:$PATH"
```
```powershell
# Windows
$env:PATH = "$env:APPDATA\Python\Python311\Scripts;$env:PATH"
```
