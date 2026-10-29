// beta.36 CLI accuracy: the npm launcher's `vibead uninstall` leaves no vibead
// command (items 1, 2), the cache is pruned (2), unsupported platforms say so (9),
// and no shipped text names Gemini or claims "asks first" for install (4, 8).
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, sep } from 'node:path';
import test from 'node:test';
import { MANUAL, globalPrefix, npmUninstall, removeKitCache, removePackage } from '../lib/uninstall.mjs';
import { pruneOldKits } from '../lib/install.mjs';
import { runPostinstall } from '../lib/postinstall.mjs';

const temp = async t => { const d = await mkdtemp(join(tmpdir(), 'vibead-npm-b36-')); t.after(() => rm(d, { recursive: true, force: true })); return d; };
const root = new URL('../../', import.meta.url).pathname;

test('item 1: uninstall runs the kit, clears the cache, then removes the npm package', async t => {
  const dir = await temp(t);
  const cache = join(dir, 'cache');
  await mkdir(join(cache, '0.1.0-beta.36-linux-x64-0123456789ab'), { recursive: true });
  const order = []; const lines = [];
  const code = await npmUninstall({ env: { VIBEAD_CACHE_DIR: cache }, log: l => lines.push(l),
    runKit: async () => { order.push('kit'); return 0; },
    remove: () => { order.push('npm'); return { removed: true, line: 'Removed the npm package @vibead/cli (the vibead command).' }; } });
  assert.equal(code, 0);
  assert.deepEqual(order, ['kit', 'npm']);
  assert.equal(existsSync(cache), false);
  assert.match(lines.join('\n'), /Removed the npm package/);
});

test('item 1: a failed kit uninstall keeps the command so the user can retry', async t => {
  const dir = await temp(t);
  let removed = false; const lines = [];
  const code = await npmUninstall({ env: { VIBEAD_CACHE_DIR: join(dir, 'c') }, log: l => lines.push(l), runKit: async () => 3, remove: () => { removed = true; return { removed: true, line: '' }; } });
  assert.equal(code, 3); assert.equal(removed, false);
  assert.match(lines.join('\n'), /kept the vibead command/);
});

test('item 1: npm uninstall -g runs for this prefix; without a global prefix it prints the command', () => {
  const calls = [];
  const ok = removePackage({ prefix: '/p', execPath: '/n/bin/node', spawn: (cmd, args) => { calls.push([cmd, ...args]); return cmd === 'npm' ? { status: 0 } : { error: { code: 'ENOENT' } }; } });
  assert.equal(ok.removed, true);
  assert.deepEqual(calls.map(c => c[0]), ['/n/bin/npm', 'npm']);
  assert.deepEqual(calls[1].slice(1), ['uninstall', '--global', '--prefix', '/p', '--no-fund', '--no-audit', '--loglevel=error', '@vibead/cli']);
  assert.deepEqual(removePackage({ prefix: null }), { removed: false, line: MANUAL });
  assert.equal(removePackage({ prefix: '/p', spawn: () => ({ status: 1 }) }).line, MANUAL);
  assert.equal(globalPrefix(`/usr/local${sep}lib${sep}node_modules${sep}@vibead${sep}cli${sep}bin${sep}vibead.mjs`), '/usr/local');
  assert.equal(globalPrefix('/home/u/.npm/_npx/abc/node_modules/@vibead/cli/bin/vibead.mjs'), null);
});

test('item 2: the cache keeps only the current kit; shared folders lose nothing else', async t => {
  const cache = await temp(t);
  for (const n of ['0.1.0-beta.34-linux-x64-aaaaaaaaaaaa', '0.1.0-beta.35-linux-x64-bbbbbbbbbbbb', '0.1.0-beta.36-linux-x64-cccccccccccc', '.install-xyz', 'mine']) await mkdir(join(cache, n));
  await pruneOldKits(cache, '0.1.0-beta.36-linux-x64-cccccccccccc');
  assert.deepEqual((await readdir(cache)).sort(), ['.install-xyz', '0.1.0-beta.36-linux-x64-cccccccccccc', 'mine']);
  await removeKitCache(cache);
  assert.deepEqual(await readdir(cache), ['mine']);
});

test('item 9: on Linux arm64 the postinstall says it is unsupported, not "setup finishes later"', async () => {
  const warnings = [];
  const r = await runPostinstall({ env: { VIBEAD_ZERO_STEP: '1' }, stdoutIsTTY: true, ancestorStdoutIsTTY: true, uid: 1000, approved: true, warn: w => warnings.push(w),
    ensure: async () => { throw new Error('Unsupported platform linux-arm64. Supported: macOS (Apple Silicon and Intel) and Linux x64 (glibc >= 2.34); Linux arm64 is not supported yet.'); } });
  assert.equal(r.skipped, 'unsupported-platform');
  assert.match(warnings.join('\n'), /Linux arm64 is not supported yet.*npm uninstall -g @vibead\/cli/);
  assert.doesNotMatch(warnings.join('\n'), /setup finishes/);
});

test('items 4, 6, 8, 9: shipped text names only Claude Code, Codex and OpenCode and matches zero-step install', async () => {
  const pkg = JSON.parse(await readFile(join(root, 'npm/package.json'), 'utf8'));
  assert.doesNotMatch(pkg.description, /gemini/i);
  for (const file of ['README.md', 'npm/README.md', 'install/README.md', 'BETA.md', 'ENTERPRISE-DEMO.md', 'install/install.sh']) {
    const text = await readFile(join(root, file), 'utf8');
    assert.doesNotMatch(text, /gemini/i, file);
    assert.doesNotMatch(text, /&& vibead enable/, `${file}: install needs no enable`);
    assert.doesNotMatch(text, /optional shell alias|Codex\*\* is opt-in/, file);
  }
  for (const file of ['README.md', 'npm/README.md']) {
    const text = await readFile(join(root, file), 'utf8');
    assert.match(text, /brew install vibead\/tap\/vibead && vibead /, file);
    assert.match(text, /Linux arm64 and Windows are not supported yet/, file);
    assert.match(text, /npm warn install-scripts/, file);
    assert.match(text, /\*\*Uninstall:\*\* `vibead uninstall`/, file);
  }
});

test('item 1: after npm uninstall -g the empty @vibead scope folder goes; a non-empty one stays', async t => {
  const prefix = await temp(t);
  const scope = join(prefix, 'lib', 'node_modules', '@vibead');
  await mkdir(scope, { recursive: true });
  assert.equal(removePackage({ prefix, spawn: () => ({ status: 0 }) }).removed, true);
  assert.equal(existsSync(scope), false);
  await mkdir(join(scope, 'other'), { recursive: true });
  removePackage({ prefix, spawn: () => ({ status: 0 }) });
  assert.ok(existsSync(join(scope, 'other')));
});

test('item 2: a cached kit start also prunes older kits', async () => {
  const src = await readFile(join(root, 'npm/lib/install.mjs'), 'utf8');
  assert.match(src, /await access\(executable\); await pruneOldKits\(cache/);
});
