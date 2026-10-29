import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, readdir, rm, writeFile } from 'node:fs/promises';
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

test('platforms may pin an earlier archive version (macOS on beta.12 while Linux is on beta.14)', async () => {
  const { platformRelease, release } = await import('../lib/install.mjs');
  assert.deepEqual(platformRelease('linux-x64'), { version: release.version, sha256: release.platforms['linux-x64'] });
  for (const key of ['darwin-arm64', 'darwin-x64']) {
    const entry = platformRelease(key);
    assert.match(entry.version, /^0\.1\.0-beta\.\d+$/);
    assert.match(entry.sha256, /^[0-9a-f]{64}$/);
  }
});

test('vibead --version prints the release version without downloading', async () => {
  const { execFileSync } = await import('node:child_process');
  const { mkdtemp, readdir } = await import('node:fs/promises');
  const { release } = await import('../lib/install.mjs');
  const cache = await mkdtemp(join(tmpdir(), 'vibead-version-'));
  for (const flag of ['--version', '-v']) {
    const out = execFileSync(process.execPath, [new URL('../bin/vibead.mjs', import.meta.url).pathname, flag], { encoding: 'utf8', env: { ...process.env, VIBEAD_CACHE_DIR: cache, HTTPS_PROXY: 'http://127.0.0.1:9' } });
    assert.equal(out.trim(), release.version);
  }
  assert.deepEqual(await readdir(cache), [], 'nothing downloaded or cached');
  await rm(cache, { recursive: true, force: true });
});

// beta.36: the real download + checksum path, against a local mirror (VIBEAD_RELEASE_BASE,
// as install.sh), and the ~/.cache folder it creates is recorded for `vibead uninstall`.
test('ensureInstalled downloads from VIBEAD_RELEASE_BASE, verifies the pinned sha, and records only the folders it created', { skip: !(process.platform === 'linux' && process.arch === 'x64') && 'Linux x64 only' }, async () => {
  const { execFileSync } = await import('node:child_process');
  const { cp, mkdir, readFile: read } = await import('node:fs/promises');
  const { createHash: hash } = await import('node:crypto');
  const { pathToFileURL } = await import('node:url');
  const work = await mkdtemp(join(tmpdir(), 'vibead-mirror-'));
  try {
    const version = '0.1.0-beta.99', key = 'linux-x64';
    const kit = join(work, 'kit', `vibead-beta-${key}`);
    await mkdir(kit, { recursive: true }); await writeFile(join(kit, 'vibead-beta'), '#!/bin/sh\necho kit\n');
    const dl = join(work, 'mirror', 'download', `v${version}`); await mkdir(dl, { recursive: true });
    const archive = join(dl, `vibead-beta-${version}-${key}.tar.gz`);
    execFileSync('tar', ['-czf', archive, '-C', join(work, 'kit'), `vibead-beta-${key}`]);
    const sha = hash('sha256').update(await read(archive)).digest('hex');
    const pkg = join(work, 'pkg'); await cp(new URL('..', import.meta.url).pathname, pkg, { recursive: true, filter: s => !s.includes('node_modules') });
    await writeFile(join(pkg, 'releases.json'), JSON.stringify({ version, platforms: { [key]: sha } }));
    const run = (home, base, flag = { VIBEAD_TEST_RELEASE: '1' }) => execFileSync(process.execPath, ['--input-type=module', '-e', `const m = await import(${JSON.stringify(pathToFileURL(join(pkg, 'lib', 'install.mjs')).href)}); console.log(await m.ensureInstalled());`],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: { PATH: process.env.PATH, HOME: home, VIBEAD_RELEASE_BASE: base, ...flag } });
    // Test-only gate: without VIBEAD_TEST_RELEASE=1 the base is refused before anything is written.
    const stray = join(work, 'home0'); await mkdir(stray);
    assert.throws(() => run(stray, pathToFileURL(join(work, 'mirror')).href, {}), /VIBEAD_RELEASE_BASE is for tests only/u);
    assert.deepEqual(await readdir(stray), [], 'nothing written without the test flag');
    const fresh = join(work, 'home1'); await mkdir(fresh);
    const exe = run(fresh, pathToFileURL(join(work, 'mirror')).href).trim();
    assert.equal(exe, join(fresh, '.cache', 'vibead', `${version}-${key}-${sha.slice(0, 12)}`, 'vibead-beta'));
    assert.deepEqual((await read(join(fresh, '.vibead', 'created-dirs'), 'utf8')).split('\n').filter(Boolean), [join(fresh, '.cache', 'vibead'), join(fresh, '.cache')]);
    const had = join(work, 'home2'); await mkdir(join(had, '.cache'), { recursive: true });
    run(had, pathToFileURL(join(work, 'mirror')).href);
    assert.deepEqual((await read(join(had, '.vibead', 'created-dirs'), 'utf8')).split('\n').filter(Boolean), [join(had, '.cache', 'vibead')], '~/.cache was already there');
    // A different archive at the base fails the pinned checksum: nothing is installed.
    await writeFile(archive, 'not the release');
    const bad = join(work, 'home3'); await mkdir(bad);
    assert.throws(() => run(bad, pathToFileURL(join(work, 'mirror')).href), /checksum mismatch/u);
  } finally { await rm(work, { recursive: true, force: true }); }
});

test('releaseUrl: VIBEAD_RELEASE_BASE is test-only; the default needs no flag', async () => {
  const { releaseUrl } = await import('../lib/install.mjs');
  assert.equal(releaseUrl('0.1.0-beta.36', 'linux-x64', {}), 'https://github.com/vibead/cli/releases/download/v0.1.0-beta.36/vibead-beta-0.1.0-beta.36-linux-x64.tar.gz');
  assert.throws(() => releaseUrl('0.1.0-beta.36', 'linux-x64', { VIBEAD_RELEASE_BASE: 'https://example.com/r' }), /VIBEAD_RELEASE_BASE is for tests only\. Unset it, or also set VIBEAD_TEST_RELEASE=1\./u);
  assert.throws(() => releaseUrl('0.1.0-beta.36', 'linux-x64', { VIBEAD_RELEASE_BASE: 'https://example.com/r', VIBEAD_TEST_RELEASE: 'yes' }), /tests only/u);
  assert.equal(releaseUrl('0.1.0-beta.36', 'linux-x64', { VIBEAD_RELEASE_BASE: 'file:///m/', VIBEAD_TEST_RELEASE: '1' }), 'file:///m/download/v0.1.0-beta.36/vibead-beta-0.1.0-beta.36-linux-x64.tar.gz');
});

// beta.36 (approved by Nina, delegated wording owner (Gaurav, Oct 29 2026), 23:01 AEDT):
// the npm launcher refuses a stray VIBEAD_RELEASE_BASE with the same line as install.sh.
test('npm launcher: VIBEAD_RELEASE_BASE without the test flag prints the exact install.sh line and exits 1', async () => {
  const { spawnSync } = await import('node:child_process');
  const { mkdtempSync, readdirSync, rmSync } = await import('node:fs');
  const { tmpdir } = await import('node:os');
  const { join: j } = await import('node:path');
  const home = mkdtempSync(j(tmpdir(), 'vibead-rb-'));
  try {
    const r = spawnSync(process.execPath, [new URL('../bin/vibead.mjs', import.meta.url).pathname, 'status'], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, VIBEAD_RELEASE_BASE: 'file:///nowhere' } });
    assert.equal(r.status, 1, r.stderr);
    assert.equal(r.stderr, 'vibead install: VIBEAD_RELEASE_BASE is for tests only. Unset it, or also set VIBEAD_TEST_RELEASE=1.\n');
    assert.deepEqual(readdirSync(home), [], 'nothing written');
  } finally { rmSync(home, { recursive: true, force: true }); }
});
