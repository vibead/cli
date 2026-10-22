import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { checkLessons, addedLessonLines, POINTER } from "./check-lessons.mjs";

const config = JSON.parse(readFileSync(new URL("./config.json", import.meta.url), "utf8"));
const append = "@@ -40,3 +40,4 @@\n - old line\n-removed\n+- A new lesson appended at the end.\n";

test("a new line in LESSONS.md fails unless the PR is allowlisted", () => {
  assert.deepEqual(checkLessons(append, 9999, []), { ok: false, added: ["- A new lesson appended at the end."] });
  assert.equal(checkLessons(append, 9999, [9999]).ok, true);
  assert.equal(checkLessons(append, "9999", [9999]).ok, true, "PR_NUMBER arrives as a string");
});

test("no LESSONS.md change, removals, blank lines and the pointer line pass", () => {
  for (const patch of ["", undefined, "@@ -1 +1 @@\n-gone\n", `@@ -1,2 +1,4 @@\n # Lessons\n+\n+${POINTER}\n`])
    assert.equal(checkLessons(patch, 9999, []).ok, true, String(patch));
  assert.deepEqual(addedLessonLines("+++ b/LESSONS.md\n+x\n"), ["x"]);
});

test("the allowlist holds PR numbers and LESSONS.md points to lessons/", () => {
  assert.ok(Array.isArray(config.lessonsAllowlist) && config.lessonsAllowlist.every(Number.isInteger));
  const lessons = readFileSync(new URL("../../LESSONS.md", import.meta.url), "utf8");
  assert.ok(lessons.split("\n").slice(0, 4).includes(POINTER), "the pointer line is at the top of LESSONS.md");
  assert.match(readFileSync(new URL("../../.gitattributes", import.meta.url), "utf8"), /^LESSONS\.md merge=union$/m);
});
