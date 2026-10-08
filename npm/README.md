# Vibead CLI (beta)

The npm launcher for the official [vibead/cli](https://github.com/vibead/cli) beta.12 release. Vibead adds disclosed synthetic advertisements or publisher messages to supported working-status rows in Claude Code, Codex, Gemini CLI and OpenCode.

```sh
npm install -g vibead
vibead claude
# Or: vibead codex, vibead gemini, vibead opencode
```

You can also run `npx vibead claude`. Your agent must already be installed and working. Your existing agent login, provider settings and project stay in use; normal provider charges apply. This is a beta with no earnings or credits.

## Supported systems

Node.js 20 or newer, macOS Apple Silicon/Intel, or Linux x64 with glibc 2.34 or newer. Windows, Linux ARM64 and Alpine/musl are not supported. `tar` is required; `curl` is also required when an HTTPS proxy is configured. Mac downloads are ad hoc signed, without Developer ID notarization.

On first use the launcher downloads the matching 72–84 MB official GitHub archive, verifies its pinned SHA-256 checksum, and extracts the complete kit to `~/.cache/vibead`. Later runs use that cached version. Set `VIBEAD_CACHE_DIR` to choose another writable cache directory. The wrapper does not require npm install scripts, a compiler, or a separate server. `vibead --version` reports the release without a download.

## Usage

```sh
vibead --help
vibead codex -- --profile my-profile
vibead claude --test-links
vibead claude --test-publisher
```

Use `--test-links` and `--test-publisher` separately. The publisher demo is shared and fictional. Run your normal agent directly whenever you do not want Vibead. Exit normally so Vibead can remove its session integration; reports are under `~/.vibead-beta/results`. Recover an interrupted integration with `vibead AGENT --cleanup`.

See the [beta guide](https://github.com/vibead/cli/blob/main/BETA.md), [publisher guide](https://github.com/vibead/cli/blob/main/ENTERPRISE-DEMO.md), and [release notes](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.12) for limits and platform qualification. Physical Mac acceptance remains pending, and OpenCode has a reported multi-turn advertisement display issue. Source and server code remain private. Third-party notices ship in this package and in each downloaded kit.

Remove the npm launcher with `npm uninstall -g vibead`. To remove cached downloads too, remove the `vibead` folder in your cache directory after all Vibead sessions have exited.
