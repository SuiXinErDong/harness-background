# Install harness-background into the active dsh profile (web by default).
# Idempotent: re-running is safe.
param(
    [string]$ProfileName = "web"
)
$ErrorActionPreference = "Stop"

$pluginName = "harness-background"
$source = Join-Path $PSScriptRoot $pluginName
if (-not (Test-Path (Join-Path $source "package.json"))) {
    throw "plugin package not found at $source"
}

$dshHome = if ($env:DSH_HOME) { $env:DSH_HOME } else { Join-Path $HOME ".dsh" }
$profileDir = Join-Path $dshHome "profiles\$ProfileName"
$modulesDir = Join-Path $dshHome "profiles\node_modules"
$target = Join-Path $modulesDir $pluginName
$patchPath = Join-Path $profileDir "cordis.patch.yml"

if (-not (Test-Path $patchPath)) {
    throw "profile patch not found at $patchPath (is the $ProfileName profile initialized?)"
}

# 1. copy the package into the flat fallback node_modules
if (Test-Path $target) {
    Remove-Item $target -Recurse -Force
}
New-Item -ItemType Directory -Path $modulesDir -Force | Out-Null
Copy-Item $source $target -Recurse
Write-Host "copied plugin to $target"

# 2. add the loader row to the user patch layer
$content = Get-Content $patchPath -Raw
if ($content -match "\b$pluginName\b") {
    Write-Host "cordis.patch.yml already lists $pluginName — nothing to do"
} else {
    $entry = "- insert:`n    - id: $pluginName`n      name: '$pluginName'`n"
    $lines = Get-Content $patchPath
    $emptyArray = $false
    for ($i = 0; $i -lt $lines.Count; $i++) {
        if ($lines[$i].Trim() -eq "[]") {
            $emptyArray = $true
            break
        }
    }
    if ($emptyArray) {
        # Replace the bare `[]` line with the insert entry (keep comments).
        $out = New-Object System.Collections.Generic.List[string]
        foreach ($line in $lines) {
            if ($line.Trim() -eq "[]") {
                $out.Add("- insert:")
                $out.Add("    - id: $pluginName")
                $out.Add("      name: '$pluginName'")
            } else {
                $out.Add($line)
            }
        }
        Set-Content -Path $patchPath -Value $out -Encoding UTF8
    } else {
        Add-Content -Path $patchPath -Value "`n$entry" -Encoding UTF8
    }
    Write-Host "patched $patchPath"
}

Write-Host ""
Write-Host "harness-background installed. Restart the harness (stop and re-run 'dsh web' / your dsh process),"
Write-Host "then reload the page: Settings (gear) -> Session Background."
