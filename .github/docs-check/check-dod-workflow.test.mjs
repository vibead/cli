// Pins .github/workflows/docs-check.yml: ONE job on ubuntu-slim that runs the
// docs, LESSONS, design-doc and DoD block (QA's MERGE-0 fast-fail) checks, so a
// run bills one slim minute (SAFE-5, vibead/vibead-ai#293 (d)); triggers, draft
// and title-only-edit skip, per-PR concurrency with cancel, timeout 3.
// The DoD checker and template come only from the BASE commit (the PR's own copy
// only when the base has none), and its two steps run right after the first
// checkout, BEFORE any step that runs PR code, with a fresh environment, so a PR
// cannot reach it through $GITHUB_PATH or $GITHUB_ENV (vibead/vibead-ai#293 (a)).
// Every later check runs even when an earlier one failed. No kept credentials,
// no secrets, no npm (QA mutants, vibead/vibead-ai#290 and #293 (c)).
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const wf = f => new URL(`../workflows/${f}`, import.meta.url);
const yml = readFileSync(wf("docs-check.yml"), "utf8");
const jobs = yml.split(/^jobs:\n/m)[1];
const job = id => new RegExp(`^  ${id}:\\n([\\s\\S]*?)(?=^  [a-z][\\w-]*:\\n|(?![\\s\\S]))`, "m").exec(jobs)?.[1] ?? "";
const docs = job("docs");
const steps = docs.split(/\n      - /).slice(1);
const name = s => /^(?:name: (.*)|uses: )/.exec(s.split("\n")[0])?.[1] ?? "(checkout)";
const dodSteps = steps.filter(s => /DoD/.test(s.split("\n")[0]));
const nocomment = s => s.replace(/^\s*#.*\n/gm, "");

test("one job, on ubuntu-slim, holding every check; no DoD workflow of its own", () => {
  assert.equal(existsSync(wf("dod-check.yml")), false, "dod-check.yml is gone");
  assert.deepEqual(jobs.match(/^  [a-z][\w-]*:\n/gm), ["  docs:\n"], "one job: one billed minute per run");
  assert.match(docs, /^    name: "Docs check \(docs, design doc, LESSONS, DoD MERGE-0\)"$/m);
  assert.match(docs, /^    runs-on: ubuntu-slim$/m);
  assert.equal(yml.match(/runs-on:/g).length, 1);
  assert.deepEqual(steps.map(name), [
    "(checkout)",
    '"DoD check: checker and template from the base commit"',
    '"DoD block complete (MERGE-0): every line ticked with evidence or N/A with a reason"',
    '"Docs: self-test"',
    "\"Docs updated (or 'docs: n/a')\"",
    "No new lines in LESSONS.md (new lessons go in lessons/)",
    '"Design doc: self-test"',
    "\"Design doc updated (or 'Design doc: N/A — <reason>')\"",
  ]);
  assert.match(steps[3], /run: node --test \.github\/docs-check\/\*\.test\.mjs(\n|$)/);
  assert.match(steps[4], /run: node \.github\/docs-check\/check-docs\.mjs(\n|$)/);
  assert.match(steps[5], /run: node \.github\/docs-check\/check-lessons\.mjs(\n|$)/);
  assert.match(steps[6], /run: node --test scripts\/check-design-doc\.test\.mjs(\n|$)/);
  assert.match(steps[7], /run: node scripts\/check-design-doc\.mjs --base "\$BASE_SHA" --head "\$HEAD_SHA"\n?$/);
});

test("first checkout: full history for the design-doc diff, credentials not kept", () => {
  assert.match(steps[0], /^uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7\.0\.1\n {8}with:\n {10}persist-credentials: false\n {10}fetch-depth: 0\n/);
  assert.doesNotMatch(steps[0], /sparse-checkout|path:|ref:|\n {8}if:/);
});

test("triggers unchanged, no labeled; drafts and title-only edits skipped; per-PR concurrency with cancel; job timeout 3", () => {
  const on = /^on:\n([\s\S]*?)\n\S/m.exec(yml)?.[1];
  assert.equal(on, "  pull_request:\n    types: [opened, ready_for_review, synchronize, reopened, edited]\n");
  assert.match(yml, /^concurrency:\n  group: docs-check-\$\{\{ github\.event\.pull_request\.number \}\}\n  cancel-in-progress: true\n/m);
  assert.match(docs, /^    if: >-\n      github\.event\.pull_request\.draft == false &&\n      \(github\.event\.action != 'edited' \|\| github\.event\.changes\.body != null \|\| github\.event\.changes\.base != null\)\n/m);
  assert.match(docs, /^    timeout-minutes: 3$/m);
  assert.doesNotMatch(yml, /continue-on-error/);
});

test("permissions stay read-only at workflow level only", () => {
  assert.match(yml, /^permissions:\n  contents: read\n  pull-requests: read\n\n/m);
  assert.doesNotMatch(yml, /: *write\b/);
  assert.equal(yml.match(/^ *permissions:/gm).length, 1, "no job-level permissions");
});

test("#293 (a): the DoD steps come right after the first checkout, before any step that runs PR code", () => {
  assert.equal(dodSteps.length, 2);
  assert.deepEqual(steps.slice(1, 3), dodSteps);
  for (const s of dodSteps) {
    assert.match(s, /\n {8}timeout-minutes: 1\n/);
    assert.doesNotMatch(s, /\n {8}if:/, "nothing before them can fail but the checkout");
  }
  for (const s of steps.slice(3)) {
    assert.match(s, /\n {8}if: success\(\) \|\| failure\(\)\n/, `${name(s)} runs even after a DoD or earlier failure`);
    assert.match(s, /\n {8}run: node /, `${name(s)} is PR code, after the DoD steps`);
  }
});

test("DoD checkout: only the checker and template, from the base commit, credentials not kept", () => {
  const [co] = dodSteps;
  assert.match(co, /^name: "DoD check: checker and template from the base commit"/);
  assert.match(co, /uses: actions\/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 /);
  assert.match(co, /ref: \$\{\{ github\.event\.pull_request\.base\.sha \}\}\n {10}path: \.dod-base\n/);
  assert.match(co, /persist-credentials: false/);
  assert.match(co, /sparse-checkout-cone-mode: false/);
  assert.match(co, /sparse-checkout: \|\n {12}\/\.github\/docs-check\/check-dod\.mjs\n {12}\/\.github\/pull_request_template\.md(\n|$)/);
  assert.doesNotMatch(co, /fetch-depth|lfs: true|submodules|token:/);
});

test("DoD run: base copy, the PR's own only when the base has none; fresh environment; body only; fails the job; no secrets or npm", () => {
  const run = dodSteps[1];
  assert.match(run, /^name: "DoD block complete \(MERGE-0\): every line ticked with evidence or N\/A with a reason"/);
  assert.match(run, /env:\n {10}PR_BODY: \$\{\{ github\.event\.pull_request\.body \}\}\n {8}run: \|\n/);
  assert.match(run, /run: \|\n {10}node_bin="\$\(command -v node\)"\n/, "node resolved before any PR step could touch PATH");
  assert.match(run, /dir=\.dod-base\n/);
  assert.match(run, /if \[ ! -f \.dod-base\/\.github\/docs-check\/check-dod\.mjs \]; then\n\s+dir=\.\n\s+echo "::notice title=DoD check bootstrap::/);
  assert.match(run, /\n {10}env -i PATH=\/usr\/bin:\/bin PR_BODY="\$PR_BODY" "\$node_bin" "\$dir\/\.github\/docs-check\/check-dod\.mjs"(\n|$)/,
    "fresh env: no $GITHUB_ENV values (NODE_OPTIONS, PR_TEMPLATE …), no $GITHUB_PATH dirs; the checker's exit code is the step's");
  assert.doesNotMatch(run, /\|\| *true|set \+e|; *exit 0/);
  assert.doesNotMatch(nocomment(dodSteps.join("\n")), /secrets\.|GH_TOKEN|GITHUB_TOKEN|github\.token|\bnpm\b|npx|setup-node|labels/);
});
