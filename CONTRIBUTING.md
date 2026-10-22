# Contributing

## Definition of done

[`docs/quality/definition-of-done.md`](docs/quality/definition-of-done.md) is the one DoD for this repo, co-owned by QA and engineering: a change to it needs review from both. Its line IDs (MERGE, TEST, DOC, UI, CLI, SAFE, DATA, REL, BUG) are stable and shared with the other two VibeAd repos; lines that don't apply here are marked N/A in the file.

- The PR body opens with the spec (MERGE-7): the user outcome, the audiences affected (AI users, sponsors and advertisers of every kind of brand, admins) and acceptance criteria written as checks.
- Then it pastes the DoD block from [`.github/pull_request_template.md`](.github/pull_request_template.md), self-verified on the head handed to QA (MERGE-8), with every applicable line ticked with evidence and the rest `N/A - <reason>`.
- **A PR without the ticked checklist and evidence is a fast QA FAIL (`DoD-miss: MERGE-0`), with no full QA run.**
- Every QA FAIL gets a root cause, a regression test and one lesson file (BUG-3, BUG-5). At most 3 QA rounds, then escalate to the Chief of Staff with options (BUG-6).

## Feature flags

Features such as sign-in providers, house ads and test or QA clients must sit behind **per-environment config flags**, never hard-coded in the launchers or installers here.

- The npm launcher and the install scripts take options only from documented `VIBEAD_*` environment variables (see `install/README.md`), and each has a safe default.
- Test-only overrides, such as `VIBEAD_RELEASE_BASE` for a local mirror, must never change the default behaviour a user gets from the one-line install.
- Add a test for both the default and the flagged behaviour.

## Docs move with code

Docs stay in line with the code, features, issues and the business ([vibead-ai#143](https://github.com/vibead/vibead-ai/issues/143)).

- A PR that changes install, release channels, the npm launcher, flags or pricing updates every affected doc in the **same PR**: `README.md`, `BETA.md`, `install/README.md`, `npm/README.md`.
- It also updates the status (Live, Merged, not released or Planned; see DOC-3 in [`docs/quality/definition-of-done.md`](docs/quality/definition-of-done.md)) in vibead-ai [`docs/system-design/README.md`](https://github.com/vibead/vibead-ai/blob/main/docs/system-design/README.md), in a linked vibead-ai PR.
- If nothing user-visible changed (refactor, tests, CI), put a line `docs: n/a - <why>` in the PR body.
- The **Docs check** workflow (`.github/workflows/docs-check.yml`) enforces this. It's a path check only: code paths are listed in `.github/docs-check/config.json` (`install/`, `npm/`, `packaging/`, `.github/workflows/`), and test-only changes don't count. Editing the PR body re-runs it.
- **Design-doc gate:** a PR that changes how VibeAd is installed, released or launched updates [`docs/system-design/README.md`](docs/system-design/README.md) in the same PR (diagrams, unbuilt pieces marked planned) or says `Design doc: N/A — <reason>`; `scripts/check-design-doc.mjs` checks `install/`, `npm/`, `packaging/` and `.github/workflows/` (Markdown files there don't count), and an empty doc file doesn't satisfy it.

## Lessons

- Read [LESSONS.md](LESSONS.md) and [lessons/](lessons/) before changing code. New lessons go in `lessons/`, one file each (see [lessons/README.md](lessons/README.md)); LESSONS.md takes no new lines.
- The **Docs check** fails a PR that adds lines to LESSONS.md. PRs open before this rule are allowlisted in `.github/docs-check/config.json`. `LESSONS.md merge=union` in `.gitattributes` keeps both sides when you merge main locally.

## QA PASS carry-over

A QA PASS is for one head. It carries over to a new head only if all of these hold:

1. **(a)** the new head differs from the passed head only by merging main;
2. **(b)** `scripts/pr-own-diff.sh <passed> <new>` shows an identical own diff;
3. **(c)** any conflict resolution touched only LESSONS/docs files (LESSONS.md, `lessons/`, `docs/`), not code, tests, infra or workflows;
4. **(d)** PR tests are green on the new head.

When carrying over, post the `pr-own-diff.sh` output on the PR. Otherwise get a fresh QA PASS.

`scripts/pr-own-diff.sh` checks (a), (b) and (c) and exits non-zero if any fails. Run `git fetch origin` first; it compares against `origin/main` (set `BASE` to change that). The same script is in vibead/vibead-ai (tested there), vibead/vibead and vibead/cli.
