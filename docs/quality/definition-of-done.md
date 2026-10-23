# Definition of Done (DoD): vibead/cli

Owners: VibeAd QA Tester and VibeAd Core Engineer (co-owned). **A change to this file needs review from both QA and the Engineer**, and is made in all three repos together.

One DoD with the same stable line IDs lives in [vibead/vibead-ai](https://github.com/vibead/vibead-ai/blob/main/docs/quality/definition-of-done.md), [vibead/vibead](https://github.com/vibead/vibead/blob/main/docs/quality/definition-of-done.md) and [vibead/cli](https://github.com/vibead/cli/blob/main/docs/quality/definition-of-done.md). This copy is for **vibead/cli** (npm launcher, installers and release). Lines that don't apply here are marked N/A (or conditional) under *In vibead/cli* with the reason, never deleted.

**How it works**
- The Engineer runs every applicable line **before handoff** and pastes the checklist from the PR template ([`.github/pull_request_template.md`](../../.github/pull_request_template.md)) into the PR body. Each line is ticked with its evidence (link, command output, screenshot, run URL) or marked `N/A - <reason>`.
- QA verifies against these same lines. A PR that arrives **without the ticked checklist and evidence is a fast FAIL** (`DoD-miss: MERGE-0`), and QA does not do a full run.
- Line IDs are stable. Never renumber a line. Retire it with ~~strikethrough~~ and add a new ID.
- The PR body **opens with the spec** (MERGE-7), and the Engineer **self-verifies** every applicable line before handoff (MERGE-8).
- A new standing check goes here first (QA + Engineer), then into the PR checklist.
- Keys, tokens and URLs in evidence: install keys masked to 6 characters (`vik_ab…`). No presigned or checkout URLs, no email codes, no tokens, and no secret values or partial secrets.

## This repo: vibead/cli

- **www.vibead.ai is served by the dev stack**, so a test run against dev is live traffic (SAFE-1, SAFE-6).
- **TEST-1:** `node --test install/test/*.test.mjs` (needs `shellcheck`, `pwsh` and `script`; a skip for a missing tool must be explained) and `cd npm && node --test`. Same commands as the **Installer tests** workflow.
- **CLI-1 to CLI-11:** run from the exact release artefact (the packed tgz or the release archive), never the source tree.
- **REL-2:** the **Sign release** workflow (run from main on a draft release) writes `SHA256SUMS` over the `vibead-beta-*` archives and signs it with cosign keyless. The npm tgz is not in that pattern, so REL-2 needs it added before it can pass.
- **DOC-1:** the **Docs check** workflow (`.github/docs-check/check-docs.mjs`, self-test `node --test .github/docs-check/*.test.mjs`); doc paths are `docs/`, `README.md`, `BETA.md`, `install/README.md`, `npm/README.md`.
- **DOC-2:** this repo has no `docs/system-design/`; the design doc is vibead-ai's, updated in a linked PR.
- **MERGE-5:** this repo has no `scripts/pr-own-diff.sh`; run vibead-ai's copy from this checkout (`bash <vibead-ai>/scripts/pr-own-diff.sh <passed> <new>`; it uses the current repo's git).
- **BUG-5:** this repo has no `lessons/` folder, `.gitattributes` or `check-lessons.mjs` on main; they are Planned in [cli#31](https://github.com/vibead/cli/pull/31). Until then the first lesson creates `lessons/`, following vibead-ai's [lessons/README.md](https://github.com/vibead/vibead-ai/blob/main/lessons/README.md).
- **DOC-3 status legend:** `node --test .github/docs-check/status-legend.test.mjs` checks the legend in this file against the pinned SHA-256 shared by all three repos (this repo has no `docs/system-design/README.md`).
- **MERGE-1 / MERGE-2:** this repo has no `PR tests` check. Its test check is **Installer tests** (`.github/workflows/installers.yml`). There is no branch protection on `main`, so no check is required by GitHub. Since [cli#36](https://github.com/vibead/cli/issues/36) Installer tests runs on every non-draft PR (`opened`, `ready_for_review`, `synchronize`, `reopened`) with no path filter and no docs-only skip, so it is never path-skipped on a PR; draft PRs skip the job, and only pushes to `main` are path-filtered (`install/**`, `npm/**`, `README.md`, `.github/workflows/**`). MERGE-1 is the green Installer tests run on the exact head from the `ready_for_review` run or a later one, and MERGE-2 also needs both **Docs check** jobs (`Docs updated (or 'docs: n/a')` and `Design doc updated (or 'Design doc: N/A — <reason>')`) green in that run (`docs/quality/ci.md`).
- **CLI-2:** `install/install.sh` and `install.ps1` ask "Add <dir> to your PATH …? [Y/n]" when the bin directory isn't on PATH; that question fails CLI-2 until it is removed.

---

## MERGE: merge gate

- **MERGE-0** The PR body has this DoD checklist, every applicable line ticked with evidence, and the others marked `N/A - <reason>`.
  *Evidence:* the PR body itself.
- **MERGE-1** The required `PR tests` check is green on the **exact head SHA** being handed off, in the run fired by `ready_for_review` or a later one. A run from while the PR was a draft is not evidence.
  *Evidence:* run URL plus the SHA it ran on (`gh pr checks <n>` output), from the ready_for_review run or a later one.
- **MERGE-2** Every required check actually **ran** on the head and its run is green, in the ready_for_review run or a later one. No required check is skipped by a path filter, with one exception: a docs-only lane may skip code suites inside a check that still reports, only when its filter is exact. Exact means every changed path ends in `.md`, a rename counts as a change to both its old and its new path (`git diff --no-renames`), an empty or unreadable diff counts as code, a change to a workflow or to the filter runs everything, and a test with rename cases pins the filter (`docs/quality/ci.md` rule 3).
  *Evidence:* the `gh pr checks <n>` list, which shows no required check as missing, skipped or expected, from the ready_for_review run or a later one; for a docs-only PR, also the run's "Docs-only PR" step summary.
- **MERGE-3** The head merges cleanly with **current main**, and the full test suite passes on that merge result, not only on the PR's base.
  *Evidence:* `git merge-tree --write-tree origin/main <head>` (clean) plus the suite summary on a local merge.
- **MERGE-4** Merging needs `QA PASS @<head sha>` posted on that exact head. A merge without it is not allowed.
  *Evidence:* the QA comment URL (QA posts it).
- **MERGE-5** Carry-over of an earlier PASS is allowed **only** when all of these hold:
  - the new head is a merge-only head;
  - `scripts/pr-own-diff.sh <passed-sha> <new-sha>` reports an identical own diff, with its output posted in the PR;
  - any conflict resolution touched only `LESSONS.md` or `lessons/` and docs.

  Otherwise a fresh QA run is needed.
  *Evidence:* the pasted `pr-own-diff.sh` output plus `git show --stat <merge>` of the resolution.
- **MERGE-6** History is true merges only.
  - Main is merged in with 2-parent merges (`git cat-file -p <merge>` shows two `parent` lines).
  - The previously QA'd head is an ancestor of the new head (`git merge-base --is-ancestor <qa-sha> <head>`).
  - There is no force-push and no rebase of a head QA has seen.

  *Evidence:* the `cat-file` and `merge-base` output, or "no earlier QA'd head".
- **MERGE-7** **Spec first.** The PR body **opens** with a spec written before any code:
  - the user outcome, in one or two sentences;
  - the audiences affected, each named or marked "none": AI users (every supported agent and install channel), sponsors and advertisers (brands of every kind), admins;
  - acceptance criteria written as `- [ ]` checks, including the DoD lines that apply;
  - the risks: anything touching www.vibead.ai, money, sign-in, data retention or third-party output.

  Every entry point of one flow ships in the same PR, so QA doesn't find the missing half.
  *Evidence:* the top of the PR body.
- **MERGE-8** **Self-verified before handoff.** The Engineer ran every applicable line and every acceptance criterion end to end, in the real environment where possible, on the head handed to QA. Hand off only when you expect a PASS: QA is verification, not discovery.
  *Evidence:* the ticked checklist (MERGE-0) and the head SHA it was run on.
- **MERGE-9** A PR that changes this file lists, for each new or edited line, every existing line it overlaps or contradicts, and resolves each one by amending or retiring the older line (IDs stay stable). The text stays byte-identical in the three repos; only the *In vibead/<repo>* notes and the "This repo" section differ.
  *Evidence:* the overlap list in the PR body, plus a diff of the three copies with the per-repo lines stripped, which must be empty.

## TEST: tests that really guard the change

- **TEST-1** The full suite passes on the head: `npm run test:all` or the repo equivalent (node, Python suites, every touched Terraform root's `terraform test`).
  *Evidence:* the pass/fail/skip counts, with every skip explained.
- **TEST-2** Every new guard, fix or invariant has a test that **fails when the code is reverted or mutated**, and none of the listed mutants survives. That includes switch branches like `"none"`, retry bounds, flags read ungated, and allowlists that may only shrink.
  *Evidence:* the mutant list with killed/survived for each and the failing test name.
- **TEST-3** A rendered or behavioural test, not only a static string check, for anything that hides, shows or routes user-facing UI.
  *Evidence:* the test name and a mutant it kills.

## DOC: docs and design

- **DOC-1** Matching doc updates are in the same PR (READMEs, `docs/`, `infra/*/README.md`, `functions/*/README.md`, `distribution/public/`, BETA/install docs), or the body has an explicit `docs: n/a - <why>`.
  *Evidence:* the list of doc files changed, or the `docs: n/a` line.
- **DOC-2** Any change to a flow, role, component, infra or auth updates vibead-ai `docs/system-design/README.md` in the same PR, or in a linked vibead-ai PR for vibead and cli. The update includes:
  - the diagrams for the change, which must render (Mermaid);
  - anything not built yet marked **Planned**.

  *Evidence:* the README diff lines plus a render check (the diagram count that renders, e.g. "7/7 diagrams render").
- **DOC-3** There are no self-referential labels that go stale on merge, such as "In review", "this PR", "in this PR", "applies once deployed", "once deployed", "once merged", "when merged", "once this lands", "pending merge", "pending deploy" or "after this merges". There are exactly **three statuses**, defined by the status legend below, which is byte-identical in every copy of this file and in every `docs/system-design/README.md`. "In review" is not a status; an open PR is Planned. The design doc must also describe current main correctly after this PR merges, not before.
  *Evidence:* the output of this command, run from any directory in the repo, which must be empty (this file and the PR template are excluded because they quote the banned labels):
  `git diff origin/main...HEAD -- ':(top)*.md' ':(top,exclude)docs/quality/definition-of-done.md' ':(top,exclude).github/pull_request_template.md' | grep -inE '^\+.*(in review|\bthis pr\b|once deployed|once merged|when merged|once this (lands|merges)|applies once|pending merge|pending deploy|after this merges)'`,
  plus the status-legend check passing (see "This repo").

**Status legend** (DOC-3). Copied byte for byte into every copy of this file and every `docs/system-design/README.md`; the status-legend check compares the text between the markers against one pinned SHA-256.

<!-- status-legend:start -->
- **Live**: what a real user gets by default. Site: deployed on www.vibead.ai. CLI: served by npm `latest`, the curl `/install` pin AND Homebrew.
- **Merged, not released**: on `main`, not Live yet. A GitHub pre-release (an RC such as v0.1.0-beta.27) is in this status, optionally with a note naming the RC tag, e.g. "Merged, not released (pre-release v0.1.0-beta.27)".
- **Planned**: tracked in an issue, or in an open pull request that isn't merged. Not on `main`. In diagrams, planned pieces are dashed.

These are the only three statuses.
<!-- status-legend:end -->

- **DOC-4** Legal, privacy and terms claims are true of the **running code and live config for the env that serves the page**. www.vibead.ai is served by the dev stack. This covers sign-in methods, which emails are sent, retention and TTL, data collected, and payment and earnings statements. `scripts/legal-claims.test.mjs` passes, and `scripts/data/legal-claims-pending.json` is updated when needed.
  *In vibead/cli:* N/A unless the PR changes what is collected or sent: legal pages live in vibead-ai; if the PR changes what the launcher collects or sends, the legal update is a linked vibead-ai PR and this line applies there.
  *Evidence:* a claim → code/tfvars file:line table plus the test output.
- **DOC-5** The design-doc gate (`scripts/check-design-doc.mjs`) passes on the head, and the PR does not weaken it.
  - Its watched paths cover every component the PR touches: workflows, packaging, scripts and new top-level dirs.
  - Whitespace-only, blank-line, rename-only and delete-only doc edits, empty `.md` files and non-`.md` files do **not** satisfy it.

  *In vibead/cli:* N/A — `scripts/check-design-doc.mjs` isn't in this repo; the Docs check (DOC-1) is the automated gate here and DOC-2 is checked by hand.
  *Evidence:* the gate exit code on the head, plus, if the gate changed, `node --test scripts/check-design-doc.test.mjs` and a whitespace-only mutant → exit 1.
- **DOC-6** Every factual claim in the changed docs, including claims about other PRs or main, is checked against **current main merged with this head**, not against a stale base.
  *Evidence:* file:line references for each claim, plus the base SHA used.

## UI: web (www.vibead.ai)

- **UI-1** Works at **390px and 1280px**: no hidden, overlapped or clipped controls, and no horizontal scroll.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* screenshots at both widths of every changed page.
- **UI-2** A new visitor reaches **sign-in and install in one tap** from the www.vibead.ai homepage, on both mobile (390px) and desktop.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* a screenshot for each width, with the tap target named.
- **UI-3** **Every** sponsor CTA reaches sign-in and then a sponsor home in **≤ 2 taps at 390px**.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* a table of CTA → taps → landing URL, with screenshots.
- **UI-4** Multiple sponsors are isolated. Sponsor A cannot read or change sponsor B's data or ads. A test pins this.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* the test name, a killed mutant, and a two-account probe.
- **UI-5** One account can hold both the **user and sponsor** roles, and switching roles needs no second account.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* the steps and screenshots for one account in both homes.
- **UI-6** Roles are **set on the server only**. A client-sent role or field is ignored, and a test pins this.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* the test name plus a mutant (trusting the client role) that it kills.
- **UI-7** Pages work with **JS off** where relevant: sign-in links, install instructions and legal pages.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* a JS-off screenshot or a curl of the HTML showing the links.
- **UI-8** There are no dead ends or fake buttons. Every link and button on changed pages resolves (no 404, no no-op), and every error state offers a way forward.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* a link-check output plus a list of clicked controls.
- **UI-9** Public pages name no founders and no third-party platform or vendor names. The supported agents (Claude Code, Codex, OpenCode) may be named where a user needs them, such as install instructions. Copy speaks to all AI users and to advertisers of every kind of brand. `npm run check:copy` passes.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* the `check:copy` output.
- **UI-10** One sign-in for users and sponsors: every sponsor entry point uses the shared `/login?as=sponsor`, never a separate sponsor sign-in. A feature switched off by a per-env flag is hidden on that env, not shown broken.
  *In vibead/cli:* N/A — no web pages here; the site is vibead/vibead-ai.
  *Evidence:* the CTA hrefs, plus the flag value for the env that serves the page.

## CLI: CLI and agent integrations (release candidates and any CLI change that affects output)

Run this on a clean Linux cloud test machine with a fresh `$HOME`. **Any user friction is a FAIL.**

- **CLI-1** Fresh install from the **exact release artefact** (the version and checksum handed to QA), not a local build.
  *Evidence:* the install command, `vibead --version`, and the artefact sha256 matching `SHA256SUMS`.
- **CLI-2** `vibead enable` succeeds with no prompts or manual steps, apart from the one opt-in consent below.
  *Consent exemption (Chief of Staff (Nina)):* exactly one explicit opt-in consent at enable time is allowed, because sponsored placements are opt-in: one screen that lists every change and one yes/no question, default no, with `--yes` to accept it non-interactively. Anything else fails CLI-2: a second question, an installer PATH question, an agent's hook-trust or folder-trust dialog, or any step the user has to do by hand.
  *Evidence:* the terminal output.
- **CLI-3** **3+ turns in each of claude, codex and opencode.**
  *RC handoff self-check ([vibead/vibead#174](https://github.com/vibead/vibead/issues/174)):* before any RC is handed to QA, the Engineer runs **5+ consecutive Claude turns through the status line**, including **one long turn with a background subagent**, and attaches frame evidence: captured frames showing the `[Ad]` line throughout every turn, the long subagent turn included. Without it the RC handoff fails CLI-3 and CLI-4.
  *Evidence:* a turn log for each agent.
- **CLI-4** The **gold `[Ad]` line** is visible while thinking on **every turn** in every agent, from the first moment of turn 1. It is the native gold line, not a pop-up, "Sponsored" box or other substitute.
  *opencode:* the toast is pending [vibead#141](https://github.com/vibead/vibead/issues/141). Nina's ruling sets the order of preference: the native gold line, else a plain native status line shown for at least 3 s, else a documented toast exception. Until #141 is closed, record CLI-4 for opencode as FAIL (pending vibead#141), not as a new bug.
  *RC handoff:* the CLI-3 Claude self-check (5+ consecutive status-line turns, one long turn with a background subagent, frame evidence; [vibead/vibead#174](https://github.com/vibead/vibead/issues/174)) is also CLI-4 evidence: every frame shows the `[Ad]` line.
  *Evidence:* a screenshot of each turn for each agent.
- **CLI-5** Ads **rotate** across turns in every agent wherever multiple creatives are eligible.
  *Evidence:* the ad id or text for each turn and agent (must differ).
- **CLI-6** No harness, debug or test text appears in user-facing output, including on agent exit. Examples are hook-trust prompts and "results report" lines. There are also no escape-code fragments such as `0;0m` or a lone `1`.
  *Evidence:* a scrollback capture plus `grep -nE '0;0m|^1$|\x1b\[' <capture>` that comes back empty, with each agent's exit screen included.
- **CLI-7** `vibead login` is frictionless: the browser opens or the URL is printed, and there are no codes to copy or paste.
  *Evidence:* the terminal output plus a screenshot.
- **CLI-8** `vibead disable` restores each agent's config to its **pre-enable hash**. It leaves no hooks and no leftover dirs, such as `~/.vibead-beta`.
  *Evidence:* sha256 of the configs before enable and after disable (equal) plus `ls -la ~ | grep -i vibead` coming back empty.
- **CLI-9** `NO_COLOR=1`, `TERM=dumb` and `VIBEAD_SHIMMER=0` each give the plain static ad, with no colour codes or animation.
  *Evidence:* the capture for each variable.
- **CLI-10** A revoked key recovers silently. A new key is issued, and queued impressions flush under it. The user sees no error and does nothing.
  *Evidence:* the steps, plus key prefixes masked to 6 characters.
- **CLI-11** The screenshots for CLI-3 to CLI-9 are attached to the PR or release issue. A run without screenshots is not evidence.
  *Evidence:* the links.
- **CLI-12** VibeAd never alters model inputs or outputs, and never collects prompts, code or agent output. Hooks and plugins print nothing that reaches the model; the only data sent is what the privacy page lists.
  *Evidence:* the hook/plugin code lines, plus the fields of one captured request (keys masked).
- **CLI-13** Hosted test runs are brief and cost-aware. The cloud test machine is paused afterwards, and every install key the run issued is revoked.
  *Evidence:* the machine state after the run, plus the revoked install hashes (hashes only, never keys).
- **CLI-14** Installers (`curl | sh`, `irm | iex`, the npm launcher) edit shell profiles idempotently (one marker-delimited block) and are tested against `file://` fake releases in a temp `$HOME`, never the real `~/.vibead` or the network.
  *Evidence:* the test names, plus a second install run showing no second profile edit.

## SAFE: safety and infra

- **SAFE-1** No script can target prod or another env by accident. It needs an **explicit environment guard**, an `--env` argument that must match the account and stack, and that refuses prod unless explicitly confirmed. A delete guard alone is not enough.
  *Evidence:* the guard code line plus the output of a run with the wrong or missing env, showing the refusal.
- **SAFE-2** Terraform plans show **0 to destroy**, and apply happens only after a clean plan is reviewed.
  *In vibead/cli:* N/A — no Terraform here.
  *Evidence:* the `Plan: X to add, Y to change, 0 to destroy` line for every root and env, plus the deploy run URL.
- **SAFE-3** Changes to workflows only (`.github/workflows/`, `.github/actions/`) run **plan-only** and never apply.
  *In vibead/cli:* N/A — workflows here test and sign releases; none applies infra.
  *Evidence:* a run URL showing plan-only.
- **SAFE-4** No secrets or partial secrets appear in logs, CI output or the PR.
  - Sensitive values come from `secrets.*`, never `vars.*`; for example, `INTERNAL_INSTALL_HASHES` must be a secret.
  - Install keys are masked to 6 characters.

  *Evidence:* a grep of the CI logs and plan for the values (0 hits), plus the plan showing `(sensitive value)`.
- **SAFE-5** The cost impact is stated: new resources, expected monthly cost, or "none".
  *Evidence:* one line in the PR body.
- **SAFE-6** Every QA or test install used is on the **internal install list**, so it is never billed or credited, **except the one billable test install on staging, flagged `billable_test` and refused outside staging (design vibead/vibead-ai#230 A1), whose spend is tagged `billable_test` and reported separately** (it is what MONEY-1 reconciles against).
  *Evidence:* install hashes, never keys, plus confirmation that they are on the list; for the billable test install, its hash prefix, the `billable_test` flag read back on staging, and the separately reported spend.
- **SAFE-7** Features ship behind **per-env flags** that default off. Prod changes only through reviewed config (tfvars or server config) with a guard test. Test-only clients and QA allowlists can't be enabled from prod config at all.
  *Evidence:* the flag declaration, its value per env, and the guard test name.
- **SAFE-8** AWS commands map `VIBEAD_AWS_*` to `AWS_*` per command and use only the VibeAd account, never another profile. Terraform is 1.10.5. Any change costing US$20/month or more is held for the Chief of Staff before apply.
  *In vibead/cli:* N/A — no AWS commands or Terraform here.
  *Evidence:* the command lines (no values), `terraform version`, and the SAFE-5 cost line.
- **SAFE-9** **The package builds and imports for every changed Lambda.** For each Lambda whose code, imports or shared modules changed, the deploy artifact (the zip `build.py` produces, not the source tree) is built, unpacked into a clean directory, and its handler module is imported with only the runtime's Python and the packaged dependencies. Every module the handler imports (including new shared files such as `dashboard*.py`) must be in the zip. A CI test does this build-and-import for every Lambda in the repo.
  *Evidence:* the build-and-import test name and its CI run on the head, plus a QA-run `python -c 'import <handler>'` from each unpacked zip (added Oct 23 2026 after the #233 outage: auth-api returned 500 "No module named dashboard" because build.py omitted the new file).
  *In vibead/cli:* N/A — no Lambda functions or `build.py` packages here.

## DATA: data and privacy

- **DATA-1** Retention and TTL behaviour is proven and pinned by tests. For example, running totals survive TTL sweeps, and event rows expire as documented.
  *In vibead/cli:* N/A — retention and TTL live in vibead-ai.
  *Evidence:* the test names, killed mutants, and the TTL attribute and config line.
- **DATA-2** Key revocation and account deletion **purge** the install's data and fail closed: if a step fails, the account is kept and a `503` is returned. This is proven on one QA install (seed → revoke or delete → read shows the data purged) and pinned by tests.
  *In vibead/cli:* N/A — the server-side purge lives in vibead-ai; the client side is CLI-10.
  *Evidence:* the before and after reads (hash only) plus the test names.

## MONEY: billing, ledger and earnings

- MONEY-1: Any change touching billing, clicks, the ledger, balances or earnings includes a reconciliation check with evidence: for every billed click, sponsor debit = user credit + VibeAd share to the micro-cent at the rates read back at test time; a duplicate within 24 h is unbilled on both sides; each sponsor's dashboard balance = its ledger sum; each user's earnings page = their ledger sum; a click on sponsor A's ad never changes sponsor B.
  *In vibead/cli:* N/A unless the change affects how the launcher or installers request ads, open click links or report impressions; billing and the ledger live in vibead-ai.

## REL: release

- **REL-1** The version string is **fresh and never used** before, in GitHub releases, the npm registry or `releases.json`.
  *Evidence:* `gh release list` plus `npm view vibead versions --json` showing it is absent before publishing.
- **REL-2** `SHA256SUMS` and the Sigstore signature (`SHA256SUMS.sigstore.json`) cover **every** shipped artefact, including the kit and the npm tgz.
  *Evidence:* `sha256sum -c` output plus the signature verify output, with the list of artefacts.
- **REL-3** Provenance points to the **named commit** and workflow.
  *Evidence:* the attestation or provenance verify output showing the SHA.
- **REL-4** It stays a **prerelease** until QA PASS.
  *Evidence:* the `gh release view <tag> --json isPrerelease` output.
- **REL-5** npm `latest` is **untouched** before approval, and the RC is published only under a non-latest tag.
  *Evidence:* `npm view vibead dist-tags` before and after.
- **REL-6** `/install` with `VIBEAD_VERSION=<rc>` and signature checking required installs and verifies.
  *Evidence:* the terminal output.
- **REL-7** npm is published **only via trusted publishing** (GitHub OIDC). No npm token is created, stored or used anywhere.
  *Evidence:* the publish run URL plus the registry's provenance for the version.
- **REL-8** The version agrees everywhere it appears: `npm/package.json`, `npm/releases.json` (with a SHA-256 for every platform archive), the git tag and the `/install` manifest.
  *Evidence:* the four values side by side.
- **REL-9** Installers read the pinned version from `https://www.vibead.ai/install.json`, never GitHub "latest", and the pinned release has `SHA256SUMS` and every archive.
  *Evidence:* the vibead-ai `npm run check:install-release` output.
- **REL-10** Kits are built with the qualified Node 22.19.0 builder (`distribution/build-beta.mjs`).
  *In vibead/cli:* N/A — kits are built in vibead/vibead.
  *Evidence:* the `node` field of the kit's `manifest.json`.
- **REL-11** Each release sweeps the status labels in the same release PR (or its linked vibead-ai PR): every item the release ships moves from **Merged, not released** to **Live** in `docs/system-design/README.md` and the other docs.
  *Evidence:* the diff lines moving each shipped item to Live, plus `git grep -n 'Merged, not released'` afterwards listing only items not in the release.

## BUG: bugs and learning

- **BUG-1** Every QA FAIL has its own GitHub issue, which QA files after a duplicate check.
  *Evidence:* the issue link in the QA comment.
- **BUG-2** Every fix references its issue with `Fixes #N` in the PR body and the commit.
  *Evidence:* the PR body plus `git log --format=%B`.
- **BUG-3** Every fix names its root cause and adds a regression test (see TEST-2).
  *Evidence:* a one-line root cause plus the test name.
- **BUG-4** A defect class seen **twice** gets a lesson file in `lessons/` (BUG-5), an **automated check** (test, lint or gate), and a new or updated DoD line here.
  *Evidence:* the lesson file, the check, and the DoD line ID.
- **BUG-5** Every QA FAIL, even a first one, gets **one new file** in `lessons/` (`lessons/YYYY-MM-DD-<slug>.md`: the gotcha, what to do instead, the issue). `LESSONS.md` stays as the index of older lessons, kept with `merge=union` in `.gitattributes`, and takes no new lessons (`.github/docs-check/check-lessons.mjs`).
  *Evidence:* the lesson file path.
- **BUG-6** At most **3 QA rounds** per PR. After a third FAIL the Engineer escalates to the Chief of Staff with options and a recommendation instead of a fourth handoff.
  *Evidence:* the round number in the QA verdict, plus the escalation message.

---

## QA verdict format

QA posts one comment per head:

```
QA PASS|FAIL @<head sha>   (round N; fresh | carry-over via MERGE-5)

| DoD line | Result | Evidence |
|----------|--------|----------|
| MERGE-1  | PASS   | run <url> on <sha> |
| DOC-3    | FAIL   | README.md:L120 "In review" → #NNN |
| UI-7     | N/A    | no page change |

FAILs:
- #NNN <title>: DoD-miss: DOC-3
- #MMM <title>: DoD-gap: proposed UI-9 "<new line text>"
```

- A verdict is given for **each applicable DoD line**: PASS, FAIL or N/A with a reason.
- Every FAIL links its issue (BUG-1) and carries exactly one tag:
  - **`DoD-miss: <line id>`**: a line existed and should have caught the problem before handoff.
  - **`DoD-gap`**: no line covers it. QA proposes the new line text, and QA and the Engineer add it here.
- Missing checklist or evidence: `QA FAIL @<sha>: DoD-miss: MERGE-0`, with no full run.
- QA logs every verdict in its verdict log (date, repo, PR, SHA, round, verdict, first_pass, dod_tag, comment URL). Each Friday the **first-pass PASS rate** is reported: the share of PRs whose first QA verdict was PASS. The target is ≥ 80%.
