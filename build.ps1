<#
.SYNOPSIS
  Builds SteadyCues.exe using only what ships with Windows 10/11.

.DESCRIPTION
  SteadyCues targets .NET Framework 4.8, which is part of every supported Windows install,
  and is compiled with the C# compiler that comes with it. No SDK, Visual Studio or NuGet
  packages are required. Windows Runtime APIs (sensors, location) are referenced straight
  from the metadata in System32\WinMetadata.

.EXAMPLE
  .\build.ps1                 # builds dist\SteadyCues.exe
  .\build.ps1 -Run            # builds and launches it
  .\build.ps1 -Extra test.cs -Out dist\harness.exe -Console
#>
[CmdletBinding()]
param(
    [string]$Out = "dist\SteadyCues.exe",
    [string[]]$Extra = @(),
    [switch]$Console,
    [string]$Main,
    [switch]$Run
)

$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$src = Join-Path $root 'src\SteadyCues'
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
if (-not (Test-Path "$fw\csc.exe")) { $fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319' }
$csc = Join-Path $fw 'csc.exe'
if (-not (Test-Path $csc)) { throw ".NET Framework 4.x C# compiler not found at $csc" }
$winmd = Join-Path $env:WINDIR 'System32\WinMetadata'

$version = (Get-Content (Join-Path $root 'VERSION') -Raw).Trim()
$outPath = Join-Path $root $Out
New-Item -ItemType Directory -Force (Split-Path $outPath) | Out-Null

# Stamp the version into the assembly.
$genDir = Join-Path $root 'obj'
New-Item -ItemType Directory -Force $genDir | Out-Null
$verFile = Join-Path $genDir 'Version.g.cs'
@"
using System.Reflection;
[assembly: AssemblyTitle("SteadyCues")]
[assembly: AssemblyProduct("SteadyCues")]
[assembly: AssemblyDescription("Vehicle motion cues for Windows")]
[assembly: AssemblyCompany("SteadyCues contributors")]
[assembly: AssemblyCopyright("MIT License")]
[assembly: AssemblyVersion("$version.0")]
[assembly: AssemblyFileVersion("$version.0")]
[assembly: AssemblyInformationalVersion("$version")]
"@ | Set-Content -Encoding UTF8 $verFile

$sources = @(Get-ChildItem $src -Recurse -Filter *.cs | ForEach-Object FullName) + $verFile + ($Extra | ForEach-Object { (Resolve-Path $_).Path })

$refs = @(
    'System.dll', 'System.Core.dll', 'System.Drawing.dll', 'System.Windows.Forms.dll',
    "$fw\System.Runtime.dll", "$fw\System.Runtime.InteropServices.WindowsRuntime.dll",
    "$winmd\Windows.Foundation.winmd", "$winmd\Windows.Devices.winmd"
) | ForEach-Object { "-r:$_" }

$cscArgs = @(
    '-nologo', '-optimize+', '-platform:anycpu', '-langversion:5', '-warn:4',
    "-target:$(if ($Console) { 'exe' } else { 'winexe' })",
    "-out:$outPath",
    "-win32icon:$src\Assets\SteadyCues.ico",
    "-win32manifest:$src\app.manifest",
    "-resource:$src\Assets\phone.html,SteadyCues.phone.html",
    "-resource:$src\Assets\SteadyCues.ico,SteadyCues.icon.ico"
) + $refs + $sources
if ($Main) { $cscArgs += "-main:$Main" }

& $csc @cscArgs
if ($LASTEXITCODE -ne 0) { throw "Build failed ($LASTEXITCODE)" }

$size = [math]::Round((Get-Item $outPath).Length / 1KB)
Write-Host "Built $Out  v$version  ($size KB)" -ForegroundColor Green
if ($Run) { Start-Process $outPath }
