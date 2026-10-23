#!/usr/bin/env node
// DoD block check (QA's MERGE-0 fast-fail, docs/quality/definition-of-done.md).
// A ready PR's body must carry the "## Definition of Done" block with every line
// ID from .github/pull_request_template.md, each one either
//   - ticked with evidence ("- [x] ID … <evidence>"): the DoD says every line is
//     "ticked with its evidence (link, command output, screenshot, run URL)", so
//     after the template's own words are removed the line must still hold a link,
//     a commit SHA, an issue/PR ref (#123), a `code` span, or at least 3 words,
//     and must not be a placeholder ("pending", "TBD", "TODO" …). MERGE-0,
//     MERGE-7 and SAFE-5, whose evidence the DoD defines as the PR body itself,
//     need only the tick plus that body part (BODY_EVIDENCE below); or
//   - marked "N/A - <reason>" (also "—", "–" or ":"), ticked or not, where the
//     reason is real text: not a <placeholder> and not "pending", "TBD", "TODO" ….
// The template's own text ("<run url>", "<captures>") never counts as evidence,
// with one exception: when the template pre-fills a per-repo answer
// ("→ in vibead/vibead: N/A — no web pages here") and the author ticks the line
// keeping that reason, it is their N/A (vibead/vibead#202; #293 (b)). BUG-6's
// evidence is the round number ("round 2 of 3").
// Parsing: "-", "*" and "+" bullets; a blockquoted block ("> - [x] …") is read
// as if unquoted; **bold**, __bold__ or `code` IDs are accepted; anything inside
// a ``` or ~~~ code fence is ignored (headings and checkboxes alike), except that
// a fence opening on the line right under a ticked item is that item's evidence
// (`gh pr checks` output under MERGE-2, vibead/vibead#193). A line that
// groups several IDs ("CLI-1 to CLI-12", "REL-1, REL-2") fails: one line per ID.
// What runs in CI: the single Docs check job in .github/workflows/docs-check.yml
// checks out only this file and the PR template from the PR's BASE commit
// (sparse, no credentials kept) and runs that copy against the event's PR body
// right after the first checkout, before any step runs PR code, under env -i,
// so a PR cannot edit or shim its own gate. Bootstrap: when the base has no
// check-dod.mjs yet (the PR that adds it), the step runs the PR's own copy and
// says so in a ::notice. The same script runs in
// vibead/vibead-ai, vibead/vibead and vibead/cli.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const HEADING = /^##[ \t]+Definition of Done[ \t]*$/;
const LEVEL2 = /^##[ \t]/;
const LINE = /^[ \t]*[-*+][ \t]+\[([ xX])\][ \t]+(\*\*|__|`)?([A-Z]+-\d+)(?:\*\*|__|`)?(?![\w])(.*)$/;
// "N/A", a dash, en/em dash or colon, then the reason (case-sensitive "N/A").
const NA = /(?<![\w/])N\/A[ \t]*[-–—:][ \t]*(.*)$/;
// A commit SHA: 7 to 40 hex characters as a whole word ("added" is not one).
const SHA = /\b[0-9a-f]{7,40}\b/;
// Evidence the DoD defines for one line without a link or sentence: BUG-6's
// "*Evidence:* the round number" (definition-of-done.md), e.g. "round 2 of 3".
export const ROUND = /\b(?:round|r)[ \t]*[1-9]\b|\b[1-9][ \t]*(?:of|\/)[ \t]*3\b/i;
const NA_ANY = /(?<![\w/])n\/a(?![\w])/i;
const PLACEHOLDER = /^[\s`*_"'([]*(?:<[^>]*>|pending|tbd|tbc|tba|todo|to do|fixme|wip|later|xxx+|n\/a|none|reason|why|\?+|…|\.{3})(?=$|[\s`*_"').,:;\]!?-])/i;
// A second ID right after the first: "CLI-1 to CLI-12", "CLI-1–12", "REL-1, REL-2", "UI-1/2".
const GROUPED = /^[ \t]*(?:to|through|thru|until|and|&|[-–—]|\.\.\.?|,|\/)[ \t]*(?:\*\*|__|`)?(?:[A-Z]+-)?\d+\b/;

// Markdown lines with blockquote markers stripped and fenced code blanked, so
// nothing inside a ``` / ~~~ fence is read as a heading or a checklist line.
// out.fences[i] holds the content of a fence whose opening line is i, so a fence
// right under a checklist line can count as that line's evidence (the template
// asks for pasted output such as `gh pr checks`).
export function readable(text) {
  const out = [];
  out.fences = [];
  let fence = null, at = -1;
  for (const raw of String(text ?? "").split(/\r?\n/)) {
    const l = raw.replace(/^(?:[ \t]{0,3}>[ \t]?)+/, "");
    const m = /^[ \t]{0,5}(`{3,}|~{3,})/.exec(l);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && /^[ \t]{0,5}[`~]+[ \t]*$/.test(l)) fence = null;
      else out.fences[at] += `${l}\n`;
      out.push("");
    } else if (m) { fence = m[1]; at = out.length; out.fences[at] = ""; out.push(""); }
    else out.push(l);
  }
  return out;
}

// The DoD section: from "## Definition of Done" to the next level-2 heading
// ("### …" does not end it) or the end. null when the heading is missing.
export function dodSection(text) {
  const lines = readable(text);
  const start = lines.findIndex(l => HEADING.test(l));
  if (start < 0) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex(l => LEVEL2.test(l));
  const section = end < 0 ? rest : rest.slice(0, end);
  section.fences = lines.fences.slice(start + 1, start + 1 + section.length);
  return section;
}

// Checklist lines in a DoD section: [{ id, ticked, text, fence }], in order;
// fence is the content of a code fence that starts on the very next line.
export function dodLines(section) {
  return (section ?? []).flatMap((l, i) => {
    const m = LINE.exec(l);
    return m ? [{ id: m[3], ticked: m[1] !== " ", text: m[4], fence: section.fences?.[i + 1] ?? null }] : [];
  });
}

// The answer the template itself pre-fills for this repo ("… → in vibead/vibead:
// N/A — no web pages here"). An author who keeps it gives a real reason.
export function templateNA(templateText = "") {
  const m = /→ in [^:]*:[ \t]*(N\/A[ \t]*[-–—:][ \t]*\S.*)$/.exec(templateText.trim());
  return m ? m[1].replace(/\s+/g, " ").trim() : null;
}

// Template text per ID, so the template's own words never count as an author's.
export function templateLines(template) {
  const lines = dodLines(dodSection(template));
  if (lines.length === 0) throw new Error("check-dod: the PR template has no Definition of Done lines");
  return new Map(lines.map(l => [l.id, l.text]));
}

// The author's own words on a line: the template text, its "→ in <repo>: …"
// note, each literal piece of it and any <placeholder> removed.
export function ownText(text, templateText = "") {
  let own = ` ${text} `;
  const t = templateText.trim();
  const arrow = t.indexOf("→");
  const pieces = [t, arrow >= 0 ? t.slice(arrow) : "", arrow >= 0 ? t.slice(arrow).replace(/^→ in [^:]*:/, "") : ""];
  for (const p of (arrow >= 0 ? t.slice(0, arrow) : t).split(/<[^>]*>/)) pieces.push(p);
  for (const p of pieces.map(s => s.trim()).filter(s => s.length >= 4).sort((a, b) => b.length - a.length)) {
    own = own.split(p).join(" ");
  }
  return own.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Lines whose evidence the DoD defines as the PR body itself
// (docs/quality/definition-of-done.md "*Evidence:*", pinned by a test): MERGE-0
// "the PR body itself", MERGE-7 "the top of the PR body" (the body must have a
// "## Spec" section before the block), SAFE-5 "one line in the PR body" (the
// block's "Cost impact (SAFE-5):" line must be filled in). A tick is enough there.
export const BODY_EVIDENCE = ["MERGE-0", "MERGE-7", "SAFE-5"];

function bodyEvidenceProblem(id, lines, section) {
  if (id === "MERGE-7") {
    const spec = lines.findIndex(l => /^##[ \t]+Spec[ \t]*$/.test(l));
    const dod = lines.findIndex(l => HEADING.test(l));
    return spec >= 0 && spec < dod ? null : 'is ticked but the body has no "## Spec" section before the block';
  }
  if (id === "SAFE-5") {
    const cost = section.map(l => /^\s*Cost impact \(SAFE-5\):(.*)$/.exec(l)).find(Boolean);
    if (!cost) return 'is ticked but the block has no "Cost impact (SAFE-5): …" line';
    const v = cost[1].trim();
    // "none" is a valid answer here (the template offers <none | details>).
    return /[A-Za-z0-9]/.test(v) && !/^[`*_"']*(?:<[^>]*>|pending|tbd|tbc|tba|todo|to do|wip|\?+|…)/i.test(v) ? null : 'is ticked but the "Cost impact (SAFE-5):" line is empty or a placeholder';
  }
  return null;
}

// null when the text is evidence, else why not.
export function evidenceProblem(own) {
  const s = own.replace(/^[\s:;,.@→–—-]+/, "");
  if (!/[A-Za-z0-9]/.test(s)) return "has no evidence after the template wording";
  if (PLACEHOLDER.test(s)) return `has a placeholder ("${s.slice(0, 20)}") instead of evidence`;
  if (/https?:\/\/\S+/.test(s) || SHA.test(s) || /(?:^|[\s(])[\w.-]*\/?[\w.-]*#\d+\b/.test(s) || /`[^`\s][^`]*`/.test(s)) return null;
  const words = s.match(/[A-Za-z0-9][A-Za-z0-9'.-]*/g) ?? [];
  return words.filter(w => /[A-Za-z0-9]{2}/.test(w)).length >= 3 ? null : `has too little evidence ("${s.slice(0, 20)}"): add a link, SHA, #ref, command output or a sentence`;
}

// null when the line is a valid N/A, "none" when it has no N/A, else why not.
export function naProblem(own) {
  const m = NA.exec(own);
  if (m) {
    const reason = m[1].trim();
    if (!reason || !/[A-Za-z0-9]/.test(reason)) return 'has "N/A" without a reason: write "N/A - <reason>"';
    if (PLACEHOLDER.test(reason)) return `has a placeholder N/A reason ("${reason.slice(0, 20)}"): give the real reason`;
    return null;
  }
  if (/(?<![\w/])N\/A(?![\w])/.test(own)) return 'has "N/A" without a separator: write "N/A - <reason>"';
  if (NA_ANY.test(own)) return 'has a lowercase "n/a": write "N/A - <reason>" in capitals';
  return "none";
}

// { ok, errors[] }: errors name the missing block, missing IDs, unticked lines,
// ticks without evidence, placeholder N/As and grouped ID lines.
export function checkDod(body, template) {
  const want = templateLines(template);
  const lines = readable(body);
  const section = dodSection(body);
  if (!section) return { ok: false, errors: ['the PR body has no "## Definition of Done" block (copy it from .github/pull_request_template.md)'] };
  const have = dodLines(section);
  const errors = [];
  for (const l of have) {
    const g = GROUPED.exec(l.text);
    if (g) errors.push(`${l.id} line groups several IDs ("${l.id}${g[0].trimEnd()}"): split per ID, one "- [x] ID …" line each`);
  }
  const seen = new Set(have.map(l => l.id));
  const missing = [...want.keys()].filter(id => !seen.has(id));
  const plain = section.join("\n");
  const misformed = missing.filter(id => new RegExp(`(?<![\\w-])${id}(?![\\w])`).test(plain));
  const absent = missing.filter(id => !misformed.includes(id));
  if (absent.length) errors.push(`missing DoD lines: ${absent.join(", ")}`);
  for (const id of misformed) errors.push(`${id} found but not as a checklist line: write "- [x] ${id} …" (bullet "-", "*" or "+", then [x] or [ ], then the ID)`);
  for (const l of have) {
    if (!want.has(l.id)) continue;
    const prefilled = templateNA(want.get(l.id));
    if (l.ticked && prefilled && l.text.replace(/\s+/g, " ").includes(prefilled)) continue;
    const own = ownText(l.text, want.get(l.id));
    const na = naProblem(own);
    if (na === null) continue;
    if (!l.ticked) {
      errors.push(na === "none" ? `${l.id} is unticked: tick it with evidence or write "N/A - <reason>"` : `${l.id} ${na}`);
      continue;
    }
    // Ticked: an empty or placeholder N/A fails; otherwise the line needs evidence (prose
    // that mentions N/A is fine when it carries evidence).
    if (/^has (a placeholder|"N\/A" without a reason)/.test(na)) { errors.push(`${l.id} ${na}`); continue; }
    // A fence right under the line (`gh pr checks` output) is its evidence, unless
    // it is empty or opens with a placeholder ("TBD", "<gh pr checks output>").
    if (l.fence !== null && /[A-Za-z0-9]/.test(l.fence) && !PLACEHOLDER.test(l.fence.trim())) continue;
    if (l.id === "BUG-6" && ROUND.test(own)) continue;
    const ev = BODY_EVIDENCE.includes(l.id) ? bodyEvidenceProblem(l.id, lines, section) : evidenceProblem(own);
    if (ev) errors.push(BODY_EVIDENCE.includes(l.id) ? `${l.id} ${ev}` : `${l.id} is ticked but ${ev}`);
  }
  return { ok: errors.length === 0, errors };
}

export function main(env = process.env, out = console.log) {
  const templatePath = env.PR_TEMPLATE ?? new URL("../pull_request_template.md", import.meta.url);
  const result = checkDod(env.PR_BODY ?? "", readFileSync(templatePath, "utf8"));
  if (result.ok) { out("DoD block check passed: every line is ticked with evidence or N/A with a reason."); return 0; }
  for (const e of result.errors.slice(0, 30)) out(`::error title=DoD-miss: MERGE-0::${e}`);
  if (result.errors.length > 30) out(`::error title=DoD-miss: MERGE-0::and ${result.errors.length - 30} more`);
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main());
