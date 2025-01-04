param (
    [string]$scriptDir,
    [string]$sessionDir
)

$fullDir = $scriptDir + "/font_manager.py"
Write-Host "Running python script at" $fullDir

python $fullDir "install" $sessionDir

exit $global:lastExitCode