# Renders the SteadyCues icon at every size Windows asks for and packs them into one .ico.
# Usage: .\tools\make-icon.ps1   (writes src\SteadyCues\Assets\SteadyCues.ico and website\public\icon-*.png)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot
$sizes = 16, 20, 24, 32, 40, 48, 64, 128, 256

function Draw-Icon([int]$n) {
    $bmp = New-Object System.Drawing.Bitmap $n, $n, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'
    $pad = [math]::Max(0.5, $n * 0.03); $r = $n * 0.23; $w = $n - 2 * $pad
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = 2 * $r
    $path.AddArc($pad, $pad, $d, $d, 180, 90); $path.AddArc($pad + $w - $d, $pad, $d, $d, 270, 90)
    $path.AddArc($pad + $w - $d, $pad + $w - $d, $d, $d, 0, 90); $path.AddArc($pad, $pad + $w - $d, $d, $d, 90, 90)
    $path.CloseFigure()
    $brush = New-Object System.Drawing.Drawing2D.LinearGradientBrush (New-Object System.Drawing.PointF 0, 0), (New-Object System.Drawing.PointF $n, $n), ([System.Drawing.Color]::FromArgb(255, 14, 116, 144)), ([System.Drawing.Color]::FromArgb(255, 30, 58, 138))
    $g.FillPath($brush, $path)
    # Screen silhouette
    $sw = $n * 0.36; $sh = $n * 0.46; $sx = ($n - $sw) / 2; $sy = ($n - $sh) / 2
    if ($n -ge 32) {
        $screen = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb(46, 255, 255, 255))
        $g.FillRectangle($screen, [single]$sx, [single]$sy, [single]$sw, [single]$sh)
    }
    # Two columns of cue dots, nudged down as if the car is pulling away.
    $dot = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
    $dr = [math]::Max(1.3, $n * 0.062)
    $rows = if ($n -ge 24) { 3 } else { 2 }
    $gap = $n * ($(if ($rows -eq 3) { 0.2 } else { 0.28 }))
    $cy = $n * 0.54
    foreach ($cx in @(($n * 0.2), ($n * 0.8))) {
        for ($i = 0; $i -lt $rows; $i++) {
            $y = $cy + ($i - ($rows - 1) / 2) * $gap
            $g.FillEllipse($dot, [single]($cx - $dr), [single]($y - $dr), [single](2 * $dr), [single](2 * $dr))
        }
    }
    $g.Dispose()
    return $bmp
}

# Frames below 256 px are stored as classic 32-bit DIBs (what .NET Framework and older shells expect);
# the 256 px frame is PNG-compressed, as Windows recommends.
function To-Dib([System.Drawing.Bitmap]$b) {
    $n = $b.Width
    $ms = New-Object System.IO.MemoryStream
    $w = New-Object System.IO.BinaryWriter $ms
    $w.Write([uint32]40); $w.Write([int32]$n); $w.Write([int32]($n * 2)); $w.Write([uint16]1); $w.Write([uint16]32)
    $w.Write([uint32]0); $w.Write([uint32]0); $w.Write([int32]0); $w.Write([int32]0); $w.Write([uint32]0); $w.Write([uint32]0)
    for ($y = $n - 1; $y -ge 0; $y--) { for ($x = 0; $x -lt $n; $x++) { $c = $b.GetPixel($x, $y); $w.Write([byte]$c.B); $w.Write([byte]$c.G); $w.Write([byte]$c.R); $w.Write([byte]$c.A) } }
    $maskRow = [math]::Ceiling($n / 32) * 4
    $w.Write((New-Object byte[] ($maskRow * $n)))
    $w.Flush()
    return $ms.ToArray()
}

$pngs = @()
foreach ($s in $sizes) {
    $b = Draw-Icon $s
    $ms = New-Object System.IO.MemoryStream
    $b.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    if ($s -ge 256) { $pngs += , @($s, $ms.ToArray()) } else { $pngs += , @($s, [byte[]](To-Dib $b)) }
    if ($s -ge 32) {
        $pub = Join-Path $root 'website\public'
        if (Test-Path $pub) { $b.Save((Join-Path $pub "icon-$s.png"), [System.Drawing.Imaging.ImageFormat]::Png) }
    }
    $b.Dispose()
}

$out = New-Object System.IO.MemoryStream
$bw = New-Object System.IO.BinaryWriter $out
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$pngs.Count)
$offset = 6 + 16 * $pngs.Count
foreach ($p in $pngs) {
    $s = $p[0]; $data = $p[1]
    $bw.Write([byte]($s % 256)); $bw.Write([byte]($s % 256)); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$data.Length); $bw.Write([uint32]$offset)
    $offset += $data.Length
}
foreach ($p in $pngs) { $bw.Write($p[1]) }
$bw.Flush()
$ico = Join-Path $root 'src\SteadyCues\Assets\SteadyCues.ico'
[System.IO.File]::WriteAllBytes($ico, $out.ToArray())
Write-Host "Wrote $ico"
