<#
.SYNOPSIS
  Writes the Scoop and winget manifests for the version in VERSION, using the SHA-256 that
  the release workflow published next to SteadyCues.exe.

.EXAMPLE
  .\tools\update-packaging.ps1        # after the vX.Y.Z release has been published
#>
param([string]$Repo = 'Aweswomedude1234/motion-cues')
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot
$version = (Get-Content (Join-Path $root 'VERSION') -Raw).Trim()
$url = "https://github.com/$Repo/releases/download/v$version/SteadyCues.exe"
$hash = ((Invoke-WebRequest -UseBasicParsing "$url.sha256").Content -split '\s+')[0].Trim().ToLower()
if ($hash -notmatch '^[0-9a-f]{64}$') { throw "Could not read the published checksum for v$version" }
$date = (gh release view "v$version" -R $Repo --json publishedAt --jq .publishedAt).Substring(0, 10)
$utf8 = New-Object System.Text.UTF8Encoding $false

# ---------------------------------------------------------------- Scoop
$scoop = [ordered]@{
    version     = $version
    description = 'Vehicle motion cues for Windows: moving dots at the screen edges help prevent car sickness.'
    homepage    = 'https://steadycues.vercel.app'
    license     = 'MIT'
    url         = $url
    hash        = $hash
    bin         = 'SteadyCues.exe'
    shortcuts   = @(, @('SteadyCues.exe', 'SteadyCues'))
    checkver    = 'github'
    autoupdate  = [ordered]@{
        url  = "https://github.com/$Repo/releases/download/v`$version/SteadyCues.exe"
        hash = @{ url = '$url.sha256' }
    }
}
$scoopDir = Join-Path $root 'packaging\scoop'
New-Item -ItemType Directory -Force $scoopDir | Out-Null
[IO.File]::WriteAllText((Join-Path $scoopDir 'steadycues.json'), ($scoop | ConvertTo-Json -Depth 5) + "`n", $utf8)

# ---------------------------------------------------------------- winget (manifest schema 1.6)
$id = 'Aweswomedude1234.SteadyCues'
$dir = Join-Path $root "packaging\winget\manifests\a\Aweswomedude1234\SteadyCues\$version"
New-Item -ItemType Directory -Force $dir | Out-Null
$H = $hash.ToUpper()

[IO.File]::WriteAllText((Join-Path $dir "$id.yaml"), @"
# yaml-language-server: `$schema=https://aka.ms/winget-manifest.version.1.6.0.schema.json
PackageIdentifier: $id
PackageVersion: $version
DefaultLocale: en-US
ManifestType: version
ManifestVersion: 1.6.0
"@ + "`n", $utf8)

[IO.File]::WriteAllText((Join-Path $dir "$id.installer.yaml"), @"
# yaml-language-server: `$schema=https://aka.ms/winget-manifest.installer.1.6.0.schema.json
PackageIdentifier: $id
PackageVersion: $version
InstallerType: exe
Scope: user
InstallModes:
- silent
- silentWithProgress
InstallerSwitches:
  Silent: --install
  SilentWithProgress: --install
UpgradeBehavior: install
ProductCode: SteadyCues
ReleaseDate: $date
AppsAndFeaturesEntries:
- DisplayName: SteadyCues
  Publisher: SteadyCues contributors
  ProductCode: SteadyCues
Installers:
- Architecture: neutral
  InstallerUrl: $url
  InstallerSha256: $H
ManifestType: installer
ManifestVersion: 1.6.0
"@ + "`n", $utf8)

[IO.File]::WriteAllText((Join-Path $dir "$id.locale.en-US.yaml"), @"
# yaml-language-server: `$schema=https://aka.ms/winget-manifest.defaultLocale.1.6.0.schema.json
PackageIdentifier: $id
PackageVersion: $version
PackageLocale: en-US
Publisher: SteadyCues contributors
PublisherUrl: https://github.com/$Repo
PublisherSupportUrl: https://github.com/$Repo/issues
PackageName: SteadyCues
PackageUrl: https://steadycues.vercel.app
License: MIT
LicenseUrl: https://github.com/$Repo/blob/main/LICENSE
ShortDescription: Vehicle motion cues for Windows that help prevent car sickness.
Description: SteadyCues puts softly moving dots at the edges of your screen that follow the car's motion, so passengers can read and work without getting car sick. Laptops without a motion sensor can use a phone as the sensor over Wi-Fi or a hotspot.
Moniker: steadycues
Tags:
- accessibility
- car-sickness
- motion-sickness
- motion-cues
- travel
- overlay
ReleaseNotesUrl: https://github.com/$Repo/releases/tag/v$version
ManifestType: defaultLocale
ManifestVersion: 1.6.0
"@ + "`n", $utf8)

Write-Host "Wrote Scoop and winget manifests for v$version (sha256 $hash)" -ForegroundColor Green
