# Beta test with your existing AI agent setup

**Official distribution:** [vibead/cli](https://github.com/vibead/cli). Beta.8 archives are unchanged from their original publication. Their bundled guide can contain older repository links; use this online guide for current downloads and known issues.

**Beta.8 keeps the setup you already use:** your home directory, saved login, model/provider configuration, custom configuration directories, project files, settings, plugins and exported environment. You launch through Vibead from your usual project, and it adds local mock advertisements during supported thinking states.

No new account setup, private checkout or separate ad server is required by Vibead. Your agent's own permissions, trust prompts and provider charges still apply.

**Known OpenCode multi-turn defect:** beta.8 improves first-turn activity-only display and ordinary spinner repaint filtering, but a customer reports ads still missing on later turns, with `all_eligible_turns_displayed: false`. OpenCode and cleanup remain functional. Investigation is deferred. Do not treat the earlier automated three-turn checks as proof that this customer issue is resolved. If you choose to test OpenCode, record each turn separately. Download and extract the complete beta.8 archive into a fresh folder and update `VIBEAD_BETA`; do not replace only the executable in an older runtime.

**Beta.8 includes optional clickable test ads.** Follow the [click-test instructions](#optional-clickable-ad-test-beta8). Use the complete beta.8 archive for Mac or Linux; older beta.5 downloads do not contain this feature. **Windows is deferred to the backlog.** Older Windows packages were not migrated to this organization release.

## Optional Mac publisher test (beta.10)

Use the [publisher-ready Mac download](ENTERPRISE-DEMO.md), then launch from your usual project:

```sh
"/path/to/vibead-beta" claude --test-publisher
```

Your existing Claude account, provider, settings and project stay in use; normal model charges apply. In the [hosted publisher](https://4180--01a0fa0e-1ee5-7350-b0ad-f976a181e629.us-east-1-01.gitpod.dev/woolworths-demo), change **Terminal line**, click **Publish to workspace**, and send another Claude prompt in the same session. The next working line shows the publication with `[Org]`. No installer, local publisher, URL configuration or manual signing is needed. Publisher testing is Claude-only; use `--test-publisher` separately from `--test-links`. Existing ad commands and beta.8 downloads below are unchanged.

<a id="optional-clickable-ad-test-beta6"></a>

## Optional clickable-ad test (beta.8)

This tests a synthetic ad opening a local browser page. It uses your existing agent account and project, starts its mock service automatically, and makes no advertiser requests. It does not test paid clicks, cash balances or payouts.

1. Check the executable before starting: `"/path/to/vibead-beta" --help` on macOS/Linux. It must list `--test-links`. Keep the complete beta.8 archive together; do not copy the executable over a beta.5 folder.
2. Open your usual project in a terminal from this table, directly rather than inside tmux or screen:

| Platform | Initial link-test terminal | Open the ad |
| --- | --- | --- |
| macOS | iTerm2 | Hold Command and click the word `Beta` |
| Linux | A modern VTE terminal, such as GNOME Terminal | Use the terminal's Open Link gesture/menu, commonly Ctrl+click |

These are initial capability checks, not a claim of physical-desktop qualification. Apple Terminal and unidentified terminals currently keep plain text. Remote/SSH sessions are outside this local-browser test: `127.0.0.1` must refer to the computer running both Vibead and the browser. Do not override terminal variables to force support.

3. Run one agent at a time, using the path to beta.8. No `--mode interactive` is needed:

```sh
"/path/to/vibead-beta" claude --test-links
"/path/to/vibead-beta" codex --test-links
"/path/to/vibead-beta" gemini --test-links
"/path/to/vibead-beta" opencode --test-links
```

On a Mac where you already set `VIBEAD_BETA` to beta.8, use `"$VIBEAD_BETA" claude --test-links`, changing the agent name as needed. Windows clickable-ad testing is not included in this release.

Keep gateway variables and saved logins as they normally are. Native agent arguments still follow `--`, for example `"/path/to/vibead-beta" claude --test-links -- --model my-model`.

4. Send a normal prompt that gives you a few seconds to observe thinking. While `Beta … [Ad]…` is visible, open the link on **the word Beta**, using the gesture above. The random label, disclosure and adjacent agent text must not be part of the link. Nothing should open until you deliberately click.
5. The browser must show **Vibead local click test** at `http://127.0.0.1:<port>/beta/click/...`. Press **Confirm I opened the test ad**. Expect **Click test confirmed**, then return to the agent. Keep the agent session open until confirmation; the mock service stops when you exit. Do not paste this temporary URL into an issue.
6. Complete the checklist below, then exit the agent normally. Review the JSON report under `~/.vibead-beta/results`.

| Check | Expected result |
| --- | --- |
| Existing setup | Your usual model, provider, project and permissions remain in use |
| No automatic browsing | No page opens until your deliberate click |
| Thinking and completion | Ad appears only during supported thinking and clears immediately at completion |
| Link boundary | Only the word Beta opens the local page; `[Ad]`, the random label, answers and native controls are not linked |
| Confirmation | Local page opens; pressing Confirm records one confirmation even if pressed again |
| Second turn and interruption | A new turn works; interrupting clears the ad without opening anything |
| Narrow/resize | Disclosure remains visible; if sponsor text is shortened its link is omitted, or native status is retained |
| Plain-text control | Relaunch without `--test-links`; the ad has no clickable metadata and the agent still works normally |

The click test passes only when the ordinary display checks pass, `click_test.status` is `passed`, `hyperlink_overlays_prepared` is greater than zero, and `confirmed_visits` is greater than zero. `page_requests` alone is insufficient. Counts are local diagnostic evidence, not proof of a billable click or a human view. No automated program can certify what you personally saw; include your observation with the report.

If `terminal_support` is `unknown` or `multiplexer_unverified`, the requested click test is blocked and ads remain plain text. If link rendering or confirmation was not observed, `click_test.status` is `not_observed`; do not report that as a click pass. When renderer `matching_rows` is zero, report the display failure first. Very short turns may legitimately show no ad. Widen the window if the sponsor text is truncated.

Share the reviewed report JSON, archive version, terminal application/version, agent version, OS, and which checklist items passed or failed. Do not share tokens, configuration backups, model transcripts or temporary click URLs. Nothing is uploaded automatically. User cash sharing and withdrawals after network settlement belong to a future approved monetized pilot; this beta creates no monetary balance.

## Mac quick start: Claude Code, Codex and OpenCode

**Ready to try:** both Apple Silicon and Intel Mac downloads are published. Automated tests passed with real agent executables and simulated model responses. This test with your own account checks your normal provider and desktop experience too.

1. Open Apple menu → **About This Mac**. A **Chip** such as Apple M1/M2/M3/M4 means Apple Silicon; an **Intel Processor** means Intel. Download **both files in the matching row** into Downloads:

| Your Mac | Archive | Checksum file |
| --- | --- | --- |
| Apple Silicon | [Download ARM64](https://github.com/vibead/cli/releases/download/v0.1.0-beta.8/vibead-beta-0.1.0-beta.8-darwin-arm64.tar.gz) | [ARM64 checksum](https://github.com/vibead/cli/releases/download/v0.1.0-beta.8/vibead-beta-0.1.0-beta.8-darwin-arm64.tar.gz.sha256) |
| Intel | [Download x64](https://github.com/vibead/cli/releases/download/v0.1.0-beta.8/vibead-beta-0.1.0-beta.8-darwin-x64.tar.gz) | [x64 checksum](https://github.com/vibead/cli/releases/download/v0.1.0-beta.8/vibead-beta-0.1.0-beta.8-darwin-x64.tar.gz.sha256) |

2. Exit any running Vibead session. In Terminal, run the block for **your Mac only**. It checks the download and extracts it into a versioned folder only if the checksum matches. These commands leave your terminal's working directory unchanged.

Apple Silicon:

```sh
(
  cd "$HOME/Downloads" &&
  shasum -a 256 -c vibead-beta-0.1.0-beta.8-darwin-arm64.tar.gz.sha256 &&
  mkdir -p vibead-beta8 &&
  tar -xzf vibead-beta-0.1.0-beta.8-darwin-arm64.tar.gz -C vibead-beta8
)
```

Intel:

```sh
(
  cd "$HOME/Downloads" &&
  shasum -a 256 -c vibead-beta-0.1.0-beta.8-darwin-x64.tar.gz.sha256 &&
  mkdir -p vibead-beta8 &&
  tar -xzf vibead-beta-0.1.0-beta.8-darwin-x64.tar.gz -C vibead-beta8
)
```

Expect a line ending in `OK`. If the check fails or either file is missing, download both files again before proceeding. If your browser already extracted and removed the archive, download it again with automatic extraction disabled. Keep the complete extracted folder together.

3. Open the same terminal and project where your agent already works. Stay in your project; you do not need to work from the download folder. Set the executable path in that terminal. For Apple Silicon:

```sh
VIBEAD_BETA="$HOME/Downloads/vibead-beta8/vibead-beta-darwin-arm64/vibead-beta"
```

For Intel:

```sh
VIBEAD_BETA="$HOME/Downloads/vibead-beta8/vibead-beta-darwin-x64/vibead-beta"
```

If you extracted elsewhere, change the path. This variable lasts for the current terminal session; set it again in a new terminal. Test one agent at a time:

| Agent | Start it | Exit after testing |
| --- | --- | --- |
| Claude Code | `"$VIBEAD_BETA" claude` | Enter `/exit` |
| Codex | `"$VIBEAD_BETA" codex` | Press Ctrl+C twice |
| OpenCode | `"$VIBEAD_BETA" opencode` | Enter `/exit` |

**No `--mode interactive` is needed in beta.4 or later.** Your existing provider, model, login, exported environment and current project remain in use. If plain `claude` already works with `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` and `ANTHROPIC_AUTH_TOKEN`, keep those settings and launch Vibead from that same shell. Do not copy or send us your token. Saved Codex and OpenCode setups are reused in the same way.

Review any native trust prompt. In Codex, review the Vibead hooks and approve the ones you intend to run; `/hooks` opens the hook controls. Vibead does not approve customer hooks automatically. Close the hook menu before sending your prompt.

Ask a normal question, or try: “Compare five sorting algorithms and explain their tradeoffs. Do not use tools or change files.” Look for `Beta … [Ad]…` while the agent works (for OpenCode, beside `esc interrupt`), then check that the ad disappears and the answer remains readable. Very short turns may show no ad. Your normal model billing applies; the ad is local and synthetic.

Exit normally and review the report printed by Vibead, under `~/.vibead-beta/results`. Share only that report JSON and your observations in a [beta issue](https://github.com/vibead/cli/issues). A `failed` or `blocked` report is not a pass even if the agent answered. The report section below explains what is recorded.

For OpenCode, finish at least three prompts in the same session, letting each response complete before submitting the next. During each sufficiently long turn, the ad should stay readable without pulsing, flashing or disappearing while the activity row is still present. Check clearing after every turn, then exit normally with `/exit`. Keep `tab agents`, `ctrl+p commands`, the Build/model label and sidebar readable in their native positions. Try the same wide-window layout you normally use. Report flicker even when automated checks pass.

Repeat for each installed agent and share one report per agent. Include your Mac chip, macOS version, agent version, whether the ad appeared during thinking, and whether the answer and normal agent behavior stayed intact. To find the reports in Finder:

```sh
open "$HOME/.vibead-beta/results"
```

If you only see `Vibead beta: passed` from an automatic test without your normal session, check that you downloaded **beta.8** and omitted `--mode fixture`. Older releases used the simulated test by default.

If macOS blocks the executable, see [platform notes](#platform-notes). If you force-killed a session, use the [recovery command](#recovery-after-a-crash-or-forced-termination) before trying again or deleting the folder.

Gemini is also supported on qualified Mac builds: use `"$VIBEAD_BETA" gemini`. Use only platform downloads listed in the release.

## 1. Download

Get an archive and its `.sha256` file from [beta.8 Releases](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.8):

| Computer | Archive ending |
| --- | --- |
| Mac with Apple Silicon | `darwin-arm64.tar.gz` |
| Mac with Intel processor | `darwin-x64.tar.gz` |
| Linux x64 | `linux-x64.tar.gz` |

Compare the checksum with the value in the `.sha256` file, replacing `ARCHIVE` with the downloaded filename:

| Terminal | Command |
| --- | --- |
| macOS | `shasum -a 256 ARCHIVE` |
| Linux | `sha256sum ARCHIVE` |
| Windows PowerShell | `Get-FileHash ARCHIVE -Algorithm SHA256` |

Extract the complete archive somewhere convenient. Keep all extracted files together. Your chosen AI agent must already be installed and working in the terminal you will use.

## 2. Open your usual project and launch

Use the same terminal, exported environment and project directory where you normally run your agent. Call the extracted executable by its full path; **do not change into the download folder to do your project work**.

Example for macOS/Linux; replace both paths with yours:

```sh
cd "/path/to/your/project"
"/path/to/vibead-beta" claude
```

Legacy Windows beta.5 PowerShell (plain ads only):

```powershell
Set-Location "C:\path\to\your\project"
& "C:\path\to\vibead-beta.exe" claude
```

Choose the agent name you normally use:

| Agent | Argument after the executable path |
| --- | --- |
| Claude Code | `claude` |
| Codex | `codex` |
| Gemini CLI | `gemini` |
| OpenCode | `opencode` |

**The short command now uses your real setup by default.** Adding `--mode interactive` has the same effect in beta.4 or later. You do not need to copy credentials into Vibead or sign in again just for the beta. Your agent can still request login if its existing credentials have expired or are unavailable.

Complete the agent's normal project-trust prompts. Approve the new Vibead hooks if your agent requests it; for Codex, check `/hooks`. Vibead does not approve hooks, change your permissions or disable organization policies for you.

### Keep your usual arguments

Put native arguments after `--` so they reach your agent:

```sh
"/path/to/vibead-beta" claude -- --model my-model
"/path/to/vibead-beta" codex -- --profile my-profile
"/path/to/vibead-beta" gemini -- --model my-model
"/path/to/vibead-beta" opencode -- --model provider/model
```

No model override is needed if you want the agent's saved default. Shell aliases and functions are not invoked by Vibead. If your normal alias supplies arguments or environment variables, supply those same arguments after `--` and export those variables in the shell before launching.

### Claude Code through your gateway (beta.3 or later)

In beta.4 or later, keep the same gateway configuration that already works with plain `claude`: settings files or exported `ANTHROPIC_BASE_URL`, `ANTHROPIC_MODEL` and `ANTHROPIC_AUTH_TOKEN` remain available. Simply launch the wrapper from the same shell and project. The local mock ad service does not replace your model gateway.

If you are configuring a gateway for the first time, follow [Claude's gateway setup](https://code.claude.com/docs/en/llm-gateway-connect), confirm plain `claude` works, then launch through Vibead. Do not send us your token. The same principle applies to Codex, Gemini and OpenCode: keep their working provider setup; Vibead inherits it.

Beta.3 forwarded those three Claude variables but still used a fresh temporary home. Beta.2 filtered them. Use beta.5 for the full existing-setup path.

## 3. Check the ad during normal use

1. Submit your own prompt, or try: “Compare five sorting algorithms and explain their tradeoffs. Do not use tools or change files.”
2. During thinking, look for the disclosed `Beta … [Ad]…` phrase printed when Vibead started.
3. Check that the ad disappears when the turn completes and the answer remains readable. A very short turn may finish before an ad appears; try a longer prompt.
4. Test three consecutive turns, waiting for each response to complete. Include your observation of smoothness and later-turn ads; then keep working normally. The interactive session has no beta-imposed time limit.
5. Exit the agent normally when finished; for example, `/exit` in Claude.

This is your actual workspace. Agent file edits, conversation history, settings changes and authentication refreshes behave as normal; they are not discarded by the beta.

## 4. Review and share the report

Vibead prints the ad-test result and a report path, normally under `~/.vibead-beta/results` (`%USERPROFILE%\.vibead-beta\results` on Windows). Add `--report-dir DIRECTORY` before `--` to choose another location.

A `passed` report means the display checks passed for this session. `failed` or `blocked` is not a pass, even if the agent itself answered. Interactive mode does not compare the model's answer against a fixed expected response; your visual check matters. The wrapper preserves the agent's exit code, so judge ad-test success from the JSON status rather than the shell exit code.

Confirm `artifact_version` is `0.1.0-beta.8`; a report written before this session exited may belong to an older run. `all_eligible_turns_displayed` must be true. Each turn with `display_eligible: true` should have `displayed`, `thinking_row_replaced` and `cleared` true. Turns shorter than the 500 ms display debounce may legitimately have no ad. `activity_frames_filtered` records ordinary OpenCode animation frames that avoided repainting the sponsor; it is diagnostic evidence, not proof that your terminal looked smooth or that an advertiser was billed.

Review the JSON and attach it to a [beta issue](https://github.com/vibead/cli/issues) with your OS, agent version and what you observed. Reports contain versions, timings and checks, not prompts, terminal captures, model responses, credentials or project contents. Reports stay local until you choose to share them. **Share only report JSON from `results`; integration recovery files contain local settings backups and must not be shared.**

## How your setup is preserved

Vibead retains your working directory and provider environment. It temporarily merges its hooks into the selected agent's hook settings, or adds its OpenCode plugin. Your existing hooks and settings stay present. Claude also receives temporary launch settings for its generic thinking phrase. On normal exit, Vibead removes its integration, restores the original settings bytes when unchanged, and preserves other settings changes made during the session. It does not delete your agent's home or alter your shell configuration/vendor executable.

A second overlapping beta session for the same configuration, an existing Vibead integration, disabled hooks, managed restrictions, or an unsupported invocation can prevent safe attachment. In that case the agent runs normally without ads; the report does not claim success. Examples include Claude custom `--settings`, Codex inline `--config`/`--cd` overrides, and sandboxed Gemini hooks. Existing provider settings loaded normally from your files are retained.

### Recovery after a crash or forced termination

Normal exit handles cleanup automatically. A power loss or force-kill can leave temporary hooks and a local recovery journal. Close other beta sessions for that agent, then run from the same account and configuration environment:

```sh
"/path/to/vibead-beta" claude --cleanup
```

Replace `claude` with your agent. Windows uses `& "C:\path\to\vibead-beta.exe" claude --cleanup`. This command needs no model request. It refuses to clean up a live beta session. If cleanup reports an error, retain the archive and recovery files; report the error without uploading those files. Do not delete recovery state while cleanup is pending.

## Optional isolated checks

| Mode | What it does |
| --- | --- |
| No mode, or `--mode interactive` | **Primary beta:** your existing setup, project and real model; local mock ads |
| `--mode fixture` | Temporary empty home, fixed prompt and local simulated model; no account or model charges |
| `--mode authenticated` | Temporary empty home and fixed factorial prompt using an exported provider key/token |

To run an optional diagnostic, use `"/path/to/vibead-beta" AGENT --mode fixture`, replacing `AGENT` with any of the four agent names. You do not need to pass it before using the primary beta. Fixture success does not establish that your usual provider works.

The separate automated authenticated mode requires `OPENAI_API_KEY` for Codex/OpenCode, `GEMINI_API_KEY` for Gemini, or `ANTHROPIC_API_KEY` / `ANTHROPIC_AUTH_TOKEN` for Claude. It accepts `--model MODEL`; Claude also accepts the gateway URL/model variables. Unlike the primary mode, it does not reuse saved account configuration. Provider charges may apply.

## Compatibility

You do not need to upgrade your agent merely to match our test version. Vibead detects required capabilities and recognizes supported status layouts; version numbers are observations, not an allowlist. This does not guarantee every old or future release works. An agent must provide usable lifecycle events and a recognizable generic status label for ad replacement.

Release notes list combinations actually tested. Other OS versions, terminal applications, themes and agent versions remain unverified until exercised. An unfamiliar status layout should leave native output intact; a no-ad report is still a compatibility failure to investigate, not successful ad delivery. Report your agent version, OS version and the status label, without prompts or credentials.

## Platform notes

**OpenCode:** beta.5 recognizes both animated and static `Thinking` labels, including a following reasoning title. Only the generic label changes; the title stays intact. This corrects a beta.4 gap reproduced with OpenCode 1.18.33. If ads are still absent, share the report and the exact status label you saw without prompts or credentials.

These builds are not publisher-signed or notarized. macOS uses an ad hoc signature; Windows may show an unrecognized-publisher warning. Hosted tests do not establish desktop approval or enterprise-policy behavior. Do not disable system-wide security controls to run a beta.

Windows Codex teardown can print an `AttachConsole failed` helper warning even when display/cleanup checks pass. Retain the JSON report and check its status. [Release notes](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.8) identify tested versions, platforms and known limits.

## Remove or upgrade

Exit active beta sessions and complete any pending `--cleanup` before deleting the extracted archive. Reports can be deleted separately. Upgrade by extracting the complete newer archive into a fresh folder; do not mix runtime files from different builds. Beta.4 changes the short command from simulated testing to using your real setup.

This remains an explicit wrapper; automatic activation through your normal agent command is separate distribution work. Synthetic ads generate no earnings or credits. Real-provider, physical-desktop and full lifecycle acceptance remain distinct from the simulated-model qualification recorded in release notes.
