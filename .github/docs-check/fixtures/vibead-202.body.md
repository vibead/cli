## Spec
**User outcome:** No ad can be shown, requested or counted before the consent notice has been printed (B1). When zero-step install or the first run connects no agent (Codex is the only agent and the login shell is tcsh, nu or another unsupported shell, or no agent is on `PATH`), VibeAd does not print the 2a "turns on a short sponsored line…" notice, because nothing was turned on. It prints only the Codex skip line (and the Gemini line), once, and does not record the notice as shown. The first run that does wire an agent prints 2a.
**Audiences affected:** AI users with Codex only on tcsh/nu/other shells, or with no agent installed yet: no longer told ads were turned on when nothing was; everyone else: no change · Sponsors/advertisers (all brands): none · Admins: none
**Acceptance criteria:**
- [x] codex only, SHELL=tcsh: `installAnnouncement` returns exactly `` Codex alias skipped: your shell (tcsh) isn't bash, zsh or fish, so VibeAd made no Codex changes. Use `vibead codex` instead. `` (no 2a); `~/.vibead/wrapperless` holds only `skip-noted` (no `announced`, no `zero-step` marker); no agent file written; the following first run prints nothing
- [x] first run (npm 12, CI, `--ignore-scripts`), codex only on tcsh: prints only the skip line, once; no `announced`, no `zero-step`; after Claude is installed the next run wires it and prints 2a + the skip line, once, then silent
- [x] no agent on PATH: install output empty (so the npm postinstall prints its existing "setup finishes the first time you run vibead"), first run silent, nothing marked
- [x] F1: tcsh with only Claude on PATH: 2a and no skip line (`notes` empty)
- [x] at least one agent wired: unchanged (2a printed once per home, existing tests pass)
- [x] B1 (QA r1): when at least one agent will be wired, install and first run run in this order: write `notice-pending`; print 2a (+ skip/Gemini lines); only after that write returned without error, write `zero-step` + `announced` and remove `notice-pending`; write the agent files; the key and link calls last (existing timeouts). Pinned by an order-log test on both paths
- [x] B1 interrupts: a throw and a real SIGINT after each step (pending, printed, marked, applied, key) leave no agent file without `announced` and no `announced` without the printed 2a; interrupted before the mark → nothing wired, the next run announces again; after the mark → the next run wires without printing again
- [x] B1 key call: throwing and hanging (stub API that never answers; also a real SIGINT mid-hang) leave the home announced and wired, 2a printed once
- [x] N3: a terminal write that fails (EPIPE on a real closed pipe, or an error reported only through the write callback) on the install (stdout) or first run (stderr) marks nothing and wires nothing; the next run announces
- [x] Consent gate (Nina's spec b): unless `~/.vibead/wrapperless/announced` holds `1` (missing, empty, `0`, garbage, a directory, or only `notice-pending`), Claude's status line and OpenCode's TUI line and toast show 2c (approved text, unchanged), refresh/prefetch/the wrapper make 0 get-ads calls to a stub API, and no impression or click is recorded. The Codex wrapper slot cannot draw 2c, so it shows nothing (no new wording)
- [x] normal path: after an install, Claude's first paint is 2c, then the ad; `vibead enable --yes` marks `announced`
- [x] 2a/2b/2c unchanged: `beta/lib/notices.mjs` has no diff vs main `3c43425`; sha16 `efa0fa0d7903299a` / `b2cb3013f3bc79b5` / `d609c91c02db7766`, equal to the pins and to vibead-ai#254 @ `df6cdae`
**Risks:** Medium (B1). Homes wired by beta.31 or earlier have no `announced`, so they show 2c and no ads until the next install or `vibead` run prints 2a (fails safe). Before B1: Low. Only `installAnnouncement` and `maybeAutoWire` change, and only when zero-step is on and `wired` is empty; wiring itself is untouched. One new VibeAd-owned state file, `~/.vibead/wrapperless/skip-noted` (under HOME, removed with the rest of `~/.vibead/wrapperless` by `vibead uninstall`), keeps the skip line to once. With no agent at all the curl installer now prints nothing from `wire --announce` (before: the 2a notice for a machine where nothing was connected).

## What and why
QA F3 on vibead#200 (https://github.com/vibead/vibead/pull/200#issuecomment-6358469949): codex only on tcsh printed 2a ("Installing this package turns on a short sponsored line in Claude Code, Codex and OpenCode…") although nothing was connected, and marked the home `announced`, so the notice would never be printed when an agent was wired later. Fix: a `nothingWired` check (zero-step on, `wired` empty) in `installAnnouncement` and `maybeAutoWire` prints only the Gemini/skip lines, marks `skip-noted` instead of `announced`, and writes no notice. The `zero-step` marker was already written only when an agent was wired. The 2a/2b/2c wording is unchanged. Also adds QA's F1 test (tcsh, Claude only: no skip line), which kills QA's surviving M13. Nina asked for F3 + F1 before beta.32 goes Latest.

**Round 2 (QA r1 B1/N3, https://github.com/vibead/vibead/pull/202#issuecomment-6358784309):** wiring wrote the agent files, the `zero-step` marker and the key before 2a was printed, and printing was the caller's job afterwards, so an interrupt, the 20 s install timer or a failed terminal write could leave ads on with no notice shown; a failed stderr write still marked the home (N3). Now `consentBeforeWiring` (`beta/lib/auto-wire.mjs`) prints and marks inside `wireDetected`, after the plan and before any agent file, through `terminalPrinter` (rejects on a failed write). Defence in depth: every ad surface is gated on `announced` (`consentShown` in `beta/lib/notices.mjs`; `beta/lib/wrapperless.mjs` status line, refresh, prefetch, both OpenCode plugins; `cli/src/launcher.mjs` + `ad-controller.mjs` `noticeOnly`). `vibead enable` marks `announced` once the plan is accepted. With Codex only on an unsupported shell, `vibead codex` prints 2a + the skip line and marks before the wrapper starts.

Left for vibead#199 (out of scope here): F2 (`zsh5`, `fish -l`, `/usr/bin/env fish` treated as unsupported; map a basename prefix or first word), F4 (the `vibead enable codex` refusal's circular second paragraph on tcsh). F5 (codex-only test title) is fixed here only because that test is rewritten for F3.

vibead/cli needs no change: the postinstall prints the kit's `wire --announce` output as is and already prints SETUP_LATER when it is empty; `install.sh` prints the output as is. Checked with the simulation against cli main `dce6b7a`.

Ships in 0.1.0-beta.32 (no version bump or publish here). Part of vibead/vibead-ai#223.

## Definition of Done

Part of #198 (QA F3 and F1 on #200; #198 itself was closed by #200)
Head SHA handed to QA: `25bbce6e20a67dbe3445cad403d833b3fa92ac46`
Cost impact (SAFE-5): none. CLI-only logic and tests; no new requests (the gate only removes ad requests), no infra; the CI run is the existing `PR tests` workflow (~3 min on GitHub-hosted Linux, no AWS)
Docs (DOC-1): `docs/system-design/README.md` (Zero-step #198 bullet, reinstall wording, new B1 ordering and consent-gate bullets), `docs/wrapperless-enable.md` (Codex-only sentence, `vibead codex` exception, print-before-change and gate bullet)

### Merge
- [x] MERGE-0 this block is complete: every applicable line ticked with evidence, the rest `N/A - <reason>` (missing = fast FAIL, `DoD-miss: MERGE-0`): every applicable line ticked with evidence, the rest N/A with a reason
- [x] MERGE-7 the body opens with the spec above: outcome, audiences, acceptance criteria as checks, risks: spec above
- [x] MERGE-8 self-verified end to end on the handed-off head before handoff: `25bbce6e20a67dbe3445cad403d833b3fa92ac46`: box `npm test` (TEST-1), 54 mutants (TEST-2), `scripts/simulate-zero-step.mjs` with the packed cli main `dce6b7a` (CLI-14), legal hashes (spec)
- [x] MERGE-9 DoD edits only: overlaps and contradictions with existing lines listed and resolved; three copies identical apart from per-repo lines: N/A - no DoD edits
- [x] MERGE-1 `PR tests` green on head, in the ready_for_review run or later: https://github.com/vibead/vibead/actions/runs/39915831574 (`pull_request` synchronize, 2026-10-23 18:08 AEDT, after the ready_for_review run 39908960929) @ `25bbce6e20a67dbe3445cad403d833b3fa92ac46`: success. All suites on CI, 0 failing: workflows PASS; scripts 53/53; cli 296 pass + 2 skipped; beta 297 pass + 1 skipped; server 20/20; distribution 7 pass + 2 skipped; distribution/native 92/92; demo/enterprise 8/8
- [x] MERGE-2 every required check ran, in the ready_for_review run or later (path skips only via the exact docs-only filter, renames count both paths): `gh pr checks 202`: `All test suites (Linux) pass 3m21s` (run 39915831574), `Design doc updated (or 'Design doc: N/A — <reason>') pass 7s` and `Docs updated (or 'docs: n/a') pass 9s` (run 39915832327); all `pull_request` @ `25bbce6`, no path skips
- [x] MERGE-3 clean merge with current main plus the suite green on the merge result: head is main `3c43425` plus two commits (`git merge-base --is-ancestor origin/main HEAD` exit 0), so the merge result is this head
- [x] MERGE-5 carry-over only: merge-only head, `scripts/pr-own-diff.sh <passed> <new>` output: N/A - not a merge-only head; the new commit `25bbce6` is the B1/N3 fix on top of the QA'd `835d93c`
- [x] MERGE-6 true 2-parent merges, earlier QA'd head is an ancestor, no force-push: QA'd `835d93c` is the parent of `25bbce6` (fast-forward push, no force-push); no merges

### Tests
- [x] TEST-1 full suite on head: box `npm test` (Node 22.19.0) exit 0: workflows PASS; scripts 53/53; cli 296 pass, 2 skipped; beta 297 pass, 1 skipped (298 tests: +54 in the new `beta/consent-gate.test.mjs`, +1 in `beta/auto-wire.test.mjs`); server 20/20; distribution 7 pass, 2 skipped; distribution/native 92/92; demo/enterprise 8/8; 0 failing. Skips are the existing platform/release-only ones. Existing ad tests now write `announced` in their setup (the gate); no assertion was weakened
- [x] TEST-2 mutants killed for every new guard/fix: 54/54 killed (32 new for B1 + 22 #200/#202 reruns) against `beta/consent-gate.test.mjs` + `beta/auto-wire.test.mjs` on this head. B1 gates (G1–G13, G15, G16): `consentShown` lax content / true when unreadable; each gate removed (Claude status, prefetch, refresh, toast, TUI, both plugins' `consented()` loosened); launcher consent always true, `noticeOnly` off, `requestDecision` or prefetch ignoring consent; controller `noticeOnly` guard and prefetch cache guard removed; `enable` not marking. B1 reorders (R1–R11): agent files before print+mark; markers before print; `announced` before print; `notice-pending` never written / never cleared; key call before print; print failure swallowed (N3); first run re-announcing; `announced` never written; `launching` path removed; marker written without announce. Entry/printer (E1–E5): `terminalPrinter` ignoring errors; entry install and first-run printers ignoring callback errors (E2/E5 survived r2's first pass and are now killed by the callback-only failing-write tests); entry printing after wiring (old order); install wire not printing before wiring. #202 F3 M13, M15–M22 (+M19b) and #200 M1–M12 rerun: 22/22 killed (M6 now killed by a new zero-step-off tcsh refresh test). G14 was removed as an equivalent mutant (a redundant `armNextTurn` guard dropped from the code). M14 (env HOME vs writeHome) stays equivalent, as QA noted
- [x] TEST-3 rendered/behavioural test for UI show/hide/route: real processes for the entry first run (stderr), `__wrapperless wire --announce` (stdout), `__wrapperless claude-status`/`refresh` and a real `vibead codex` wrapper on a PTY stub; rendered Claude status frames and OpenCode toast/TUI output per marker state; plus the packed-npm simulation

### Docs
- [x] DOC-1 matching docs updated, or `docs: n/a - <why>`: `docs/system-design/README.md`, `docs/wrapperless-enable.md`
- [x] DOC-2 `docs/system-design/README.md` updated for flow/role/component/infra/auth change; diagrams render (<n>/<n>); unbuilt parts marked Planned: Zero-step bullets: reinstall wording ("A reinstall prints it again only when an agent is wired"), new **Merged, not released** B1 ordering bullet and consent-gate bullet (upgrade note, Codex shows nothing). No diagram changed (10/11 parse, as on main; the Claude-turn sequence diagram's `;` is pre-existing)
- [x] DOC-3 status only Live, Merged, not released or Planned (legend identical; no "In review"); no stale self-labels (this PR / once merged / when merged / once deployed / pending deploy …): `git diff origin/main -- docs | grep '^+' | grep -inE "this PR|once merged|when merged|once deployed|pending deploy|in review"`: empty; status labels unchanged
- [x] DOC-4 legal/privacy/terms claims true of live config for the serving env; `legal-claims.test.mjs` passes: N/A - the legal pages live in vibead-ai; the approved 2a/2b/2c sentences are unchanged (hashes in the spec); this change only stops 2a being shown where it would be untrue
- [x] DOC-5 `node scripts/check-design-doc.mjs --base origin/main --head HEAD --body-file <body>` exit 0 (or a `Design doc: N/A — <reason>` line, only when no flow, role, component, infra or sign-in changed); whitespace-only doc edits don't satisfy it: `Design-doc check passed (origin/main...HEAD, 21 files): design doc changed: docs/system-design/README.md.` (exit 0)
- [x] DOC-6 doc claims checked against current main merged with this head: checked against main `3c43425` (this head's base); npm 11 hiding postinstall stderr, the cli README and the stale "Planned" postinstall label stay with vibead#199

### UI (www)
- [x] UI-1 390px + 1280px screenshots: N/A — no web pages here
- [x] UI-2 homepage → sign-in and install in 1 tap, mobile + desktop: N/A — no web pages here
- [x] UI-3 every sponsor CTA → sign-in → sponsor home in ≤ 2 taps @390px: N/A — no web pages here
- [x] UI-4 sponsors isolated (test + probe): N/A — no web pages here
- [x] UI-5 one account holds user + sponsor roles: N/A — no web pages here
- [x] UI-6 roles server-set only (test pins it): N/A — no web pages here
- [x] UI-7 JS-off works where relevant: N/A — no web pages here
- [x] UI-8 no dead ends or fake buttons: N/A — no web pages here
- [x] UI-9 no founder names or third-party platform/vendor names; `npm run check:copy` passes: N/A — no web pages here
- [x] UI-10 one sign-in (`/login?as=sponsor`); flagged-off features hidden: N/A — no web pages here

### CLI / agents
- [x] CLI-1 fresh install from the exact release artefact: N/A - no release artefact in this PR; verified on the beta.32 RC at RC handoff
- [x] CLI-2 `vibead enable` with no prompts apart from the one opt-in consent: `vibead enable` unchanged; zero-step install asks nothing (unchanged)
- [x] CLI-3 3+ turns each in claude, codex and opencode (before RC handoff: 5+ consecutive Claude status-line turns incl. one long turn with a background subagent, frame evidence, vibead/vibead#174): N/A - verified on the beta.32 RC at RC handoff (vibead/vibead#174); this PR ships source only
- [x] CLI-4 gold [Ad] line visible on every turn while thinking (native line, not a pop-up): N/A - verified on the beta.32 RC at RC handoff; the simulation's Claude frames still pass on this head
- [x] CLI-5 ads rotate (ad per turn per agent): N/A - rotation untouched
- [x] CLI-6 no harness/debug text or escape codes (`0;0m`, lone `1`), exit screens included: no new wording; 2a/2c and the skip line are the unchanged approved/plain texts
- [x] CLI-7 `vibead login` frictionless (no codes to copy): N/A - login untouched
- [x] CLI-8 `vibead disable` restores config hashes; no hooks or leftover dirs: wiring and disable untouched; the 7 per-shell byte-for-byte disable tests from #200 pass on this head; simulation tcsh/nu disable restores `settings.json` sha256 `27dafb…`
- [x] CLI-9 NO_COLOR=1 / TERM=dumb / VIBEAD_SHIMMER=0 give the plain static ad: unchanged code path; existing tests in TEST-1
- [x] CLI-10 revoked-key recovery is silent; queued impressions flush: N/A - key handling untouched
- [x] CLI-11 screenshots attached: N/A - CLI text only; exact outputs are in the acceptance criteria
- [x] CLI-12 model inputs/outputs untouched; no prompts or code collected: no change to what is sent; gated surfaces send nothing; the simulation's prompt-leak walk passes
- [x] CLI-13 hosted machine paused; test keys revoked: N/A - no hosted machine; tests and simulation use a local stub API or a closed local port, never www
- [x] CLI-14 installers: idempotent profile edit, `file://` fake-release tests: `scripts/simulate-zero-step.mjs` (packed `@vibead/cli` from cli main `dce6b7a`) passes on this head (`simulation ok`): TTY install prints 2a, first Claude frame 2c then 14 [Ad]; OpenCode notice then ad; bash TTY/CI/non-TTY/`--ignore-scripts`/Homebrew/default/upgrade, tcsh TTY and nu CI + first run; second install byte-identical; disable restores `settings.json` sha256 `27dafb…`. New writes are `notice-pending`/`announced`/`skip-noted` under `~/.vibead/wrapperless` only (HOME), idempotent; CI/`--ignore-scripts`/non-TTY installs still run no wiring

### Safety / infra
- [x] SAFE-1 explicit env guard; wrong/missing env refused: N/A - no env-dependent code
- [x] SAFE-2 plans show 0 to destroy for every root/env; apply only after a clean plan: N/A — no Terraform here
- [x] SAFE-3 workflow-only change ran plan-only: N/A — no workflow change
- [x] SAFE-4 no secrets or partial secrets in output; sensitive values via `secrets.*`: no secrets in the diff or body; the new tests use fake tokens (`VIBEAD_API_TOKEN: "x"`) and no install key or click URL is printed
- [x] SAFE-5 cost impact stated (above): none
- [x] SAFE-6 QA/test installs on the internal list (only exception: the one staging `billable_test` install, vibead/vibead-ai#230 A1): N/A - no install registered; stub API only
- [x] SAFE-7 per-env flag, default off; prod only via reviewed config + guard test: N/A - no flag; a behaviour fix in the zero-step notice
- [x] SAFE-8 `VIBEAD_AWS_*` → `AWS_*`, VibeAd account only, Terraform 1.10.5, ≥ US$20/month held for the Chief of Staff: N/A — no AWS commands or Terraform here
- [x] SAFE-9 the package builds and imports for every changed Lambda: N/A - no Lambda in vibead/vibead

### Data / privacy
- [x] DATA-1 retention/TTL proven and pinned by tests: N/A — retention and TTL live in vibead-ai
- [x] DATA-2 revoke/delete purges and fails closed (proven on a QA install): N/A — the server-side purge lives in vibead-ai

### Money
- [x] MONEY-1 billed-click reconciliation: sponsor debit = user credit + VibeAd share (micro-cent, rates read back at test time); 24 h duplicate unbilled both sides; dashboard and earnings = ledger sums; sponsor A never changes B: N/A - click links and impression reports unchanged; the gate only suppresses requests and impressions before consent

### Release
- [x] REL-1 fresh, never-used version: N/A - no release here; beta.32 release PR
- [x] REL-2 SHA256SUMS + Sigstore signature cover every artefact (kit + npm tgz): N/A - no release here
- [x] REL-3 provenance from the named commit: N/A - no release here
- [x] REL-4 prerelease until QA PASS: N/A - no release here
- [x] REL-5 npm `latest` untouched: N/A - no publish here; `latest` untouched
- [x] REL-6 `/install` with VIBEAD_VERSION verifies: N/A - no release here
- [x] REL-7 npm via trusted publishing only, no npm token: N/A — the npm package is published from vibead/cli
- [x] REL-8 version agrees in package.json, releases.json, tag and /install manifest: N/A — versions live in vibead/cli
- [x] REL-9 installers read pinned install.json, never GitHub latest: N/A — the installers live in vibead/cli
- [x] REL-10 kit built with Node 22.19.0 builder: N/A - no kit build here (box tests ran on Node 22.19.0)
- [x] REL-11 shipped items swept from Merged, not released to Live in the release PR: N/A - no release here; the beta.32 release PR sweeps

### Bugs
- [x] BUG-2 `Fixes #N` in body and commit: N/A - #198 was closed by #200; this is QA's post-launch F3/F1 follow-up, so the body and commit say `Part of #198`
- [x] BUG-3 root cause: (F3) the announcement printed 2a whenever zero-step was on, without checking that any agent was wired; (B1/N3) wiring wrote the agent files, markers and key before 2a was printed, printing was the caller's job afterwards and its failure was ignored. Regression tests: `#198 F3 …` (3) in `beta/auto-wire.test.mjs`; `B1 …`/`N3 …` in `beta/consent-gate.test.mjs`
- [x] BUG-4 recurring class → `lessons/` file + automated check + DoD line: N/A - first instance of this class; lesson filed under BUG-5, automated check is `beta/consent-gate.test.mjs`
- [x] BUG-5 one `lessons/` file per QA FAIL; LESSONS.md takes no new lessons: `lessons/2026-10-23-consent-before-the-first-write.md` (QA r1 FAIL, B1/N3)
- [x] BUG-6 QA round n of 3 (escalate to the Chief of Staff after the third FAIL): round 2 of 3

