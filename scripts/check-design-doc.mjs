#!/usr/bin/env node
// Design-doc gate (Gaurav, 2026-10-22): a PR that changes a flow, role, component, infra, the
// build or release, or sign-in must update docs/system-design/ in the same PR, or say in its body
//   Design doc: N/A — <reason>
// with a real reason. Test-only and Markdown-only changes don't count as code.
// A design-doc change counts only if a .md file under docs/system-design/ gains at least one
// added or changed non-blank line, so an empty or whitespace-only file never satisfies the gate.
// The doc diff ignores whitespace (git diff -w --ignore-blank-lines), so re-indenting or adding
// trailing spaces or CRLF to an existing line doesn't count either.
//
// Usage: node scripts/check-design-doc.mjs --base <ref> --head <ref> [--body-file <file>]
//        (or the PR body in the PR_BODY env var). Exit 0 pass, 1 fail, 2 usage or git error.
// The same script is in vibead/vibead-ai, vibead/vibead and vibead/cli; only CODE_PATHS differs.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Per-repo config. An entry ending in "/" watches everything under it; any other entry is one file.
export const CODE_PATHS = ["install/", "npm/", "packaging/", ".github/workflows/"];
export const DESIGN_DOC = "docs/system-design/";

const TEST = /(^|\/)(test|tests|__tests__|fixtures)\/|\.test\.[cm]?[jt]sx?$|(^|\/)test_[^/]*\.py$|\.tftest\.hcl$/u;
const MARKDOWN = /\.md$/iu;
const NA = /^[ \t]*(?:[-*][ \t]+)?(?:\[[xX ]\][ \t]+)?design doc:[ \t]*n\/a[ \t]*(?:[—–]|-{1,2})[ \t]*(.*)$/imu;
const PLACEHOLDER = /^<[^>]*>$/u;

export function naReason(body) {
  for (const line of String(body ?? "").split(/\r?\n/u)) {
    const m = NA.exec(line);
    if (!m) continue;
    const reason = m[1].trim();
    if (reason && !PLACEHOLDER.test(reason)) return reason;
  }
  return null;
}

export function isCode(f, codePaths = CODE_PATHS) {
  const watched = codePaths.some(p => (p.endsWith("/") ? f.startsWith(p) : f === p));
  return watched && !TEST.test(f) && !MARKDOWN.test(f);
}

export const isDesignDoc = f => f.startsWith(DESIGN_DOC) && MARKDOWN.test(f);

// files: changed paths. docLines: { path: number of added or changed non-blank lines } for design docs.
export function checkDesignDoc(files, body, docLines = {}, codePaths = CODE_PATHS) {
  const code = files.filter(f => isCode(f, codePaths));
  const docs = files.filter(f => isDesignDoc(f) && (docLines[f] ?? 0) > 0);
  if (code.length === 0) return { ok: true, reason: "no design-relevant paths changed" };
  if (docs.length > 0) return { ok: true, reason: `design doc changed: ${docs.join(", ")}` };
  const why = naReason(body);
  if (why) return { ok: true, reason: `PR body says Design doc: N/A — ${why}` };
  const empty = files.filter(f => f.startsWith(DESIGN_DOC));
  return { ok: false, code, empty };
}

const git = (args, cwd) => execFileSync("git", ["-c", "core.quotePath=false", ...args], { cwd, encoding: "utf8", maxBuffer: 64 << 20 });

export function changedFiles(base, head, cwd = process.cwd()) {
  const out = git(["diff", "--name-status", "-M", `${base}...${head}`], cwd);
  const files = new Set();
  for (const line of out.split("\n").filter(Boolean)) for (const f of line.split("\t").slice(1)) files.add(f);
  return [...files];
}

// Counts added or changed non-blank lines per design-doc .md file (deleted files count 0).
// Expects a diff built with -w, so a whitespace-only edit has no + line to count.
export function countDocLines(diff) {
  const counts = {};
  let file = null, inHunk = false;
  for (const line of diff.split("\n")) {
    if (line.startsWith("diff --git ")) { file = null; inHunk = false; continue; }
    if (!inHunk) {
      if (line.startsWith("+++ ")) file = line.startsWith("+++ b/") ? line.slice(6) : null;
      else if (line.startsWith("@@")) inHunk = true;
      continue;
    }
    if (line.startsWith("@@")) continue;
    if (file && line.startsWith("+") && line.slice(1).trim() !== "") counts[file] = (counts[file] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).filter(([f]) => isDesignDoc(f)));
}

export function designDocLines(base, head, cwd = process.cwd()) {
  return countDocLines(git(["diff", "--no-color", "--no-ext-diff", "-w", "--ignore-blank-lines", "-U0", "-M", `${base}...${head}`, "--", DESIGN_DOC], cwd));
}

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (!["--base", "--head", "--body-file"].includes(k) || argv[i + 1] === undefined) throw new Error(`bad argument: ${k}`);
    args[k.slice(2)] = argv[++i];
  }
  if (!args.base || !args.head) throw new Error("--base and --head are required");
  return args;
}

export function main(argv, env = process.env, cwd = process.cwd(), log = console.log) {
  let args, files, body, docLines;
  try {
    args = parseArgs(argv);
    body = args["body-file"] ? readFileSync(args["body-file"], "utf8") : (env.PR_BODY ?? "");
    files = changedFiles(args.base, args.head, cwd);
    docLines = designDocLines(args.base, args.head, cwd);
  } catch (e) {
    log(`check-design-doc: ${e.message.split("\n")[0]}`);
    log("Usage: node scripts/check-design-doc.mjs --base <ref> --head <ref> [--body-file <file>] (or PR_BODY)");
    return 2;
  }
  const result = checkDesignDoc(files, body, docLines);
  if (result.ok) { log(`Design-doc check passed (${args.base}...${args.head}, ${files.length} files): ${result.reason}.`); return 0; }
  const shown = result.code.slice(0, 10).join(", ") + (result.code.length > 10 ? `, and ${result.code.length - 10} more` : "");
  const note = result.empty.length ? ` (${result.empty.join(", ")} changed, but with no added non-blank line in a .md file; whitespace-only edits don't count)` : "";
  log(`::error title=Design doc not updated::This PR changes ${shown} but not ${DESIGN_DOC}${note}. Update ${DESIGN_DOC}README.md in this PR (flows, roles, components, infra, build and release, sign-in; diagrams; unbuilt pieces marked planned), or add a line "Design doc: N/A — <reason>" to the PR body.`);
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)));
