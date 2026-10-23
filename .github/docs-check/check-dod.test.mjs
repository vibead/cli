// Tests for check-dod.mjs (QA MERGE-0 fast-fail). Runs in the "DoD block complete
// (MERGE-0)" job of docs-check.yml before the check itself.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { checkDod, dodLines, dodSection, templateLines } from "./check-dod.mjs";

const TEMPLATE = `<!-- comment -->
## Spec
- [ ] 

## Definition of Done

Head SHA handed to QA: \`<sha>\`

### Merge
- [ ] MERGE-0 this block is complete: every applicable line ticked with evidence, the rest \`N/A - <reason>\`
- [ ] MERGE-1 \`PR tests\` green on head: <run url> @ <sha>
### CLI
- [ ] CLI-9 NO_COLOR=1 gives the plain ad: <captures> → in vibead/vibead-ai: N/A — the CLI lives in vibead/vibead and vibead/cli
`;
const body = lines => `## Spec\n**User outcome:** x\n**Acceptance criteria:**\n- [ ] BLOCKER: not part of the DoD block\n\n## Definition of Done\n\nHead SHA handed to QA: \`abc\`\n${lines.join("\n")}\n`;
const ALL_TICKED = ["- [x] MERGE-0 complete", "- [x] MERGE-1 `PR tests` green: run 1 @ abc", "- [x] CLI-9 NO_COLOR: N/A - CLI not touched"];

test("a body with no Definition of Done block fails", () => {
  const r = checkDod("## Spec\nSome text\n\n## What and why\n", TEMPLATE);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /no "## Definition of Done" block/);
  assert.equal(checkDod("", TEMPLATE).ok, false);
});

test("an unticked line fails and is named", () => {
  const r = checkDod(body(["- [x] MERGE-0 complete", "- [ ] MERGE-1 `PR tests` green: pending: draft", "- [x] CLI-9 N/A - not touched"]), TEMPLATE);
  assert.equal(r.ok, false);
  assert.deepEqual(r.errors, ['MERGE-1 is unticked: tick it with evidence or write "N/A - <reason>"']);
});

test("every line ticked passes ([x] and [X], CRLF bodies too)", () => {
  assert.deepEqual(checkDod(body(ALL_TICKED), TEMPLATE), { ok: true, errors: [] });
  assert.equal(checkDod(body(ALL_TICKED.map(l => l.replace("[x]", "[X]"))).replace(/\n/g, "\r\n"), TEMPLATE).ok, true);
});

test("an unticked line marked N/A with a reason counts as done", () => {
  for (const na of ["N/A - not a bug fix", "N/A — no release", "N/A: CLI untouched", "N/A - `install` untouched"]) {
    const r = checkDod(body(["- [x] MERGE-0 complete", `- [ ] MERGE-1 PR tests: ${na}`, "- [x] CLI-9 done"]), TEMPLATE);
    assert.equal(r.ok, true, na);
  }
});

test("N/A without a reason, or with a <placeholder>, is not done", () => {
  for (const na of ["N/A", "N/A -", "N/A - <reason>", "N/A - `<reason>`"]) {
    const r = checkDod(body(["- [x] MERGE-0 complete", `- [ ] MERGE-1 PR tests: ${na}`, "- [x] CLI-9 done"]), TEMPLATE);
    assert.equal(r.ok, false, na);
  }
});

test("the template's own N/A words never count: an untouched template fails on every line", () => {
  const r = checkDod(TEMPLATE, TEMPLATE);
  assert.deepEqual(r.errors.map(e => e.split(" ")[0]), ["MERGE-0", "MERGE-1", "CLI-9"]);
});

test("a missing DoD line fails; Spec checkboxes outside the block are ignored", () => {
  const r = checkDod(body(ALL_TICKED.slice(0, 2)), TEMPLATE);
  assert.deepEqual(r.errors, ["missing DoD lines: CLI-9"]);
});

test("the block ends at the next level-2 heading", () => {
  const r = checkDod(body(ALL_TICKED) + "\n## Notes\n- [ ] MERGE-1 a later unticked note\n", TEMPLATE);
  assert.equal(r.ok, true);
  assert.equal(dodLines(dodSection(body(ALL_TICKED))).length, 3);
});

test("this repo's PR template: every line ID is read; untouched it fails, fully ticked it passes", () => {
  const template = readFileSync(new URL("../pull_request_template.md", import.meta.url), "utf8");
  const ids = [...templateLines(template).keys()];
  assert.ok(ids.length >= 60, `${ids.length} IDs`);
  assert.ok(ids.includes("MERGE-0") && ids.includes("CLI-9"));
  assert.equal(checkDod(template, template).errors.length, ids.length);
  const ticked = template.replace(/^- \[ \] ([A-Z]+-\d+)/gm, "- [x] $1");
  assert.deepEqual(checkDod(ticked, template), { ok: true, errors: [] });
});

test("an unticked line that keeps the template's '→ in <repo>: N/A — …' suffix is still unticked", () => {
  const kept = "- [ ] CLI-9 NO_COLOR=1 gives the plain ad: see captures → in vibead/vibead-ai: N/A — the CLI lives in vibead/vibead and vibead/cli";
  const r = checkDod(body(["- [x] MERGE-0 complete", "- [x] MERGE-1 run 1", kept]), TEMPLATE);
  assert.deepEqual(r.errors, ['CLI-9 is unticked: tick it with evidence or write "N/A - <reason>"']);
});

test("N/A wording in a template line's own text never counts as the author's", () => {
  const template = TEMPLATE.replace("- [ ] MERGE-1 `PR tests` green on head: <run url> @ <sha>", "- [ ] MERGE-1 PR tests green, or N/A - docs-only lane");
  const r = checkDod(body(["- [x] MERGE-0 complete", "- [ ] MERGE-1 PR tests green, or N/A - docs-only lane", "- [x] CLI-9 done"]), template);
  assert.equal(r.ok, false);
  assert.equal(checkDod(body(["- [x] MERGE-0 complete", "- [ ] MERGE-1 PR tests green, or N/A - docs-only lane: N/A - docs only", "- [x] CLI-9 done"]), template).ok, true);
});
