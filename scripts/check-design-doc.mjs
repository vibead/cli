#!/usr/bin/env node
// Design-doc gate (Gaurav, 2026-10-22): a PR that changes a flow, role, component, infra or
// sign-in must update docs/system-design/ in the same PR, or say in its body
//   Design doc: N/A — <reason>
// with a real reason. Path check only: it never reads file contents. Test-only changes don't count.
//
// Usage: node scripts/check-design-doc.mjs --base <ref> --head <ref> [--body-file <file>]
//        (or the PR body in the PR_BODY env var). Exit 0 pass, 1 fail, 2 usage or git error.
// The same script is in vibead/vibead-ai, vibead/vibead and vibead/cli; only CODE_PATHS differs.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const CODE_PATHS = ["install/", "npm/"];
export const DESIGN_DOC = "docs/system-design/";

const TEST = /(^|\/)(test|tests|__tests__|fixtures)\/|\.test\.[cm]?[jt]sx?$|(^|\/)test_[^/]*\.py$|\.tftest\.hcl$/u;
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

export function checkDesignDoc(files, body, codePaths = CODE_PATHS) {
  const code = files.filter(f => codePaths.some(p => f.startsWith(p)) && !TEST.test(f));
  const docs = files.filter(f => f.startsWith(DESIGN_DOC));
  if (code.length === 0) return { ok: true, reason: "no design-relevant paths changed" };
  if (docs.length > 0) return { ok: true, reason: `design doc changed: ${docs.join(", ")}` };
  const why = naReason(body);
  if (why) return { ok: true, reason: `PR body says Design doc: N/A — ${why}` };
  return { ok: false, code };
}

export function changedFiles(base, head, cwd = process.cwd()) {
  const out = execFileSync("git", ["diff", "--name-status", "-M", `${base}...${head}`], { cwd, encoding: "utf8" });
  const files = new Set();
  for (const line of out.split("\n").filter(Boolean)) for (const f of line.split("\t").slice(1)) files.add(f);
  return [...files];
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
  let args, files, body;
  try {
    args = parseArgs(argv);
    body = args["body-file"] ? readFileSync(args["body-file"], "utf8") : (env.PR_BODY ?? "");
    files = changedFiles(args.base, args.head, cwd);
  } catch (e) {
    log(`check-design-doc: ${e.message.split("\n")[0]}`);
    log("Usage: node scripts/check-design-doc.mjs --base <ref> --head <ref> [--body-file <file>] (or PR_BODY)");
    return 2;
  }
  const result = checkDesignDoc(files, body);
  if (result.ok) { log(`Design-doc check passed (${args.base}...${args.head}, ${files.length} files): ${result.reason}.`); return 0; }
  const shown = result.code.slice(0, 10).join(", ") + (result.code.length > 10 ? `, and ${result.code.length - 10} more` : "");
  log(`::error title=Design doc not updated::This PR changes ${shown} but not ${DESIGN_DOC}. Update ${DESIGN_DOC}README.md in this PR (flows, roles, components, infra, sign-in; diagrams; unbuilt pieces marked planned), or add a line "Design doc: N/A — <reason>" to the PR body.`);
  return 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exit(main(process.argv.slice(2)));
