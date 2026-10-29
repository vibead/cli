# Backup installers

npm (`npm i -g @vibead/cli`) is the primary channel. These one-line installers use the same GitHub Release archives, so a one-command install keeps working without npm:

| Channel | Command |
| --- | --- |
| npm (primary) | `npm i -g @vibead/cli` |
| macOS / Linux | `curl -fsSL https://www.vibead.ai/install \| sh` |
| Homebrew | `brew install vibead/tap/vibead && vibead` |
| Windows PowerShell | `irm https://www.vibead.ai/install.ps1 \| iex` (once Windows builds ship) |

`install.sh` and `install.ps1` are the only sources; www.vibead.ai serves byte-identical copies.

**What they do:** read the pinned version from `https://www.vibead.ai/install.json` (or `VIBEAD_VERSION`; never GitHub's "latest"), download that release's `SHA256SUMS`, check its Sigstore signature when `cosign` is installed (`VIBEAD_REQUIRE_SIGNATURE=1` makes it mandatory), download the archive for this computer and check its SHA-256, reject archives with files outside the kit folder, install to `~/.vibead/versions/<version>-<platform>` (Windows: `%LOCALAPPDATA%\vibead`) with a stable launcher `~/.vibead/bin/vibead` linked from `~/.local/bin/vibead`, keep the current and previous versions, then connect the detected agents (zero-step setup, below); `install.ps1` runs `vibead enable`, which asks before changing anything. They never use sudo and ask no question of their own. They never edit a shell profile or the user PATH; when the bin directory isn't on PATH they print the line to add (a profile that already has an earlier installer's `# >>> vibead installer PATH >>>` block or the exact line is recognised). With no terminal they print the next command instead. Zero-step setup (vibead/vibead-ai#235: wire every detected agent with no question, then print the install notice and `vibead disable`) is on: `ZERO_STEP_CONSENT_APPROVED=1` in `install.sh` since the notice wording was approved (vibead-ai#254). Set back to `0`, `install.sh` runs `vibead enable` instead, and `VIBEAD_ZERO_STEP=1` opts in. CI, no terminal or root wire nothing at install, and the first `vibead` run does it.

## Release procedure

One manual run of **Release** (`.github/workflows/release.yml`, from `main`) ships every channel in a fixed order. It is the only way to publish, so nobody needs an npm login, token or one-time code.

Before the run:

1. Create a **draft** release `vX.Y.Z-beta.N` with each `vibead-beta-<version>-<platform>.tar.gz` and its `.sha256` (darwin-arm64, darwin-x64, linux-x64), built by the vibead/vibead pipeline, plus the npm launcher tarball `vibead-cli-<version>.tgz` (`npm pack` in `npm/` at the step-2 commit, with npm 11) and its `.sha256`.
2. Merge a PR that sets `npm/package.json` `version` and `npm/releases.json` (version and the three SHA-256s) to that release.
3. Make sure the tag `vX.Y.Z-beta.N` either does not exist yet or points at the main commit from step 2. Release never creates, moves or checks the tag: publishing a draft whose tag exists keeps that tag (the release's `target_commitish` is used only when the tag is missing), so a tag left on an older commit makes the release's source archives disagree with the npm package.
4. QA the draft from a local mirror (`VIBEAD_RELEASE_BASE=file:///path/to/mirror`, laid out as `download/vX/…`, plus `VIBEAD_MANIFEST_URL=file:///path/to/install.json`) on Claude Code, Codex and OpenCode.

Then run **Release** (mode `release`, the default) with `version` (no `v`) and the npm dist-tag (default `next`; choose `latest` only when QA promotes the release). It:

1. **check:** fails unless the draft has all three archives and `npm/` on main matches them exactly, and the draft's `vibead-cli-<version>.tgz` is byte-identical to `npm pack` of `npm/` on main (same SHA-256), so the tarball that gets signed is the one npm publishes. The job runs with `contents: write` although it only reads: GitHub shows a **draft** release only to tokens with push access, so with the default `contents: read` the workflow token gets "release not found" (dry run in cli#37). Every job that reads the draft (check, sign, publish-release) has `contents: write`; the workflow default stays `read`.
2. **sign:** calls `sign-release.yml`, which checks every kit archive and the launcher tarball against its `.sha256`, refuses a release without exactly one `vibead-cli-<version>.tgz`, and adds `SHA256SUMS` (kits **and** launcher tarball) and `SHA256SUMS.sigstore.json`. The Sigstore identity stays `sign-release.yml@refs/heads/main`, which the installers verify. This writes a public transparency-log entry, so only run it for a release you mean to ship.
3. **publish-release:** publishes the release. With npm dist-tag `latest` it is marked **Latest**; with `next` or `beta` it is a **pre-release, not Latest** (`--prerelease --latest=false`), so `releases/latest` and `/install` stay on the promoted version.
4. **npm:** first re-packs `npm/` and stops unless its SHA-256 is the `vibead-cli-<version>.tgz` line in the signed `SHA256SUMS`; then `npm publish --provenance --access public` through npm Trusted Publishing. The job's GitHub OIDC token is exchanged for a short-lived publish credential. There is no `NODE_AUTH_TOKEN` and no OTP, and the npm page shows a provenance badge linking to this run. It runs in the `npm` environment; add required reviewers there to gate it.
Homebrew needs no step here: `vibead/homebrew-tap` updates `Formula/vibead.rb` itself every 30 minutes from npm `latest` (workflow `update-formula`, default `GITHUB_TOKEN` only; it stops unless npm's tarball and this release's `SHA256SUMS` agree). A `next` or `beta` run never reaches Homebrew.

After the run, bump `apps/static-web/install.json` in vibead/vibead-ai. That manifest, not GitHub's "latest", decides what `curl | sh` and `irm | iex` install, and vibead-ai CI refuses a pin whose release lacks `SHA256SUMS` or any archive; it accepts exactly one same-version `vibead-cli-<version>.tgz` line in `SHA256SUMS` and refuses any other unknown line (vibead/vibead-ai#212).

**One-time setup:**

- On npmjs.com, open `@vibead/cli` → Settings → Trusted publishing → GitHub Actions, and enter: owner `vibead`, repository `cli`, workflow `release.yml`, environment `npm`.
- In this repo, create the `npm` environment, with optional required reviewers.
- Once the first OIDC publish works, set the package's publishing access to "Require two-factor authentication and disallow tokens", so only this workflow can publish.

- To promote a version that is already on npm without any token, also tick **Allow npm dist-tag** on that trusted-publisher entry (off by default; npm 11.21.0 or newer is installed by the job). Without it the promote run stops at its dist-tag step, before the GitHub Release or Homebrew change.

**Promote a version already on npm** (for example a `next` release that QA passed). Run **Release** from `main` with `mode` **promote**, the same `version`, and `npm_tag` (`latest`, `beta` or `next`). It skips check, sign and `npm publish`, and is safe to re-run:

1. **promote-npm:** stops unless the release is published, its `SHA256SUMS` lists `vibead-cli-<version>.tgz` exactly once with a matching SHA-256, the tarball is `@vibead/cli@<version>`, and npm's `dist.integrity` (SHA-512) for that version is the same tarball. Then `npm dist-tag add @vibead/cli@<version> <npm_tag>` through Trusted Publishing (OIDC, no token). It runs in the `npm` environment.
2. **promote-release:** the same rule as publish-release: Latest for `latest`, otherwise a pre-release that is not Latest.
Homebrew follows by itself once npm `latest` moves (see above).

Rehearse first with `npm_tag` `next` on a version that is already `next`: every step runs and nothing changes. Then bump `install.json` as above.

Then deploy the site so `/install` and `/install.ps1` serve this commit's scripts.

**Release candidate (QA) drafts.** The draft also carries the npm launcher tarball `vibead-cli-<version>.tgz` (`npm pack` in `npm/`) and its `.sha256`, so QA installs the exact artefact (`sha256sum -c vibead-cli-<version>.tgz.sha256 && npm i -g ./vibead-cli-<version>.tgz`) from the draft or a local mirror. `SHA256SUMS` lists the kit archives and the launcher tarball, so the one signature covers both. `SHA256SUMS.sigstore.json` is added by Release's sign step at publish. To let QA check the signature before publish, run **Sign release** by hand on the draft from `main` (it only uploads `SHA256SUMS` and the bundle to the draft; Release signs again at publish, so the published files are the ones Release signed). Releases signed before this change (up to v0.1.0-beta.30) list the kits only. **Release**'s check needs all three archives at the release version, so an RC draft carries the darwin-arm64, darwin-x64 and linux-x64 kits built from one vibead/vibead main commit.

Verify a downloaded kit archive or launcher tarball by hand (`--ignore-missing` checks whichever files you downloaded):

```sh
cosign verify-blob --bundle SHA256SUMS.sigstore.json \
  --certificate-oidc-issuer https://token.actions.githubusercontent.com \
  --certificate-identity https://github.com/vibead/cli/.github/workflows/sign-release.yml@refs/heads/main \
  SHA256SUMS
sha256sum --ignore-missing -c SHA256SUMS
```

## Tests

`node --test install/test/*.test.mjs` runs shellcheck, the shell installer in a temp HOME against a local fake release (manifest version, manifest missing or empty, pinned, upgrade, checksum mismatch, unsafe archive, missing platform, a `SHA256SUMS` that also lists the launcher tarball, no PATH question or profile edit, with and without a terminal, existing non-installer `vibead`), the PowerShell installer under `pwsh`, and checks that the README lists npm first with every channel as one command.
