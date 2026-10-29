// beta.36 RC3b (CLI Tester #4c): the old Codex trust line ("Codex will ask you to trust VibeAd's
// hooks; choose Trust") must not come back in any tracked file, reworded or not. It is matched by
// meaning: an instruction to pick a bare "Trust" ("…; choose Trust", "…hooks. Choose Trust.",
// "Then select “Trust”"), in any case, quoting, markdown or line wrapping. The approved copy is
// not matched: the runtime note's 'Choose "Trust all and continue"' and the 02:29 sentence
// "ads show after you choose Trust" (a statement, not an instruction). vibead/vibead
// distribution/codex-trust-paths.mjs (oldTrustLines) uses the same pattern.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { CODEX_TRUST_SENTENCE } from './beta-md-pin.test.mjs';

const root = new URL('../../', import.meta.url);
const flatten = (text) => text.replace(/[*_`"“”'‘’]/gu, '').replace(/\s+/gu, ' ').toLowerCase();
const OLD_TRUST_MEANING = /(?:^|[.;:!?(]\s?|\bthen\s|\band\s)(?:choose|select|pick|press|click|hit)\s+(?:the\s+)?trust(?!\s+all)(?![\w-])/gu;
export const oldTrustLines = (text) => {
  const flat = flatten(String(text));
  return [...flat.matchAll(OLD_TRUST_MEANING)].map((m) => flat.slice(Math.max(0, m.index - 50), m.index + m[0].length + 10).trim());
};
// Allow-list, by name only: this guard (its samples).
const ALLOWED = new Set(['install/test/no-old-trust-line.test.mjs']);

test('the old trust line is caught reworded; the approved copy is not', () => {
  for (const s of ["Codex will ask you to trust VibeAd's hooks; choose Trust", "Codex will ask you to trust VibeAd's hooks; choose Trust.",
    "Codex will ask you to trust VibeAd's hooks. Choose Trust.", 'Codex asks to trust the hooks.\nChoose **Trust**.', 'Then select “Trust”.',
    "trust VibeAd's hooks; CHOOSE TRUST", 'and pick `Trust` when asked'])
    assert.equal(oldTrustLines(s).length, 1, s);
  for (const s of [CODEX_TRUST_SENTENCE, 'Codex will ask you to review VibeAd\'s hooks ("Hooks need review"). Choose "Trust all and continue" to see ads.',
    'Choose Trust all and continue', 'trusted hooks', 'choose trustworthy'])
    assert.deepEqual(oldTrustLines(s), [], s);
});

test('no tracked text file carries the old trust line (allow-list: this guard)', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  assert.ok(tracked.includes('docs/system-design/README.md') && tracked.includes('install/README.md'), 'scans the docs too');
  const hits = [];
  for (const f of tracked) {
    if (ALLOWED.has(f)) continue;
    let bytes; try { bytes = readFileSync(new URL(f, root)); } catch { continue; }
    if (bytes.includes(0)) continue; // binary (the gif)
    for (const line of oldTrustLines(bytes.toString('utf8'))) hits.push(`${f}: ${line}`);
  }
  assert.deepEqual(hits, []);
});
