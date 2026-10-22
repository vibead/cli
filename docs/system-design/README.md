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
| npm (primary) | `npm i -g @vibead/cli && vibead enable`. The launcher (`npm/bin/vibead.mjs`) picks the archive for this platform from `releases.json`, downloads it from GitHub Releases, checks its SHA-256 and runs it. macOS arm64/x64 and Linux x64. | **Live**, beta.25. |
| curl | `curl -fsSL https://www.vibead.ai/install \| sh`. `install/install.sh` reads the pinned version from `www.vibead.ai/install.json` (never GitHub "latest", [cli#27](https://github.com/vibead/cli/issues/27)), verifies the archive against the release's `SHA256SUMS` (and its Sigstore signature when `cosign` is installed, required with `VIBEAD_REQUIRE_SIGNATURE=1`), installs under `~/.vibead` with a `vibead` link in `~/.local/bin`, then runs `vibead enable`. The whole script is one function called on the last line, so a truncated download runs nothing. | **Live** ([#28](https://github.com/vibead/cli/pull/28)). vibead-ai serves a byte-identical copy at the commit pinned in its `install.source.json`. |
| PowerShell | `irm https://www.vibead.ai/install.ps1 \| iex`. Prints the npm or WSL one-liner until Windows builds ship. | **Live**. |
| Homebrew | `brew install vibead/tap/vibead` from [vibead/homebrew-tap](https://github.com/vibead/homebrew-tap). `packaging/homebrew` holds an official-cask candidate that is not submitted (needs notarized macOS builds). | **Live** (tap). |

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
- **Merged, not released:** release workflow `release.yml` with npm Trusted Publishing ([cli#30](https://github.com/vibead/cli/pull/30), [cli#29](https://github.com/vibead/cli/issues/29)). The GitHub Release is marked Latest only when `npm_tag` is `latest`; a `next` or `beta` run makes a pre-release that is not Latest, so `releases/latest`, npm `latest`, the `/install` pin and Homebrew keep the promoted version (the tap job runs only for `latest`). Every job that reads the draft release (check, sign, publish-release) runs with `contents: write`, because GitHub shows drafts only to tokens with push access; the workflow default stays `contents: read` (cli#37, QA R2-1). Release never creates or moves the tag: publishing keeps an existing tag, and uses the release's `target_commitish` only when the tag is missing. Its first run published 0.1.0-beta.30 to npm `next`.
- **Merged, not released (pre-release v0.1.0-beta.31):** the npm launcher at 0.1.0-beta.31 (`npm/package.json`, publishes under the `next` dist-tag) with the beta.31 darwin-arm64, darwin-x64 and linux-x64 kits in `npm/releases.json`, all built from vibead/vibead main @ b4fc00d (beta.30's kit code plus [vibead#135](https://github.com/vibead/vibead/pull/135) click links, [vibead#170](https://github.com/vibead/vibead/pull/170) full click URL when it fits, and [vibead#175](https://github.com/vibead/vibead/pull/175): Claude's status line keeps the turn's ad through a background subagent and its report, [vibead#174](https://github.com/vibead/vibead/issues/174)). It is the first release whose signed `SHA256SUMS` lists the launcher tgz (cli#39). Known gap: no ad on the very first Claude turn of a fresh install ([vibead#164](https://github.com/vibead/vibead/issues/164)); Claude is judged from turn 2, and #164 blocks promotion to Latest. Live stays 0.1.0-beta.25 (npm `latest`, the `/install` pin and Homebrew).
- **Merged, not released (pre-release v0.1.0-beta.30, npm `next` until beta.31 is published):** the npm launcher at 0.1.0-beta.30 with the beta.30 kits from vibead/vibead main @ 607fb1f ([cli#37](https://github.com/vibead/cli/pull/37)). The installers ask no question of their own (no PATH prompt, no profile edit; the one consent is `vibead enable`'s). Its signed `SHA256SUMS` lists the kits only, so beta.30 is not promoted to Latest.
- **Merged, not released:** lessons folder and the QA carry-over rule (`lessons/`, `scripts/pr-own-diff.sh`, [cli#31](https://github.com/vibead/cli/pull/31)); these are repo tooling, not a user channel.
- **Merged, not released:** launcher tgz in the signed `SHA256SUMS` ([cli#39](https://github.com/vibead/cli/pull/39)). sign-release.yml refuses to sign without exactly one `vibead-cli-<version>.tgz` matching its `.sha256`, and lists it with the kits; release.yml's check requires the draft tgz to be `npm pack` of `npm/` on main (the tar inside is compared, since gzip bytes vary with zlib), and its npm job publishes that signed tgz byte for byte after checking it against `SHA256SUMS`, so the npm tarball is the signed one. vibead-ai's `/install` release guard accepts that line ([vibead-ai#212](https://github.com/vibead/vibead-ai/issues/212)); the installers' anchored patterns ignore it. Releases up to v0.1.0-beta.30 list the kits only.
- **Planned:** the Homebrew tap update from the release workflow needs a `HOMEBREW_TAP_TOKEN` secret; a local cached house ad in the CLI ([cli#25](https://github.com/vibead/cli/issues/25)); OpenClaw as a fourth agent ([cli#20](https://github.com/vibead/cli/issues/20)). These are tracked in the vibead-ai launch epics.

## CI

- **Installer tests** (`installers.yml`, Linux only): shellcheck, `install/test/*.test.mjs` and the npm launcher tests. It runs on every pull request, so as a required check it always reports (MERGE-1/MERGE-2); pushes to `main` run it only when `install/`, `npm/`, `README.md` or the workflows change ([cli#36](https://github.com/vibead/cli/issues/36), [cli#38](https://github.com/vibead/cli/pull/38)).
- **Docs check** (`docs-check.yml`): docs move with code ([vibead-ai#143](https://github.com/vibead/vibead-ai/issues/143)).
- **Design doc updated** (`docs-check.yml` job): self-test, then `scripts/check-design-doc.mjs` on the PR's base and head.
