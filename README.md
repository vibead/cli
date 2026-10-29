<h1 align="center">VibeAd</h1>

<p align="center"><b>Your AI agent thinks. You get paid.</b></p>

<p align="center">
<a href="https://www.npmjs.com/package/@vibead/cli"><img src="https://img.shields.io/npm/v/@vibead/cli?label=npm" alt="npm version"></a>
<img src="https://img.shields.io/badge/agents-Claude%20Code%20%C2%B7%20Codex%20%C2%B7%20OpenCode-blue" alt="Supported agents">
<img src="https://img.shields.io/badge/OS-macOS%20%C2%B7%20Linux%20x64-lightgrey" alt="Supported OS">
<img src="https://img.shields.io/badge/license-proprietary-lightgrey" alt="License">
</p>

<p align="center">
<a href="https://www.vibead.ai">Website</a> · <a href="https://github.com/vibead/cli/releases/latest">Releases</a> · <a href="https://github.com/vibead/cli/issues">Issues</a> · <a href="https://x.com/VibeadAi">X</a> · <a href="https://www.linkedin.com/company/vibeadai">LinkedIn</a>
</p>

<p align="center"><img src="https://raw.githubusercontent.com/vibead/cli/main/docs/readme-ad-claude.gif" alt="Real capture, beta.25, Claude Code: a labelled [Ad] line in the status line while it thinks (the Tip: line is Claude's own text)" width="100%"><br><sub>Real capture, beta.25, Claude Code. The "Tip:" line is Claude's own text.</sub></p>

## Quick start

```sh
npm i -g @vibead/cli                    # installs and connects the agents it finds
claude                                  # or codex, or opencode: use your agent as usual
vibead disable                          # turn ads off and restore your settings
```

**No npm, or npm unavailable?** Each of these installs the same release and connects the same agents:

```sh
curl -fsSL https://www.vibead.ai/install | sh       # macOS and Linux, no sudo
brew install vibead/tap/vibead && vibead          # Homebrew
irm https://www.vibead.ai/install.ps1 | iex        # Windows PowerShell (once Windows builds ship)
```

**Codex** gets a `codex` shell function that runs `vibead codex`; `vibead disable` removes it. Open a new terminal after installing; Codex asks once whether to trust VibeAd's hooks, and ads show after you choose Trust.

- A short, labelled `[Ad]` line appears while your agent thinks: in the status line (Claude Code, OpenCode 1.19+) or a labelled toast (OpenCode 1.18).
- VibeAd never reads or changes your prompts, code or agent output.
- Journals every file it changes; `vibead disable` restores them exactly.

Works with **Claude Code, Codex and OpenCode** on **macOS (Apple Silicon, Intel)** and **Linux x64 (glibc 2.34+)**. Linux arm64 and Windows are not supported yet.

**Uninstall:** `vibead uninstall` (npm or install script: it restores your settings and removes VibeAd's files and the `vibead` command), or `vibead uninstall && brew uninstall vibead` (Homebrew).

---

<details>
<summary><b>What install (or <code>vibead enable</code>) changes</b></summary>

Install connects the agents it finds, without a question, and prints what it did. `vibead enable` (to turn ads back on after `vibead disable`) lists every file it will change and asks before touching anything. Use `--dry-run` to preview only.

- **Claude Code:** adds a status line, spinner tips and turn hooks to `~/.claude/settings.json`. The hooks print nothing, so nothing reaches the model.
- **OpenCode:** adds a plugin: a line in the status area on OpenCode 1.19+ (the first turn shows a short notice, then the ad), a labelled toast on 1.18.
- **Codex:** a `codex` shell function in your shell's rc file (`~/.bashrc` or `~/.zshrc`) that runs `vibead codex`, and plain `codex` if VibeAd is gone.

Ads are labelled `[Ad]` and appear only in status or notification UI. `vibead disable` removes only VibeAd's changes and keeps yours; `vibead uninstall` also removes VibeAd's files and the `vibead` command.

npm 11 prints `npm warn install-scripts` lines for `@vibead/cli`: that is npm noting the package has an install script (it connects your agents); it is safe to ignore, and npm 12, which skips install scripts, leaves setup to your first `vibead` run.

VibeAd counts how many times ads are shown, nothing else. Never your prompts or code. Stop it anytime with `vibead disable`.

**Turn off ad counting but keep ads:** `vibead telemetry off` (or set `VIBEAD_NO_TELEMETRY=1` or `DO_NOT_TRACK=1`). VibeAd stops reporting the ads it shows, ads have no click link, and the ad server keeps no per-install record of what you saw. Ads are still fetched with your anonymous install key. `vibead telemetry status` shows the setting; `vibead telemetry on` turns counting back on. The setting is the file `~/.vibead/telemetry-off`; `vibead uninstall` keeps it, so a reinstall stays private, and says where it is. Delete that file to reset it.
</details>

<details>
<summary><b>Install with Homebrew</b></summary>

```sh
brew install vibead/tap/vibead && vibead      # installs, then connects the agents it finds
```

Includes its own runtime, so Node.js is not needed. See [vibead/homebrew-tap](https://github.com/vibead/homebrew-tap).
</details>

<details>
<summary><b>Manual download</b></summary>

Download the archive for your computer and `SHA256SUMS` from the [latest release](https://github.com/vibead/cli/releases/latest), check it with `shasum -a 256 -c --ignore-missing SHA256SUMS`, extract it, and run `/path/to/vibead-beta enable`. `SHA256SUMS` is signed in CI with Sigstore; with [cosign](https://docs.sigstore.dev/cosign/system_config/installation/) installed you can check it too:

```sh
cosign verify-blob --bundle SHA256SUMS.sigstore.json --certificate-oidc-issuer https://token.actions.githubusercontent.com --certificate-identity-regexp '^https://github\.com/vibead/cli/\.github/workflows/sign-release\.yml@refs/heads/main$' SHA256SUMS
```

The install script does both checks for you (the signature check runs when `cosign` is installed). See the [beta guide](https://github.com/vibead/cli/blob/main/BETA.md#1-download).
</details>

<details>
<summary><b>Settings and other commands</b></summary>

```sh
vibead enable claude opencode codex   # choose agents
vibead disable [agent...]             # undo for some or all agents
vibead uninstall                      # undo everything and remove data
vibead claude                         # wrapper mode, without enable
vibead --help
```

npm needs Node.js 20+ and `tar`. The first run downloads the release and verifies its SHA-256 checksum.
</details>

<details>
<summary><b>Troubleshooting</b></summary>

- **Claude Code asks whether you trust the folder:** choose **Yes, I trust this folder**. If you exit by mistake, run `claude` again.
- **No ad on the first turn:** very short turns can end before an ad shows; the first turn may show a VibeAd house ad.
- **macOS:** builds are ad hoc signed, not Apple-notarized.
- Something wrong? [Open an issue](https://github.com/vibead/cli/issues) with your OS and agent version.

Full guide: [BETA.md](https://github.com/vibead/cli/blob/main/BETA.md). Publisher demo: [ENTERPRISE-DEMO.md](https://github.com/vibead/cli/blob/main/ENTERPRISE-DEMO.md).
</details>

<details>
<summary><b>For developers</b></summary>

This repo holds public releases, the npm launcher in [`npm/`](https://github.com/vibead/cli/tree/main/npm) and the backup installers in [`install/`](https://github.com/vibead/cli/tree/main/install) (served at `www.vibead.ai/install` and `/install.ps1`). Source and server code are private. [Release notes](https://github.com/vibead/cli/releases/latest).
</details>
