// Tests for check-dod.mjs (QA MERGE-0 fast-fail). Run by the Docs check job's
// "Docs: self-test" step (node --test .github/docs-check/*.test.mjs) and by PR tests' script
// suite; the DoD step itself only runs the base branch's checker (docs-check.yml).
// Each QA mutant from vibead/vibead-ai#290 and #293 (c) is named in the test that kills it.
// fixtures/: real PR bodies and their templates (see fixtures/README.md).
import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { BODY_EVIDENCE, ROUND, checkDod, evidenceProblem, dodLines, dodSection, main, templateLines, templateNA } from "./check-dod.mjs";

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
const M0 = "- [x] MERGE-0 this block is complete: every line ticked with its evidence below";
const M1 = "- [x] MERGE-1 `PR tests` green on head: https://github.com/o/r/actions/runs/1 @ `a4b87c6`";
const C9 = "- [x] CLI-9 NO_COLOR: N/A - CLI not touched";
const ALL = [M0, M1, C9];
const ok = (lines, t = TEMPLATE) => checkDod(body(lines), t);

test("a body with no Definition of Done block fails", () => {
  const r = checkDod("## Spec\nSome text\n\n## What and why\n", TEMPLATE);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /no "## Definition of Done" block/);
  assert.equal(checkDod("", TEMPLATE).ok, false);
});

test("every line ticked with evidence passes ([x] and [X], CRLF bodies too)", () => {
  assert.deepEqual(ok(ALL), { ok: true, errors: [] });
  assert.equal(checkDod(body(ALL.map(l => l.replace("[x]", "[X]"))).replace(/\n/g, "\r\n"), TEMPLATE).ok, true);
});

test("an unticked line fails and is named", () => {
  assert.deepEqual(ok([M0, "- [ ] MERGE-1 `PR tests` green: run later", C9]).errors, ['MERGE-1 is unticked: tick it with evidence or write "N/A - <reason>"']);
});

test("#290 §2: a tick with no evidence, or only the template text, fails (evidence rule from definition-of-done.md)", () => {
  for (const l of ["- [x] MERGE-1", "- [x] MERGE-1 `PR tests` green on head: <run url> @ <sha>", "- [x] MERGE-1 `PR tests` green on head:", "- [x] MERGE-1 done", "- [x] MERGE-1 `PR tests` green on head: ok"]) {
    const r = ok([M0, l, C9]);
    assert.equal(r.ok, false, l);
    assert.match(r.errors.join("\n"), /^MERGE-1 is ticked but has (no|too little) evidence/m, l);
  }
});

test("evidence: a link, a SHA, a #ref, a `code` span or a 3-word sentence counts", () => {
  for (const ev of ["https://github.com/o/r/pull/1", "a4b87c6", "vibead/vibead#174", "#287", "`npm test` exit 0", "suite passed on the merge result"]) {
    assert.equal(ok([M0, `- [x] MERGE-1 \`PR tests\` green on head: ${ev}`, C9]).ok, true, ev);
  }
});

test("a tick whose evidence is a placeholder fails", () => {
  for (const ev of ["pending", "TBD", "TODO: add run", "<run url>", "WIP"]) {
    const r = ok([M0, `- [x] MERGE-1 \`PR tests\` green on head: ${ev}`, C9]);
    assert.equal(r.ok, false, ev);
  }
});

test("an unticked or ticked line marked N/A with a real reason counts as done", () => {
  for (const na of ["N/A - not a bug fix", "N/A — no release", "N/A: CLI untouched", "N/A - `install` untouched", "N/A – docs only"]) {
    assert.equal(ok([M0, `- [ ] MERGE-1 PR tests: ${na}`, C9]).ok, true, na);
    assert.equal(ok([M0, `- [x] MERGE-1 PR tests: ${na}`, C9]).ok, true, na);
  }
});

test("N/A without a reason, or with a <placeholder>, is not done", () => {
  for (const na of ["N/A", "N/A -", "N/A - <reason>", "N/A - `<reason>`"]) {
    assert.equal(ok([M0, `- [ ] MERGE-1 PR tests: ${na}`, C9]).ok, false, na);
  }
});

test("#290 §2: 'N/A - pending' and similar placeholder reasons fail, ticked or not", () => {
  for (const na of ["N/A - pending", "N/A - TBD", "N/A: todo", "N/A — pending QA", "N/A - ?", "N/A - …", "N/A - n/a"]) {
    for (const box of ["[ ]", "[x]"]) {
      const r = ok([M0, `- ${box} MERGE-1 PR tests: ${na}`, C9]);
      assert.equal(r.ok, false, `${box} ${na}`);
      assert.match(r.errors.join("\n"), /MERGE-1 has (a placeholder N\/A reason|"N\/A" without a reason)/, `${box} ${na}`);
    }
  }
});

test("mutant 'N/A without a separator accepted' is killed", () => {
  const r = ok([M0, "- [ ] MERGE-1 PR tests: N/A not touched", C9]);
  assert.deepEqual(r.errors, ['MERGE-1 has "N/A" without a separator: write "N/A - <reason>"']);
});

test("mutant 'N/A case-insensitive' is killed: a lowercase n/a fails and says to use capitals", () => {
  for (const na of ["n/a - not touched", "N/a - not touched"]) {
    const r = ok([M0, `- [ ] MERGE-1 PR tests: ${na}`, C9]);
    assert.deepEqual(r.errors, ['MERGE-1 has a lowercase "n/a": write "N/A - <reason>" in capitals'], na);
  }
});

test("the template's own N/A words never count: an untouched template fails on every line", () => {
  assert.deepEqual(checkDod(TEMPLATE, TEMPLATE).errors.map(e => e.split(" ")[0]), ["MERGE-0", "MERGE-1", "CLI-9"]);
});

test("#293 (b): the template's pre-filled N/A reason, kept by the author on a ticked line, is a valid reason", () => {
  assert.equal(templateNA("NO_COLOR=1 gives the plain ad: <captures> → in vibead/vibead-ai: N/A — the CLI lives in vibead/vibead and vibead/cli"), "N/A — the CLI lives in vibead/vibead and vibead/cli");
  assert.equal(templateNA("plain ad: <captures> → in vibead/vibead-ai: applies to the installer"), null, "only an N/A answer counts");
  assert.equal(templateNA("plain ad: <captures>"), null);
  const kept = "CLI-9 NO_COLOR=1 gives the plain ad: <captures> → in vibead/vibead-ai: N/A — the CLI lives in vibead/vibead and vibead/cli";
  assert.deepEqual(ok([M0, M1, `- [ ] ${kept}`]).errors, ['CLI-9 is unticked: tick it with evidence or write "N/A - <reason>"'], "an untouched template line still fails");
  assert.equal(ok([M0, M1, `- [x] ${kept}`]).ok, true, "ticked with the whole template text left in place");
  assert.equal(ok([M0, M1, "- [x] CLI-9 NO_COLOR=1 gives the plain ad: N/A — the CLI lives in vibead/vibead and vibead/cli"]).ok, true, "the vibead#202 shape");
  assert.equal(ok([M0, M1, "- [x] CLI-9 NO_COLOR=1 gives the plain ad: N/A — pending"]).ok, false, "placeholders still fail");
  assert.equal(ok([M0, M1, "- [x] CLI-9 NO_COLOR=1 gives the plain ad: N/A — TBD"]).ok, false);
  assert.equal(ok([M0, M1, "- [x] CLI-9 NO_COLOR=1 gives the plain ad: N/A — <reason>"]).ok, false);
});

test("#293 (b): a code fence right under a ticked line is that line's evidence; fences elsewhere are still ignored", () => {
  const fenced = (gap, content = "PR tests  pass  11s  https://github.com/o/r/actions/runs/1") =>
    ok([M0, "- [x] MERGE-1 `PR tests` green on head: ", ...gap, "```", content, "```", C9]);
  assert.equal(fenced([]).ok, true, "the vibead#193 shape");
  assert.equal(ok([M0, "- [x] MERGE-1 `PR tests` green on head: ", "  ```text", "PR tests pass", "  ```", C9]).ok, true, "indented fence under a list item");
  assert.deepEqual(fenced([""]).errors, ["MERGE-1 is ticked but has no evidence after the template wording"], "a blank line between: not attached");
  assert.deepEqual(fenced([], "").errors, ["MERGE-1 is ticked but has no evidence after the template wording"], "an empty fence is no evidence");
  assert.deepEqual(fenced([], "   ").errors, ["MERGE-1 is ticked but has no evidence after the template wording"]);
  for (const ph of ["TBD", "<gh pr checks output>", "pending"]) assert.equal(fenced([], ph).ok, false, `placeholder fence: ${ph}`);
  assert.equal(ok([M0, "- [ ] MERGE-1 `PR tests` green on head: ", "```", "PR tests pass", "```", C9]).ok, false, "a fence does not tick the line");
  const inside = ok([M0, "```", "- [x] MERGE-1 `PR tests` green on head: https://x.y/1", "```", C9]);
  assert.deepEqual(inside.errors, ["missing DoD lines: MERGE-1"], "a checklist line inside a fence is still ignored");
});

test("#293 (c): text before the bullet is not a checklist line (mutant LINE '^.*?[-*+]')", () => {
  const r = ok([M0, "Note - [x] MERGE-1 `PR tests` green on head: https://github.com/o/r/actions/runs/1", C9]);
  assert.deepEqual(r.errors, ['MERGE-1 found but not as a checklist line: write "- [x] MERGE-1 …" (bullet "-", "*" or "+", then [x] or [ ], then the ID)']);
  assert.equal(dodLines(["| x | - [x] MERGE-1 a table cell |"]).length, 0);
  assert.equal(dodLines(["   - [x] MERGE-1 indented is fine"]).length, 1);
});

test("#293 (c): a SHA is 7-40 hex characters at a word boundary ('added', 'face' are not evidence)", () => {
  for (const w of ["added", "face", "cafe", "decade", "zz1234567", "1234567zz", "a4b87c6x"]) {
    assert.notEqual(evidenceProblem(w), null, w);
  }
  for (const w of ["a4b87c6", "5ebe8872964f8fa8e40bc86f2b4d084a5923c37c", "on a4b87c6."]) assert.equal(evidenceProblem(w), null, w);
  assert.notEqual(evidenceProblem("5ebe8872964f8fa8e40bc86f2b4d084a5923c37c0"), null, "41 hex is not a SHA");
});

test("BUG-6 takes the round number as its evidence (definition-of-done.md: 'the round number')", () => {
  const dod = readFileSync(new URL("../../docs/quality/definition-of-done.md", import.meta.url), "utf8");
  assert.match(dod, /- \*\*BUG-6\*\*[\s\S]*?\*Evidence:\* the round number/);
  for (const r of ["round 2 of 3", "QA r1", "2/3", "1 of 3"]) assert.match(r, ROUND, r);
  for (const r of ["round n of 3", "round", "of 3", "r0", "4 of 5"]) assert.doesNotMatch(r, ROUND, r);
  const t = TEMPLATE.replace("- [ ] CLI-9", "- [ ] BUG-6 QA round n of 3 (escalate to the Chief of Staff after the third FAIL)\n- [ ] CLI-9");
  const b6 = x => checkDod(body([M0, M1, `- [x] BUG-6 QA round n of 3 (escalate to the Chief of Staff after the third FAIL)${x}`, C9]), t);
  assert.equal(b6(": round 2 of 3").ok, true);
  assert.equal(b6("").ok, false);
  assert.equal(b6(": round n").ok, false);
  assert.equal(ok([M0, "- [x] MERGE-1 `PR tests` green on head: r2", C9]).ok, false, "the round rule is BUG-6's alone");
});

const fixture = f => readFileSync(new URL(`./fixtures/${f}`, import.meta.url), "utf8");
test("#293 (b): real bodies pass: vibead/vibead#202, vibead/vibead#193 and vibead/vibead-ai#288 (fixtures)", () => {
  assert.deepEqual(checkDod(fixture("vibead-202.body.md"), fixture("vibead.template.md")), { ok: true, errors: [] });
  assert.deepEqual(checkDod(fixture("vibead-193.body.md"), fixture("vibead.template.md")), { ok: true, errors: [] });
  assert.deepEqual(checkDod(fixture("vibead-ai-288.body.md"), fixture("vibead-ai.template.md")), { ok: true, errors: [] });
  // and the fixtures still catch real misses: emptying #193's MERGE-2 fence fails it
  const b = fixture("vibead-193.body.md").replace(/(- \[x\] MERGE-2 [^\n]*\n```[^\n]*\n)[\s\S]*?(\n```)/, "$1$2");
  assert.deepEqual(checkDod(b, fixture("vibead.template.md")).errors, ["MERGE-2 is ticked but has no evidence after the template wording"]);
});

test("N/A wording in a template line's own text never counts as the author's", () => {
  const t = TEMPLATE.replace("- [ ] MERGE-1 `PR tests` green on head: <run url> @ <sha>", "- [ ] MERGE-1 PR tests green, or N/A - docs-only lane");
  assert.equal(ok([M0, "- [ ] MERGE-1 PR tests green, or N/A - docs-only lane", C9], t).ok, false);
  assert.equal(ok([M0, "- [ ] MERGE-1 PR tests green, or N/A - docs-only lane: N/A - docs only", C9], t).ok, true);
});

test("a missing DoD line fails; Spec checkboxes outside the block are ignored", () => {
  assert.deepEqual(ok([M0, M1]).errors, ["missing DoD lines: CLI-9"]);
});

test("the block ends at the next level-2 heading", () => {
  assert.equal(checkDod(body(ALL) + "\n## Notes\n- [ ] MERGE-1 a later unticked note\n", TEMPLATE).ok, true);
  assert.equal(dodLines(dodSection(body(ALL))).length, 3);
});

test("mutant 'block ends at ### too' is killed: ### sub-headings stay inside the block", () => {
  assert.equal(ok([M0, "### Merge", M1, "### CLI", C9]).ok, true);
  assert.equal(dodLines(dodSection(body([M0, "### Merge", M1, "#### deeper", C9]))).length, 3);
});

test("mutant 'HEADING loosened' is killed: near-miss headings are not the block", () => {
  for (const h of ["## Definition of Doneness", "## Def", "## Definition", "### Definition of Done", "# Definition of Done", "## Definition of done", "##Definition of Done"]) {
    const r = checkDod(`## Spec\nx\n\n${h}\n${ALL.join("\n")}\n`, TEMPLATE);
    assert.equal(r.ok, false, h);
    assert.match(r.errors[0], /no "## Definition of Done" block/, h);
  }
});

test("mutant 'LINE accepts any bullet prefix' is killed: non-bullet lines are not checklist lines, with a clear message", () => {
  for (const l of ["[x] MERGE-1 run a4b87c6", "1. [x] MERGE-1 run a4b87c6", "• [x] MERGE-1 run a4b87c6", "-[x] MERGE-1 run a4b87c6", "MERGE-1 run a4b87c6"]) {
    assert.deepEqual(ok([M0, l, C9]).errors, ['MERGE-1 found but not as a checklist line: write "- [x] MERGE-1 …" (bullet "-", "*" or "+", then [x] or [ ], then the ID)'], l);
  }
});

test("#290 §2: '+' and '*' bullets are accepted", () => {
  assert.equal(ok(ALL.map(l => l.replace(/^- /, "+ "))).ok, true);
  assert.equal(ok(ALL.map(l => l.replace(/^- /, "* "))).ok, true);
});

test("#290 §2: a blockquoted block is read as if unquoted", () => {
  const quoted = body(ALL).split("\n").map(l => (l ? `> ${l}` : ">")).join("\n");
  assert.deepEqual(checkDod(quoted, TEMPLATE), { ok: true, errors: [] });
  assert.equal(checkDod(body([M0, `> ${M1}`, `>> ${C9}`]), TEMPLATE).ok, true);
});

test("#290 §2: a bold, __bold__ or `code` ID is accepted", () => {
  for (const id of ["**MERGE-1**", "__MERGE-1__", "`MERGE-1`"]) {
    assert.equal(ok([M0, `- [x] ${id} \`PR tests\` green on head: https://x/runs/1 @ a4b87c6`, C9]).ok, true, id);
  }
});

test("#290 §2: a ## heading inside a code fence does not end the block", () => {
  for (const f of ["```", "~~~", "````md"]) {
    const close = f.replace(/md$/, "");
    assert.deepEqual(ok([M0, f, "## not a heading", close, M1, C9]), { ok: true, errors: [] }, f);
  }
});

test("#290 §2: checkboxes inside a code fence are ignored", () => {
  assert.equal(ok([M0, "```", "- [ ] X-9 an unticked example", "- [ ] MERGE-1 example", "```", M1, C9]).ok, true);
  const r = ok([M0, "```", M1, "```", C9]);
  assert.deepEqual(r.errors, ["missing DoD lines: MERGE-1"], "a real line inside a fence does not count");
  assert.equal(checkDod("```\n## Definition of Done\n" + ALL.join("\n") + "\n```\n", TEMPLATE).ok, false, "a heading inside a fence is not the block");
  assert.equal(ok([M0, M1, C9, "```", "- [ ] unclosed fence hides the rest"]).ok, true);
});

test("#290 §2: a grouped ID line fails with a 'split per ID' message", () => {
  for (const g of ["CLI-1 to CLI-12", "CLI-1–CLI-12", "CLI-1 - 12", "CLI-1, CLI-2", "CLI-1/2", "CLI-1 through CLI-14", "CLI-1..12", "**CLI-1** to CLI-12"]) {
    const t = TEMPLATE.replace("- [ ] CLI-9", "- [ ] CLI-1 x: <y>\n- [ ] CLI-9");
    const r = ok([M0, M1, `- [x] ${g}: N/A - CLI not touched`, C9], t);
    assert.equal(r.ok, false, g);
    assert.match(r.errors[0], /^CLI-1 line groups several IDs \(".*"\): split per ID, one "- \[x\] ID …" line each$/, g);
  }
});

test("mutant 'empty template does not throw' is killed", () => {
  assert.throws(() => templateLines("## Definition of Done\n\nno lines\n"), /no Definition of Done lines/);
  assert.throws(() => templateLines("## Spec\n- [ ] MERGE-1 x\n"), /no Definition of Done lines/);
  assert.throws(() => checkDod(body(ALL), ""), /no Definition of Done lines/);
});

test("mutant 'CLI exits 0 on failure' is killed: the entry point exits 1 with ::error lines, 0 on a pass", () => {
  const dir = mkdtempSync(join(tmpdir(), "dod-"));
  const tpl = join(dir, "template.md");
  writeFileSync(tpl, TEMPLATE);
  const out = [];
  assert.equal(main({ PR_BODY: "no block", PR_TEMPLATE: tpl }, l => out.push(l)), 1);
  assert.match(out[0], /^::error title=DoD-miss: MERGE-0::the PR body has no/);
  assert.equal(main({ PR_BODY: body(ALL), PR_TEMPLATE: tpl }, () => {}), 0);
  const script = fileURLToPath(new URL("./check-dod.mjs", import.meta.url));
  const run = b => spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH, PR_BODY: b, PR_TEMPLATE: tpl }, encoding: "utf8" });
  const bad = run(body([M0, "- [ ] MERGE-1 x", C9]));
  assert.equal(bad.status, 1);
  assert.match(bad.stdout, /^::error title=DoD-miss: MERGE-0::MERGE-1 is unticked/m);
  const good = run(body(ALL));
  assert.equal(good.status, 0, good.stdout + good.stderr);
  assert.match(good.stdout, /DoD block check passed/);
  rmSync(dir, { recursive: true });
});

test("this repo's PR template: every line ID is read; untouched it fails, ticked with evidence it passes", () => {
  const template = readFileSync(new URL("../pull_request_template.md", import.meta.url), "utf8");
  const ids = [...templateLines(template).keys()];
  assert.ok(ids.length >= 60, `${ids.length} IDs`);
  assert.ok(ids.includes("MERGE-0") && ids.includes("CLI-9"));
  assert.equal(checkDod(template, template).errors.length, ids.length);
  const bare = template.replace(/^- \[ \] ([A-Z]+-\d+)/gm, "- [x] $1");
  const failed = checkDod(bare, template).errors.map(e => e.split(" ")[0]);
  const prefilled = ids.filter(id => templateNA(templateLines(template).get(id)) !== null);
  assert.deepEqual(ids.filter(id => !failed.includes(id)), ["MERGE-0", "MERGE-7", ...prefilled].sort((a, b) => ids.indexOf(a) - ids.indexOf(b)), "ticking without evidence fails every line but the two whose evidence is the body itself and those whose template pre-fills an N/A reason");
  const done = template.split("\n").map(l => l.replace(/^- \[ \] ([A-Z]+-\d+)(.*)$/, "- [x] $1$2: checked on `a4b87c6`"))
    .join("\n").replace(/^Cost impact \(SAFE-5\): .*$/m, "Cost impact (SAFE-5): none, no runtime or CI change");
  assert.deepEqual(checkDod(done, template), { ok: true, errors: [] });
});

test("BODY_EVIDENCE is exactly the lines whose DoD evidence is the PR body itself (definition-of-done.md)", () => {
  const dod = readFileSync(new URL("../../docs/quality/definition-of-done.md", import.meta.url), "utf8");
  const ids = [];
  let id = null;
  for (const l of dod.split("\n")) {
    const h = /^- \*\*([A-Z]+-\d+)\*\*/.exec(l);
    if (h) id = h[1];
    const e = /^ {2}\*Evidence:\* (.*)$/.exec(l);
    if (e && id && /^(the PR body itself|the top of the PR body|one line in the PR body)\.?$/.test(e[1].trim())) ids.push(id);
  }
  assert.deepEqual(ids.sort(), [...BODY_EVIDENCE].sort());
});

const T2 = TEMPLATE.replace("- [ ] CLI-9", "- [ ] MERGE-7 the body opens with the spec above\n- [ ] SAFE-5 cost impact stated (above)\n- [ ] CLI-9");
const withCost = (lines, cost = "Cost impact (SAFE-5): none, docs only") => body([cost, ...lines]);

test("MERGE-0, MERGE-7 and SAFE-5 need only a tick plus their body part", () => {
  assert.deepEqual(checkDod(withCost(["- [x] MERGE-0", M1, "- [x] MERGE-7", "- [x] SAFE-5 cost impact stated (above)", C9]), T2), { ok: true, errors: [] });
});

test("MERGE-7 ticked without a ## Spec section before the block fails", () => {
  const b = withCost([M0, M1, "- [x] MERGE-7", "- [x] SAFE-5", C9]).replace("## Spec\n", "## Summary\n");
  assert.deepEqual(checkDod(b, T2).errors, ['MERGE-7 is ticked but the body has no "## Spec" section before the block']);
});

test("SAFE-5 ticked with no Cost impact line, or a placeholder one, fails", () => {
  for (const cost of ["Cost impact (SAFE-5): <none | details>", "Cost impact (SAFE-5): ", "Cost impact (SAFE-5): TBD", "no cost line"]) {
    const r = checkDod(withCost([M0, M1, "- [x] MERGE-7", "- [x] SAFE-5", C9], cost), T2);
    assert.equal(r.ok, false, cost);
    assert.match(r.errors[0], /^SAFE-5 is ticked but the (block has no "Cost impact|"Cost impact \(SAFE-5\):" line is empty or a placeholder)/, cost);
  }
});

test("a template-only tick leaves no stray punctuation as evidence", () => {
  const t = TEMPLATE.replace("- [ ] MERGE-1 `PR tests` green on head: <run url> @ <sha>", "- [ ] MERGE-1 the rest `N/A - <reason>` (missing = fast FAIL, `DoD-miss: MERGE-0`)");
  const r = checkDod(body([M0, "- [x] MERGE-1 the rest `N/A - <reason>` (missing = fast FAIL, `DoD-miss: MERGE-0`)", C9]), t);
  assert.deepEqual(r.errors, ["MERGE-1 is ticked but has no evidence after the template wording"]);
  for (const left of ["`", " ` ( ) ", "**", ": —"]) assert.equal(evidenceProblem(left), "has no evidence after the template wording", JSON.stringify(left));
});
