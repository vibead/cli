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

One manual run of **Release** (`.github/workflows/release.yml`, from `main`) ships every channel in a fixed order. It is the only way to publish, so nobody needs an npm login, token or one-time code.

Before the run:

1. Create a **draft** release `vX.Y.Z-beta.N` with each `vibead-beta-<version>-<platform>.tar.gz` and its `.sha256` (darwin-arm64, darwin-x64, linux-x64), built by the vibead/vibead pipeline.
2. Merge a PR that sets `npm/package.json` `version` and `npm/releases.json` (version and the three SHA-256s) to that release.
3. QA the draft from a local mirror (`VIBEAD_RELEASE_BASE=file:///path/to/mirror`, laid out as `download/vX/…`, plus `VIBEAD_MANIFEST_URL=file:///path/to/install.json`) on Claude Code, Codex and OpenCode.

Then run **Release** with `version` (no `v`) and the npm dist-tag (default `next`; choose `latest` only when QA promotes the release). It:

1. **check:** fails unless the draft has all three archives and `npm/` on main matches them exactly.
2. **sign:** calls `sign-release.yml`, which adds `SHA256SUMS` and `SHA256SUMS.sigstore.json`. The Sigstore identity stays `sign-release.yml@refs/heads/main`, which the installers verify. This writes a public transparency-log entry, so only run it for a release you mean to ship.
3. **publish-release:** publishes the release. With npm dist-tag `latest` it is marked **Latest**; with `next` or `beta` it is a **pre-release, not Latest** (`--prerelease --latest=false`), so `releases/latest` and `/install` stay on the promoted version.
4. **npm:** `npm publish --provenance --access public` through npm Trusted Publishing. The job's GitHub OIDC token is exchanged for a short-lived publish credential. There is no `NODE_AUTH_TOKEN` and no OTP, and the npm page shows a provenance badge linking to this run. It runs in the `npm` environment; add required reviewers there to gate it.
5. **tap** (only when the npm dist-tag is `latest`; a `next` or `beta` run never touches Homebrew): updates `vibead/homebrew-tap` `Formula/vibead.rb` (version, URLs, SHA-256s from `SHA256SUMS`) and pushes to main as `github-actions[bot]` (a test fails if any workflow names a personal email). Its own CI then installs the formula on Linux and both Macs.

After the run, bump `apps/static-web/install.json` in vibead/vibead-ai. That manifest, not GitHub's "latest", decides what `curl | sh` and `irm | iex` install, and vibead-ai CI refuses a pin whose release lacks `SHA256SUMS` or any archive.

**One-time setup:**

- On npmjs.com, open `@vibead/cli` → Settings → Trusted publishing → GitHub Actions, and enter: owner `vibead`, repository `cli`, workflow `release.yml`, environment `npm`.
- In this repo, create the `npm` environment, with optional required reviewers.
- Add the `HOMEBREW_TAP_TOKEN` secret: a fine-grained token with Contents read/write on `vibead/homebrew-tap` only.
- Once the first OIDC publish works, set the package's publishing access to "Require two-factor authentication and disallow tokens", so only this workflow can publish.

Trusted Publishing only publishes. Moving another dist-tag (for example `beta`) still needs a signed-in maintainer, so pick the tag in the run instead.

Then deploy the site so `/install` and `/install.ps1` serve this commit's scripts.

## Tests

`node --test install/test/*.test.mjs` runs shellcheck, the shell installer in a temp HOME against a local fake release (manifest version, manifest missing or empty, pinned, upgrade, checksum mismatch, unsafe archive, missing platform, with and without a terminal, existing non-installer `vibead`), the PowerShell installer under `pwsh`, and checks that the README lists npm first with every channel as one command.
