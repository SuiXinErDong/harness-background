# Remove harness-background from the active dsh profile (web by default).
param(
    [string]$ProfileName = "web"
)
$ErrorActionPreference = "Stop"

$pluginName = "harness-background"
$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME ".dsh" }
$target = Join-Path $dshHome "profiles\node_modules\$pluginName"
$patchPath = Join-Path $dshHome "profiles\$ProfileName\cordis.patch.yml"

if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
    Write-Host "removed $target"
}

if (Test-Path $patchPath) {
    $lines = Get-Content $patchPath
    $out = New-Object System.Collections.Generic.List[string]
    $skip = $false
    foreach ($line in $lines) {
        if ($line -match "^\s*- id:\s*$pluginName\s*$") { $skip = $true; continue }
        if ($skip) {
            if ($line -match "^\s*-") { $skip = $false } else { continue }
        }
        $out.Add($line)
    }
    # Drop a now-orphaned trailing `- insert:` (and trailing blank lines).
    while ($out.Count -gt 0 -and $out[$out.Count - 1].Trim() -eq "") { $out.RemoveAt($out.Count - 1) }
    if ($out.Count -gt 0 -and $out[$out.Count - 1].Trim() -eq "- insert:") { $out.RemoveAt($out.Count - 1) }
    if ($out.Count -ne $lines.Count) {
        Set-Content -Path $patchPath -Value $out -Encoding UTF8
        Write-Host "removed the $pluginName row from $patchPath"
    }
}

Write-Host "done. Restart the harness to unload the plugin."
