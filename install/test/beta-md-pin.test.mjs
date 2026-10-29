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
