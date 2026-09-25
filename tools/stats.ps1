<#
.SYNOPSIS
  One-screen growth dashboard for SteadyCues: stars, forks, downloads, repo views and clones.

.DESCRIPTION
  Uses the GitHub CLI (gh), signed in as the repository owner. GitHub keeps traffic data
  (views, unique visitors, clones, referrers) for 14 days, so run this at least every two
  weeks if you want a long history: each run appends a line to tools\stats-history.csv.

  Website visitors are in the Vercel dashboard: vercel.com > steadycues > Analytics.

.EXAMPLE
  .\tools\stats.ps1
#>
param([string]$Repo = 'Aweswomedude1234/motion-cues')
$ErrorActionPreference = 'Stop'

function Api($path) { gh api $path | ConvertFrom-Json | ForEach-Object { $_ } }  # unroll arrays (Windows PowerShell 5)

$r = Api "repos/$Repo"
$releases = @(Api "repos/$Repo/releases")
$views = Api "repos/$Repo/traffic/views"
$clones = Api "repos/$Repo/traffic/clones"
$refs = @(Api "repos/$Repo/traffic/popular/referrers")

$downloads = 0
$perRelease = foreach ($rel in $releases) {
    $n = ($rel.assets | Where-Object { $_.name -eq 'SteadyCues.exe' } | Measure-Object download_count -Sum).Sum
    $downloads += [int]$n
    [pscustomobject]@{ Release = $rel.tag_name; Published = ([datetime]$rel.published_at).ToString('yyyy-MM-dd'); Downloads = [int]$n }
}

Write-Host ""
Write-Host "  SteadyCues  ($Repo)" -ForegroundColor Green
Write-Host "  ------------------------------------------------------------"
"  Stars      {0,8}      Forks    {1,6}      Watchers {2,6}" -f $r.stargazers_count, $r.forks_count, $r.subscribers_count
"  Downloads  {0,8}      (all releases, SteadyCues.exe)" -f $downloads
"  Views      {0,8}      ({1} unique visitors, last 14 days)" -f $views.count, $views.uniques
"  Clones     {0,8}      ({1} unique, last 14 days)" -f $clones.count, $clones.uniques
Write-Host ""
Write-Host "  Downloads by release" -ForegroundColor Green
$perRelease | Format-Table -AutoSize | Out-String | ForEach-Object { $_.TrimEnd() } | Write-Host
if ($refs.Count) {
    Write-Host "  Where visitors came from (14 days)" -ForegroundColor Green
    $refs | Select-Object @{n = 'Referrer'; e = { $_.referrer } }, @{n = 'Views'; e = { $_.count } }, @{n = 'Unique'; e = { $_.uniques } } |
        Format-Table -AutoSize | Out-String | ForEach-Object { $_.TrimEnd() } | Write-Host
}
Write-Host ""
Write-Host "  Website visitors: https://vercel.com/dashboard  >  steadycues  >  Analytics"
Write-Host "  Daily repo views: https://github.com/$Repo/graphs/traffic"
Write-Host ""

$csv = Join-Path $PSScriptRoot 'stats-history.csv'
if (-not (Test-Path $csv)) { 'date,stars,forks,downloads,views14d,uniqueVisitors14d,clones14d' | Set-Content $csv }
'{0},{1},{2},{3},{4},{5},{6}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm'), $r.stargazers_count, $r.forks_count, $downloads, $views.count, $views.uniques, $clones.count |
    Add-Content $csv
