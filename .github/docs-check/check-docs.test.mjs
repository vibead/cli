import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { checkDocs } from "./check-docs.mjs";

const config = JSON.parse(readFileSync(new URL("./config.json", import.meta.url), "utf8"));
const code = config.code[0].endsWith("/") ? `${config.code[0]}x.mjs` : config.code[0];
const doc = config.docs[0].endsWith("/") ? `${config.docs[0]}x.md` : config.docs[0];

test("code without docs fails; with a doc change or a 'docs: n/a' line it passes", () => {
  assert.deepEqual(checkDocs([code], "", config), { ok: false, code: [code] });
  assert.equal(checkDocs([code, doc], "", config).ok, true);
  for (const body of ["docs: n/a - CI only", "Fixes #1\n\nDocs: N/A (refactor, no behaviour change)", "- [x] docs: n/a: test only", "  * docs:n/a"])
    assert.equal(checkDocs([code], body, config).ok, true, body);
  for (const body of ["no docs: n/a here", "docs: needed", "`docs: n/a`", "docs: na"])
    assert.equal(checkDocs([code], body, config).ok, false, body);
});

test("test-only and non-code changes need no docs", () => {
  const dir = config.code.find(p => p.endsWith("/")) ?? "src/";
  for (const file of [`${dir}a.test.mjs`, `${dir}test/a.mjs`, `${dir}tests/a.sh`, `${dir}test_a.py`, `${dir}a.tftest.hcl`, "LESSONS.md", "CONTRIBUTING.md"])
    assert.equal(checkDocs([file], "", config).ok, true, file);
  assert.equal(checkDocs([], "", config).ok, true);
});

test("every configured code path fails alone, and every configured doc path satisfies it", () => {
  for (const p of config.code) {
    const file = p.endsWith("/") ? `${p}main.x` : p;
    assert.equal(checkDocs([file], "", config).ok, false, file);
    for (const d of config.docs) assert.equal(checkDocs([file, d.endsWith("/") ? `${d}a.md` : d], "", config).ok, true, `${file} + ${d}`);
  }
  assert.ok(!config.docs.some(d => ["LESSONS.md", "CONTRIBUTING.md"].includes(d)), "LESSONS/CONTRIBUTING alone are not docs");
});
