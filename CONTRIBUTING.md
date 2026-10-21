# Contributing

## Feature flags

Features such as sign-in providers, house ads and test or QA clients must sit behind **per-environment config flags**, never hard-coded in the launchers or installers here.

- The npm launcher and the install scripts take options only from documented `VIBEAD_*` environment variables (see `install/README.md`), and each has a safe default.
- Test-only overrides, such as `VIBEAD_RELEASE_BASE` for a local mirror, must never change the default behaviour a user gets from the one-line install.
- Add a test for both the default and the flagged behaviour.

## Docs move with code

Docs stay in line with the code, features, issues and the business ([vibead-ai#143](https://github.com/vibead/vibead-ai/issues/143)).

- A PR that changes install, release channels, the npm launcher, flags or pricing updates every affected doc in the **same PR**: `README.md`, `BETA.md`, `install/README.md`, `npm/README.md`.
- It also updates the Live / In review / Planned status in vibead-ai [`docs/system-design/README.md`](https://github.com/vibead/vibead-ai/blob/main/docs/system-design/README.md), in a linked vibead-ai PR.
- If nothing user-visible changed (refactor, tests, CI), put a line `docs: n/a - <why>` in the PR body.
- The **Docs check** workflow (`.github/workflows/docs-check.yml`) enforces this. It's a path check only: code paths are listed in `.github/docs-check/config.json` (`install/`, `npm/`, `packaging/`, `.github/workflows/`), and test-only changes don't count. Editing the PR body re-runs it.

