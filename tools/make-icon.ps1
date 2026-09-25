# Renders the SteadyCues icon at every size Windows asks for and packs them into one .ico.
# Usage: .\tools\make-icon.ps1   (writes src\SteadyCues\Assets\SteadyCues.ico and website\public\icon-*.png)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot
$sizes = 16, 20, 24, 32, 40, 48, 64, 128, 256

function Draw-Icon([int]$n) {
    # A calm road winding into the hills, framed by the two columns of cue dots the app draws.
    $bmp = New-Object System.Drawing.Bitmap $n, $n, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'; $g.PixelOffsetMode = 'HighQuality'
    $C = { param($hex) [System.Drawing.ColorTranslator]::FromHtml($hex) }
    $paper = & $C '#F3EDE1'; $field = & $C '#DCDFC8'; $far = & $C '#C5CCAE'; $sun = & $C '#E7C08A'; $road = & $C '#55704A'; $ink = & $C '#2D2B26'; $edge = & $C '#CFC6B4'

    # Tile (rounded square).
    $pad = [math]::Max(0.5, $n * 0.035); $r = $n * 0.24; $w = $n - 2 * $pad; $d = 2 * $r
    $tile = New-Object System.Drawing.Drawing2D.GraphicsPath
    $tile.AddArc($pad, $pad, $d, $d, 180, 90); $tile.AddArc($pad + $w - $d, $pad, $d, $d, 270, 90)
    $tile.AddArc($pad + $w - $d, $pad + $w - $d, $d, $d, 0, 90); $tile.AddArc($pad, $pad + $w - $d, $d, $d, 90, 90)
    $tile.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $paper), $tile)
    $g.SetClip($tile)

    # Low sun, a far ridge and near fields.
    if ($n -ge 40) { $sr = $n * 0.085; $g.FillEllipse((New-Object System.Drawing.SolidBrush $sun), [single]($n * 0.66 - $sr), [single]($n * 0.27 - $sr), [single](2 * $sr), [single](2 * $sr)) }
    $ridge = New-Object System.Drawing.Drawing2D.GraphicsPath
    $ridge.AddBezier([single]0, [single]($n * 0.30), [single]($n * 0.35), [single]($n * 0.18), [single]($n * 0.60), [single]($n * 0.36), [single]$n, [single]($n * 0.26))
    $ridge.AddLine([single]$n, [single]($n * 0.26), [single]$n, [single]$n)
    $ridge.AddLine([single]$n, [single]$n, [single]0, [single]$n)
    $ridge.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $far), $ridge)
    $hill = New-Object System.Drawing.Drawing2D.GraphicsPath
    $hill.AddBezier([single]0, [single]($n * 0.40), [single]($n * 0.30), [single]($n * 0.34), [single]($n * 0.66), [single]($n * 0.46), [single]$n, [single]($n * 0.37))
    $hill.AddLine([single]$n, [single]($n * 0.37), [single]$n, [single]$n)
    $hill.AddLine([single]$n, [single]$n, [single]0, [single]$n)
    $hill.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $field), $hill)

    # The road: a cubic Bezier, wide in front and narrow at the horizon.
    $p0 = @(0.50, 1.06); $p1 = @(0.62, 0.78); $p2 = @(0.72, 0.58); $p3 = @(0.45, 0.41)
    # Sample the centreline, then offset both edges along the normal: a smooth tapering ribbon.
    $steps = 64; $pts = @()
    for ($i = 0; $i -le $steps; $i++) {
        $t = $i / $steps; $u = 1 - $t
        $x = ($u*$u*$u*$p0[0] + 3*$u*$u*$t*$p1[0] + 3*$u*$t*$t*$p2[0] + $t*$t*$t*$p3[0]) * $n
        $y = ($u*$u*$u*$p0[1] + 3*$u*$u*$t*$p1[1] + 3*$u*$t*$t*$p2[1] + $t*$t*$t*$p3[1]) * $n
        $pts += ,@($x, $y, $t)
    }
    $left = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    $right = New-Object System.Collections.Generic.List[System.Drawing.PointF]
    for ($i = 0; $i -le $steps; $i++) {
        $a = $pts[[math]::Max(0, $i - 1)]; $b = $pts[[math]::Min($steps, $i + 1)]
        $dx = $b[0] - $a[0]; $dy = $b[1] - $a[1]; $len = [math]::Sqrt($dx * $dx + $dy * $dy)
        $nx = -$dy / $len; $ny = $dx / $len
        $half = $n * (0.17 * [math]::Pow(1 - $pts[$i][2], 1.2) + 0.004)
        $left.Add((New-Object System.Drawing.PointF ([single]($pts[$i][0] + $nx * $half)), ([single]($pts[$i][1] + $ny * $half))))
        $right.Insert(0, (New-Object System.Drawing.PointF ([single]($pts[$i][0] - $nx * $half)), ([single]($pts[$i][1] - $ny * $half))))
    }
    $ribbon = New-Object System.Drawing.Drawing2D.GraphicsPath
    $ribbon.AddLines($left.ToArray()); $ribbon.AddLines($right.ToArray()); $ribbon.CloseFigure()
    $g.FillPath((New-Object System.Drawing.SolidBrush $road), $ribbon)
    if ($n -ge 64) {
        # Dashed centre line, thinning with distance.
        for ($i = 2; $i -lt $steps - 16; $i += 8) {
            $w0 = [single]($n * 0.014 * (1 - $pts[$i][2]) + 0.6)
            $dash = New-Object System.Drawing.Pen $paper, $w0
            $dash.StartCap = 'Round'; $dash.EndCap = 'Round'
            $g.DrawLine($dash, [single]$pts[$i][0], [single]$pts[$i][1], [single]$pts[$i + 3][0], [single]$pts[$i + 3][1])
        }
    }

    # Cue dots.
    $g.ResetClip()
    $dot = New-Object System.Drawing.SolidBrush $ink
    $dr = [math]::Max(1.0, $n * 0.04)
    $rows = if ($n -ge 24) { @(0.50, 0.65, 0.80) } else { @(0.54, 0.78) }
    foreach ($cx in @(($n * 0.16), ($n * 0.84))) {
        foreach ($ry in $rows) {
            $g.FillEllipse($dot, [single]($cx - $dr), [single]($ry * $n - $dr), [single](2 * $dr), [single](2 * $dr))
        }
    }

    # Hairline edge so the light tile holds its shape on a light taskbar.
    $g.DrawPath((New-Object System.Drawing.Pen $edge, ([single][math]::Max(1, $n / 96))), $tile)
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
