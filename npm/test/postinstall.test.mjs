import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { installTimeWiringAllowed } from '../lib/identity.mjs';
import { SETUP_LATER, runPostinstall as runAny } from '../lib/postinstall.mjs';
import { ZERO_STEP_CONSENT_APPROVED, zeroStepEnabled } from '../lib/consent.mjs';

// Every test below except the sign-off ones runs with zero-step switched on.
const runPostinstall = options => runAny({ approved: true, ...options });

const NOTICE = 'Installing this package turns on a short sponsored line in Claude Code, Codex and OpenCode on this computer. The line is labelled [Ad] and appears in the agent\'s status area while it works. It does not read or change your prompts, code or replies. Turn it off at any time with: vibead disable';

test('install-time wiring is off for CI, ignore-scripts and a non-TTY', () => {
  assert.equal(installTimeWiringAllowed({ env: { CI: 'true' }, stdoutIsTTY: true }), false);
  assert.equal(installTimeWiringAllowed({ env: { CI: '1' }, stdoutIsTTY: true, ancestorStdoutIsTTY: true }), false);
  assert.equal(installTimeWiringAllowed({ env: { CI: '0' }, stdoutIsTTY: true }), true);
  assert.equal(installTimeWiringAllowed({ env: { CI: 'false' }, stdoutIsTTY: true }), true);
  assert.equal(installTimeWiringAllowed({ env: { npm_config_ignore_scripts: 'true' }, stdoutIsTTY: true }), false);
  assert.equal(installTimeWiringAllowed({ env: {}, stdoutIsTTY: false }), false);
  assert.equal(installTimeWiringAllowed({ env: {}, stdoutIsTTY: false, ancestorStdoutIsTTY: true }), true);
  assert.equal(installTimeWiringAllowed({ env: {}, stdoutIsTTY: true }), true);
});

test('a gated postinstall does not download or spawn', async () => {
  let called = false;
  const touch = () => { called = true; };
  for (const env of [{ CI: 'true' }, { npm_config_ignore_scripts: 'true' }, {}]) {
    const tty = !('CI' in env) && env.npm_config_ignore_scripts !== 'true';
    const result = await runPostinstall({ env, stdoutIsTTY: !tty, ancestorStdoutIsTTY: false, spawn: touch, ensure: touch });
    assert.equal(result.code, 0);
    assert.equal(result.skipped, 'gated');
  }
  assert.equal(called, false);
});

test('sudo re-execs as SUDO_USER and the parent does not download', async () => {
  const spawned = [];
  let ensured = false;
  const result = await runPostinstall({
    env: { SUDO_USER: 'ada', HOME: '/root' },
    stdoutIsTTY: true,
    uid: 0,
    argv: ['node', 'lib/postinstall.mjs'],
    lookup: () => ({ user: 'ada', uid: 1000, gid: 1000, home: '/home/ada' }),
    spawn: (cmd, args, options) => { spawned.push({ cmd, args, options }); return { status: 0 }; },
    ensure: async () => { ensured = true; return '/kit'; },
  });
  assert.equal(result.dropped, true);
  assert.equal(result.code, 0);
  assert.equal(ensured, false);
  assert.equal(spawned.length, 1);
  assert.equal(spawned[0].options.uid, 1000);
  assert.equal(spawned[0].options.gid, 1000);
  assert.equal(spawned[0].options.env.HOME, '/home/ada');
  assert.equal(spawned[0].options.env.USER, 'ada');
  assert.equal(spawned[0].options.env.VIBEAD_WIRE_DROPPED, '1');
});

test('an unresolved SUDO_USER writes nothing', async () => {
  const warnings = [];
  let ensured = false;
  const result = await runPostinstall({
    env: { SUDO_USER: 'missing' },
    stdoutIsTTY: true,
    uid: 0,
    lookup: () => null,
    spawn: () => { throw new Error('should not spawn'); },
    ensure: async () => { ensured = true; return '/kit'; },
    warn: message => warnings.push(message),
  });
  assert.equal(result.skipped, 'root-unresolved');
  assert.equal(ensured, false);
  assert.deepEqual(warnings, [SETUP_LATER]);
});

test('VIBEAD_KIT is wired without a download, and a missing kit still exits 0', async () => {
  const spawned = [];
  let ensured = false;
  const ok = await runPostinstall({
    env: {},
    stdoutIsTTY: true,
    uid: 1000,
    kit: '/tmp/vibead-kit',
    spawn: (cmd, args) => { spawned.push([cmd, args]); return { status: 0, stdout: 'notice\n\nvibead disable\n' }; },
    showNotice: () => {},
    ensure: async () => { ensured = true; return '/downloaded'; },
  });
  assert.equal(ok.code, 0);
  assert.equal(ensured, false);
  assert.deepEqual(spawned, [['/tmp/vibead-kit', ['__wrapperless', 'wire', '--announce']]]);

  const warnings = [];
  const failed = await runPostinstall({
    env: {},
    stdoutIsTTY: true,
    uid: 1000,
    ensure: async () => { throw new Error('offline'); },
    warn: message => warnings.push(message),
  });
  assert.equal(failed.code, 0);
  assert.equal(failed.skipped, 'no-kit');
  assert.deepEqual(warnings, [SETUP_LATER]);
});

test('pending sign-off: the switch is off and the README still shows the asking install', async () => {
  assert.equal(ZERO_STEP_CONSENT_APPROVED, false, 'flip only with the signed-off wording (vibead/vibead-ai#235)');
  assert.equal(zeroStepEnabled({}), false);
  assert.equal(zeroStepEnabled({ VIBEAD_ZERO_STEP: 'true' }), false);
  assert.equal(zeroStepEnabled({ VIBEAD_ZERO_STEP: '1' }), true);
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  assert.ok(!readme.includes(NOTICE), 'the unapproved sentence is not on the npm page');
  assert.match(readme, /npm i -g @vibead\/cli && vibead enable/);
  const design = await readFile(new URL('../../docs/system-design/README.md', import.meta.url), 'utf8');
  assert.ok(design.includes('LEGAL WORDING - pending Gaurav sign-off'));
  assert.ok(design.includes(NOTICE));
  assert.ok(design.includes('VibeAd will show a sponsored [Ad] line here. Turn it off: vibead disable'));
});

test('pending sign-off: the default postinstall downloads nothing and spawns nothing, even with a terminal', async () => {
  let touched = false;
  const touch = () => { touched = true; return { status: 0 }; };
  const result = await runAny({ env: {}, stdoutIsTTY: true, ancestorStdoutIsTTY: true, uid: 1000, spawn: touch, ensure: async () => { touched = true; return '/kit'; } });
  assert.deepEqual(result, { code: 0, skipped: 'pending-sign-off' });
  assert.equal(touched, false);
  const spawned = [];
  const optedIn = await runAny({
    env: { VIBEAD_ZERO_STEP: '1' }, stdoutIsTTY: true, uid: 1000, kit: '/kit',
    spawn: (cmd, args) => { spawned.push([cmd, args]); return { status: 0, stdout: 'notice\nvibead disable\n' }; },
    showNotice: () => {},
  });
  assert.equal(optedIn.status, 0);
  assert.deepEqual(spawned, [['/kit', ['__wrapperless', 'wire', '--announce']]]);
});

test('an npm upgrade (N to N+1) runs the new kit wire with no manual step, and the notice the kit prints is shown as is', async () => {
  const runs = [];
  const shown = [];
  for (const kit of ['/home/u/.vibead/versions/0.1.0-beta.31/vibead-beta', '/home/u/.vibead/versions/0.1.0-beta.32/vibead-beta']) {
    const result = await runPostinstall({
      env: {}, stdoutIsTTY: true, uid: 1000,
      ensure: async () => kit,
      spawn: (cmd, args) => { runs.push([cmd, args.join(' ')]); return { status: 0, stdout: `${NOTICE}\n\nvibead disable\n` }; },
      showNotice: text => shown.push(text),
    });
    assert.equal(result.code, 0);
  }
  assert.deepEqual(runs.map(r => r[1]), ['__wrapperless wire --announce', '__wrapperless wire --announce']);
  assert.match(runs[1][0], /beta\.32/);
  assert.equal(shown.length, 2);
  assert.ok(shown.every(text => text.endsWith('vibead disable')));
});

test('a kit that fails or prints nothing leaves the install green and says setup finishes on first run', async () => {
  for (const reply of [{ status: 1, stdout: '' }, { status: 0, stdout: '' }, { error: new Error('ENOENT') }]) {
    const warnings = [];
    const result = await runPostinstall({ env: {}, stdoutIsTTY: true, uid: 1000, kit: '/kit', spawn: () => reply, warn: m => warnings.push(m), showNotice: () => { throw new Error('no notice'); } });
    assert.equal(result.code, 0);
    assert.equal(result.skipped, 'wire-failed');
    assert.deepEqual(warnings, [SETUP_LATER]);
  }
});

test('package.json declares the postinstall only after sign-off, with plain node and no shell', async () => {
  // npm 12 blocks global install scripts by default and warns about each one,
  // and npm 11 lists them for review. A postinstall that does nothing until
  // sign-off would only add that warning, so it is declared in the same PR
  // that flips ZERO_STEP_CONSENT_APPROVED.
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(Boolean(pkg.scripts?.postinstall), ZERO_STEP_CONSENT_APPROVED);
  if (pkg.scripts?.postinstall) assert.equal(pkg.scripts.postinstall, 'node lib/postinstall.mjs');
  assert.ok(pkg.files === undefined || pkg.files.some(f => f.startsWith('lib')), 'lib/ ships in the tarball');
});
