# Publisher beta for Mac and Linux

Download and extract the complete **beta.12** kit: [Mac Apple Silicon](https://github.com/vibead/cli/releases/download/v0.1.0-beta.12/vibead-beta-0.1.0-beta.12-darwin-arm64.tar.gz) · [Mac Intel](https://github.com/vibead/cli/releases/download/v0.1.0-beta.12/vibead-beta-0.1.0-beta.12-darwin-x64.tar.gz) · [Linux x64](https://github.com/vibead/cli/releases/download/v0.1.0-beta.12/vibead-beta-0.1.0-beta.12-linux-x64.tar.gz). [Checksums](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.12) are available as with the advertising beta. Keep the extracted folder together. Linux requires glibc 2.34 or newer.

From your usual project, run the command for your agent:

```sh
"/path/to/vibead-beta" claude --test-publisher
"/path/to/vibead-beta" codex --test-publisher
"/path/to/vibead-beta" gemini --test-publisher
"/path/to/vibead-beta" opencode --test-publisher
```

Your existing login, provider, settings and project stay in use. Normal model charges apply. The publisher connection is built in and uses your terminal's existing proxy environment automatically. No installer, local publisher, endpoint configuration or manual signing command is needed.

**Publisher:** [Open the Woolworths demo](https://www.vibead.ai/woolworths-demo).

1. Edit **Terminal line** and click **Publish to workspace**.
2. Send a prompt in your agent. Look for that line with `[Org]` while it works.
3. Change and publish the line, then send another prompt in the **same session**. No restart needed.
4. To test removal, click **Withdraw featured message** and send another prompt. Native working status should remain.

Anyone can edit this shared fictional demo; no publisher sign-in is needed. Only the featured Terminal line is delivered, beginning on the next turn. The publisher runs independently of the development workspace. Allow a few seconds for delivery; a turn that finishes before the line arrives keeps native status.

Your ordinary ad commands and `--test-links` remain the same; use the two test flags separately. Beta.9–11 failed the reported Mac publisher tests; use beta.12 for this retest. Beta.8 and the older `vibead-enterprise` demo lack this publisher flow.

Exit your agent normally. The usual report is saved under `~/.vibead-beta/results`; share it with what you saw. No separate verification command is required. An automatic report cannot confirm what appeared on your screen: successful checks say physical confirmation is required. Physical Mac acceptance remains pending. Mac kits are ad hoc signed before download, with the same lack of Developer ID notarization as the ad beta; normal macOS opening controls still apply.
