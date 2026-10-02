# Test publisher changes on your Mac

**Publisher:** [Open the Woolworths demo](https://4180--01a0fa0e-1ee5-7350-b0ad-f976a181e629.us-east-1-01.gitpod.dev/woolworths-demo). This exact publisher is already connected to the client. No URL flags or local publisher are needed.

Once you have the enterprise kit, launch it just like the advertising beta:

```sh
"/path/to/vibead-enterprise" claude
```

Keep that Claude session open:

1. In the publisher, select a message, edit **Terminal line**, and click **Publish to workspace**.
2. Send any short prompt in Claude. The published line appears with `[Org]` while Claude works.
3. Change the line and publish again. Send another prompt in the **same session** to see the change. No restart, download or reconfiguration is needed.
4. Click **Withdraw featured message**, then send another prompt. Claude should show its normal working status.

Only the featured **Terminal line** is delivered; editing **Full update** alone will not change that line. A turn already in progress keeps its current message. **Run demo turn** on the web page is a browser preview; send prompts in your Mac's Claude session to test the Mac client.

## First time on this Mac

Claude Code must already be installed. Run this once; it chooses Apple Silicon or Intel, downloads the pinned release, checks its checksum, and prepares the executable for macOS:

```sh
curl -fsSL https://raw.githubusercontent.com/vibead/cli/main/install-enterprise.sh | /bin/bash
```

Then launch from any folder with:

```sh
"$HOME/.vibead-enterprise/vibead-enterprise" claude
```

You can [inspect the setup script](install-enterprise.sh) or use the [manual downloads](https://github.com/vibead/cli/releases/tag/v0.1.0-enterprise-demo.2). Setup needs no administrator privileges and does not change your shell, agent settings or advertising kit. This experimental executable is not Developer ID signed or notarized; setup applies a local signature and leaves macOS security settings intact.

**Scope:** publisher testing currently supports Claude Code on Mac. Your existing `vibead-beta` commands, including `--test-links` for Claude, Codex, Gemini and OpenCode, remain unchanged; they test ads, not this publisher. [Advertising beta guide](BETA.md)

This demo uses fictional content and simulated model replies, with no model charges. Actual Mac acceptance remains pending your test. The hosted demo must stay running. The publisher editor requires owner access; another tester can receive changes while the owner publishes them.

<details>
<summary>If something does not work, or you want an automated check</summary>

If no `[Org]` line appears, check that a message is featured and the hosted demo is running. Exit and relaunch only if the agent itself stops responding. Use the command printed by setup if you installed in another folder. Keep all kit files together.

With a message featured, this optional check runs one turn and exits:

```sh
"$HOME/.vibead-enterprise/vibead-enterprise" claude --verify
```

Look for `"passed": true`. Reports are under `demo/enterprise/artifacts/` in the installed kit. If Claude is outside PATH, the launcher accepts `--binary /absolute/path/to/claude`; the automatic setup expects `claude` on PATH.

Tell us your Mac chip, macOS version, terminal app, Claude Code version, and whether publication, change and withdrawal worked. Review any screen captures before sharing.

</details>
