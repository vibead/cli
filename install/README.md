# Backup installers

npm (`npm i -g @vibead/cli && vibead enable`) is the primary channel. These one-line installers use the same GitHub Release archives, so a one-command install keeps working without npm:

| Channel | Command |
| --- | --- |
| npm (primary) | `npm i -g @vibead/cli && vibead enable` |
| macOS / Linux | `curl -fsSL https://www.vibead.ai/install \| sh` |
| Homebrew | `brew install vibead/tap/vibead && vibead enable` |
| Windows PowerShell | `irm https://www.vibead.ai/install.ps1 \| iex` (once Windows builds ship) |

`install.sh` and `install.ps1` are the only sources; www.vibead.ai serves byte-identical copies.

**What they do:** download `SHA256SUMS` from the latest (or `VIBEAD_VERSION`) release, check its Sigstore signature when `cosign` is installed (`VIBEAD_REQUIRE_SIGNATURE=1` makes it mandatory), download the archive for this computer and check its SHA-256, reject archives with files outside the kit folder, install to `~/.vibead/versions/<version>-<platform>` (Windows: `%LOCALAPPDATA%\vibead`) with a stable launcher `~/.vibead/bin/vibead` linked from `~/.local/bin/vibead`, keep the current and previous versions, then run `vibead enable`, which asks before changing anything. They never use sudo. They only edit a shell profile or the user PATH after a yes at a prompt. With no terminal they print the next command instead.

## Release procedure

1. Create a **draft** release `vX.Y.Z-beta.N` with each `vibead-beta-<version>-<platform>.tar.gz` / `.zip` and its `.sha256`.
2. Run **Sign release** (`.github/workflows/sign-release.yml`) from `main` with that tag. It adds `SHA256SUMS` and `SHA256SUMS.sigstore.json`. Signing writes a public Sigstore transparency-log entry, so only sign a release you intend to publish.
3. QA: install from the draft with a local mirror (`VIBEAD_RELEASE_BASE=file:///path/to/mirror`, laid out as `download/vX/…` and `latest/download/…`), on Claude Code, Codex and OpenCode.
4. Publish the release and mark it **latest** (the installers resolve `releases/latest/download/SHA256SUMS`).
5. Bump `vibead/homebrew-tap` `Formula/vibead.rb` (version, urls, sha256).
6. Deploy the site so `/install` and `/install.ps1` serve this commit's scripts.

## Tests

`node --test install/test` runs shellcheck, the shell installer in a temp HOME against a local fake release (latest, pinned, upgrade, checksum mismatch, unsafe archive, missing platform, with and without a terminal, existing non-installer `vibead`), the PowerShell installer under `pwsh`, and checks that the README lists npm first with every channel as one command.
