// DOC-3 (docs/quality/definition-of-done.md): the status legend is copied byte for byte into
// every copy of the DoD and every docs/system-design/README.md in vibead/vibead-ai, vibead/vibead
// and vibead/cli. Each repo pins the same SHA-256 below, so a change must be made in all three.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";

export const LEGEND_SHA256 = "e779d37f96a6e21e77b6e4cb7a54f0d04be44719ab22cc3c7720eb596c54c9de";
export const START = "<!-- status-legend:start -->";
export const END = "<!-- status-legend:end -->";
const root = new URL("../../", import.meta.url);
const FILES = ["docs/quality/definition-of-done.md", "docs/system-design/README.md"];

export function legend(text) {
  const a = text.indexOf(START);
  const b = text.indexOf(END);
  if (a < 0 || b < a || text.indexOf(START, a + 1) >= 0) return null;
  return text.slice(a, b + END.length);
}
const sha = s => createHash("sha256").update(s).digest("hex");
const present = FILES.filter(f => existsSync(new URL(f, root)));

test("the DoD carries the status legend", () => assert.ok(present.includes(FILES[0])));

for (const file of present) {
  test(`${file}: status legend matches the pinned SHA-256 shared by all three repos`, () => {
    const block = legend(readFileSync(new URL(file, root), "utf8"));
    assert.ok(block, `${file} needs exactly one ${START} … ${END} block`);
    assert.equal(sha(block), LEGEND_SHA256);
  });
}

test("the legend defines exactly three statuses, with no 'In review'", () => {
  const block = legend(readFileSync(new URL(FILES[0], root), "utf8"));
  const statuses = [...block.matchAll(/^- \*\*([^*]+)\*\*:/gmu)].map(m => m[1]);
  assert.deepEqual(statuses, ["Live", "Merged, not released", "Planned"]);
  assert.doesNotMatch(block, /in review/iu);
});

test("mutants: a one-word edit, a missing marker or a second block fails", () => {
  const block = legend(readFileSync(new URL(FILES[0], root), "utf8"));
  assert.notEqual(sha(block.replace("Live", "Released")), LEGEND_SHA256);
  assert.equal(legend(block.replace(END, "")), null);
  assert.equal(legend(block + "\n" + block), null);
});
