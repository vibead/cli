# vibead/cli system design

What this public repo ships and how it fits with the rest of VibeAd. The CLI's own source is in the private [vibead/vibead](https://github.com/vibead/vibead) (its design: `docs/system-design/README.md` there); the website and API that serve `/install` and `/install.json` are in [vibead/vibead-ai](https://github.com/vibead/vibead-ai/blob/main/docs/system-design/README.md).

Checked against `main` on 2026-10-23.

<!-- status-legend:start -->
- **Live**: what a real user gets by default. Site: deployed on www.vibead.ai. CLI: served by npm `latest`, the curl `/install` pin AND Homebrew.
- **Merged, not released**: on `main`, not Live yet. A GitHub pre-release (an RC such as v0.1.0-beta.27) is in this status, optionally with a note naming the RC tag, e.g. "Merged, not released (pre-release v0.1.0-beta.27)".
- **Planned**: tracked in an issue, or in an open pull request that isn't merged. Not on `main`. In diagrams, planned pieces are dashed.

These are the only three statuses.
<!-- status-legend:end -->

**This doc is a gate on every PR.** A PR that changes how VibeAd is installed, released or launched updates this file in the same PR, with diagrams, and marks anything not built as planned. `scripts/check-design-doc.mjs` fails a PR that changes `install/`, `npm/`, `packaging/` (the Homebrew cask and any formula) or `.github/workflows/` (including `sign-release.yml`) (test-only and Markdown-only changes don't count) without at least one added or changed non-blank line in a `.md` file under `docs/system-design/` (an empty or whitespace-only file, or a whitespace-only edit to an existing line, doesn't count), unless the PR body has `Design doc: N/A — <reason>`. CI runs it on every PR as the **Design doc updated** job in `docs-check.yml`. **Known limit:** the gate watches only the paths listed above, so a new top-level folder isn't watched until it is added to `CODE_PATHS` in `scripts/check-design-doc.mjs` (reviewers check that by hand).

## Components

```mermaid
flowchart LR
  subgraph Repo["vibead/cli"]
    NPM["npm/: @vibead/cli launcher<br/>bin/vibead.mjs, lib/install.mjs,<br/>releases.json (per-platform SHA-256)"]
    SH["install/install.sh"]
    PS["install/install.ps1"]
    Sign["sign-release.yml<br/>SHA256SUMS (kits + launcher tgz)<br/>+ Sigstore bundle"]
    Cask["packaging/homebrew<br/>official cask candidate (not submitted)"]
  end
  Src["vibead/vibead<br/>builds the release archives"]
  Rel["GitHub Releases<br/>archive + .sha256 per platform,<br/>vibead-cli-&lt;v&gt;.tgz + .sha256,<br/>SHA256SUMS, SHA256SUMS.sigstore.json"]
  Reg["npm registry<br/>@vibead/cli"]
  Tap["vibead/homebrew-tap"]
  Site["www.vibead.ai<br/>/install, /install.ps1 (copies of install/),<br/>/install.json (pinned version)"]
  User["User's machine<br/>~/.vibead/versions/&lt;v&gt;, ~/.local/bin/vibead"]
  TP["release.yml with npm Trusted Publishing<br/>publishes the signed launcher tgz"]

  Src --> Rel
  Sign --> Rel
  NPM -- "npm pack (draft asset, checked by release.yml)" --> Rel
  Rel -- "signed vibead-cli-&lt;v&gt;.tgz" --> TP
  TP --> Reg
  Reg --> User
  NPM -- "downloads + checks SHA-256" --> Rel
  Site -- "curl | sh, irm | iex" --> User
  SH -. "byte-identical copy" .-> Site
  PS -. "byte-identical copy" .-> Site
  SH -- "reads /install.json, verifies SHA256SUMS<br/>(and cosign when present)" --> Rel
  Tap --> User
  classDef planned stroke-dasharray: 5 5,fill:#fafafa,color:#555
```

## Install channels

| Channel | How it works | Status |
| --- | --- | --- |
| npm (primary) | `npm i -g @vibead/cli && vibead enable`. The launcher (`npm/bin/vibead.mjs`) picks the archive for this platform from `releases.json`, downloads it from GitHub Releases, checks its SHA-256 and runs it. macOS arm64/x64 and Linux x64. | **Live**, 0.1.0-beta.33 (npm `latest`, `beta` and `next`). |
| curl | `curl -fsSL https://www.vibead.ai/install \| sh`. `install/install.sh` reads the pinned version from `www.vibead.ai/install.json` (never GitHub "latest", [cli#27](https://github.com/vibead/cli/issues/27)), verifies the archive against the release's `SHA256SUMS` (and its Sigstore signature when `cosign` is installed, required with `VIBEAD_REQUIRE_SIGNATURE=1`), installs under `~/.vibead` with a `vibead` link in `~/.local/bin`, then runs the zero-step wire (see Zero-step install; with the switch set back to 0 it runs `vibead enable`, which asks). The whole script is one function called on the last line, so a truncated download runs nothing. | **Live** ([#28](https://github.com/vibead/cli/pull/28)). vibead-ai serves a byte-identical copy at the commit pinned in its `install.source.json` (b3abed7, which has the zero-step switch at 0, so the copy on www runs `vibead enable`, which asks). Its version pin `install.json` is 0.1.0-beta.33 ([vibead-ai#295](https://github.com/vibead/vibead-ai/pull/295)), so the copy on www installs 0.1.0-beta.33. |
| PowerShell | `irm https://www.vibead.ai/install.ps1 \| iex`. Prints the npm or WSL one-liner until Windows builds ship. | **Live**. |
| Homebrew | `brew install vibead/tap/vibead` from [vibead/homebrew-tap](https://github.com/vibead/homebrew-tap). `packaging/homebrew` holds an official-cask candidate that is not submitted (needs notarized macOS builds). | **Live** (tap at 0.1.0-beta.33, [homebrew-tap#9](https://github.com/vibead/homebrew-tap/pull/9)). |

## Zero-step install

Founder decision (vibead-ai#235): `npm i -g @vibead/cli` is the only install step. It connects the detected agents on install, or on the first `vibead` run, whichever comes first (npm 12, `CI`, `--ignore-scripts`, non-TTY and Homebrew installs run no install-time wiring, so the first run does it). Installing is the consent, given a notice on the npm page and the website and a first-turn notice in each agent that names `vibead disable`. The curl installer uses the same kit command. Homebrew takes the first-run path (below).

**On by default (approved).** Gaurav approved the three notice sentences word for word in vibead-ai#254 (2a, 2b, 2c, 23 Oct 2026). `ZERO_STEP_CONSENT_APPROVED` is `true` in `npm/lib/consent.mjs` and `1` in `install/install.sh`, and the kit (vibead/vibead `beta/lib/notices.mjs`) has the same switch, on in the same release (0.1.0-beta.32). `npm/package.json` declares `"postinstall": "node lib/postinstall.mjs"`, the curl installer runs the zero-step wire instead of `vibead enable`, and `npm/README.md` shows the npm sentence above the install command. A test pins that sentence by hash: a change goes back for approval, never an edit. Setting the switches back (`false`, `0`) restores `vibead enable`, which asks, and stays tested. With a switch off, `VIBEAD_ZERO_STEP=1` is the explicit opt-in.

```mermaid
flowchart TD
  Npm["npm i -g @vibead/cli"] --> Signed{"switch on (approved, vibead-ai#254), or VIBEAD_ZERO_STEP=1?"}
  Curl["curl /install"] --> Signed
  Signed -- "no (switch set back)" --> Today["npm: postinstall does nothing; curl: vibead enable asks"]
  Signed -- yes --> Gate{"terminal on stdout and CI unset?"}
  Gate -- "no: CI, non-TTY, or --ignore-scripts" --> First["first vibead run wires"]
  Brew["brew install vibead/tap/vibead"] --> First
  Gate -- yes --> Drop{"euid 0?"}
  Drop -- "npm, SUDO_USER set" --> AsUser["re-exec as SUDO_USER; parent writes nothing"]
  Drop -- "curl" --> First
  Drop -- no --> Kit["npm: download the checked kit, or VIBEAD_KIT"]
  AsUser --> Kit
  Kit --> Wire["kit: __wrapperless wire --announce"]
  First --> Wire
  Wire --> Notice["one-line notice naming vibead disable, once per home (install or first run); one Gemini line if gemini is on PATH"]
  Fail["download or wire fails"] --> Later["exit 0; first vibead run finishes setup"]
```

- **Live** (npm, from 0.1.0-beta.32; 0.1.0-beta.33 on npm `latest`, [vibead-ai#235](https://github.com/vibead/vibead-ai/issues/235)). `npm/lib/postinstall.mjs` is the npm `postinstall` script. It skips when `CI` is set to anything other than empty, `0` or `false`, or when `npm_config_ignore_scripts=true` (with `--ignore-scripts` npm does not run it at all). npm pipes the script's own stdout, so the install counts as a terminal when this process or an ancestor has a terminal on stdout; the notice is written to `/dev/tty`. No terminal means no file changes. `sudo` re-execs as `SUDO_USER` before any download (`npm/lib/identity.mjs`), so nothing root-owned lands in the user's home; root with a `SUDO_USER` that cannot be resolved writes nothing. A download or wire failure prints one line and exits 0. `VIBEAD_KIT` points at a local kit for a simulation.
- **Merged, not released** (0.1.0-beta.32, [vibead-ai#235](https://github.com/vibead/vibead-ai/issues/235); the copy on www is `b3abed7` with the switch at 0, so a default curl install runs `vibead enable`, which asks). `install/install.sh` runs the same `__wrapperless wire --announce` with stdin from `/dev/null` (no question) when zero-step is on and there is a terminal, `CI` is unset and it is not root. Otherwise it prints `Setup finishes the first time you run vibead.` The stable launcher `~/.vibead/bin/vibead` that agent hooks call does not move on upgrade, so beta.N to beta.N+1 needs no manual step: the new kit refreshes the hooks on the install and on every run.
- **Live (Homebrew, 0.1.0-beta.33).** A formula cannot write the user's agent files: `post_install` runs sandboxed on macOS with a temporary `HOME`. A Homebrew install therefore gets the first-run path: the first `vibead` run wires, with the same journal and the same byte-for-byte `vibead disable`. This repo writes no formula caveats: the caveats text lives only in vibead/homebrew-tap `Formula/vibead.rb`, and `release.yml`'s tap job rewrites only the version and the three `sha256` lines, so the first-run path needs no change here.
- **npm 12 does not run the postinstall.** npm 12 (`latest` on 2026-10-23) blocks install scripts of global packages unless the user passes `--allow-scripts=@vibead/cli` or sets `allow-scripts` in their npm config, and it prints a warning naming the blocked script. npm 10 and 11 (bundled with Node 22 and 24) still run it. On npm 12 a plain `npm i -g @vibead/cli` takes the first-run path: nothing changes until the first `vibead` run. Checked on the box with npm 12.2.1 on 2026-10-23. Because of that warning the script was declared in `npm/package.json` only with the switch on, so no published package carried the warning before the feature could run.
- Wiring, idempotence (a second run writes no byte), the byte-for-byte restore, `~/.vibead/ads-off`, the first-turn notice and the upgrade refresh live in the kit, in vibead/vibead (`beta/lib/auto-wire.mjs`, design in that repo's `docs/system-design/README.md`).
- **Gemini CLI is not wired.** There is no documented status or spinner slot, hook context would reach the model, and the Gemini CLI FAQ forbids piggybacking on its OAuth. When `gemini` is on `PATH` the kit prints one line, `Gemini CLI isn't supported yet: VibeAd made no changes for it.`, and touches no Gemini file. The spike is vibead-ai#237.

## LEGAL WORDING - approved by Gaurav (vibead-ai#254)

These sentences are the consent, approved word for word in vibead-ai#254. The npm sentence goes above the install command in `npm/README.md`. The website sentence goes in the install section on www.vibead.ai. The first-turn line is one line in each agent's status area, before any ad.

npm README and npm page, above the install command:

Installing this package turns on a short sponsored line in Claude Code, Codex and OpenCode on this computer. The line is labelled [Ad] and appears in the agent's status area while it works. It does not read or change your prompts, code or replies. Turn it off at any time with: vibead disable

Website install section, where the install command is shown:

Installing VibeAd turns on a short sponsored line in Claude Code, Codex and OpenCode on this computer. The line is labelled [Ad] and appears in the agent's status area while it works. It does not read or change your prompts, code or replies. Turn it off at any time with: vibead disable

First turn of each agent, one line in the status area, before any ad:

VibeAd will show a sponsored [Ad] line here. Turn it off: vibead disable

With the switch on, the `npm/README.md` quick start is:

```sh
npm i -g @vibead/cli                    # connects your agents on install, or on your first vibead run
vibead                                  # finishes setup if npm skipped the install script (npm 12, CI)
claude                                  # or opencode, or codex: use your agent as usual
vibead disable                          # turn ads off and restore your settings
```

with the npm sentence above it, and `npm/package.json` declares `"postinstall": "node lib/postinstall.mjs"`.

## Release flow

```mermaid
sequenceDiagram
  autonumber
  participant Src as vibead/vibead CI
  participant R as GitHub Release (draft)
  participant S as sign-release.yml (main only)
  participant N as npm
  participant Site as vibead-ai install.json
  Src->>R: archives + .sha256 per platform
  Note over R: plus vibead-cli-<v>.tgz + .sha256 (npm pack of npm/ at the release commit)
  Note over R,N: release.yml (manual, from main, cli#30): check, sign, then publish-release
  Note over R: check: the draft tgz's tar is npm pack of npm/ on main
  S->>R: check every .sha256, write SHA256SUMS over the kits AND the tgz (exactly one, same version), cosign keyless (GitHub OIDC)
  alt npm_tag latest
    Note over R: published and marked Latest
  else npm_tag next or beta (default next)
    Note over R: published as a pre-release, not Latest (releases/latest and /install stay put)
  end
  R->>N: download the signed tgz, check it against SHA256SUMS, npm publish ./vibead-cli-<v>.tgz --provenance --tag npm_tag (Trusted Publishing, OIDC, environment npm, no token)
  Note over N: tap job (Homebrew, a Live channel) runs only for npm_tag latest
  R->>Site: bump install.json in a vibead-ai PR (CI refuses a pin without SHA256SUMS or an archive)
```

- **Live:** release signing (`sign-release.yml`, run by hand on a draft release from `main`); the installers trust only that workflow's identity on `main`.
- **Live:** npm package access requires 2FA and disallows tokens.
- **Live:** release workflow `release.yml` with npm Trusted Publishing ([cli#30](https://github.com/vibead/cli/pull/30), [cli#29](https://github.com/vibead/cli/issues/29)). The GitHub Release is marked Latest only when `npm_tag` is `latest`; a `next` or `beta` run makes a pre-release that is not Latest, so `releases/latest`, npm `latest`, the `/install` pin and Homebrew keep the promoted version (the tap job runs only for `latest`). Every job that reads the draft release (check, sign, publish-release) runs with `contents: write`, because GitHub shows drafts only to tokens with push access; the workflow default stays `contents: read` (cli#37, QA R2-1). Release never creates or moves the tag: publishing keeps an existing tag, and uses the release's `target_commitish` only when the tag is missing. Its first run published 0.1.0-beta.30 to npm `next`; it published 0.1.0-beta.33 to npm `next`, and `latest` and `beta` then moved to that version. Its tap job has not run yet (the tap moved to 0.1.0-beta.33 through homebrew-tap#9).
- **Live (v0.1.0-beta.33: the Latest GitHub release, on npm `latest`, `beta` and `next`, the `/install` pin and the Homebrew tap):** the npm launcher at 0.1.0-beta.33 (`npm/package.json`, published under the `next` dist-tag, then `latest` and `beta` moved to the same version) with the beta.33 darwin-arm64, darwin-x64 and linux-x64 kits in `npm/releases.json`, all built from vibead/vibead main @ 8334291 ([vibead#211](https://github.com/vibead/vibead/pull/211)): beta.32's kit code plus argument passthrough, where every argument after the agent name goes to the agent unchanged and VibeAd's own options go before the agent name ([vibead#207](https://github.com/vibead/vibead/issues/207), [vibead#209](https://github.com/vibead/vibead/pull/209), [vibead#210](https://github.com/vibead/vibead/pull/210)), and the telemetry-off signal to get-ads with no click link while telemetry is off ([vibead#208](https://github.com/vibead/vibead/pull/208), part of [vibead#196](https://github.com/vibead/vibead/issues/196)). The npm launcher code is unchanged from beta.32.
- **Live in 0.1.0-beta.33 (first shipped as pre-release v0.1.0-beta.32 on npm `next`):** the npm launcher at 0.1.0-beta.32 with the beta.32 kits from vibead/vibead main @ cfe881b ([cli#50](https://github.com/vibead/cli/pull/50)). It is the first release whose npm postinstall runs zero-step setup with consent first (cli#46, cli#48).
- **Live in 0.1.0-beta.33 (first shipped as pre-release v0.1.0-beta.31 on npm `next`):** the npm launcher at 0.1.0-beta.31 with the beta.31 kits from vibead/vibead main @ b4fc00d ([cli#41](https://github.com/vibead/cli/pull/41)). It is the first release whose signed `SHA256SUMS` lists the launcher tgz (cli#39).
- **Live in 0.1.0-beta.33 (first shipped as pre-release v0.1.0-beta.30 on npm `next`):** the npm launcher at 0.1.0-beta.30 with the beta.30 kits from vibead/vibead main @ 607fb1f ([cli#37](https://github.com/vibead/cli/pull/37)). The installers ask no question of their own (no PATH prompt, no profile edit; the one consent is `vibead enable`'s). Its signed `SHA256SUMS` lists the kits only, so beta.30 is not promoted to Latest.
- **Merged, not released:** lessons folder and the QA carry-over rule (`lessons/`, `scripts/pr-own-diff.sh`, [cli#31](https://github.com/vibead/cli/pull/31)); these are repo tooling, not a user channel.
- **Live** (0.1.0-beta.33 lists it)**:** launcher tgz in the signed `SHA256SUMS` ([cli#39](https://github.com/vibead/cli/pull/39)). sign-release.yml refuses to sign without exactly one `vibead-cli-<version>.tgz` matching its `.sha256`, and lists it with the kits; release.yml's check requires the draft tgz to be `npm pack` of `npm/` on main (the tar inside is compared, since gzip bytes vary with zlib), and its npm job publishes that signed tgz byte for byte after checking it against `SHA256SUMS`, so the npm tarball is the signed one. vibead-ai's `/install` release guard accepts that line ([vibead-ai#212](https://github.com/vibead/vibead-ai/issues/212)); the installers' anchored patterns ignore it. Releases up to v0.1.0-beta.30 list the kits only.
- **Planned:** the Homebrew tap update from the release workflow needs a `HOMEBREW_TAP_TOKEN` secret; a local cached house ad in the CLI ([cli#25](https://github.com/vibead/cli/issues/25)); OpenClaw as a fourth agent ([cli#20](https://github.com/vibead/cli/issues/20)). These are tracked in the vibead-ai launch epics.

## CI

- **Installer tests** (`installers.yml`, Linux only): shellcheck, `install/test/*.test.mjs` and the npm launcher tests. It runs on every non-draft pull request (and when a draft is marked ready), so as a required check it always reports on a ready PR (MERGE-1/MERGE-2). A newer push to the same PR cancels the older run; pushes to `main` run it only when `install/`, `npm/`, `README.md` or the workflows change ([cli#36](https://github.com/vibead/cli/issues/36), [cli#38](https://github.com/vibead/cli/pull/38)).
- **Docs check** (`docs-check.yml`): docs move with code ([vibead-ai#143](https://github.com/vibead/vibead-ai/issues/143)), LESSONS and design-doc gates on every non-draft PR event, body edits included. One job on `ubuntu-slim` (one billed slim minute per run). It runs the DoD block check (MERGE-0) first, as two steps right after checkout: it fails a ready PR whose body lacks the Definition of Done block, has a line neither ticked with evidence nor `N/A - <reason>`, or groups several IDs on one line. It runs the base branch's `.github/docs-check/check-dod.mjs` against the PR body (the PR that adds the checker runs its own copy), before any step runs PR code and under `env -i`, with no secrets or npm install; then the docs, LESSONS and design-doc steps.
- **Cost rules** ([docs/quality/ci.md](../quality/ci.md), [vibead-ai#178](https://github.com/vibead/vibead-ai/issues/178)): Linux only. Drafts skip the PR checks until they are marked ready. Release and Sign release are dispatch-only and are never cancelled.
