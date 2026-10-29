# VibeAd for Windows: there is no Windows build yet, so this script (served at
# https://www.vibead.ai/install.ps1) prints one line and installs nothing. It
# suggests no other route: npm (`os` is darwin/linux) and WSL are not supported
# Windows installs either.
#
#   irm https://www.vibead.ai/install.ps1 | iex
#
# Under `irm … | iex` it ends with `return`, never `exit`, so the PowerShell
# window that ran it stays open, and sets $LASTEXITCODE to 1. Run as a file
# (`pwsh -File install.ps1`) it exits 1.

function Install-VibeAd {
  [Console]::Error.WriteLine('vibead: Windows is not supported yet.')
  $global:LASTEXITCODE = 1
}

Install-VibeAd
if ($PSCommandPath) { exit 1 }
