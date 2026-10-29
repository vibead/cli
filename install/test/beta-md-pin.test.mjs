// beta.36 RC2 (Nina 01:55 AEDT Oct 30): BETA.md here must be byte-identical to the kit's
// BETA.md (vibead/vibead distribution/public/BETA.md). Neither repo can read the other in CI,
// so both pin the same SHA-256: vibead/vibead distribution/kit-docs.test.mjs pins the kit copy
// to this exact value. Change both pins together, in the same reviewed wording change.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';

export const BETA_MD_SHA256 = '0b8d2d27543aba4bc545486338552680e9fb2f2c426c3f12c63e24702337248a';

test('BETA.md is byte-identical to the kit BETA.md (pinned SHA-256 shared with vibead/vibead)', () => {
  const sha = createHash('sha256').update(readFileSync(new URL('../../BETA.md', import.meta.url))).digest('hex');
  assert.equal(sha, BETA_MD_SHA256, 'BETA.md differs from the kit copy: copy distribution/public/BETA.md byte for byte and update both pins');
});

// beta.36 RC3 QA (03:48 AEDT Oct 30): README.md carries the approved Codex sentence (Nina 02:29
// AEDT Oct 30) byte-exact as its own sentence, the same one BETA.md has; the old trust line
// and the double-semicolon form are gone.
export const CODEX_TRUST_SENTENCE = "Codex asks you to trust VibeAd's hooks; ads show after you choose Trust. It asks again each time you turn VibeAd off and back on.";
test('README.md and BETA.md carry the approved Codex sentence as one sentence', () => {
  for (const f of ['README.md', 'BETA.md']) {
    const text = readFileSync(new URL(`../../${f}`, import.meta.url), 'utf8');
    assert.equal(text.split(CODEX_TRUST_SENTENCE).length - 1, 1, `${f}: the approved sentence once`);
    assert.doesNotMatch(text, /;\s*Codex asks you to trust/u, `${f}: the sentence is joined to the one before by a semicolon`);
    assert.doesNotMatch(text, /choose Trust\.?$|hooks; choose Trust/mu, `${f}: the old trust line`);
  }
  assert.ok(readFileSync(new URL('../../README.md', import.meta.url), 'utf8').includes(`Open a new terminal after installing. ${CODEX_TRUST_SENTENCE}`));
});
