param (
    [string]$outputs
)
Write-Host "Creating output folders."
$outputList = $outputs -split ','

foreach($output in $outputList){
    md -Force (Split-Path -Path "$($output)")
}
