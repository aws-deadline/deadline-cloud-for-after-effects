param (
    [string]$project,
    [int]$rqindex,
    [int]$start,
    [int]$end,
    [int]$multiframe,
    [string]$outputpath = ""
)

function Check-Output {
    param (
        [string]$output,
        [int]$exitCode
    )
    Write-Output $output
    if ($exitCode -ne 0) {
        exit $exitCode
    }
    if(($output) -match "^WARNING:After Effects warning: logged (.+) errors"){
        exit 1
    }
    if(($output) -match "^aerender ERROR"){
        exit 2
    }
}

$renderarg = @("-project", "`"$project`"", "-rqindex", $rqindex, "-s", $start, "-e", $end, "-v", "ERRORS_AND_PROGRESS", "-close", "DO_NOT_SAVE_CHANGES", "-sound", "OFF")

if (-Not "$outputpath".Contains(",")) {
    $renderarg += "-output", "`"$outputpath`""
}

if ($multiframe -le 0) {
    $renderarg += "-mfr", "OFF", "100"
} else {
    $renderarg += "-mfr", "ON", $multiframe
}

aerender.exe $renderarg 2>&1 | ForEach-Object ($_) {
    Check-Output -output "$_" -exitCode $global:lastExitCode
}

exit $global:lastExitCode
