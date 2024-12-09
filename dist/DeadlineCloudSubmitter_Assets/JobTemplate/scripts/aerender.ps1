param (
    [string]$project,
    [int]$rqindex,
    [int]$start,
    [int]$end,
    [string]$outputpath = ""
)

function Check-Output {
    param (
        [string]$output,
        [int]$exitCode
    )
    Write-Output $output

    # Throw actual errors instead of just exiting
    if ($exitCode -ne 0) {
        throw "Process exited with code: $exitCode"
    }
    if(($output) -match "^WARNING:After Effects warning: logged (.+) errors"){
        throw "After Effects Warning: $($matches[1])"
    }
    if(($output) -match "^aerender ERROR"){
        throw "Aerender Error: $output"
    }
}

# Add error action preference
$ErrorActionPreference = "Stop"

$renderarg = @("-project", "`"$project`"", "-rqindex", $rqindex, "-s", $start, "-e", $end, "-v", "ERRORS_AND_PROGRESS", "-close", "DO_NOT_SAVE_CHANGES", "-sound", "OFF")

if (-Not "$outputpath".Contains(",")) {
    $renderarg += "-output", "`"$outputpath`""
}

try {
    aerender.exe $renderarg 2>&1 | ForEach-Object {
        Check-Output -output "$_" -exitCode $LASTEXITCODE
    }
} catch {
    Write-Error $_.Exception.Message
    exit 1
}

if ($LASTEXITCODE -ne 0) {
    exit $LASTEXITCODE
}