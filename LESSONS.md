# Lessons

- `curl … | sh`: stdin is the script, so prompts must read `/dev/tty`, and only when `(: </dev/tty)` succeeds. With no terminal, print the next command; never edit shell profiles silently.
- Wrap a piped installer in `main` and call it on the last line, so a truncated download runs nothing.
- `irm … | iex` runs in the user's session: use `return`, never `exit`, or the PowerShell window closes on an error.
- Tar sets extracted folder mtimes from the archive; `touch` a freshly installed version before pruning by age.
- Test installers against `file://` fake releases in a temp HOME; never against the real `~/.vibead` or the network.
- Node 22 `node --test <dir>` treats the directory as a module and fails; pass globs (`install/test/*.test.mjs`) or cd and run `node --test` (cli#23 CI run 39674953549).
