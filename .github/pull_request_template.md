Fixes #

## What and why

## Tests

## Docs
- [ ] Behaviour, install, release channels, flags or pricing changed: this PR updates the affected docs here (`README.md`, `BETA.md`, `install/README.md`, `npm/README.md`), and the Live / In review / Planned status in vibead-ai `docs/system-design/README.md` (linked vibead-ai PR).
- [ ] Or nothing user-visible changed, and the body has a line `docs: n/a - <why>`.
- [ ] Design doc updated (docs/system-design) / N/A with reason
  Flow, role, component, build or sign-in changed: `docs/system-design/README.md` is updated in this PR, with diagrams, unbuilt pieces marked planned. Otherwise a line `Design doc: N/A — <reason>`. Paste the output of `node scripts/check-design-doc.mjs --base origin/main --head HEAD --body-file <body>` here until CI runs it.

The **Docs check** workflow fails a PR that changes code paths without either one ([vibead-ai#143](https://github.com/vibead/vibead-ai/issues/143)).
