# Definition of done (vibead/cli: npm launcher, installers, release)

**Co-owned by engineering and QA.** A change to this file needs review from both an engineer and QA before it merges.

This is the standing checklist for every PR in this repo. The engineer ticks it, with evidence, in the PR body **before** handing off to QA. QA verifies against the same list, so a QA run confirms the work instead of discovering gaps. Goal: one QA cycle per PR.

Sister files: [vibead/vibead-ai](https://github.com/vibead/vibead-ai/blob/main/docs/quality/definition-of-done.md) (site, infra, auth) and [vibead/vibead](https://github.com/vibead/vibead/blob/main/docs/quality/definition-of-done.md) (launcher, kits, agent integrations).

Mark a line `N/A — <reason>` when it doesn't apply. An unticked line with no reason is not done.

## 1. Spec first

The PR body opens with these, written before any code:

- [ ] **User outcome:** what changes for the person installing or running VibeAd, in one or two sentences.
- [ ] **Audiences affected:** AI users on every supported agent (Claude Code, Codex, OpenCode) and every install channel (npm, `curl | sh`, `irm | iex`, Homebrew), sponsors and advertisers (every kind of brand, whose ads the launcher shows), admins. Say "none" for an audience explicitly.
- [ ] **Acceptance criteria written as checks** (`- [ ]` lines), including the standing checks below that apply.
- [ ] **Risks named:** anything touching the user's shell profile or agent config, signing, the published package, or third-party output.
- [ ] `Fixes #N` for every issue it closes, and the right epic in vibead/vibead-ai (#177 for releases) is linked.

## 2. Launcher and agent integrations (npm/, install/, packaging/)

Any change to what the launcher installs or runs needs a **real run on claude, codex AND opencode**, each over **3 or more turns**, from the packed tgz or the release archive (not the source tree), with screenshots or terminal recordings per agent:

- [ ] **Creatives rotate** across turns on every agent, the same way on each.
- [ ] The **gold `[Ad]` label** shows from the **first spinner frame** of turn 1 on every agent. Where an agent's UI can't show it (for example an OpenCode toast), the limit is documented honestly in `README.md` and `npm/README.md`.
- [ ] **No harness or debug text** in user-facing output; diagnostics only behind `--debug`.
- [ ] **No escape garbage** in the agent's screen.
- [ ] **Install, enable, disable and uninstall restore everything cleanly**: agent config and shell profiles back to their prior state, profile edits idempotent (marker block), no leftover folders.
- [ ] Sign-in is frictionless: the browser opens by itself where there is one; the device code flow stays for headless machines.
- [ ] **Never alter model inputs or outputs.** Never collect prompts, code or agent output.
- [ ] Installers are tested against `file://` fake releases in a temp HOME, never the real `~/.vibead` or the network.
- [ ] Hosted run kept brief and cost-aware; the test machine is paused afterwards and test install keys are revoked (list them).

## 3. Docs

- [ ] User docs (`README.md`, `BETA.md`, `install/README.md`, `npm/README.md`) are updated in the same PR. Otherwise the PR body has `docs: n/a - <why>` (the **Docs check** workflow enforces this).
- [ ] The system design is updated for any change to install channels, release, the launcher or sign-in, with mermaid diagrams and Live / Planned status: in this repo's `docs/system-design/README.md` where it exists, and in vibead-ai [`docs/system-design/README.md`](https://github.com/vibead/vibead-ai/blob/main/docs/system-design/README.md) (linked vibead-ai PR). Otherwise the PR body has `Design doc: N/A — <reason>`.
- [ ] Every claim is true of the shipped package and release. Current-state wording only: no "in review", "this PR", "once merged" or "once deployed" self-labels; write e.g. "merged, not released".
- [ ] Any QA FAIL fixed here has one new lesson file in `lessons/` (one file per lesson; LESSONS.md takes no new lines).

## 4. Safety

- [ ] Explicit environment guards: no script, test or workflow can send traffic, keys or impressions to the www stack by accident. **The dev environment serves www.vibead.ai to live users.** Test-only overrides such as `VIBEAD_RELEASE_BASE` never change what a default install does.
- [ ] Every `VIBEAD_*` option has a safe default and a test for both the default and the flagged behaviour.
- [ ] No secrets or partial secrets (install keys, tokens, `s=` values) in output, logs, commits or PR text. No npm token anywhere.
- [ ] **Cost impact stated** (for example hosted-run minutes, or "none").

## 5. Release

- [ ] A **fresh, never-used version string**: check tags, GitHub releases (including drafts and unpublished ones), the npm registry and any private kits. A version once used is never reused.
- [ ] `npm/package.json` version, `npm/releases.json` and the release tag agree, and `releases.json` has a SHA-256 for every platform archive.
- [ ] **Checksums and signatures cover every shipped artefact**: every kit archive AND the launcher tgz are in `SHA256SUMS`, signed by the **Sign release** workflow (cosign keyless, run from main) and verified as the installers verify.
- [ ] The installers read the pinned version from `https://www.vibead.ai/install.json`, never GitHub "latest"; the pinned release has `SHA256SUMS` and every archive.
- [ ] It's a **prerelease** (GitHub prerelease, npm `next` tag) **until QA PASS**; only then promote to `latest`.
- [ ] npm is published **only via trusted publishing** (GitHub OIDC), never with an npm token.

## 6. Self-verify before handoff

- [ ] The full checklist above and every acceptance criterion were run end to end by the engineer, including the real 3-agent run in section 2.
- [ ] Tests run and pasted (exit codes and counts), the same commands as the **Installer tests** workflow:
  - `node --test install/test/*.test.mjs` (needs `shellcheck`, `pwsh` and `script`; tests must not silently skip)
  - `cd npm && node --test`
  - `node --test .github/docs-check/*.test.mjs` when the docs gate changed
- [ ] Evidence pasted in the PR: test output, per-agent screenshots or recordings, `SHA256SUMS` listing and signature verification, and this checklist with each line ticked and proven.
- [ ] Hand off to QA only when you expect a PASS.

## 7. QA FAILs, retries and measurement

- [ ] Each QA FAIL gets a **root cause** (not just the symptom), a **regression test** and **one lessons file**.
- [ ] A bug class seen twice gets an automated check (a test, a lint or a CI gate) so it can't come back.
- [ ] At most **3 retries** per PR. After the third FAIL, escalate to the Chief of Staff with options and a recommendation.
- A QA PASS is for one head; a rebase never carries it over (see vibead-ai CONTRIBUTING.md, "QA PASS carry-over").
- The **first-pass QA rate** is tracked weekly by the Chief of Staff, with a target of **80% or more**. When it drops, find the missing standing check and add it here.

## PR evidence template

Copy this into the PR body, tick each line and add the evidence after it (or `N/A — <reason>`).

```markdown
## Spec
**User outcome:** 
**Audiences affected:** AI users (claude/codex/opencode; npm/curl/irm/brew): … · Sponsors/advertisers: … · Admins: …
**Acceptance criteria:**
- [ ] 
**Risks:** 
**Cost impact:** 

## Definition of done (docs/quality/definition-of-done.md)
- [ ] Real run from the packed tgz, 3+ turns each — claude: … · codex: … · opencode: …
  - [ ] creatives rotate · [ ] gold [Ad] from first spinner frame · [ ] no harness/debug text · [ ] no escape garbage · [ ] install/disable/uninstall restore cleanly, no leftovers
- [ ] No model input/output altered; no prompts or code collected — evidence:
- [ ] Docs: README/BETA/install/npm docs (or `docs: n/a - …`); system design + linked vibead-ai PR (or `Design doc: N/A — …`); current-state wording — evidence:
- [ ] Safety: env guard (nothing can target the www stack); no secrets or npm token; cost stated — evidence:
- [ ] Release: fresh version …; package.json/releases.json/tag agree; SHA256SUMS + signature cover kit AND launcher tgz; prerelease/next until QA PASS; trusted publishing only — evidence:
- [ ] Tests: `node --test install/test/*.test.mjs` …; `cd npm && node --test` … — output:
- [ ] Test keys revoked / hosted machine paused — list:
- [ ] QA FAIL follow-up (if any): root cause, regression test, lessons file — links:
- [ ] Retry count: n of 3
```
