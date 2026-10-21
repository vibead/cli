#!/usr/bin/env node
// Docs move with code (vibead/vibead-ai#143). A PR that changes a code path
// (config.json "code") must also change a doc (config.json "docs") or carry a
// "docs: n/a" line in its body saying why. Path check only: it never reads
// file contents. Test-only changes don't count as code. The same script runs
// in vibead-ai, vibead and cli; only config.json differs.
// CI: .github/workflows/docs-check.yml (needs GH_TOKEN, REPO, PR_NUMBER, PR_BODY).
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const TEST = /(^|\/)(test|tests|__tests__|fixtures)\/|\.test\.[cm]?[jt]sx?$|(^|\/)test_[^/]*\.py$|\.tftest\.hcl$/u;
const NA = /^[ \t]*(?:[-*][ \t]+)?(?:\[[xX ]\][ \t]+)?docs:[ \t]*n\/a\b/imu;

const matches = (file, patterns) => patterns.some(p => (p.endsWith("/") ? file.startsWith(p) : file === p));

export function checkDocs(files, body, config) {
  const code = files.filter(f => matches(f, config.code) && !TEST.test(f));
  const docs = files.filter(f => matches(f, config.docs));
  if (code.length === 0) return { ok: true, reason: "no code paths changed" };
  if (docs.length > 0) return { ok: true, reason: `docs changed: ${docs.join(", ")}` };
  if (NA.test(body ?? "")) return { ok: true, reason: "PR body says docs: n/a" };
  return { ok: false, code };
}

function changedFiles(repo, pr) {
  const out = execFileSync("gh", ["api", "--paginate", `repos/${repo}/pulls/${pr}/files?per_page=100`, "--jq", ".[] | .filename, (.previous_filename // empty)"], { encoding: "utf8" });
  return [...new Set(out.split("\n").filter(Boolean))];
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const config = JSON.parse(readFileSync(new URL("./config.json", import.meta.url), "utf8"));
  const { REPO, PR_NUMBER, PR_BODY = "" } = process.env;
  if (!REPO || !PR_NUMBER) { console.error("check-docs: REPO and PR_NUMBER are required"); process.exit(2); }
  const result = checkDocs(changedFiles(REPO, PR_NUMBER), PR_BODY, config);
  if (result.ok) { console.log(`Docs check passed: ${result.reason}.`); process.exit(0); }
  const shown = result.code.slice(0, 10).join(", ") + (result.code.length > 10 ? `, and ${result.code.length - 10} more` : "");
  console.log(`::error title=Docs not updated::This PR changes code (${shown}) but no docs. Update ${config.docs.join(" or ")} in this PR (including the Live / In review / Planned status in vibead-ai docs/system-design/README.md), or add a line "docs: n/a - <why>" to the PR body.`);
  process.exit(1);
}
