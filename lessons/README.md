# Lessons

One file per lesson, so PRs never edit a shared line and never conflict. Read these and [../LESSONS.md](../LESSONS.md) (older lessons) before changing related code.

- Name: `lessons/YYYY-MM-DD-<slug>.md`, for example `lessons/2026-10-22-install-never-latest.md`.
- Content: one line, or a short paragraph: the gotcha, what to do instead, and the issue or PR it came from.
- Don't add lines to LESSONS.md. The Docs check workflow fails a PR that does (`.github/docs-check/check-lessons.mjs`), except PRs that were already open when this started.
