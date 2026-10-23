Real PR bodies (from `gh pr view --json body`, 2026-10-23 AEDT) and the PR
templates they were written against, used by `check-dod.test.mjs` as
regression fixtures for checker false fails (vibead/vibead-ai#293 (b)):
vibead/vibead#202 (the template's pre-filled `N/A — …` reasons),
vibead/vibead#193 (`gh pr checks` output in a fence under MERGE-2) and
vibead/vibead-ai#288. They hold commit SHAs only, no secrets or install hashes.
