# Normalize the selected design board for side-by-side visual QA.
Add-Type -AssemblyName System.Drawing
$qaDirectory = $PSScriptRoot
$qaSource = [System.Drawing.Bitmap]::FromFile((Join-Path $qaDirectory 'option-2.png'))
try {
    foreach ($qaView in @(
        @{ Name = 'desktop'; X = 24; Y = 51; Width = 1100; Height = 944 },
        @{ Name = 'mobile'; X = 1155; Y = 51; Width = 362; Height = 944 }
    )) {
        $qaRect = [System.Drawing.Rectangle]::new($qaView.X, $qaView.Y, $qaView.Width, $qaView.Height)
        $qaCrop = $qaSource.Clone($qaRect, $qaSource.PixelFormat)
        try {
            $qaCrop.Save((Join-Path $qaDirectory "reference-$($qaView.Name).png"), [System.Drawing.Imaging.ImageFormat]::Png)
            foreach ($qaSuffix in @('-1', '')) {
                $qaImplementationPath = Join-Path $qaDirectory "implementation-$($qaView.Name)$qaSuffix.png"
                if (-not (Test-Path -LiteralPath $qaImplementationPath)) { continue }
                $qaImplementation = [System.Drawing.Bitmap]::FromFile($qaImplementationPath)
                $qaComparison = [System.Drawing.Bitmap]::new(($qaView.Width * 2), $qaView.Height)
                $qaGraphics = [System.Drawing.Graphics]::FromImage($qaComparison)
                try {
                    $qaGraphics.DrawImage($qaCrop, 0, 0, $qaView.Width, $qaView.Height)
                    $qaGraphics.DrawImage($qaImplementation, $qaView.Width, 0, $qaView.Width, $qaView.Height)
                    $qaComparison.Save((Join-Path $qaDirectory "comparison-$($qaView.Name)$qaSuffix.png"), [System.Drawing.Imaging.ImageFormat]::Png)
                } finally { $qaGraphics.Dispose(); $qaComparison.Dispose(); $qaImplementation.Dispose() }
            }
        } finally { $qaCrop.Dispose() }
    }
} finally { $qaSource.Dispose() }

$qaReference = [System.Drawing.Bitmap]::FromFile((Join-Path $qaDirectory 'reference-desktop.png'))
$qaLatest = [System.Drawing.Bitmap]::FromFile((Join-Path $qaDirectory 'implementation-desktop.png'))
try {
    foreach ($qaRegion in @(
        @{ Name = 'heading'; X = 280; Y = 80; Width = 760; Height = 220 },
        @{ Name = 'form'; X = 280; Y = 340; Width = 760; Height = 450 }
    )) {
        $qaRect = [System.Drawing.Rectangle]::new($qaRegion.X, $qaRegion.Y, $qaRegion.Width, $qaRegion.Height)
        $qaFocus = [System.Drawing.Bitmap]::new(($qaRegion.Width * 2), $qaRegion.Height)
        $qaGraphics = [System.Drawing.Graphics]::FromImage($qaFocus)
        try {
            $qaGraphics.DrawImage($qaReference, [System.Drawing.Rectangle]::new(0, 0, $qaRegion.Width, $qaRegion.Height), $qaRect, [System.Drawing.GraphicsUnit]::Pixel)
            $qaGraphics.DrawImage($qaLatest, [System.Drawing.Rectangle]::new($qaRegion.Width, 0, $qaRegion.Width, $qaRegion.Height), $qaRect, [System.Drawing.GraphicsUnit]::Pixel)
            $qaFocus.Save((Join-Path $qaDirectory "comparison-$($qaRegion.Name).png"), [System.Drawing.Imaging.ImageFormat]::Png)
        } finally { $qaGraphics.Dispose(); $qaFocus.Dispose() }
    }
} finally { $qaReference.Dispose(); $qaLatest.Dispose() }
