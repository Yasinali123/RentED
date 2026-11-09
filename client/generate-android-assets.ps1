Add-Type -AssemblyName System.Drawing

function Get-TrimmedBitmap([string]$path) {
    $src = [System.Drawing.Bitmap]::FromFile($path)
    $minX = $src.Width; $maxX = 0; $minY = $src.Height; $maxY = 0
    for ($y = 0; $y -lt $src.Height; $y++) {
        for ($x = 0; $x -lt $src.Width; $x++) {
            if ($src.GetPixel($x, $y).A -gt 15) {
                if ($x -lt $minX) { $minX = $x }
                if ($x -gt $maxX) { $maxX = $x }
                if ($y -lt $minY) { $minY = $y }
                if ($y -gt $maxY) { $maxY = $y }
            }
        }
    }
    $w = $maxX - $minX + 1
    $h = $maxY - $minY + 1
    $rect = New-Object System.Drawing.Rectangle($minX, $minY, $w, $h)
    $dest = New-Object System.Drawing.Bitmap($w, $h, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.DrawImage($src, 0, 0, $rect, [System.Drawing.GraphicsUnit]::Pixel)
    $g.Dispose()
    $src.Dispose()
    return $dest
}

function Save-Png([System.Drawing.Bitmap]$bmp, [string]$destPath) {
    $dir = [System.IO.Path]::GetDirectoryName($destPath)
    if (!(Test-Path $dir)) {
        [System.IO.Directory]::CreateDirectory($dir) | Out-Null
    }
    if (Test-Path $destPath) {
        Remove-Item $destPath -Force
    }
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
}

function Create-LauncherForeground([System.Drawing.Bitmap]$iconBmp, [int]$size, [string]$destPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Safe zone is 66dp of 108dp (~61.1%). We scale the emblem to ~60% of canvas
    $maxTarget = [int]($size * 0.60)
    $scale = [Math]::Min($maxTarget / $iconBmp.Width, $maxTarget / $iconBmp.Height)
    $destW = [int]($iconBmp.Width * $scale)
    $destH = [int]($iconBmp.Height * $scale)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $g.DrawImage($iconBmp, $destX, $destY, $destW, $destH)
    $g.Dispose()
    Save-Png $bmp $destPath
    $bmp.Dispose()
    Write-Host "Generated Foreground ($size x $size): $destPath"
}

function Create-LegacySquareIcon([System.Drawing.Bitmap]$iconBmp, [int]$size, [string]$destPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Rounded rectangle white card
    $radius = [int]($size * 0.22)
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $radius * 2
    $pad = [int]($size * 0.02)
    $w = $size - (2 * $pad)
    $h = $size - (2 * $pad)

    $path.AddArc($pad, $pad, $d, $d, 180, 90)
    $path.AddArc($pad + $w - $d, $pad, $d, $d, 270, 90)
    $path.AddArc($pad + $w - $d, $pad + $h - $d, $d, $d, 0, 90)
    $path.AddArc($pad, $pad + $h - $d, $d, $d, 90, 90)
    $path.CloseFigure()

    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillPath($brush, $path)
    $brush.Dispose()
    $path.Dispose()

    # Draw centered logo at ~65% size
    $maxTarget = [int]($size * 0.65)
    $scale = [Math]::Min($maxTarget / $iconBmp.Width, $maxTarget / $iconBmp.Height)
    $destW = [int]($iconBmp.Width * $scale)
    $destH = [int]($iconBmp.Height * $scale)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $g.DrawImage($iconBmp, $destX, $destY, $destW, $destH)
    $g.Dispose()
    Save-Png $bmp $destPath
    $bmp.Dispose()
    Write-Host "Generated Legacy Square ($size x $size): $destPath"
}

function Create-LegacyRoundIcon([System.Drawing.Bitmap]$iconBmp, [int]$size, [string]$destPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    $pad = [int]($size * 0.02)
    $w = $size - (2 * $pad)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::White)
    $g.FillEllipse($brush, $pad, $pad, $w, $w)
    $brush.Dispose()

    # Draw centered logo at ~62% size
    $maxTarget = [int]($size * 0.62)
    $scale = [Math]::Min($maxTarget / $iconBmp.Width, $maxTarget / $iconBmp.Height)
    $destW = [int]($iconBmp.Width * $scale)
    $destH = [int]($iconBmp.Height * $scale)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $g.DrawImage($iconBmp, $destX, $destY, $destW, $destH)
    $g.Dispose()
    Save-Png $bmp $destPath
    $bmp.Dispose()
    Write-Host "Generated Legacy Round ($size x $size): $destPath"
}

function Create-SplashScreen([System.Drawing.Bitmap]$logoBmp, [int]$width, [int]$height, [string]$destPath) {
    $bmp = New-Object System.Drawing.Bitmap($width, $height, [System.Drawing.Imaging.PixelFormat]::Format24bppRgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality

    # Dark brand background #0F172A
    $bgColor = [System.Drawing.ColorTranslator]::FromHtml("#0F172A")
    $g.Clear($bgColor)

    # Scale logo to ~50% of screen width (portrait) or ~35% of screen width (landscape), and at most 30% height
    $isPortrait = $height -ge $width
    $maxW = if ($isPortrait) { [int]($width * 0.58) } else { [int]($width * 0.38) }
    $maxH = [int]($height * 0.30)

    $scale = [Math]::Min($maxW / $logoBmp.Width, $maxH / $logoBmp.Height)
    $destW = [int]($logoBmp.Width * $scale)
    $destH = [int]($logoBmp.Height * $scale)
    $destX = [int](($width - $destW) / 2)
    $destY = [int](($height - $destH) / 2)

    $g.DrawImage($logoBmp, $destX, $destY, $destW, $destH)
    $g.Dispose()
    Save-Png $bmp $destPath
    $bmp.Dispose()
    Write-Host "Generated Splash ($width x $height): $destPath"
}

function Create-SplashIcon([System.Drawing.Bitmap]$iconBmp, [int]$size, [string]$destPath) {
    $bmp = New-Object System.Drawing.Bitmap($size, $size, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.Clear([System.Drawing.Color]::Transparent)

    # Android 12+ 160dp circular mask inside 288dp canvas -> ~55% safe diameter
    $maxTarget = [int]($size * 0.55)
    $scale = [Math]::Min($maxTarget / $iconBmp.Width, $maxTarget / $iconBmp.Height)
    $destW = [int]($iconBmp.Width * $scale)
    $destH = [int]($iconBmp.Height * $scale)
    $destX = [int](($size - $destW) / 2)
    $destY = [int](($size - $destH) / 2)

    $g.DrawImage($iconBmp, $destX, $destY, $destW, $destH)
    $g.Dispose()
    Save-Png $bmp $destPath
    $bmp.Dispose()
    Write-Host "Generated Android 12 Splash Icon ($size x $size): $destPath"
}

# --- Execute Generation ---
$iconBmp = Get-TrimmedBitmap "client\public\logo-icon.png"
$fullLogoBmp = Get-TrimmedBitmap "client\public\logo-transparent.png"
$resDir = "client\android\app\src\main\res"

Write-Host "=== Generating Launcher Icons ==="
$densities = @(
    @{ Name = "mipmap-mdpi";    ForeSize = 108; IconSize = 48 },
    @{ Name = "mipmap-hdpi";    ForeSize = 162; IconSize = 72 },
    @{ Name = "mipmap-xhdpi";   ForeSize = 216; IconSize = 96 },
    @{ Name = "mipmap-xxhdpi";  ForeSize = 324; IconSize = 144 },
    @{ Name = "mipmap-xxxhdpi"; ForeSize = 432; IconSize = 192 }
)

foreach ($d in $densities) {
    $dir = Join-Path $resDir $d.Name
    Create-LauncherForeground $iconBmp $d.ForeSize (Join-Path $dir "ic_launcher_foreground.png")
    Create-LegacySquareIcon   $iconBmp $d.IconSize (Join-Path $dir "ic_launcher.png")
    Create-LegacyRoundIcon    $iconBmp $d.IconSize (Join-Path $dir "ic_launcher_round.png")
}

Write-Host "=== Generating Android 12 Splash Icon ==="
Create-SplashIcon $iconBmp 432 (Join-Path $resDir "drawable\splash_icon.png")

Write-Host "=== Generating Splash Screens ==="
# Default fallback
Create-SplashScreen $fullLogoBmp 480 320 (Join-Path $resDir "drawable\splash.png")

# Portrait
$portraits = @(
    @{ Dir = "drawable-port-mdpi";    W = 320;  H = 480 },
    @{ Dir = "drawable-port-hdpi";    W = 480;  H = 800 },
    @{ Dir = "drawable-port-xhdpi";   W = 720;  H = 1280 },
    @{ Dir = "drawable-port-xxhdpi";  W = 960;  H = 1600 },
    @{ Dir = "drawable-port-xxxhdpi"; W = 1280; H = 1920 }
)
foreach ($p in $portraits) {
    Create-SplashScreen $fullLogoBmp $p.W $p.H (Join-Path $resDir "$($p.Dir)\splash.png")
}

# Landscape
$landscapes = @(
    @{ Dir = "drawable-land-mdpi";    W = 480;  H = 320 },
    @{ Dir = "drawable-land-hdpi";    W = 800;  H = 480 },
    @{ Dir = "drawable-land-xhdpi";   W = 1280; H = 720 },
    @{ Dir = "drawable-land-xxhdpi";  W = 1600; H = 960 },
    @{ Dir = "drawable-land-xxxhdpi"; W = 1920; H = 1280 }
)
foreach ($l in $landscapes) {
    Create-SplashScreen $fullLogoBmp $l.W $l.H (Join-Path $resDir "$($l.Dir)\splash.png")
}

$iconBmp.Dispose()
$fullLogoBmp.Dispose()
Write-Host "=== All Android assets successfully generated! ==="

