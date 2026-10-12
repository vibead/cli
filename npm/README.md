# Vibead CLI

**Try clearly marked test ads while your AI coding agent works.**

Vibead shows test ads in your terminal while **Claude Code, Codex, Gemini CLI or OpenCode** is thinking. Keep using your usual agent account, model, settings and project. No separate Vibead account or API key is needed.

**This is a beta:** ads are simulated, with no earnings or credits. Your AI provider's usual charges still apply.

## Quick start

You need **macOS** (Apple Silicon or Intel) or **Linux x64**, **Node.js 20 or newer**, and Claude Code or OpenCode already installed and working. **Windows is not supported yet.** If you need Node.js, [install the current LTS version](https://nodejs.org/en/download), then reopen your terminal.

```sh
npm i -g @vibead/cli && vibead enable
```

Then run plain `claude` or `opencode` as usual.

`vibead enable` lists exactly which files it will change and asks before changing anything. The first run downloads about 72–84 MB and checks it against its SHA-256. While your agent works you'll see a message marked **`[Ad]`**:

- **Claude Code:** in bold in the status line, and from turn 2 also as a dim `Ad: … [Ad]` spinner tip.
- **OpenCode:** as a "Sponsored" notification.

Ads never enter your prompts or the model's context.

> **Codex:** Codex has no extension point that can show an ad. Run `vibead codex`, or accept the opt-in shell alias (`codex` → `vibead codex`) that `vibead enable` offers when Codex is installed.

To pause ads, set `VIBEAD_DISABLE=1`. `vibead disable` restores your agent settings exactly, and `vibead uninstall` removes everything Vibead added. Vibead counts which ads were shown (ad id, agent, time; nothing else); set `VIBEAD_NO_TELEMETRY=1` or `DO_NOT_TRACK=1` to turn that off.

> **Claude Code first run:** the first time Claude Code opens a folder, it asks whether you trust it. The first option, which is already selected, is **No, exit**. Use the arrow keys to choose **Yes, I trust this folder** (the wording in Claude Code 2.1.x), then press Enter. If you exit by mistake, just run the same command again.

### Or use the wrapper

You can also start any agent through Vibead without changing its settings: `vibead claude`, `vibead codex`, `vibead gemini` or `vibead opencode`. Gemini CLI is supported only this way. To use an agent without Vibead, launch it with its usual command, or run `vibead disable` if you enabled it.

## Try without a global install

If you prefer to try it first, or the install command reports a permissions error:

```sh
npx @vibead/cli claude
```

This uses the wrapper. Replace `claude` with `codex`, `gemini` or `opencode` as needed. If npm asks to install `@vibead/cli`, confirm to continue. This still downloads and caches Vibead's files.

## Need help?

| What you see | What to do |
| --- | --- |
| `npm: command not found`, or a Node.js version error | Install the [current Node.js LTS version](https://nodejs.org/en/download), reopen your terminal, and try again. |
| A permissions error during installation, or `vibead: command not found` | Use the `npx` command above to run without a global installation. |
| Your agent is missing or asks you to sign in | First make sure its usual command, such as `claude`, works on its own. Complete the agent's normal setup, then launch it through Vibead. |
| The first launch cannot download its files | Check your connection and access to GitHub, then rerun the same command. If the error names `tar` or `curl`, install that tool through your system's package manager. |
| `Unsupported platform` or a `GLIBC` error | Check the system requirements below. **Windows is not supported yet**, and neither are Linux ARM64 or Alpine Linux. |
| Your agent opens but no ad appears | Try a longer prompt and review any hook approvals. Turn 1 may show a VibeAd house ad while hosted ads load. If no ad appears at all, use the issue link below. |

For command help, run `vibead --help`. To check the installed beta release, run `vibead --version`.

**Still stuck?** [Report an issue](https://github.com/vibead/cli/issues/new) with your operating system, terminal app, agent name/version, Vibead version and what happened. Session reports are saved under `~/.vibead-beta/results`. Review a report before sharing it; leave out credentials, private prompts and configuration backups.

## Optional: try your own publisher message

You can also test a message marked `[Org]` using the shared publisher demo:

1. Run `vibead claude --test-publisher` (or use another agent name from the table).
2. Open the [Woolworths demo publisher](https://www.vibead.ai/woolworths-demo), edit **Terminal line**, and click **Publish to workspace**.
3. Send a prompt in your agent and look for that message while it works. Change the message and send another prompt to test the update.

This is a shared, fictional demo that anyone can edit. See the [publisher guide](https://github.com/vibead/cli/blob/main/ENTERPRISE-DEMO.md) for details.

To test clickable ads instead, use `vibead claude --test-links` and follow the [click-test guide](https://github.com/vibead/cli/blob/main/BETA.md#optional-clickable-ad-test-beta8). Use `--test-links` and `--test-publisher` separately.

## Update or remove Vibead

To update to the latest npm release:

```sh
npm install -g @vibead/cli@latest
```

To remove the global installation, first exit any running Vibead sessions and run `vibead uninstall`, then run:

```sh
npm uninstall -g @vibead/cli
```

Downloaded files remain in `~/.cache/vibead`; you can remove that folder too after all sessions have exited. If you set a custom cache directory, use that location instead.

## System requirements and beta details

- **macOS:** Apple Silicon or Intel. Builds are ad hoc signed and are not Apple-notarized. Testing on physical Mac terminals is still in progress. See the [beta.19 release notes](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.19).
- **Linux:** x64 with glibc 2.34 or newer. Linux ARM64 and Alpine/musl are not supported.
- **Tools:** Node.js 20+ and `tar`. `curl` is also needed when an HTTPS proxy is configured. No compiler or separately managed ad server is needed.
- **Downloads:** the launcher chooses the matching official archive (beta.19 on Linux x64 and macOS), checks its SHA-256 checksum, and stores the complete kit in `~/.cache/vibead`. Set `VIBEAD_CACHE_DIR` to use another writable folder.
- **Known limitations:** while the hosted `--test-publisher` service warms up, turn 1 shows a VibeAd house ad (labelled `[Ad]`); with a single published message it alternates with house ads so no ad repeats on consecutive turns. Clickable ads are still unreliable on Windows terminals (Windows is not supported). Source and server code remain private. Third-party notices are included with the package and downloaded kit.

Your agent's own options go after `--`. For example, to use an existing Codex profile:

```sh
vibead codex -- --profile my-profile
```

If a session was interrupted and left its integration behind, use the cleanup command for that agent. For Claude Code:

```sh
vibead claude --cleanup
```

Replace `claude` with the affected agent's name if needed. See the [full beta guide](https://github.com/vibead/cli/blob/main/BETA.md) for recovery details and additional tests. Its manual-download examples run `./vibead-beta-linux-x64/vibead-beta claude`. The npm package installs the same launcher under two names, `vibead` and `vibead-beta`, so `vibead claude` and `vibead-beta claude` are equivalent; this guide uses `vibead`.
