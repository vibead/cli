import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { platformKey, verifyChecksum } from '../lib/install.mjs';

test('accepts release platforms and rejects unavailable binaries', () => {
  assert.equal(platformKey('darwin', 'arm64'), 'darwin-arm64');
  assert.equal(platformKey('darwin', 'x64'), 'darwin-x64');
  assert.equal(platformKey('linux', 'x64'), 'linux-x64');
  assert.throws(() => platformKey('linux', 'arm64'), /Unsupported platform/);
  assert.throws(() => platformKey('win32', 'x64'), /Unsupported platform/);
});

test('rejects modified downloads before extraction', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'vibead-integrity-'));
  try {
    const file = join(dir, 'archive');
    const expected = createHash('sha256').update('verified content').digest('hex');
    await writeFile(file, 'verified content');
    await verifyChecksum(file, expected);
    await writeFile(file, 'modified content');
    await assert.rejects(verifyChecksum(file, expected), /checksum mismatch/);
  } finally { await rm(dir, { recursive: true, force: true }); }
});
