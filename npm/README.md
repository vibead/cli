# Vibead CLI

**Try clearly marked test ads while your AI coding agent works.**

Vibead shows test ads in your terminal while **Claude Code, Codex, Gemini CLI or OpenCode** is thinking. Keep using your usual agent account, model, settings and project. No separate Vibead account or API key is needed.

**This is a beta:** ads are simulated, with no earnings or credits. Your AI provider's usual charges still apply.

## Get started

You need **macOS** (Apple Silicon or Intel) or **Linux x64**, **Node.js 20 or newer**, and one of the agents below already installed and working. **Windows is not supported yet.** If you need Node.js, [install the current LTS version](https://nodejs.org/en/download), then reopen your terminal.

### 1. Install Vibead

Open Terminal on your Mac, or your Linux terminal, and run:

```sh
npm install -g @vibead/cli
```

You only need to install it once. You do not need to sign in to npm to install this public package.

### 2. Choose your agent

In the project folder where you normally use your agent, run **one** of these commands:

| Your agent | Run this |
| --- | --- |
| Claude Code | `vibead claude` |
| Codex | `vibead codex` |
| Gemini CLI | `vibead gemini` |
| OpenCode | `vibead opencode` |

**The first launch downloads about 72–84 MB.** Wait for the download message to finish and your agent to open. Later launches reuse the downloaded files. Review any permission or project-trust prompts from your agent; in Codex, review the Vibead hooks if prompted.

### 3. Send a prompt

Use your agent as usual, or try this:

> Compare five sorting algorithms and explain their tradeoffs. Do not run commands or change files.

Look for a message marked **`[Ad]`** in the agent's status line while it thinks. The message should disappear when the response finishes. Very short responses may finish before an ad appears.

Exit your agent normally when you're done. To use your agent without Vibead next time, launch it with its usual command, such as `claude` or `codex`.

## Try without a global install

If you prefer to try it first, or the install command reports a permissions error:

```sh
npx @vibead/cli claude
```

Replace `claude` with `codex`, `gemini` or `opencode` as needed. If npm asks to install `@vibead/cli`, confirm to continue. This still downloads and caches Vibead's files.

## Need help?

| What you see | What to do |
| --- | --- |
| `npm: command not found`, or a Node.js version error | Install the [current Node.js LTS version](https://nodejs.org/en/download), reopen your terminal, and try again. |
| A permissions error during installation, or `vibead: command not found` | Use the `npx` command above to run without a global installation. |
| Your agent is missing or asks you to sign in | First make sure its usual command, such as `claude`, works on its own. Complete the agent's normal setup, then launch it through Vibead. |
| The first launch cannot download its files | Check your connection and access to GitHub, then rerun the same command. If the error names `tar` or `curl`, install that tool through your system's package manager. |
| `Unsupported platform` or a `GLIBC` error | Check the system requirements below. This release does not support Windows, Linux ARM64 or Alpine Linux. |
| Your agent opens but no ad appears | Try a longer prompt and review any hook approvals. OpenCode has a known issue where ads may be missing on later turns. If it continues, use the issue link below. |

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

To remove the global installation, first exit any running Vibead sessions, then run:

```sh
npm uninstall -g @vibead/cli
```

Downloaded files remain in `~/.cache/vibead`; you can remove that folder too after all sessions have exited. If you set a custom cache directory, use that location instead.

## System requirements and beta details

- **macOS:** Apple Silicon or Intel. Builds are ad hoc signed and are not Apple-notarized. Testing on physical Mac terminals is still in progress; see the [release notes](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.12).
- **Linux:** x64 with glibc 2.34 or newer. Linux ARM64 and Alpine/musl are not supported.
- **Tools:** Node.js 20+ and `tar`. `curl` is also needed when an HTTPS proxy is configured. No compiler or separately managed ad server is needed.
- **Downloads:** the launcher chooses the matching official beta.12 archive, checks its SHA-256 checksum, and stores the complete kit in `~/.cache/vibead`. Set `VIBEAD_CACHE_DIR` to use another writable folder.
- **Known limitation:** OpenCode may not show ads on later turns in the same session. Source and server code remain private. Third-party notices are included with the package and downloaded kit.

Your agent's own options go after `--`. For example, to use an existing Codex profile:

```sh
vibead codex -- --profile my-profile
```

If a session was interrupted and left its integration behind, use the cleanup command for that agent. For Claude Code:

```sh
vibead claude --cleanup
```

Replace `claude` with the affected agent's name if needed. See the [full beta guide](https://github.com/vibead/cli/blob/main/BETA.md) for recovery details and additional tests. Its manual-download examples use `vibead-beta`; with this npm package, use `vibead` instead of the executable path.
