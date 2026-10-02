# Test organization messages in Claude Code on a Mac

This separate demo shows fictional Woolworths Group messages in Claude Code. **Enterprise demo.2 reads messages from the hosted publisher automatically.** You run one command; the feed is already configured. It uses a local deterministic model with no model account or paid calls. The existing [beta.8 advertising test](BETA.md) is unchanged.

Install Claude Code first so `claude --version` works. Download, verify, extract, and locally sign the experimental Mac kit with this block:

```sh
case "$(uname -m)" in
  arm64) vibead_arch=arm64 ;;
  x86_64) vibead_arch=x64 ;;
  *) echo "This test needs an Apple Silicon or Intel Mac"; exit 1 ;;
esac
cd "$HOME/Downloads" || exit 1
vibead_file="vibead-enterprise-demo-darwin-${vibead_arch}.tar.gz"
vibead_url="https://github.com/vibead/cli/releases/download/v0.1.0-enterprise-demo.2"
curl --fail --location --output "$vibead_file" "$vibead_url/$vibead_file" || exit 1
curl --fail --location --output "$vibead_file.sha256" "$vibead_url/$vibead_file.sha256" || exit 1
shasum -a 256 -c "$vibead_file.sha256" || exit 1
tar -xzf "$vibead_file" || exit 1
cd "vibead-enterprise-demo-darwin-${vibead_arch}" || exit 1
codesign --force --sign - ./vibead-enterprise || exit 1
```

You can also download from the [release page](https://github.com/vibead/cli/releases/tag/v0.1.0-enterprise-demo.2). Keep the extracted folder together. The experimental executable is not Developer ID signed or notarized; macOS may require its normal opening confirmation. If signing fails, record the error.

From the extracted folder, launch the demo:

```sh
./vibead-enterprise claude
```

Ask Claude a short question. While it is working, look for the hosted publisher's current featured message with `[Org]`. Every new turn fetches the current publication. You do not need to run a publisher or configure an endpoint.

The demo administrator can publish a changed reminder, news item, or announcement in the hosted publisher. Submit another prompt to see the new short line. After the administrator withdraws the featured message, the next turn keeps native `Working…`. Messages clear at completion and interruption; answers and controls should remain readable. Exit normally or press Ctrl-C twice.

For an optional automated one-turn check:

```sh
./vibead-enterprise claude --verify
```

Keep a message featured in the hosted publisher for this check. Success prints `"passed": true`, with `observedPlacement` and `observedCompletion` both true. It writes `demo/enterprise/artifacts/claude-verification.json` and `claude-screens.txt`. If Claude is outside PATH, add `--binary /absolute/path/to/claude`.

If no organization line appears, the administrator should check that a message is featured and the hosted demo is running. The client keeps native output when no message is available. This is a temporary hosted beta feed, not a production tenant service.

Report your macOS version, Apple Silicon or Intel, terminal app, Claude Code version, and result. Review screen captures before sharing; do not share credentials. The enterprise demo uses an isolated temporary Claude setup and a local model fixture with deterministic answers. That model fixture is managed automatically and makes no paid calls. Your normal Claude setup and the advertising beta remain unchanged. Actual Mac acceptance remains pending tester results.
