import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { CODE_PATHS, checkDesignDoc, naReason, main, parseArgs } from "./check-design-doc.mjs";

const EXPECTED_PATHS = ["install/", "npm/"];
const CODE = "install/install.sh";
const OTHER = "README.md";

test("CODE_PATHS is pinned for this repo", () => assert.deepEqual(CODE_PATHS, EXPECTED_PATHS));

test("every code path counts", () => {
  for (const p of CODE_PATHS) assert.equal(checkDesignDoc([`${p}x/file.mjs`], "").ok, false, p);
});

test("paths outside the list never need the doc", () => {
  assert.equal(checkDesignDoc([OTHER, "docs/other.md"], "").ok, true);
  assert.equal(checkDesignDoc([`x${CODE}`], "").ok, true);
});

test("test-only changes don't count as code", () => {
  for (const t of ["test/a.mjs", "a.test.mjs", "test_a.py", "tests/a.tftest.hcl", "a.tftest.hcl"]) {
    assert.equal(checkDesignDoc([`${CODE_PATHS[0]}${t}`], "").ok, true, t);
  }
});

test("code plus a design-doc change passes; other docs don't", () => {
  assert.equal(checkDesignDoc([CODE, "docs/system-design/README.md"], "").ok, true);
  assert.equal(checkDesignDoc([CODE, "docs/other.md", "README.md"], "").ok, false);
  assert.deepEqual(checkDesignDoc([CODE, OTHER], "").code, [CODE]);
});

test("N/A needs a non-empty reason", () => {
  assert.equal(naReason("Design doc: N/A — refactor only"), "refactor only");
  assert.equal(naReason("- [x] design doc: n/a - tests only"), "tests only");
  assert.equal(naReason("Design doc: N/A – en dash"), "en dash");
  assert.equal(naReason("Design doc: N/A -- ascii"), "ascii");
  for (const bad of ["Design doc: N/A —", "Design doc: N/A — ", "Design doc: N/A — <reason>", "Design doc: N/A", "Design doc: N/A no dash", "Design doc updated", "", "text Design doc: N/A — inline is not a line"]) {
    assert.equal(naReason(bad), null, JSON.stringify(bad));
  }
  assert.equal(naReason("intro\n\nDesign doc: N/A — later line\n"), "later line");
  assert.equal(checkDesignDoc([CODE], "Design doc: N/A — no design change").ok, true);
  assert.equal(checkDesignDoc([CODE], "Design doc: N/A — <reason>").ok, false);
});

test("args: base and head required, unknown flags refused", () => {
  assert.deepEqual(parseArgs(["--base", "a", "--head", "b"]), { base: "a", head: "b" });
  assert.throws(() => parseArgs(["--base", "a"]));
  assert.throws(() => parseArgs(["--base", "a", "--head"]));
  assert.throws(() => parseArgs(["--base", "a", "--head", "b", "--nope", "c"]));
});

function repo(t) {
  const dir = mkdtempSync(join(tmpdir(), "design-doc-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  const git = (...a) => execFileSync("git", ["-c", "user.name=t", "-c", "user.email=t@t", ...a], { cwd: dir, encoding: "utf8" });
  const write = (f, s = "x\n") => { mkdirSync(dirname(join(dir, f)), { recursive: true }); writeFileSync(join(dir, f), s); };
  git("init", "-q", "-b", "main");
  write(OTHER); write(CODE, "v1\n"); git("add", "-A"); git("commit", "-qm", "base");
  git("checkout", "-qb", "pr");
  return { dir, git, write };
}

const run = (dir, argv, env = {}) => { const out = []; const code = main(argv, env, dir, l => out.push(l)); return { code, out: out.join("\n") }; };

test("git: code change without the doc fails, with the doc passes", t => {
  const { dir, git, write } = repo(t);
  write(CODE, "v2\n"); git("commit", "-qam", "code");
  const fail = run(dir, ["--base", "main", "--head", "HEAD"]);
  assert.equal(fail.code, 1); assert.match(fail.out, /Design doc not updated/); assert.ok(fail.out.includes(CODE));
  write("docs/system-design/README.md"); git("add", "-A"); git("commit", "-qm", "doc");
  assert.equal(run(dir, ["--base", "main", "--head", "HEAD"]).code, 0);
});

test("git: body from --body-file or PR_BODY", t => {
  const { dir, git, write } = repo(t);
  write(CODE, "v2\n"); git("commit", "-qam", "code");
  write("body.md", "Fixes #1\nDesign doc: N/A — config value only\n");
  assert.equal(run(dir, ["--base", "main", "--head", "HEAD", "--body-file", join(dir, "body.md")]).code, 0);
  assert.equal(run(dir, ["--base", "main", "--head", "HEAD"], { PR_BODY: "Design doc: N/A — copy fix" }).code, 0);
  assert.equal(run(dir, ["--base", "main", "--head", "HEAD"], { PR_BODY: "Design doc: N/A — " }).code, 1);
});

test("git: compares against the merge base, so main's own changes don't count", t => {
  const { dir, git, write } = repo(t);
  git("checkout", "-q", "main"); write(CODE, "main moved\n"); git("commit", "-qam", "main code");
  git("checkout", "-q", "pr"); write(OTHER, "pr\n"); git("commit", "-qam", "pr readme");
  assert.equal(run(dir, ["--base", "main", "--head", "pr"]).code, 0);
});

test("git: a rename out of a code path still counts", t => {
  const { dir, git } = repo(t);
  git("mv", CODE, "moved.txt"); git("commit", "-qm", "mv");
  assert.equal(run(dir, ["--base", "main", "--head", "HEAD"]).code, 1);
});

test("git: bad ref or missing args exit 2", t => {
  const { dir } = repo(t);
  assert.equal(run(dir, ["--base", "nope", "--head", "HEAD"]).code, 2);
  assert.equal(run(dir, ["--head", "HEAD"]).code, 2);
});
