# Backup installers

npm (`npm i -g @vibead/cli && vibead enable`) is the primary channel. These one-line installers use the same GitHub Release archives, so a one-command install keeps working without npm:

| Channel | Command |
| --- | --- |
| npm (primary) | `npm i -g @vibead/cli && vibead enable` |
| macOS / Linux | `curl -fsSL https://www.vibead.ai/install \| sh` |
| Homebrew | `brew install vibead/tap/vibead && vibead enable` |
| Windows PowerShell | `irm https://www.vibead.ai/install.ps1 \| iex` (once Windows builds ship) |

`install.sh` and `install.ps1` are the only sources; www.vibead.ai serves byte-identical copies.

**What they do:** read the pinned version from `https://www.vibead.ai/install.json` (or `VIBEAD_VERSION`; never GitHub's "latest"), download that release's `SHA256SUMS`, check its Sigstore signature when `cosign` is installed (`VIBEAD_REQUIRE_SIGNATURE=1` makes it mandatory), download the archive for this computer and check its SHA-256, reject archives with files outside the kit folder, install to `~/.vibead/versions/<version>-<platform>` (Windows: `%LOCALAPPDATA%\vibead`) with a stable launcher `~/.vibead/bin/vibead` linked from `~/.local/bin/vibead`, keep the current and previous versions, then run `vibead enable`, which asks before changing anything. They never use sudo and ask no question of their own: the only question is `vibead enable`'s one consent. They never edit a shell profile or the user PATH; when the bin directory isn't on PATH they print the line to add (a profile that already has an earlier installer's `# >>> vibead installer PATH >>>` block or the exact line is recognised). With no terminal they print the next command instead.

## Release procedure

1. Create a **draft** release `vX.Y.Z-beta.N` with each `vibead-beta-<version>-<platform>.tar.gz` / `.zip`, the npm launcher tarball `vibead-cli-<version>.tgz` (`npm pack` in `npm/`), and a `.sha256` for each.
2. Run **Sign release** (`.github/workflows/sign-release.yml`) from `main` with that tag. It checks each kit archive's `.sha256` and adds `SHA256SUMS` (one line per kit archive) and `SHA256SUMS.sigstore.json`. The launcher tarball is checked against its own `vibead-cli-<version>.tgz.sha256`. **Planned:** `SHA256SUMS` also lists the launcher tarball, so the one signature covers it (the `sign-release.yml` change needs a push with the GitHub `workflow` scope); a release is not marked Latest until it does. The installers match only their platform's kit line, so a launcher line doesn't change what they install. Signing writes a public Sigstore transparency-log entry, so only sign a release you intend to publish.
3. Publish the draft as a **prerelease** (never Latest), so README links and npm `latest` keep the last release that passed QA. QA installs the exact artefact: `npm i -g vibead-cli-<version>.tgz` after `sha256sum -c vibead-cli-<version>.tgz.sha256` (and, for kits, `sha256sum -c` against `SHA256SUMS` plus `cosign verify-blob`, below), or the installers with `VIBEAD_VERSION=<version>`, on Claude Code, Codex and OpenCode.
4. After QA PASS: mark it Latest, `npm publish` from `npm/` (`publishConfig.tag` is `next`; then `npm dist-tag add @vibead/cli@<version> latest`), and bump `apps/static-web/install.json` in vibead/vibead-ai to the new version: that manifest, not GitHub's "latest", decides what `curl | sh` installs, and vibead-ai CI refuses a pin whose release lacks `SHA256SUMS` or any archive.
5. Bump `vibead/homebrew-tap` `Formula/vibead.rb` (version, urls, sha256).
6. Deploy the site so `/install` and `/install.ps1` serve this commit's scripts.

Verify a downloaded kit archive by hand (the launcher tarball: `sha256sum -c vibead-cli-<version>.tgz.sha256`):

```sh
cosign verify-blob --bundle SHA256SUMS.sigstore.json \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity https://github.com/vibead/cli/.github/workflows/sign-release.yml@refs/heads/main \
  SHA256SUMS
sha256sum --ignore-missing -c SHA256SUMS
```

## Tests

`node --test install/test/*.test.mjs` runs shellcheck, the shell installer in a temp HOME against a local fake release (manifest version, manifest missing or empty, pinned, upgrade, checksum mismatch, unsafe archive, missing platform, a `SHA256SUMS` that also lists the launcher tarball, no PATH question or profile edit, with and without a terminal, existing non-installer `vibead`), the PowerShell installer under `pwsh`, and checks that the README lists npm first with every channel as one command.
