import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { installTimeWiringAllowed } from '../lib/identity.mjs';
import { SETUP_LATER, runPostinstall as runAny } from '../lib/postinstall.mjs';
import { ZERO_STEP_CONSENT_APPROVED, zeroStepEnabled } from '../lib/consent.mjs';

// Tests pass approved: true explicitly so they keep testing the on path if the
// default switch is ever set back to false; the switch-off tests pass false.
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

test('approved (vibead-ai#254): the switch is on and the npm README shows the approved sentence above the install command', async () => {
  assert.equal(ZERO_STEP_CONSENT_APPROVED, true, 'Gaurav approved the 2a sentence in vibead/vibead-ai#254');
  assert.equal(zeroStepEnabled({}), true);
  assert.equal(zeroStepEnabled({}, false), false);
  assert.equal(zeroStepEnabled({ VIBEAD_ZERO_STEP: 'true' }, false), false);
  assert.equal(zeroStepEnabled({ VIBEAD_ZERO_STEP: '1' }, false), true);
  const { createHash } = await import('node:crypto');
  assert.equal(createHash('sha256').update(NOTICE).digest('hex').slice(0, 16), 'efa0fa0d7903299a', '2a changed: approved text goes back to Gaurav, never an edit');
  const readme = await readFile(new URL('../README.md', import.meta.url), 'utf8');
  const at = readme.indexOf(NOTICE);
  assert.ok(at >= 0, 'the approved sentence is on the npm page');
  assert.ok(at < readme.indexOf('npm i -g @vibead/cli'), 'above the install command');
  assert.doesNotMatch(readme, /npm i -g @vibead\/cli && vibead enable/);
  const design = await readFile(new URL('../../docs/system-design/README.md', import.meta.url), 'utf8');
  assert.ok(design.includes('LEGAL WORDING - approved by Gaurav (vibead-ai#254)'));
  assert.ok(design.includes(NOTICE));
  assert.ok(design.includes('VibeAd will show a sponsored [Ad] line here. Turn it off: vibead disable'));
});

test('approved default: with no opt-in and no approved argument the postinstall passes the consent gate', async () => {
  // No terminal, so it stops at the next gate ('gated') without touching anything.
  assert.deepEqual(await runAny({ env: {}, stdoutIsTTY: false, ancestorStdoutIsTTY: false, uid: 1000 }), { code: 0, skipped: 'gated' });
});

test('switch off: the postinstall downloads nothing and spawns nothing, even with a terminal', async () => {
  let touched = false;
  const touch = () => { touched = true; return { status: 0 }; };
  const result = await runAny({ env: {}, approved: false, stdoutIsTTY: true, ancestorStdoutIsTTY: true, uid: 1000, spawn: touch, ensure: async () => { touched = true; return '/kit'; } });
  assert.deepEqual(result, { code: 0, skipped: 'pending-sign-off' });
  assert.equal(touched, false);
  const spawned = [];
  const optedIn = await runAny({
    env: { VIBEAD_ZERO_STEP: '1' }, approved: false, stdoutIsTTY: true, uid: 1000, kit: '/kit',
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

test('package.json declares the postinstall exactly when the switch is on, with plain node and no shell', async () => {
  // npm 12 blocks global install scripts by default and warns about each one,
  // and npm 11 lists them for review. A postinstall that does nothing until
  // sign-off would only add that warning, so it is declared in the same PR
  // that flips ZERO_STEP_CONSENT_APPROVED.
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'));
  assert.equal(Boolean(pkg.scripts?.postinstall), ZERO_STEP_CONSENT_APPROVED);
  if (pkg.scripts?.postinstall) assert.equal(pkg.scripts.postinstall, 'node lib/postinstall.mjs');
  assert.ok(pkg.files === undefined || pkg.files.some(f => f.startsWith('lib')), 'lib/ ships in the tarball');
});

test('install copy never promises install-time wiring: agents connect on install or on the first vibead run', async () => {
  // npm 12 blocks global install scripts; CI, --ignore-scripts and Homebrew run
  // none either. No README, quick start or design line may say the install alone wires.
  const root = new URL('../../', import.meta.url);
  const files = ['README.md', 'npm/README.md', 'docs/system-design/README.md', 'install/README.md'];
  for (const file of files) {
    const text = await readFile(new URL(file, root), 'utf8');
    assert.doesNotMatch(text, /this is the whole install|is the whole install|wires every detected agent|wired at install time/iu, file);
  }
  const design = await readFile(new URL('docs/system-design/README.md', root), 'utf8');
  const signedOff = design.slice(design.indexOf('With the switch on, the `npm/README.md` quick start is'));
  assert.match(signedOff, /on install, or on your first vibead run/u);
  assert.match(design, /on install, or on the first `vibead` run, whichever comes first/u);
});
