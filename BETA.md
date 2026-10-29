# VibeAd beta guide (0.1.0-beta.36)

VibeAd shows one labelled `[Ad]` line in **Claude Code, Codex and OpenCode** while they work, on **macOS (Apple Silicon, Intel)** and **Linux x64 (glibc 2.34+)**. It never reads or changes your prompts, code or agent output. Your agent keeps your login, provider, model, settings and project; normal model charges apply.

[Release notes](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.36) list the tested versions and known limits.

## Install

```sh
npm i -g @vibead/cli                                # installs and connects the agents it finds
curl -fsSL https://www.vibead.ai/install | sh       # or: macOS and Linux, no sudo
brew install vibead/tap/vibead && vibead            # or: Homebrew
```

Install connects the agents it finds and prints what it did. Then start your agent as usual: `claude`, `codex` or `opencode`. Open a new terminal first for Codex: it gets a `codex` shell function that runs `vibead codex`. Codex asks you to trust VibeAd's hooks; ads show after you choose Trust. It asks again each time you turn VibeAd off and back on.

- **Claude Code:** a status line, spinner tips and turn hooks in `~/.claude/settings.json`.
- **OpenCode:** a plugin: a line in the status area on OpenCode 1.19+, a labelled toast on 1.18.
- **Codex:** a `codex` shell function in `~/.bashrc` or `~/.zshrc`.

**Claude Code first run:** the workspace-trust dialog selects **No, exit** first. Choose **Yes, I trust this folder**, or run `claude` again if you exit by mistake. Very short turns can end before an ad shows; the first turn may show a VibeAd house ad.

## Commands

```sh
vibead status                 # version, each agent's state and ad counting (changes nothing)
vibead enable [agent...]      # turn ads back on: lists every file it will change and asks first (--dry-run to preview)
vibead disable [agent...]     # turn ads off and restore your settings exactly
vibead uninstall              # restore your settings and remove VibeAd's files and the vibead command
vibead telemetry off          # keep ads, stop ad counting (also: on, status)
vibead login                  # your VibeAd account (also: whoami, logout)
vibead --help
```

With Homebrew, run `vibead uninstall && brew uninstall vibead`.

## Optional checks

VibeAd options go before the agent name; everything after the agent name goes to the agent unchanged, for example `vibead claude --model my-model`.

| Command | What it does |
| --- | --- |
| `vibead --test-links claude` | A synthetic ad you can click in a terminal that supports links (iTerm2 on macOS, a modern VTE terminal such as GNOME Terminal on Linux). Click the word `Beta`; the browser opens **VibeAd local click test** on `127.0.0.1`. Press **Confirm I opened the test ad** and expect **Click test confirmed**. No advertiser request is made and the click is not counted. |
| `vibead --test-publisher claude` | The preconfigured hosted publisher feed. See [ENTERPRISE-DEMO.md](ENTERPRISE-DEMO.md). |
| `vibead --mode fixture claude` | A local test model with test ads, in a temporary home. No account or model charges. |
| `vibead --debug claude` | Prints diagnostics and saves a local report in `~/.vibead-beta/results`. Share only that report JSON, never tokens or settings backups. |
| `vibead --cleanup claude` | Recovers an interrupted wrapper session. |

Replace `claude` with `codex` or `opencode`. Report problems in a [beta issue](https://github.com/vibead/cli/issues) with your OS, terminal and agent version.

## 1. Download

To install without npm, curl or Homebrew, download the archive for your computer and `SHA256SUMS` from the [release](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.36):

| Computer | Archive ending |
| --- | --- |
| Mac with Apple Silicon | `darwin-arm64.tar.gz` |
| Mac with Intel processor | `darwin-x64.tar.gz` |
| Linux x64 | `linux-x64.tar.gz` |

Check it with `shasum -a 256 -c --ignore-missing SHA256SUMS`, extract the complete archive, keep its files together, and run `/path/to/vibead-beta enable`.

## Platform notes

macOS builds are ad hoc signed, not Apple-notarized; your OS may ask you to approve the executable. Do not disable system-wide security controls to run a beta. Linux arm64 is not supported yet.

`vibead: Windows is not supported yet.`
