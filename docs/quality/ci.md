# CI cost and quality gates

GitHub Actions for the vibead org has a US$50 monthly budget (set 2026-10-23, [vibead-ai#178](https://github.com/vibead/vibead-ai/issues/178)). These rules cut waste only. **No rule may weaken a quality gate: where a rule and a gate disagree, the gate wins.** The same rules apply in vibead-ai, vibead/vibead and vibead/cli; this file says how they apply in this repo.

## Rules

1. **Runners.** Pull-request workflows run on Linux only. macOS and Windows run only for release candidates: release tags, `workflow_dispatch`, and release or RC branches (`release/*`, the cli bump branches). Nothing that qualifies a release candidate is cut.
2. **Concurrency.** Every PR workflow uses `group: ${{ github.workflow }}-${{ github.ref }}` with cancel-in-progress for pull requests, so a newer push to the same PR cancels the older run. Pushes to `main` are never cancelled. Release, tag, deploy and QA-matrix workflows have a group without cancel: a second run queues behind the first.
3. **Docs-only PRs.** A PR whose changed files all end in `.md` still reports every check, under the same job name, so `gh pr checks` and MERGE-1/MERGE-2 stay readable. A first step diffs the PR merge commit against its base parent and skips the code suites. Suites that read docs, the docs and design-doc checks, and the workflow lints still run. An empty or unreadable diff counts as code, so every suite runs. (In vibead-ai and vibead, `scripts/ci-docs-only.test.mjs` pins this; cli has no docs-only lane.)
4. **Drafts.** `pull_request` types are `[opened, ready_for_review, synchronize, reopened]`, plus `edited` for the body checks, and jobs carry `if: github.event.pull_request.draft == false`. A draft shows the jobs as skipped. Marking it ready starts the full run, and **MERGE-1/MERGE-2 evidence comes from a run on or after ready_for_review**.
5. **Caches.** Dependency caches are used wherever a workflow installs dependencies: setup-node `npm`, setup-python `pip`, and a Terraform plugin cache (`actions/cache`, keyed on the `.terraform.lock.hcl` files).
6. **Artifacts.** `upload-artifact` retention is 3 days by default and 1 day for pure diagnostic or test logs. Release-candidate artifacts, and the reports that are an RC's QA evidence, keep their retention so they outlive the draft-to-publish and QA window.
7. **Timeouts.** Each job's `timeout-minutes` is about 2× its October p95. The floor is 3 minutes, because a 1-minute cap only causes flaky re-runs and every job bills at least one minute anyway. Release and publish jobs keep their caps, because a publish cut off half way is worse than the minutes it saves.

No self-hosted runners. Secrets and token permissions are unchanged.

## In vibead/cli

| Workflow / job | Before | After |
| --- | --- | --- |
| `installers.yml` / shellcheck + install.sh/install.ps1 + npm launcher (Linux) | Every PR event, drafts included, and push to `main` (paths). Group per PR, cancel. Timeout 10. | Non-draft PRs (opened, ready_for_review, synchronize, reopened) and push to `main` (paths unchanged). Cancel only for PRs. Timeout 3 (p95 0.4, max 0.6, floor 3). |
| `docs-check.yml` / Docs updated, Design doc updated | Every PR event incl. `edited`, drafts included. Timeout 3. | Non-draft PRs (adds ready_for_review, keeps `edited`). Timeout 3 (floor). |
| `release.yml` (check, sign, publish-release, npm, tap) | Dispatch only, Linux, group `release-<version>` without cancel. | Unchanged. Already Linux only, no cancel. Publish caps kept (rule 7). |
| `sign-release.yml` | Dispatch or called from release, group `sign-release-<tag>` without cancel. | Unchanged. |

No docs-only lane in `installers.yml`: a skipped job still bills its 1-minute minimum, the whole job takes under a minute, and its status-legend test reads `README.md`. So skipping would save nothing and drop a doc check.

npm cache: N/A. The installer job installs no npm dependencies (`node --test` only).

Artifacts: no workflow here uses `upload-artifact`. Release files go to the GitHub draft release and are untouched.

### Quality gates: still enforced, and when

| Gate | Workflow | Runs |
| --- | --- | --- |
| shellcheck, install.sh and install.ps1 tests, npm launcher tests, status-legend test | Installer tests | Every non-draft PR, docs-only included, and `main` pushes to the watched paths. |
| Docs updated, LESSONS check, Design doc updated | Docs check | Every non-draft PR event, including body edits and ready_for_review. |
| Release check (draft tgz = `npm pack` at this commit), signing, `SHA256SUMS`, npm provenance publish | Release, Sign release | Every release dispatch (unchanged). |

There are no CodeQL, dependency-audit or mutation-test jobs in this repo's workflows.
