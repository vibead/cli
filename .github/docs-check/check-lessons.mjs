#!/usr/bin/env node
// LESSONS.md is append-only history: new lessons go in lessons/, one file each,
// so open PRs never touch a shared line and never conflict. This check fails a
// PR that adds a line to LESSONS.md, except PRs that were already open when the
// rule started (config.json "lessonsAllowlist") and the one pointer line at the top.
// CI: .github/workflows/docs-check.yml (needs GH_TOKEN, REPO, PR_NUMBER).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const POINTER = "New lessons go in lessons/, one file each; read both.";

// Added lines in a unified-diff patch, without the "+" and ignoring blank lines and the pointer.
export function addedLessonLines(patch) {
  return (patch ?? "").split("\n")
    .filter(l => l.startsWith("+") && !l.startsWith("+++"))
    .map(l => l.slice(1))
    .filter(l => l.trim() !== "" && l.trim() !== POINTER);
}

export function checkLessons(patch, prNumber, allowlist) {
  const added = addedLessonLines(patch);
  if (added.length === 0) return { ok: true, reason: "no new lines in LESSONS.md" };
  if (allowlist.includes(Number(prNumber))) return { ok: true, reason: `PR #${prNumber} was open before lessons/ (allowlisted)` };
  return { ok: false, added };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const config = JSON.parse(readFileSync(new URL("./config.json", import.meta.url), "utf8"));
  const { REPO, PR_NUMBER } = process.env;
  if (!REPO || !PR_NUMBER) { console.error("check-lessons: REPO and PR_NUMBER are required"); process.exit(2); }
  const patch = execFileSync("gh", ["api", "--paginate", `repos/${REPO}/pulls/${PR_NUMBER}/files?per_page=100`, "--jq", '.[] | select(.filename == "LESSONS.md") | .patch // ""'], { encoding: "utf8" });
  const result = checkLessons(patch, PR_NUMBER, config.lessonsAllowlist ?? []);
  if (result.ok) { console.log(`Lessons check passed: ${result.reason}.`); process.exit(0); }
  console.log(`::error title=New lesson in LESSONS.md::This PR adds ${result.added.length} line(s) to LESSONS.md. Put each new lesson in its own file, lessons/YYYY-MM-DD-<slug>.md, so PRs never conflict on a shared line (see lessons/README.md).`);
  process.exit(1);
}
