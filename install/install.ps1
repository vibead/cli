# VibeAd installer for Windows (backup channel; npm `npm i -g @vibead/cli` stays primary).
#
#   irm https://www.vibead.ai/install.ps1 | iex
#
# Downloads the Windows release from GitHub Releases, verifies its SHA-256
# against the release's SHA256SUMS, installs it under %LOCALAPPDATA%\vibead
# (no admin rights), then runs `vibead enable`, which lists every file it will
# change and asks before touching anything.
#
# Optional environment: VIBEAD_VERSION, VIBEAD_INSTALL_DIR, VIBEAD_NO_ENABLE,
# VIBEAD_NO_MODIFY_PATH (same meaning as the macOS/Linux installer).
# Everything runs inside a function and uses `return`, never `exit`, so a
# failure doesn't close the PowerShell window that ran `iex`.

function Install-VibeAd {
  $ErrorActionPreference = 'Stop'
  $ProgressPreference = 'SilentlyContinue'
  $releaseBase = if ($env:VIBEAD_RELEASE_BASE) { $env:VIBEAD_RELEASE_BASE } else { 'https://github.com/vibead/cli/releases' }
  $installDir = if ($env:VIBEAD_INSTALL_DIR) { $env:VIBEAD_INSTALL_DIR } else { Join-Path $env:LOCALAPPDATA 'vibead' }
  $binDir = Join-Path $installDir 'bin'

  $arch = if ($env:VIBEAD_PLATFORM) { $env:VIBEAD_PLATFORM } else {
    switch ($env:PROCESSOR_ARCHITECTURE) { 'AMD64' { 'win32-x64' } 'ARM64' { 'win32-arm64' } default { "win32-$($env:PROCESSOR_ARCHITECTURE)" } }
  }
  $platform = $arch

  $tmp = Join-Path ([System.IO.Path]::GetTempPath()) ("vibead-" + [System.Guid]::NewGuid().ToString('N'))
  New-Item -ItemType Directory -Path $tmp | Out-Null
  try {
    $version = $env:VIBEAD_VERSION
    if ($version) { $version = $version.TrimStart('v'); $sumsUrl = "$releaseBase/download/v$version/SHA256SUMS" }
    else { $sumsUrl = "$releaseBase/latest/download/SHA256SUMS" }
    $sumsFile = Join-Path $tmp 'SHA256SUMS'
    try { Get-VibeAdFile $sumsUrl $sumsFile } catch { Write-Host "vibead install: could not download the release checksums ($sumsUrl)." -ForegroundColor Red; return }

    $pattern = '^([0-9a-f]{64})  (vibead-beta-([0-9A-Za-z.+-]+)-' + [regex]::Escape($platform) + '\.zip)$'
    $match = Get-Content $sumsFile | ForEach-Object { [regex]::Match($_, $pattern) } | Where-Object { $_.Success } | Select-Object -First 1
    if (-not $match) {
      Write-Host "vibead install: this release has no Windows build for $platform yet." -ForegroundColor Yellow
      Write-Host "Use npm instead:  npm i -g @vibead/cli; vibead enable"
      Write-Host "Or, in WSL:       curl -fsSL https://www.vibead.ai/install | sh"
      return
    }
    $expected = $match.Groups[1].Value
    $archive = $match.Groups[2].Value
    $found = $match.Groups[3].Value
    if ($version -and $found -ne $version) { Write-Host "vibead install: checksums are for $found, not $version." -ForegroundColor Red; return }
    $version = $found

    Write-Host "Downloading VibeAd $version for $platform..."
    $zip = Join-Path $tmp $archive
    try { Get-VibeAdFile "$releaseBase/download/v$version/$archive" $zip } catch { Write-Host 'vibead install: download failed. Check your network and retry.' -ForegroundColor Red; return }
    $actual = (Get-FileHash -Algorithm SHA256 -Path $zip).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { Write-Host "vibead install: checksum mismatch for $archive (expected $expected, got $actual). Nothing was installed." -ForegroundColor Red; return }
    Write-Host 'Checksum verified.'

    $folder = "vibead-beta-$platform"
    $stage = Join-Path $tmp 'stage'
    Expand-Archive -Path $zip -DestinationPath $stage
    $top = @(Get-ChildItem -Force $stage)
    if ($top.Count -ne 1 -or $top[0].Name -ne $folder) { Write-Host "vibead install: unexpected files in $archive. Nothing was installed." -ForegroundColor Red; return }
    $exe = Join-Path (Join-Path $stage $folder) 'vibead-beta.exe'
    if (-not (Test-Path $exe)) { Write-Host "vibead install: $archive has no vibead-beta.exe." -ForegroundColor Red; return }

    $versions = Join-Path $installDir 'versions'
    New-Item -ItemType Directory -Force -Path $versions, $binDir | Out-Null
    $target = Join-Path $versions "$version-$platform"
    if (Test-Path $target) { Remove-Item -Recurse -Force $target }
    Move-Item (Join-Path $stage $folder) $target
    (Get-Item $target).LastWriteTime = Get-Date

    # Stable launcher: the path never changes across upgrades.
    $launcher = Join-Path $binDir 'vibead.cmd'
    $targetExe = Join-Path $target 'vibead-beta.exe'
    $body = "@echo off`r`nif `"%~1`"==`"--version`" if `"%~2`"==`"`" (echo $version& exit /b 0)`r`n`"$targetExe`" %*`r`n"
    [System.IO.File]::WriteAllText($launcher, $body, [System.Text.Encoding]::ASCII)

    Get-ChildItem -Directory $versions | Sort-Object LastWriteTime -Descending | Select-Object -Skip 2 | Remove-Item -Recurse -Force
    Write-Host "Installed VibeAd $version`: $launcher"

    $userPath = [Environment]::GetEnvironmentVariable('Path', 'User')
    if (-not (($userPath -split ';') -contains $binDir)) {
      $add = $false
      if (-not $env:VIBEAD_NO_MODIFY_PATH -and [Environment]::UserInteractive -and -not [Console]::IsInputRedirected) {
        $answer = Read-Host "Add $binDir to your user PATH? [Y/n]"
        $add = ($answer -eq '' -or $answer -match '^(y|yes)$')
      }
      if ($add) {
        [Environment]::SetEnvironmentVariable('Path', ($(if ($userPath) { "$userPath;" } else { '' }) + $binDir), 'User')
        Write-Host 'Added. New terminals will find `vibead`.'
      } else {
        Write-Host "To use ``vibead`` in new terminals, add $binDir to your PATH."
      }
    }
    $env:Path = "$binDir;$env:Path"

    if ($env:VIBEAD_NO_ENABLE) { Write-Host 'Next: vibead enable'; return }
    Write-Host ''
    & $launcher enable
    if ($LASTEXITCODE -ne 0) { Write-Host 'vibead enable did not finish. Run it again any time: vibead enable' -ForegroundColor Yellow }
  } finally {
    Remove-Item -Recurse -Force $tmp -ErrorAction SilentlyContinue
  }
}

function Get-VibeAdFile([string]$Url, [string]$OutFile) {
  if ($Url -like 'file://*') { Copy-Item -LiteralPath ([System.Uri]$Url).LocalPath -Destination $OutFile; return }
  if ($Url -notlike 'https://*') { throw "refusing non-HTTPS URL $Url" }
  Invoke-WebRequest -UseBasicParsing -Uri $Url -OutFile $OutFile
}

Install-VibeAd
