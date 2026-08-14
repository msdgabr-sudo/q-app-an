param(
    [Parameter(Mandatory = $true)]
    [string]$KeystorePath
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$SourceRoot = Join-Path $Root 'source'
$AndroidRoot = Join-Path $SourceRoot 'android-twa'
$FrozenShaFile = Join-Path $SourceRoot '.release-source-sha'
$ExpectedSourceSha = '6e49775df5742413371a4165ea985173c43f5f5e'
$ExpectedAlias = 'qiblaastro'
$ExpectedUploadSha256 = 'E8:6F:83:F1:61:0B:6F:AA:4F:57:62:4F:44:B1:B8:74:83:49:DB:84:69:EB:3C:CE:06:A4:BA:05:5B:CB:EC:A7'
$DestinationDir = Join-Path $AndroidRoot 'keystore'
$DestinationKey = Join-Path $DestinationDir 'qiblaastro-upload.jks'

if (-not (Test-Path -LiteralPath $FrozenShaFile -PathType Leaf)) {
    throw 'Frozen source marker is missing. Clone/checkout release/aab-3.1.0 completely before signing.'
}
$ActualSourceSha = (Get-Content -LiteralPath $FrozenShaFile -Raw).Trim()
if ($ActualSourceSha -ne $ExpectedSourceSha) {
    throw "Frozen source mismatch. Expected $ExpectedSourceSha but found $ActualSourceSha"
}
if (-not (Test-Path -LiteralPath $KeystorePath -PathType Leaf)) {
    throw "Upload keystore not found: $KeystorePath"
}
if (-not (Test-Path -LiteralPath (Join-Path $AndroidRoot 'build_signed_release.ps1') -PathType Leaf)) {
    throw 'Frozen Android release script is missing.'
}

Write-Host 'QiblaAstro ELITE 3.1.0 — final local signed AAB build' -ForegroundColor Cyan
Write-Host "Frozen source: $ExpectedSourceSha"
Write-Host 'Package: com.qiblalabs'
Write-Host 'Version: 3.1.0 (code 3)'
Write-Host 'Target SDK: 36'
Write-Host "Expected upload key SHA-256: $ExpectedUploadSha256"
Write-Host "Expected alias: $ExpectedAlias"
Write-Host ''
Write-Host 'The keystore password must only be entered into local keytool/jarsigner/apksigner prompts.' -ForegroundColor Yellow
Write-Host 'Never commit the keystore or password to GitHub.' -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $DestinationDir | Out-Null
if (Test-Path -LiteralPath $DestinationKey) {
    Remove-Item -LiteralPath $DestinationKey -Force
}
Copy-Item -LiteralPath $KeystorePath -Destination $DestinationKey -Force

try {
    Push-Location $AndroidRoot
    try {
        & .\build_signed_release.ps1
        if ($LASTEXITCODE -ne 0) { throw 'Frozen signed release script failed.' }
    }
    finally {
        Pop-Location
    }

    $SignedAab = Join-Path $AndroidRoot 'app-release-bundle-signed.aab'
    $SignedApk = Join-Path $AndroidRoot 'app-release-signed.apk'
    if (-not (Test-Path -LiteralPath $SignedAab -PathType Leaf)) { throw 'Final signed AAB was not produced.' }
    if (-not (Test-Path -LiteralPath $SignedApk -PathType Leaf)) { throw 'Final signed APK was not produced.' }

    $Dist = Join-Path $Root 'dist'
    New-Item -ItemType Directory -Force -Path $Dist | Out-Null
    $FinalAab = Join-Path $Dist 'QiblaAstro-3.1.0-code3-final.aab'
    $FinalApk = Join-Path $Dist 'QiblaAstro-3.1.0-code3-final.apk'
    Copy-Item -LiteralPath $SignedAab -Destination $FinalAab -Force
    Copy-Item -LiteralPath $SignedApk -Destination $FinalApk -Force

    $Hashes = Get-FileHash -Algorithm SHA256 -LiteralPath $FinalAab,$FinalApk
    $HashFile = Join-Path $Dist 'SHA256SUMS.txt'
    $Hashes | ForEach-Object { "{0}  {1}" -f $_.Hash, (Split-Path -Leaf $_.Path) } | Set-Content -LiteralPath $HashFile -Encoding ASCII

    Write-Host ''
    Write-Host 'PASS: final signed AAB/APK produced from the frozen release snapshot.' -ForegroundColor Green
    $Hashes | Format-Table -AutoSize
    Write-Host "Artifacts: $Dist" -ForegroundColor Green
}
finally {
    if (Test-Path -LiteralPath $DestinationKey) {
        Remove-Item -LiteralPath $DestinationKey -Force
    }
}
