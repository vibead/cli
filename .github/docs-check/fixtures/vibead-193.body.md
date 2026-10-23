## Spec
**User outcome:** every repo's DoD carries SAFE-9 so a Lambda zip that can't import its handler can't merge (after the Oct 23 www sign-in outage, vibead/vibead-ai#257).
**Audiences affected:** AI users: none directly · Sponsors/advertisers (all brands): none · Admins: none
**Acceptance criteria:**
- [x] SAFE-9 definition and evidence lines identical to vibead/vibead-ai#259
- [x] per-repo N/A line for vibead/vibead (no Lambdas here)
- [x] PR template carries the SAFE-9 checklist line
**Risks:** none (docs only)

## What and why
Adds DoD **SAFE-9** ("The package builds and imports for every changed Lambda (the build.py zip, unpacked clean, handler imported); evidence is the build-and-import CI test on the head plus QA's import from each zip") per MERGE-9, so the three DoD copies stay identical. Source: vibead/vibead-ai#259 (fix + CI check), postmortem vibead/vibead-ai#257, umbrella vibead/vibead-ai#223.

Design doc: N/A — DoD text only; no flow, role, component, infra or sign-in change.
docs: DoD files are the docs changed.

## Definition of Done

Refs vibead/vibead-ai#257 (no closing keyword: docs follow-up)
Head SHA handed to QA: `23f7698e049073349c16cb93701cd57d64735633`
Cost impact (SAFE-5): none, US$0 (docs only)
Docs (DOC-1): `docs/quality/definition-of-done.md`, `.github/pull_request_template.md`

### Merge
- [x] MERGE-0 this block is complete: every applicable line ticked with evidence, the rest `N/A -` (missing = fast FAIL, `DoD-miss: MERGE-0`): every line ticked with evidence or N/A with a reason
- [x] MERGE-7 the body opens with the spec above: outcome, audiences, acceptance criteria as checks, risks: spec above
- [x] MERGE-8 self-verified end to end on the handed-off head before handoff: self-verified on `23f7698e049073349c16cb93701cd57d64735633`: own diff vs main is still +4 lines in 2 .md files (`git diff --stat origin/main HEAD`); SAFE-9 shared text byte-identical to vibead/vibead-ai#259
- [x] MERGE-9 DoD edits only: overlaps and contradictions with existing lines listed and resolved; three copies identical apart from per-repo lines: SAFE-9 shared lines (definition + evidence) identical to vibead/vibead-ai#259 and the sibling PR; per-repo line `*In vibead/vibead:* N/A — no Lambda functions or build.py packages here`, checklist line `→ in vibead/vibead: N/A — no Lambda functions here`. Overlaps: SAFE-8 (AWS/Terraform, N/A here) and TEST-1 — no contradiction
- [x] MERGE-1 `PR tests` green on head, in the ready_for_review run or later @: https://github.com/vibead/vibead/actions/runs/39904747466 @ `23f7698e049073349c16cb93701cd57d64735633` (synchronize run after merging main): success
- [x] MERGE-2 every required check ran, in the ready_for_review run or later (path skips only via the exact docs-only filter, renames count both paths): 
```
All test suites (Linux)  pass  11s  https://github.com/vibead/vibead/actions/runs/39904747466/job/120253986263  
Design doc updated (or 'Design doc: N/A — <reason>')  pass  8s  https://github.com/vibead/vibead/actions/runs/39904747455/job/120253986689  
Docs updated (or 'docs: n/a')  pass  10s  https://github.com/vibead/vibead/actions/runs/39904747455/job/120253986626  
```
- [x] MERGE-3 clean merge with current main plus the suite green on the merge result: current main `d89a443` merged in (`git merge-base --is-ancestor origin/main HEAD` exit 0); PR tests green on the merge result (MERGE-1)
- [x] MERGE-5 carry-over only: merge-only head, `scripts/pr-own-diff.sh` output; conflict fixes only in LESSONS/docs: merge-only head since `bd3cc33`; `scripts/pr-own-diff.sh bd3cc33 HEAD` → `OK (a): only merges of origin/main after bd3cc33 (1 merge(s))`, `OK (b): own diff identical (ignoring LESSONS.md)`, `OK (c): merge resolutions only in LESSONS.md, lessons/ or docs/ (or none)`, `CARRY OVER: bd3cc33 -> 23f7698`
- [x] MERGE-6 true 2-parent merges, earlier QA'd head is an ancestor, no force-push: one true 2-parent merge `23f7698` (parents `bd3cc33`, `d89a443`); `git merge-base --is-ancestor bd3cc33 HEAD` exit 0; no force-push, no rebase

### Tests
- [ ] TEST-1 full suite on head: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] TEST-2 mutants killed for every new guard/fix: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] TEST-3 rendered/behavioural test for UI show/hide/route: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### Docs
- [x] DOC-1 matching docs updated, or `docs: n/a -`: `docs/quality/definition-of-done.md`, `.github/pull_request_template.md`
- [ ] DOC-2 `docs/system-design/README.md` updated for flow/role/component/infra/auth change; diagrams render (<n>/<n>); unbuilt parts marked Planned: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] DOC-3 status only Live, Merged, not released or Planned (legend identical; no "In review"); no stale self-labels (this PR / once merged / when merged / once deployed / pending deploy …): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] DOC-4 legal/privacy/terms claims true of live config for the serving env; `legal-claims.test.mjs` passes → in vibead/vibead: N/A unless the PR changes what is collected or sent: legal pages live in vibead-ai: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] DOC-5 `check-design-doc` gate exit 0; whitespace-only doc edits don't satisfy it; `Design doc: N/A —` only when no flow, role, component, infra or sign-in changed → in vibead/vibead: CI job "Design doc updated" (`node scripts/check-design-doc.mjs`): N/A - see the Design doc line
- [ ] DOC-6 doc claims checked against current main merged with this head: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### UI (www)
- [ ] UI-1 390px + 1280px screenshots → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-2 homepage → sign-in and install in 1 tap, mobile + desktop → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-3 every sponsor CTA → sign-in → sponsor home in ≤ 2 taps @390px → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-4 sponsors isolated (test + probe) → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-5 one account holds user + sponsor roles → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-6 roles server-set only (test pins it) → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-7 JS-off works where relevant → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-8 no dead ends or fake buttons → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-9 no founder names or third-party platform/vendor names; `npm run check:copy` passes → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] UI-10 one sign-in (`/login?as=sponsor`); flagged-off features hidden → in vibead/vibead: N/A — no web pages here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### CLI / agents
- [ ] CLI-1 fresh install from the exact release artefact: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-2 `vibead enable` with no prompts apart from the one opt-in consent: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-3 3+ turns each in claude, codex and opencode (before RC handoff: 5+ consecutive Claude status-line turns incl. one long turn with a background subagent, frame evidence, vibead/vibead#174): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-4 gold [Ad] line visible on every turn while thinking (native line, not a pop-up) (incl. the Claude RC self-check frames, vibead/vibead#174): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-5 ads rotate (ad per turn per agent): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-6 no harness/debug text or escape codes (`0;0m`, lone `1`), exit screens included: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-7 `vibead login` frictionless (no codes to copy): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-8 `vibead disable` restores config hashes; no hooks or leftover dirs: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-9 NO_COLOR=1 / TERM=dumb / VIBEAD_SHIMMER=0 give the plain static ad: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-10 revoked-key recovery is silent; queued impressions flush: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-11 screenshots attached: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-12 model inputs/outputs untouched; no prompts or code collected: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-13 hosted machine paused; test keys revoked: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] CLI-14 installers: idempotent profile edit, `file://` fake-release tests: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### Safety / infra
- [ ] SAFE-1 explicit env guard; wrong/missing env refused: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] SAFE-2 plans show 0 to destroy for every root/env; apply only after a clean plan → in vibead/vibead: N/A — no Terraform here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] SAFE-3 workflow-only change ran plan-only → in vibead/vibead: N/A — workflows here build and test only: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [x] SAFE-4 no secrets or partial secrets in output; sensitive values via `secrets.*`: diff has no secrets (`grep -E 'vbs_|AKIA|sk_|rk_|eyJ'` = 0)
- [x] SAFE-5 cost impact stated (above): US$0 (docs only)
- [ ] SAFE-6 QA/test installs on the internal list (only exception: the one staging `billable_test` install, vibead/vibead-ai#230 A1): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] SAFE-7 per-env flag, default off; prod only via reviewed config + guard test: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] SAFE-8 `VIBEAD_AWS_*` → `AWS_*`, VibeAd account only, Terraform 1.10.5, ≥ US$20/month held for the Chief of Staff → in vibead/vibead: N/A — no AWS commands or Terraform here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] SAFE-9 the package builds and imports for every changed Lambda (the build.py zip, unpacked clean, handler imported) → in vibead/vibead: N/A — no Lambda functions here: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### Data / privacy
- [ ] DATA-1 retention/TTL proven and pinned by tests → in vibead/vibead: N/A — retention and TTL live in vibead-ai (record-impressions and the install tables): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] DATA-2 revoke/delete purges and fails closed (proven on a QA install) → in vibead/vibead: N/A — the server-side purge lives in vibead-ai: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### Money
- [ ] MONEY-1 billed-click reconciliation: sponsor debit = user credit + VibeAd share (micro-cent, rates read back at test time); 24 h duplicate unbilled both sides; dashboard and earnings = ledger sums; sponsor A never changes B → in vibead/vibead: N/A unless the CLI change affects ad requests, click links or impression reports: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### Release
- [ ] REL-1 fresh, never-used version: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-2 SHA256SUMS + Sigstore signature cover every artefact (kit + npm tgz): N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-3 provenance from the named commit: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-4 prerelease until QA PASS: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-5 npm `latest` untouched: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-6 `/install` with VIBEAD_VERSION verifies: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-7 npm via trusted publishing only, no npm token → in vibead/vibead: N/A — the public npm package is published from vibead/cli: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-8 version agrees in package.json, releases.json, tag and /install manifest → in vibead/vibead: N/A — `npm/package.json` and `releases.json` live in vibead/cli: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-9 installers read pinned install.json, never GitHub latest → in vibead/vibead: N/A — the installers live in vibead/cli: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-10 kit built with Node 22.19.0 builder: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] REL-11 shipped items swept from Merged, not released to Live in the release PR: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change

### Bugs
- [ ] BUG-2 `Refs vibead/vibead-ai#257 (no closing keyword: docs follow-up)N` in body and commit: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] BUG-3 root cause; regression test: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] BUG-4 recurring class → `lessons/` file + automated check + DoD line: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [ ] BUG-5 one `lessons/` file per QA FAIL; LESSONS.md takes no new lessons: N/A - docs-only DoD text change (two .md files); no code, UI, CLI, infra, data, money or release change
- [x] BUG-6 QA round n of 3 (escalate to the Chief of Staff after the third FAIL): QA round 1 of 3


