# Try Vibead with your usual AI agent setup

**Official distribution:** [vibead/cli](https://github.com/vibead/cli). Beta.8 archives are unchanged from their original publication. Their bundled guide can contain older repository links; use this online guide for current downloads and known issues.

Vibead adds disclosed test advertisements to supported thinking rows in **Claude Code, Codex, Gemini CLI and OpenCode**. Beta.8 uses your existing login, model/provider configuration, settings and current project. Its local mock ad service starts automatically.

**Known OpenCode issue:** beta.8 improves first-turn activity-only ads, but a customer reports missing advertisements on later turns (`all_eligible_turns_displayed: false`). OpenCode and cleanup still work. Investigation is deferred; this release does not resolve multi-turn display in that setup.

**Optional clickable ads:** add `--test-links` to test opening a synthetic ad in your browser. The [click-test checklist](BETA.md#optional-clickable-ad-test-beta8) covers all four agents and supported terminal families. No advertiser requests or earnings are generated.

**Mac downloads are ready for beta testing.** Follow the [Mac quick start for Claude Code, Codex and OpenCode](BETA.md#mac-quick-start-claude-code-codex-and-opencode) for direct downloads, copy-and-paste checksum/extraction commands and a test checklist. You can use your existing Claude gateway or agent login. No API key needs to be given to Vibead. Automated qualification used simulated model responses; your test checks your own account and provider too.

## 1. Download

Download the complete archive and its `.sha256` file from [beta.8 Releases](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.8). [Verify the checksum](BETA.md#1-download), then extract it somewhere convenient and keep its files together.

| Computer | Download |
| --- | --- |
| Apple Silicon Mac | [macOS ARM64](https://github.com/vibead/cli/releases/download/v0.1.0-beta.8/vibead-beta-0.1.0-beta.8-darwin-arm64.tar.gz) |
| Intel Mac | [macOS x64](https://github.com/vibead/cli/releases/download/v0.1.0-beta.8/vibead-beta-0.1.0-beta.8-darwin-x64.tar.gz) |
| Linux x64 | [Linux archive](https://github.com/vibead/cli/releases/download/v0.1.0-beta.8/vibead-beta-0.1.0-beta.8-linux-x64.tar.gz) |

**Windows is deferred.** This organization release contains only the current Mac and Linux downloads; older Windows packages were not migrated.

Your agent must already work in your terminal. Vibead needs no private repository, npm installation, compiler or separately managed server. These beta builds are not publisher-signed or notarized; see the [platform notes](BETA.md#platform-notes).

## 2. Launch from your normal project

Open the terminal and project you normally use for your agent. Call the extracted executable by its full path, replacing the example path below. Run **one** command:

```sh
"/path/to/vibead-beta" claude
"/path/to/vibead-beta" codex
"/path/to/vibead-beta" gemini
"/path/to/vibead-beta" opencode
```

For an Apple Silicon Mac, after following the guide's extraction commands into `Downloads/vibead-beta8`, set this once in that terminal:

```sh
VIBEAD_BETA="$HOME/Downloads/vibead-beta8/vibead-beta-darwin-arm64/vibead-beta"
```

For an Intel Mac, replace `darwin-arm64` with `darwin-x64`. From your usual project, run `"$VIBEAD_BETA" claude`, `"$VIBEAD_BETA" codex`, or `"$VIBEAD_BETA" opencode`, one at a time. See the [Mac quick start](BETA.md#mac-quick-start-claude-code-codex-and-opencode) for what to check and how to exit.

**You no longer need `--mode interactive`: it is the default since beta.4.** Your home directory, project and provider environment are retained. You should only see login or project-trust prompts your agent itself requires, plus approval for Vibead's new hooks where the agent requires it. For Codex, review `/hooks` when prompted.

Use your usual native arguments after `--`, for example:

```sh
"/path/to/vibead-beta" codex -- --profile my-profile
"/path/to/vibead-beta" claude -- --model my-model
```

Shell aliases/functions are not executed by the wrapper; supply their usual arguments and exported environment. Some policy-sensitive/custom invocations run natively without ads. [Details and recovery](BETA.md#how-your-setup-is-preserved) are in the guide.

## 3. Use the agent normally

Ask your own question or work on your project. During a sufficiently long turn, look for `Beta … [Ad]…` in the thinking row. The ad should disappear when the turn ends, and the answer should stay readable. The model request uses your normal provider and billing; only the advertisement is mocked.

If testing OpenCode despite the known issue, observe three turns in the same session. Check that the ad remains readable without pulsing or flashing, appears on later turns, and clears each time. A single first-turn appearance is insufficient; report visible flicker even if the JSON says `passed`.

Exit the agent normally. Vibead removes its session integration and prints the local report path, normally under `~/.vibead-beta/results`. Review the report and share it in a [beta issue](https://github.com/vibead/cli/issues) with your OS, agent version and observations. Share report JSON only, never credentials or integration recovery files.

[Read the full beta guide](BETA.md) for commands, troubleshooting and cleanup.

## Optional diagnostic

`"/path/to/vibead-beta" claude --mode fixture` runs the old isolated simulated-model test without credentials or model charges. Replace `claude` with any of the four agents. This is optional; it does not test your usual account or configuration.

Beta.3 and earlier defaulted to this simulated test, and their interactive mode used an empty temporary home. Upgrade the complete archive to beta.8 for the existing-setup experience.

## Scope

Beta.8 improves first-turn OpenCode activity-only ads and retains thinking-label support and optional local click testing. The reported later-turn OpenCode failure remains unresolved. Reports check every display-eligible turn. Successful ad decisions alone do not mean an ad was displayed; check the report and the screen. Automated checks cannot certify physical-terminal smoothness.

This is an explicit beta wrapper. Keep launching your ordinary agent directly whenever you do not want Vibead. Automatic activation through your usual command name remains later distribution work. Native permissions, trust prompts and organization policies still apply; unsupported cases preserve the agent's normal launch without ads.

Source and server code remain private. Synthetic ads generate no earnings or credits. [Release notes](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.8) identify exact tested agents/platforms and limits; simulated-model qualification does not establish live-provider or physical-desktop acceptance.

## Separate enterprise communications demo

The optional [Mac organization-message demo](ENTERPRISE-DEMO.md) uses a [separate experimental download](https://github.com/vibead/cli/releases/tag/v0.1.0-enterprise-demo.2). Run `./vibead-enterprise claude` to receive messages from its configured hosted feed. **Beta.8 ad testing continues with the download and one-command agent launch above.**
