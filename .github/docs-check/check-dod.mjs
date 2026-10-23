#!/usr/bin/env node
// DoD block check (QA's MERGE-0 fast-fail, docs/quality/definition-of-done.md).
// A ready PR's body must carry the "## Definition of Done" block with every line
// ID from .github/pull_request_template.md, each ticked ("- [x] ID …") or marked
// "N/A - <reason>". The template's own per-repo text ("→ in <repo>: N/A …") and a
// placeholder reason ("N/A - <reason>") do not count. Reads only the PR body and
// the template: no PR code is checked out or run. The same script runs in
// vibead-ai, vibead and cli.
// CI: .github/workflows/docs-check.yml, job "DoD block complete (MERGE-0)" (needs PR_BODY).
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const HEADING = /^##[ \t]+Definition of Done[ \t]*$/;
const LINE = /^[ \t]*[-*][ \t]+\[([ xX])\][ \t]+([A-Z]+-\d+)\b(.*)$/;
// "N/A", a dash, en/em dash or colon, then a reason (a <placeholder> is not one).
const NA = /\bN\/A[ \t]*[-–—:][ \t]*[`*_"']*[A-Za-z0-9]/;

// The DoD section of a markdown document: from "## Definition of Done" to the next
// level-2 heading (or the end). null when the heading is missing.
export function dodSection(text) {
  const lines = String(text ?? "").split(/\r?\n/);
  const start = lines.findIndex(l => HEADING.test(l));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(l => /^##[ \t]/.test(l) && !/^###/.test(l));
  return end < 0 ? rest : rest.slice(0, end);
}

// Checklist lines in a DoD section: [{ id, ticked, text }], in order.
export function dodLines(section) {
  return (section ?? []).flatMap(l => {
    const m = LINE.exec(l);
    return m ? [{ id: m[2], ticked: m[1] !== " ", text: m[3] }] : [];
  });
}

// Template text per ID, so the template's own words never count as an author's N/A.
export function templateLines(template) {
  const lines = dodLines(dodSection(template));
  if (lines.length === 0) throw new Error("check-dod: the PR template has no Definition of Done lines");
  return new Map(lines.map(l => [l.id, l.text]));
}

function naReason(text, templateText = "") {
  let own = text;
  const t = templateText.trim();
  if (t && own.includes(t)) own = own.replace(t, " ");
  const arrow = t.indexOf("→ in ");
  if (arrow >= 0) own = own.replace(t.slice(arrow), " ");
  return NA.test(own);
}

// { ok, errors[] }: errors name the missing block, missing IDs and unticked lines.
export function checkDod(body, template) {
  const want = templateLines(template);
  const section = dodSection(body);
  if (!section) return { ok: false, errors: ['the PR body has no "## Definition of Done" block (copy it from .github/pull_request_template.md)'] };
  const have = dodLines(section);
  const errors = [];
  const seen = new Set(have.map(l => l.id));
  const missing = [...want.keys()].filter(id => !seen.has(id));
  if (missing.length) errors.push(`missing DoD lines: ${missing.join(", ")}`);
  for (const l of have) {
    if (l.ticked || naReason(l.text, want.get(l.id))) continue;
    errors.push(`${l.id} is unticked: tick it with evidence or write "N/A - <reason>"`);
  }
  return { ok: errors.length === 0, errors };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const templatePath = process.env.PR_TEMPLATE ?? new URL("../pull_request_template.md", import.meta.url);
  const result = checkDod(process.env.PR_BODY ?? "", readFileSync(templatePath, "utf8"));
  if (result.ok) { console.log("DoD block check passed: every line is ticked or N/A with a reason."); process.exit(0); }
  for (const e of result.errors.slice(0, 30)) console.log(`::error title=DoD-miss: MERGE-0::${e}`);
  if (result.errors.length > 30) console.log(`::error title=DoD-miss: MERGE-0::and ${result.errors.length - 30} more`);
  process.exit(1);
}
