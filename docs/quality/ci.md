# CI cost and quality gates

GitHub Actions for the vibead org has a US$50 monthly budget (set 2026-10-23, [vibead-ai#178](https://github.com/vibead/vibead-ai/issues/178)). These rules cut waste only. **No rule may weaken a quality gate: where a rule and a gate disagree, the gate wins.** The same rules apply in vibead-ai, vibead/vibead and vibead/cli; this file says how they apply in this repo.

## Rules

1. **Runners.** Pull-request workflows run on Linux only. macOS and Windows run only for release candidates: release tags, `workflow_dispatch`, and release or RC branches (`release/*`, the cli bump branches). Nothing that qualifies a release candidate is cut.
2. **Concurrency.** Every PR workflow uses `group: ${{ github.workflow }}-${{ github.ref }}` with cancel-in-progress for pull requests, so a newer push to the same PR cancels the older run. Pushes to `main` are never cancelled. Release, tag, deploy and QA-matrix workflows have a group without cancel: a second run queues behind the first.
3. **Docs-only PRs.** A PR whose changed files all end in `.md` still reports every check, under the same job name, so `gh pr checks` and MERGE-1/MERGE-2 stay readable. A first step diffs the PR merge commit against its base parent with `git diff --name-only --no-renames`, so a rename counts as a change to both its old and its new path, and skips the code suites only when every path ends in `.md`. A code or workflow file renamed to `.md`, or deleted beside an added `.md`, runs every suite. A change to a workflow, which is where the filter lives, runs every suite. Suites that read docs, the docs and design-doc checks, and the workflow lints still run. An empty or unreadable diff counts as code, so every suite runs. A repo with this lane pins it in `scripts/ci-docs-only.test.mjs`, which runs the workflow's own classifier against synthetic PR merge commits, renames and deletions included, and pins the lint steps. The *In vibead/<repo>* section below says whether the repo has the lane. This is the exact filter DoD MERGE-2 allows.
4. **Drafts.** `pull_request` types are `[opened, ready_for_review, synchronize, reopened]`, plus `edited` for the body checks, and jobs carry `if: github.event.pull_request.draft == false`. A draft shows the jobs as skipped. Marking it ready starts the full run, and **MERGE-1/MERGE-2 evidence comes from the ready_for_review run or a later one** (DoD MERGE-1, MERGE-2).
5. **Caches.** Dependency caches are used wherever a workflow installs dependencies: setup-node `npm`, setup-python `pip`, and a Terraform plugin cache (`actions/cache`, keyed on the `.terraform.lock.hcl` files).
6. **Artifacts.** `upload-artifact` retention is 3 days by default and 1 day for pure diagnostic or test logs. Release-candidate artifacts, and the reports that are an RC's QA evidence, keep their retention so they outlive the draft-to-publish and QA window.
7. **Timeouts.** Each job's `timeout-minutes` is about 2× its October p95. The floor is 3 minutes, because a 1-minute cap only causes flaky re-runs and every job bills at least one minute anyway. Release and publish jobs keep their caps, and a job that runs `terraform apply` gets GitHub's 360-minute maximum with small caps on its other steps, because a publish or an apply cut off half way is worse than the minutes it saves.

No self-hosted runners. Secrets and token permissions are unchanged.

## In vibead/cli

| Workflow / job | Before | After |
| --- | --- | --- |
| `installers.yml` / shellcheck + install.sh/install.ps1 + npm launcher (Linux) | Every PR event, drafts included, and push to `main` (paths). Group per PR, cancel. Timeout 10. | Non-draft PRs (opened, ready_for_review, synchronize, reopened) and push to `main` (paths unchanged). Cancel only for PRs. Timeout 3 (p95 0.4, max 0.6, floor 3). |
| `docs-check.yml` / Docs check (docs, design doc, LESSONS, DoD MERGE-0) | Two `ubuntu-latest` jobs (Docs updated, Design doc updated) on every PR event incl. `edited`, drafts included. Timeout 3. | **One** job on `ubuntu-slim` (US$0.002/min, so one billed slim minute per run instead of two at US$0.006; vibead-ai#293 (d)). Non-draft PRs (adds ready_for_review, keeps `edited` for body or base changes; title-only edits skip). Group per PR (`docs-check-<PR number>`), cancel. Timeout 3 (floor). Step order: full checkout, then the DoD block check (checker and PR template from the PR's **base** commit, sparse, no kept credentials, 1-minute step timeouts, run under `env -i` with the runner's own node) **before any step that runs PR code**, so nothing a PR writes to `$GITHUB_PATH`/`$GITHUB_ENV` reaches it (vibead-ai#293 (a)); then the docs self-test, Docs updated, LESSONS, design-doc self-test and Design doc updated steps, each run even after an earlier failure. |
| `release.yml` (check, sign, publish-release, npm, tap) | Dispatch only, Linux, group `release-<version>` without cancel. | Unchanged. Already Linux only, no cancel. Publish caps kept (rule 7). |
| `sign-release.yml` | Dispatch or called from release, group `sign-release-<tag>` without cancel. | Unchanged. |

No docs-only lane in `installers.yml`: a skipped job still bills its 1-minute minimum, the whole job takes under a minute, and its status-legend test reads `README.md`. So skipping would save nothing and drop a doc check.

npm cache: N/A. The installer job installs no npm dependencies (`node --test` only).

Artifacts: no workflow here uses `upload-artifact`. Release files go to the GitHub draft release and are untouched.

### Quality gates: still enforced, and when

| Gate | Workflow | Runs |
| --- | --- | --- |
| shellcheck, install.sh and install.ps1 tests, npm launcher tests, status-legend test | Installer tests | Every non-draft PR, docs-only included, and `main` pushes to the watched paths. |
| Docs updated, LESSONS check, Design doc updated (steps of the one Docs check job) | Docs check | Every non-draft PR event, including body edits and ready_for_review; title-only edits skip. |
| DoD block complete (MERGE-0): the body has the `## Definition of Done` block with every line ID in `.github/pull_request_template.md`, each ticked with evidence (a link, SHA, `#ref`, `code` span or a 3-word sentence beyond the template wording) or `N/A - <reason>` with a real reason (not `<…>`, pending, TBD, TODO), the template's own pre-filled `→ in <repo>: N/A — …` reason counting when the author ticks the line and keeps it; MERGE-0, MERGE-7 and SAFE-5, whose evidence the DoD defines as the PR body, need only the tick plus a `## Spec` section (MERGE-7) or a filled `Cost impact (SAFE-5):` line; `-`, `*` or `+` bullets, blockquotes and bold IDs are read, code fences are ignored except one opening right under a ticked line, which is that line's evidence (`gh pr checks` output), and a grouped line (`CLI-1 to CLI-12`) fails with "split per ID" (`.github/docs-check/check-dod.mjs`, tests in `check-dod.test.mjs` and `check-dod-workflow.test.mjs`, which the Docs check job runs; the step fails the job with one `DoD-miss: MERGE-0` annotation per bad line) | Docs check (its DoD steps, first after checkout) | Every non-draft PR open, push, reopen, body edit and ready_for_review. Drafts skip it, so a draft may hold pending lines; marking it ready runs it. It runs the base branch's checker, so a PR cannot loosen its own gate. Advisory like every check here: none is a required status, but a DoD miss turns the Docs check red. |
| Release check (draft tgz = `npm pack` at this commit), signing, `SHA256SUMS`, npm provenance publish | Release, Sign release | Every release dispatch (unchanged). |

There are no CodeQL, dependency-audit or mutation-test jobs in this repo's workflows.
