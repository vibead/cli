# Lessons

- Docs drift unless the PR that changes code also changes the docs. The Docs check fails a PR that touches install/, npm/, packaging/ or workflows with no doc change and no `docs: n/a - <why>` line (vibead-ai#143).
- `curl … | sh`: stdin is the script, so prompts must read `/dev/tty`, and only when `(: </dev/tty)` succeeds. With no terminal, print the next command; never edit shell profiles silently.
- Wrap a piped installer in `main` and call it on the last line, so a truncated download runs nothing.
- `irm … | iex` runs in the user's session: use `return`, never `exit`, or the PowerShell window closes on an error.
- Tar sets extracted folder mtimes from the archive; `touch` a freshly installed version before pruning by age.
- Test installers against `file://` fake releases in a temp HOME; never against the real `~/.vibead` or the network.
- Node 22 `node --test <dir>` treats the directory as a module and fails; pass globs (`install/test/*.test.mjs`) or cd and run `node --test` (cli#23 CI run 39674953549).
- Features such as Google/GitHub sign-in, house ads and test clients go behind per-environment config flags (default off in prod), never hard-coded; see CONTRIBUTING.md "Feature flags".
- Profile edits from an installer must be idempotent: write a marker-delimited block and guard with `grep -qxF` on the marker (and any legacy exact line) before prompting. A re-run from a shell that hasn't reloaded PATH would otherwise prompt and append again (cli#24).
- The box is shared and fills fast (35% to 92% in a day, mostly ~7G worktrees): reuse worktrees, `git worktree remove` your own as soon as its PR merges or closes (never anyone else's), and clear build artefacts and node_modules you no longer need.
- Installers must never resolve the version from GitHub "latest": on 22 Oct it pointed at beta.19 with no SHA256SUMS and every `curl | sh` failed. They read the site's pinned `install.json`, and vibead-ai CI checks that the pinned release has SHA256SUMS and every archive (cli#27, vibead-ai#156).
