# Builds the app sources together with tests\Tests.cs into a console runner and runs it.
$ErrorActionPreference = 'Stop'
& "$PSScriptRoot\build.ps1" -Extra "$PSScriptRoot\tests\Tests.cs" -Out 'obj\SteadyCues.Tests.exe' -Console -Main 'SteadyCues.Tests.Runner'
& "$PSScriptRoot\obj\SteadyCues.Tests.exe"
exit $LASTEXITCODE
