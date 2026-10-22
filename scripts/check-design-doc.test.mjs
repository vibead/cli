import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { CODE_PATHS, checkDesignDoc, countDocLines, isCode, naReason, main, parseArgs } from "./check-design-doc.mjs";

// Per-repo config (the rest of this file is identical in vibead-ai, vibead and cli).
const EXPECTED_PATHS = ["install/", "npm/", "packaging/", ".github/workflows/"];
const CODE = "install/install.sh";
// Design-relevant files QA showed passing with no doc change (vibead-ai#185, vibead#151, cli#33): each must fail now.
const MUST_WATCH = ["packaging/homebrew/Casks/v/vibead.rb", "packaging/homebrew/Formula/vibead.rb", ".github/workflows/sign-release.yml", ".github/workflows/installers.yml"];
// A Markdown file inside a watched folder: docs, not code.
const MD_IN_WATCHED = "npm/README.md";
const OTHER = "README.md";
const DOC = "docs/system-design/README.md";
const LINES = { [DOC]: 1 };

test("CODE_PATHS is pinned for this repo", () => assert.deepEqual(CODE_PATHS, EXPECTED_PATHS));

test("every code path counts (folders: any file under them; files: that file)", () => {
  for (const p of CODE_PATHS) {
    const f = p.endsWith("/") ? `${p}x/file.mjs` : p;
    assert.equal(checkDesignDoc([f], "").ok, false, f);
    assert.equal(checkDesignDoc([f, DOC], "", LINES).ok, true, f);
  }
});

test("each file QA found unwatched now needs the doc", () => {
  assert.ok(MUST_WATCH.length > 0);
  for (const f of MUST_WATCH) {
    assert.equal(isCode(f), true, f);
    assert.equal(checkDesignDoc([f], "").ok, false, f);
  }
});

test("a single-file entry watches that file only, not a prefix of it", () => {
  assert.equal(isCode("a/b.json", ["a/b.json"]), true);
  assert.equal(isCode("a/b.json.orig", ["a/b.json"]), false);
  assert.equal(isCode("a/b.json/c", ["a/b.json"]), false);
  assert.equal(isCode("a/b/c.json", ["a/b/"]), true);
  for (const p of CODE_PATHS.filter(p => !p.endsWith("/"))) {
    assert.equal(isCode(`${p}.orig`), false, p);
    assert.equal(isCode(`x${p}`), false, p);
  }
});

test("paths outside the list never need the doc", () => {
  assert.equal(checkDesignDoc([OTHER, "docs/other.md"], "").ok, true);
  assert.equal(checkDesignDoc([`x${CODE}`], "").ok, true);
});

test("Markdown in a watched folder is docs, not code (README-only change passes)", () => {
  assert.equal(isCode(MD_IN_WATCHED), false);
  assert.equal(checkDesignDoc([MD_IN_WATCHED], "").ok, true);
  assert.equal(checkDesignDoc([MD_IN_WATCHED.replace(/\.md$/u, ".MD")], "").ok, true);
  assert.equal(checkDesignDoc([MD_IN_WATCHED, CODE], "").ok, false);
  assert.deepEqual(checkDesignDoc([MD_IN_WATCHED, CODE], "").code, [CODE]);
});

test("test-only changes don't count as code", () => {
  const dir = CODE_PATHS.find(p => p.endsWith("/"));
  for (const t of ["test/a.mjs", "a.test.mjs", "test_a.py", "tests/a.tftest.hcl", "a.tftest.hcl"]) {
    assert.equal(checkDesignDoc([`${dir}${t}`], "").ok, true, t);
  }
});

test("code plus a non-trivial design-doc change passes; other docs don't", () => {
  assert.equal(checkDesignDoc([CODE, DOC], "", LINES).ok, true);
  assert.equal(checkDesignDoc([CODE, "docs/system-design/flows.md"], "", { "docs/system-design/flows.md": 3 }).ok, true);
  assert.equal(checkDesignDoc([CODE, "docs/other.md", "README.md"], "", { "docs/other.md": 5, "README.md": 5 }).ok, false);
  assert.deepEqual(checkDesignDoc([CODE, OTHER], "").code, [CODE]);
});

test("an empty or unchanged design-doc file doesn't count", () => {
  assert.equal(checkDesignDoc([CODE, "docs/system-design/empty.md"], "", {}).ok, false);
  assert.equal(checkDesignDoc([CODE, "docs/system-design/empty.md"], "", { "docs/system-design/empty.md": 0 }).ok, false);
  assert.deepEqual(checkDesignDoc([CODE, "docs/system-design/empty.md"], "").empty, ["docs/system-design/empty.md"]);
  // A non-Markdown file there (a .txt, an image) doesn't count either.
  assert.equal(checkDesignDoc([CODE, "docs/system-design/x.txt"], "", { "docs/system-design/x.txt": 4 }).ok, false);
});

test("countDocLines counts added non-blank lines per design-doc .md file", () => {
  const diff = [
    "diff --git a/docs/system-design/README.md b/docs/system-design/README.md",
    "--- a/docs/system-design/README.md", "+++ b/docs/system-design/README.md",
    "@@ -1,0 +2,3 @@", "+new line", "+", "+   ", "-old",
    "diff --git a/docs/system-design/blank.md b/docs/system-design/blank.md",
    "new file mode 100644", "--- /dev/null", "+++ b/docs/system-design/blank.md",
    "@@ -0,0 +1,2 @@", "+", "+\t",
    "diff --git a/docs/system-design/gone.md b/docs/system-design/gone.md",
    "deleted file mode 100644", "--- a/docs/system-design/gone.md", "+++ /dev/null",
    "@@ -1 +0,0 @@", "-text",
    "diff --git a/docs/system-design/x.txt b/docs/system-design/x.txt",
    "--- a/docs/system-design/x.txt", "+++ b/docs/system-design/x.txt", "@@ -1 +1 @@", "-a", "+b",
    "diff --git a/docs/system-design/plus.md b/docs/system-design/plus.md",
    "--- a/docs/system-design/plus.md", "+++ b/docs/system-design/plus.md", "@@ -1 +1 @@", "-a", "+++ looks like a header",
  ].join("\n");
  assert.deepEqual(countDocLines(diff), { "docs/system-design/README.md": 1, "docs/system-design/plus.md": 1 });
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
  write(OTHER); write(CODE, "v1\n"); write(DOC, "# Design\n");
  for (const f of [...MUST_WATCH, MD_IN_WATCHED]) write(f, "v1\n");
  git("add", "-A"); git("commit", "-qm", "base");
  git("checkout", "-qb", "pr");
  return { dir, git, write };
}

const run = (dir, argv, env = {}) => { const out = []; const code = main(argv, env, dir, l => out.push(l)); return { code, out: out.join("\n") }; };
const PR = ["--base", "main", "--head", "HEAD"];

test("git: code change without the doc fails, with the doc passes", t => {
  const { dir, git, write } = repo(t);
  write(CODE, "v2\n"); git("commit", "-qam", "code");
  const fail = run(dir, PR);
  assert.equal(fail.code, 1); assert.match(fail.out, /Design doc not updated/); assert.ok(fail.out.includes(CODE));
  write(DOC, "# Design\n\nNew flow.\n"); git("commit", "-qam", "doc");
  assert.equal(run(dir, PR).code, 0);
});

test("git: each QA repro file (one-line change, empty body) fails", t => {
  const { dir, git, write } = repo(t);
  for (const f of MUST_WATCH) {
    git("checkout", "-q", "-B", "pr", "main");
    write(f, "v2\n"); git("commit", "-qam", f);
    assert.equal(run(dir, PR).code, 1, f);
  }
});

test("git: a README-only change in a watched folder passes", t => {
  const { dir, git, write } = repo(t);
  write(MD_IN_WATCHED, "v2\n"); git("commit", "-qam", "readme");
  assert.equal(run(dir, PR).code, 0);
});

test("git: an empty or whitespace-only design-doc file doesn't satisfy the gate", t => {
  const { dir, git, write } = repo(t);
  write(CODE, "v2\n"); write("docs/system-design/empty.md", ""); git("add", "-A"); git("commit", "-qm", "empty");
  const r = run(dir, PR);
  assert.equal(r.code, 1); assert.match(r.out, /empty\.md changed, but with no added non-blank line/);
  write("docs/system-design/empty.md", "\n  \n\t\n"); git("commit", "-qam", "blank lines");
  assert.equal(run(dir, PR).code, 1);
  write(DOC, "# Design\n\n\n"); git("commit", "-qam", "README blank line only");
  assert.equal(run(dir, PR).code, 1);
  write("docs/system-design/empty.md", "Real content.\n"); git("commit", "-qam", "content");
  assert.equal(run(dir, PR).code, 0);
});

test("git: deleting or renaming a design doc without content doesn't count", t => {
  const { dir, git, write } = repo(t);
  write(CODE, "v2\n"); git("mv", DOC, "docs/system-design/RENAMED.md"); git("commit", "-qam", "rename doc");
  assert.equal(run(dir, PR).code, 1);
  git("rm", "-q", "docs/system-design/RENAMED.md"); git("commit", "-qm", "delete doc");
  assert.equal(run(dir, PR).code, 1);
});

test("git: a modified line in the design doc counts", t => {
  const { dir, git, write } = repo(t);
  write(CODE, "v2\n"); write(DOC, "# Design, revised\n"); git("commit", "-qam", "edit");
  assert.equal(run(dir, PR).code, 0);
});

test("git: body from --body-file or PR_BODY", t => {
  const { dir, git, write } = repo(t);
  write(CODE, "v2\n"); git("commit", "-qam", "code");
  write("body.md", "Fixes #1\nDesign doc: N/A — config value only\n");
  assert.equal(run(dir, [...PR, "--body-file", join(dir, "body.md")]).code, 0);
  assert.equal(run(dir, PR, { PR_BODY: "Design doc: N/A — copy fix" }).code, 0);
  assert.equal(run(dir, PR, { PR_BODY: "Design doc: N/A — " }).code, 1);
});

test("git: compares against the merge base, so main's own changes don't count", t => {
  const { dir, git, write } = repo(t);
  git("checkout", "-q", "main"); write(CODE, "main moved\n"); git("commit", "-qam", "main code");
  git("checkout", "-q", "pr"); write(OTHER, "pr\n"); git("commit", "-qam", "pr readme");
  assert.equal(run(dir, ["--base", "main", "--head", "pr"]).code, 0);
});

test("git: main's design-doc edits don't satisfy the PR's code change", t => {
  const { dir, git, write } = repo(t);
  git("checkout", "-q", "main"); write(DOC, "# Design (edited on main)\n"); git("commit", "-qam", "main doc");
  // The PR touches the doc only with a blank line, so only main's edit could make it count.
  git("checkout", "-q", "pr"); write(CODE, "v2\n"); write(DOC, "# Design\n\n"); git("commit", "-qam", "pr code + blank doc line");
  assert.equal(run(dir, ["--base", "main", "--head", "pr"]).code, 1);
});

test("git: a rename out of a code path still counts", t => {
  const { dir, git } = repo(t);
  git("mv", CODE, "moved.txt"); git("commit", "-qm", "mv");
  assert.equal(run(dir, PR).code, 1);
});

test("git: bad ref or missing args exit 2", t => {
  const { dir } = repo(t);
  assert.equal(run(dir, ["--base", "nope", "--head", "HEAD"]).code, 2);
  assert.equal(run(dir, ["--head", "HEAD"]).code, 2);
});
