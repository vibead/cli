<!-- The PR body opens with the Spec, then this block. Tick each applicable line and add its evidence, or write "N/A - <reason>".
     Line definitions: docs/quality/definition-of-done.md. A PR without this block, ticked with evidence, is a fast QA FAIL (DoD-miss: MERGE-0). -->

## Spec
**User outcome:** 
**Audiences affected:** AI users: … · Sponsors/advertisers (all brands): … · Admins: …
**Acceptance criteria:**
- [ ] 
**Risks:** 

## What and why

## Definition of Done

Fixes #
Head SHA handed to QA: `<sha>`
Cost impact (SAFE-5): <none | details>
Docs (DOC-1): <files changed | docs: n/a - why>

### Merge
- [ ] MERGE-0 this block is complete: every applicable line ticked with evidence, the rest `N/A - <reason>` (missing = fast FAIL, `DoD-miss: MERGE-0`)
- [ ] MERGE-7 the body opens with the spec above: outcome, audiences, acceptance criteria as checks, risks
- [ ] MERGE-8 self-verified end to end on the handed-off head before handoff: <sha>
- [ ] MERGE-9 DoD edits only: overlaps and contradictions with existing lines listed and resolved; three copies identical apart from per-repo lines: <overlap list, diff>
- [ ] MERGE-1 `PR tests` green on head, in the ready_for_review run or later: <run url> @ <sha>
- [ ] MERGE-2 every required check ran, in the ready_for_review run or later (path skips only via the exact docs-only filter, renames count both paths): <gh pr checks output>
- [ ] MERGE-3 clean merge with current main plus the suite green on the merge result: <merge-tree + counts>
- [ ] MERGE-5 carry-over only: merge-only head, `scripts/pr-own-diff.sh <passed> <new>` output: <paste>; conflict fixes only in LESSONS/docs
- [ ] MERGE-6 true 2-parent merges, earlier QA'd head is an ancestor, no force-push: <cat-file / merge-base output>

### Tests
- [ ] TEST-1 full suite on head: <counts; skips explained>
- [ ] TEST-2 mutants killed for every new guard/fix: <mutant → failing test>
- [ ] TEST-3 rendered/behavioural test for UI show/hide/route: <test + killed mutant>

### Docs
- [ ] DOC-1 matching docs updated, or `docs: n/a - <why>`
- [ ] DOC-2 `docs/system-design/README.md` updated for flow/role/component/infra/auth change; diagrams render (<n>/<n>); unbuilt parts marked Planned: <lines>
- [ ] DOC-3 status only Live, Merged, not released or Planned (legend identical; no "In review"); no stale self-labels (this PR / once merged / when merged / once deployed / pending deploy …): <empty grep output + status-legend check>
- [ ] DOC-4 legal/privacy/terms claims true of live config for the serving env; `legal-claims.test.mjs` passes: <claim → file:line table>
- [ ] DOC-5 `node scripts/check-design-doc.mjs --base origin/main --head HEAD --body-file <body>` exit 0 (or a `Design doc: N/A — <reason>` line, only when no flow, role, component, infra or sign-in changed); whitespace-only doc edits don't satisfy it: <output>
- [ ] DOC-6 doc claims checked against current main merged with this head: <base sha, refs>

### UI (www)
- [ ] UI-1 390px + 1280px screenshots: <links>
- [ ] UI-2 homepage → sign-in and install in 1 tap, mobile + desktop: <screenshots>
- [ ] UI-3 every sponsor CTA → sign-in → sponsor home in ≤ 2 taps @390px: <table>
- [ ] UI-4 sponsors isolated (test + probe): <test, mutant>
- [ ] UI-5 one account holds user + sponsor roles: <steps/screenshots>
- [ ] UI-6 roles server-set only (test pins it): <test, mutant>
- [ ] UI-7 JS-off works where relevant: <evidence>
- [ ] UI-8 no dead ends or fake buttons: <link check>
- [ ] UI-9 no founder names or third-party platform/vendor names; `npm run check:copy` passes: <output>
- [ ] UI-10 one sign-in (`/login?as=sponsor`); flagged-off features hidden: <hrefs + flag value>

### CLI / agents
- [ ] CLI-1 fresh install from the exact release artefact: <version, sha256> → in vibead/vibead-ai: N/A unless apps/static-web/install or install.ps1 changes (then byte-identical to cli install/ + cli installer tests)
- [ ] CLI-2 `vibead enable` with no prompts apart from the one opt-in consent → in vibead/vibead-ai: N/A unless apps/static-web/install or install.ps1 changes (then byte-identical to cli install/ + cli installer tests)
- [ ] CLI-3 3+ turns each in claude, codex and opencode (before RC handoff: 5+ consecutive Claude status-line turns incl. one long turn with a background subagent, frame evidence, vibead/vibead#174) → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-4 gold [Ad] line visible on every turn while thinking (native line, not a pop-up): <screenshots> (incl. the Claude RC self-check frames, vibead/vibead#174) → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-5 ads rotate (ad per turn per agent): <table> → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-6 no harness/debug text or escape codes (`0;0m`, lone `1`), exit screens included: <grep output> → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-7 `vibead login` frictionless (no codes to copy) → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-8 `vibead disable` restores config hashes; no hooks or leftover dirs: <before/after sha256, ls> → in vibead/vibead-ai: N/A unless apps/static-web/install or install.ps1 changes (then byte-identical to cli install/ + cli installer tests)
- [ ] CLI-9 NO_COLOR=1 / TERM=dumb / VIBEAD_SHIMMER=0 give the plain static ad: <captures> → in vibead/vibead-ai: N/A — the CLI lives in vibead/vibead and vibead/cli
- [ ] CLI-10 revoked-key recovery is silent; queued impressions flush: <steps, masked prefixes> → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-11 screenshots attached: <links> → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-12 model inputs/outputs untouched; no prompts or code collected: <code lines, request fields> → in vibead/vibead-ai: N/A unless the API the CLI uses changes (get-ads, record-impressions, auth-api, install keys)
- [ ] CLI-13 hosted machine paused; test keys revoked: <hashes only> → in vibead/vibead-ai: applies whenever the evidence uses a hosted test machine
- [ ] CLI-14 installers: idempotent profile edit, `file://` fake-release tests: <tests> → in vibead/vibead-ai: N/A unless apps/static-web/install or install.ps1 changes (then byte-identical to cli install/ + cli installer tests)

### Safety / infra
- [ ] SAFE-1 explicit env guard; wrong/missing env refused: <code line + refusal output>
- [ ] SAFE-2 plans show 0 to destroy for every root/env; apply only after a clean plan: <plan lines, run url>
- [ ] SAFE-3 workflow-only change ran plan-only: <run url>
- [ ] SAFE-4 no secrets or partial secrets in output; sensitive values via `secrets.*`: <grep = 0 hits>
- [ ] SAFE-5 cost impact stated (above)
- [ ] SAFE-6 QA/test installs on the internal list (only exception: the one staging `billable_test` install, #230 A1): <hashes only>
- [ ] SAFE-7 per-env flag, default off; prod only via reviewed config + guard test: <flag, values, test>
- [ ] SAFE-8 `VIBEAD_AWS_*` → `AWS_*`, VibeAd account only, Terraform 1.10.5, ≥ US$20/month held for the Chief of Staff: <evidence>
- [ ] SAFE-9 the package builds and imports for every changed Lambda (the build.py zip, unpacked clean, handler imported): <build-and-import CI test on head + QA's import from each zip>

### Data / privacy
- [ ] DATA-1 retention/TTL proven and pinned by tests: <tests, mutants>
- [ ] DATA-2 revoke/delete purges and fails closed (proven on a QA install): <before/after reads, hash only>

### Money
- [ ] MONEY-1 billed-click reconciliation: sponsor debit = user credit + VibeAd share (micro-cent, rates read back at test time); 24 h duplicate unbilled both sides; dashboard and earnings = ledger sums; sponsor A never changes B: <reconcile output, hashes only> → in vibead/vibead-ai: applies to any change touching billing, clicks, the ledger, balances or earnings (functions/, earnings scripts)

### Release
- [ ] REL-1 fresh, never-used version: <release list + npm versions> → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-2 SHA256SUMS + Sigstore signature cover every artefact (kit + npm tgz): <verify output> → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-3 provenance from the named commit: <verify output> → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-4 prerelease until QA PASS → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-5 npm `latest` untouched: <dist-tags before/after> → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-6 `/install` with VIBEAD_VERSION verifies: <output> → in vibead/vibead-ai: N/A unless apps/static-web/install or install.ps1 changes (then byte-identical to cli install/ + cli installer tests)
- [ ] REL-7 npm via trusted publishing only, no npm token: <run url, provenance> → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-8 version agrees in package.json, releases.json, tag and /install manifest: <values> → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-9 installers read pinned install.json, never GitHub latest: <check:install-release output> → in vibead/vibead-ai: applies to every PR (`PR tests` runs it)
- [ ] REL-10 kit built with Node 22.19.0 builder: <manifest node field> → in vibead/vibead-ai: N/A — no versioned artefact here
- [ ] REL-11 shipped items swept from Merged, not released to Live in the release PR: <diff lines> → in vibead/vibead-ai: applies to the linked PR of a CLI release; a site item is Live only when deployed on www

### Bugs
- [ ] BUG-2 `Fixes #N` in body and commit
- [ ] BUG-3 root cause: <one line>; regression test: <name>
- [ ] BUG-4 recurring class → `lessons/` file + automated check + DoD line: <links>
- [ ] BUG-5 one `lessons/` file per QA FAIL; LESSONS.md takes no new lessons: <path>
- [ ] BUG-6 QA round n of 3 (escalate to the Chief of Staff after the third FAIL)
