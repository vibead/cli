Fixes #

## What and why

## Tests

## Docs
- [ ] Behaviour, install, release channels, flags or pricing changed: this PR updates the affected docs here (`README.md`, `BETA.md`, `install/README.md`, `npm/README.md`), and the Live / In review / Planned status in vibead-ai `docs/system-design/README.md` (linked vibead-ai PR).
- [ ] Or nothing user-visible changed, and the body has a line `docs: n/a - <why>`.

The **Docs check** workflow fails a PR that changes code paths without either one ([vibead-ai#143](https://github.com/vibead/vibead-ai/issues/143)).

## QA
- [ ] QA PASS on the current head, or a carry-over: the head only merged main, `scripts/pr-own-diff.sh <passed> <new>` passes and its output is posted here, and PR tests are green (CONTRIBUTING.md, "QA PASS carry-over").
