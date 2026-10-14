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

<p align="center"><img src="https://raw.githubusercontent.com/vibead/cli/main/docs/readme-ad-claude.gif" alt="Scripted demo of the beta.24 Claude Code layout: one labelled [Ad] in the status line while it thinks" width="100%"><br><sub>Scripted demo of the beta.24 layout (not a live capture)</sub></p>

## Quick start

```sh
npm i -g @vibead/cli && vibead enable   # install, then review and approve the changes
claude                                  # or opencode: use your agent as usual
vibead disable                          # turn ads off and restore your settings
```

**Codex** is opt-in: accept the `codex` alias that `vibead enable` offers, or run `vibead codex`.

- A short, labelled `[Ad]` line appears in the status line (Claude Code) or a notification (OpenCode) while your agent thinks.
- VibeAd never reads or changes your prompts, code or agent output.
- Asks before changing any file; `vibead disable` restores them exactly.
- Payouts launching soon.

Works with **Claude Code, Codex and OpenCode** on **macOS (Apple Silicon, Intel)** and **Linux x64 (glibc 2.34+)**. Windows is not supported yet.

**Uninstall:** `vibead uninstall && npm uninstall -g @vibead/cli`

---

<details>
<summary><b>What <code>vibead enable</code> changes</b></summary>

`vibead enable` lists every file it will change and asks before touching anything. Use `--dry-run` to preview only.

- **Claude Code:** adds a status line, spinner tips and turn hooks to `~/.claude/settings.json`. The hooks print nothing, so nothing reaches the model.
- **OpenCode:** adds a plugin that shows a labelled toast when a turn starts.
- **Codex:** an optional shell alias, `codex` → `vibead codex`.

Ads are labelled `[Ad]` and appear only in status or notification UI. `vibead disable` restores your files exactly; `vibead uninstall` also removes VibeAd's data. Only impression counts (ad id, agent, time) are sent; set `VIBEAD_NO_TELEMETRY=1` or `DO_NOT_TRACK=1` to turn that off.
</details>

<details>
<summary><b>Install with Homebrew</b></summary>

```sh
brew install vibead/tap/vibead && vibead enable
```

Includes its own runtime, so Node.js is not needed. See [vibead/homebrew-tap](https://github.com/vibead/homebrew-tap).
</details>

<details>
<summary><b>Manual download</b></summary>

Download the archive for your computer and its `.sha256` file from the [latest release](https://github.com/vibead/cli/releases/latest), verify the checksum, extract it, and run `/path/to/vibead-beta enable`. See the [beta guide](https://github.com/vibead/cli/blob/main/BETA.md#1-download).
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

This repo holds public releases and the npm launcher in [`npm/`](https://github.com/vibead/cli/tree/main/npm). Source and server code are private. [Release notes](https://github.com/vibead/cli/releases/latest).
</details>
