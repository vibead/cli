# Backup installers

npm (`npm i -g @vibead/cli && vibead enable`) is the primary channel. These one-line installers use the same GitHub Release archives, so a one-command install keeps working without npm:

| Channel | Command |
| --- | --- |
| npm (primary) | `npm i -g @vibead/cli && vibead enable` |
| macOS / Linux | `curl -fsSL https://www.vibead.ai/install \| sh` |
| Homebrew | `brew install vibead/tap/vibead && vibead enable` |
| Windows PowerShell | `irm https://www.vibead.ai/install.ps1 \| iex` (once Windows builds ship) |

`install.sh` and `install.ps1` are the only sources; www.vibead.ai serves byte-identical copies.

**What they do:** read the pinned version from `https://www.vibead.ai/install.json` (or `VIBEAD_VERSION`; never GitHub's "latest"), download that release's `SHA256SUMS`, check its Sigstore signature when `cosign` is installed (`VIBEAD_REQUIRE_SIGNATURE=1` makes it mandatory), download the archive for this computer and check its SHA-256, reject archives with files outside the kit folder, install to `~/.vibead/versions/<version>-<platform>` (Windows: `%LOCALAPPDATA%\vibead`) with a stable launcher `~/.vibead/bin/vibead` linked from `~/.local/bin/vibead`, keep the current and previous versions, then run `vibead enable`, which asks before changing anything. They never use sudo. They only edit a shell profile or the user PATH after a yes at a prompt, and only once: the profile gets one `# >>> vibead installer PATH >>>` block, and a re-run that finds it (or the exact line) doesn't ask again. With no terminal they print the next command instead.

## Release procedure

1. Create a **draft** release `vX.Y.Z-beta.N` with each `vibead-beta-<version>-<platform>.tar.gz` / `.zip` and its `.sha256`.
2. Run **Sign release** (`.github/workflows/sign-release.yml`) from `main` with that tag. It adds `SHA256SUMS` and `SHA256SUMS.sigstore.json`. Signing writes a public Sigstore transparency-log entry, so only sign a release you intend to publish.
3. QA: install from the draft with a local mirror (`VIBEAD_RELEASE_BASE=file:///path/to/mirror`, laid out as `download/vX/…`, plus `VIBEAD_MANIFEST_URL=file:///path/to/install.json`), on Claude Code, Codex and OpenCode.
4. Publish the release and mark it **latest** (for the README links). Then bump `apps/static-web/install.json` in vibead/vibead-ai to the new version: that manifest, not GitHub's "latest", decides what `curl | sh` installs, and vibead-ai CI refuses a pin whose release lacks `SHA256SUMS` or any archive.
5. Bump `vibead/homebrew-tap` `Formula/vibead.rb` (version, urls, sha256).
6. Deploy the site so `/install` and `/install.ps1` serve this commit's scripts.

## Tests

`node --test install/test/*.test.mjs` runs shellcheck, the shell installer in a temp HOME against a local fake release (manifest version, manifest missing or empty, pinned, upgrade, checksum mismatch, unsafe archive, missing platform, with and without a terminal, existing non-installer `vibead`), the PowerShell installer under `pwsh`, and checks that the README lists npm first with every channel as one command.
