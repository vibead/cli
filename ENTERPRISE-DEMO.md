# Mac publisher beta

Download and extract the complete **beta.10** kit: [Apple Silicon](https://github.com/vibead/cli/releases/download/v0.1.0-beta.10/vibead-beta-0.1.0-beta.10-darwin-arm64.tar.gz) · [Intel](https://github.com/vibead/cli/releases/download/v0.1.0-beta.10/vibead-beta-0.1.0-beta.10-darwin-x64.tar.gz). [Checksums](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.10) are available as with the advertising beta. Keep the extracted folder together.

From your usual project, run:

```sh
"/path/to/vibead-beta" claude --test-publisher
```

This uses your existing Claude login, provider, settings and project, just like the ad beta. Normal model charges apply. The publisher connection is built in. No installer, local publisher, endpoint configuration or manual signing command is needed.

**Publisher:** [Open the Woolworths demo](https://4180--01a0fa0e-1ee5-7350-b0ad-f976a181e629.us-east-1-01.gitpod.dev/woolworths-demo).

1. Edit **Terminal line** and click **Publish to workspace**.
2. Send a prompt in Claude. Look for that line with `[Org]` while it works.
3. Change and publish the line, then send another prompt in the **same Claude session**. No restart needed.
4. To test removal, click **Withdraw featured message** and send another prompt. Native working status should remain.

The owner edits the publisher; testers only need the beta command. Only the featured Terminal line is delivered, beginning on the next turn. The hosted demo must remain running. Allow a few seconds for the line to arrive; a turn that finishes before it arrives keeps its native status.

Publisher testing is Claude Code on Mac only. Your ordinary `vibead-beta` ad commands and `--test-links` remain the same; use the two test flags separately. Beta.8 and the older `vibead-enterprise` demo do not support `--test-publisher`.

Exit Claude normally. The usual report is saved under `~/.vibead-beta/results`; share it with what you saw. No separate verification command is required. Beta.10 fixes the publisher timeout reported in beta.9. Actual Mac acceptance of beta.10 is pending. The kit is ad hoc signed before download, with the same lack of Developer ID notarization as the ad beta; normal macOS opening controls still apply.
