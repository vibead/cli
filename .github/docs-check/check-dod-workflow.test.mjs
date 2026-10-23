// Pins the "DoD block complete (MERGE-0)" job in docs-check.yml: the triggers QA
// relies on (body edits, ready_for_review), the draft skip and timeout (CI thrift,
// docs/quality/ci.md), and that it reads only the body and template (no secrets,
// no token, sparse checkout). Runs in the job's own self-test.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const yml = readFileSync(new URL("../workflows/docs-check.yml", import.meta.url), "utf8");
const job = (() => {
  const start = yml.indexOf("\n  dod:\n");
  assert.ok(start > 0, "docs-check.yml has a dod job");
  const rest = yml.slice(start + 1);
  const next = rest.slice(1).search(/\n  [a-z][\w-]*:\n/);
  return next < 0 ? rest : rest.slice(0, next + 1);
})();

test("runs on body edits, pushes and ready_for_review", () => {
  const types = /pull_request:\s*\n\s*types:\s*\[([^\]]*)\]/.exec(yml)?.[1].split(",").map(s => s.trim());
  for (const t of ["opened", "edited", "synchronize", "ready_for_review"]) assert.ok(types?.includes(t), t);
});

test("skips drafts, has the 3-minute floor, and keeps its check name", () => {
  assert.match(job, /^    name: "DoD block complete \(MERGE-0\)"$/m);
  assert.match(job, /^    if: github\.event\.pull_request\.draft == false$/m);
  assert.match(job, /^    timeout-minutes: 3$/m);
  assert.match(yml, /cancel-in-progress: true/);
});

test("reads only the body and template: sparse checkout, no credentials, no secrets or token", () => {
  assert.match(job, /persist-credentials: false/);
  assert.match(job, /sparse-checkout:/);
  assert.doesNotMatch(job, /secrets\.|GH_TOKEN|github\.token|fetch-depth/);
  assert.match(job, /PR_BODY: \$\{\{ github\.event\.pull_request\.body \}\}/);
  assert.match(job, /run: node \.github\/docs-check\/check-dod\.mjs$/m);
  assert.match(job, /run: node --test .*check-dod\.test\.mjs/);
});
