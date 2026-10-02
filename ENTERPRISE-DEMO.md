# Test organization messages in Claude Code on a Mac

This separate Vibead demo shows a fictional Woolworths Group message in the Claude Code working row. A local publisher page changes what appears on the next turn. The test uses Claude Code's real terminal UI with a local deterministic model; it does not need a model account or incur model charges. The existing [beta.8 release](https://github.com/vibead/cli/releases/tag/v0.1.0-beta.8) tests `[Ad]` placements and cannot test these `[Org]` messages.

Install Claude Code first so `claude --version` works in your terminal. Then use a Terminal window on your Mac and run this block. It chooses the correct public archive, checks its SHA-256 file, extracts it, and signs the experimental executable locally:

```sh
case "$(uname -m)" in
  arm64) vibead_arch=arm64 ;;
  x86_64) vibead_arch=x64 ;;
  *) echo "This test needs an Apple Silicon or Intel Mac"; exit 1 ;;
esac
cd "$HOME/Downloads" || exit 1
vibead_file="vibead-enterprise-demo-darwin-${vibead_arch}.tar.gz"
vibead_url="https://github.com/vibead/cli/releases/download/v0.1.0-enterprise-demo.1"
curl --fail --location --output "$vibead_file" "$vibead_url/$vibead_file" || exit 1
curl --fail --location --output "$vibead_file.sha256" "$vibead_url/$vibead_file.sha256" || exit 1
shasum -a 256 -c "$vibead_file.sha256" || exit 1
tar -xzf "$vibead_file" || exit 1
cd "vibead-enterprise-demo-darwin-${vibead_arch}" || exit 1
codesign --force --sign - ./vibead-enterprise
```

The archive and checksum can also be downloaded directly from the [enterprise demo release](https://github.com/vibead/cli/releases/tag/v0.1.0-enterprise-demo.1). Keep the extracted folder together. This binary is not Developer ID signed or notarized, so macOS may ask you to approve opening it. Do not change system-wide security settings. If `codesign` fails, record its exact error.

Choose where to run the publisher. For a self-contained test, start it in your first terminal:

```sh
./vibead-enterprise serve
```

Open <http://127.0.0.1:4180/woolworths-demo> in your browser. Click **Reset demo** and keep the default `Help a teammate succeed [Org]` message featured. In a **second terminal**, change into the same extracted folder and run:

```sh
./vibead-enterprise claude --verify
```

If you already have a **hosted Ona publisher**, you do not need to run `serve` on your Mac. Open its `/woolworths-demo` page in your signed-in browser instead. A creator-only Ona preview requires browser authentication; the Vibead executable cannot use that browser session, so passing the preview URL directly to `--url` will return 401 and show no organization message. Keep the hosted environment and its publisher service running, then use an authenticated SSH tunnel. Install the [Ona CLI](https://ona.com/docs/ona/integrations/cli) if needed; on your Mac:

```sh
brew install gitpod-io/tap/ona
ona login
ona environment ssh-config
ona_environment_id='YOUR-ENVIRONMENT-ID'
ssh -N -o ExitOnForwardFailure=yes -L 127.0.0.1:4181:127.0.0.1:4180 "${ona_environment_id}.ona.environment"
```

Replace `YOUR-ENVIRONMENT-ID` with the ID in the hosted preview URL. Leave this terminal open. In a second terminal, from the extracted kit folder, check the tunnel and run the verification against it:

```sh
curl --fail http://127.0.0.1:4181/api/tenants/woolworths-demo/decision
./vibead-enterprise claude --url http://127.0.0.1:4181 --verify
```

For the manual successive-turn test, use `./vibead-enterprise claude --url http://127.0.0.1:4181` and publish changes through the hosted browser page. The tunnel preserves Ona access controls without exposing the shared editor publicly. If you cannot authenticate to this Ona environment from the Mac, use the self-contained local publisher above.

The check should print `"passed": true`, with `observedPlacement` and `observedCompletion` both true. It also writes `demo/enterprise/artifacts/claude-verification.json` and `claude-screens.txt`. If `claude` is installed outside PATH, add `--binary /absolute/path/to/claude`. This mode uses an isolated temporary Claude setup and a local model fixture. It does not reuse your login or model provider.

For the publishing test, keep your chosen publisher or tunnel running and run the corresponding `./vibead-enterprise claude` command in the second terminal. Submit a short prompt. While Claude is idle, publish a different short line in the browser, then submit another prompt. Confirm the new `[Org]` line appears. Withdraw the featured message in the browser and submit once more: native `Working…` should remain. Confirm the message clears at completion and interruption, and that the native answer and controls stay readable. The browser's **Run demo turn** rehearses the publishing sequence without a model.

Tell us your Mac version, Apple Silicon or Intel, terminal app, Claude Code version and what you saw. Share the verification JSON if useful; review `claude-screens.txt` before sharing. Never share credentials or temporary agent settings. This is an experimental local demo of delivery, not a production tenant service or paid advertising release.
