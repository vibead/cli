// Installer tests: run the real install.sh / install.ps1 in a temp HOME
// against a local fake release (file:// URLs), so nothing touches the network
// or the tester's own ~/.vibead. Run: node --test install/test/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync, execFileSync } from 'node:child_process';
import { chmodSync, existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, readlinkSync, rmSync, writeFileSync, copyFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const installSh = join(here, '..', 'install.sh');
const installPs1 = join(here, '..', 'install.ps1');
const linuxX64 = process.platform === 'linux' && process.arch === 'x64';
const PLATFORM = 'linux-x64';
const which = cmd => spawnSync('sh', ['-c', `command -v ${cmd}`], { encoding: 'utf8' }).stdout.trim() || null;
const pwsh = process.env.VIBEAD_PWSH || which('pwsh');
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');

// The fake kit logs each call (args, whether stdin is a TTY, and whether the
// stable launcher dir is on PATH) so tests can see what the installer ran.
const KIT = `#!/bin/sh
tty=no; [ -t 0 ] && tty=yes
case ":$PATH:" in *"/.vibead/bin:"*) onpath=yes ;; *) onpath=no ;; esac
echo "kit=@VERSION@ args=$* tty=$tty launcher_on_path=$onpath" >> "$HOME/kit.log"
if [ "$1" = enable ] && [ -n "\${FAKE_DECLINE:-}" ]; then echo "No changes made."; exit 1; fi
if [ "$1" = __wrapperless ]; then echo "FAKE NOTICE zero_step=\${VIBEAD_ZERO_STEP:-}"; echo "vibead disable"; fi
`;

function release(base, version, { platform = PLATFORM, extra = null, corrupt = false, zip = false } = {}) {
  const dir = join(base, 'download', `v${version}`);
  mkdirSync(dir, { recursive: true });
  const work = mkdtempSync(join(tmpdir(), 'vibead-kit-'));
  const folder = join(work, `vibead-beta-${platform}`);
  mkdirSync(folder);
  const exe = join(folder, zip ? 'vibead-beta.exe' : 'vibead-beta');
  writeFileSync(exe, KIT.replace('@VERSION@', version)); chmodSync(exe, 0o755);
  writeFileSync(join(folder, 'README.txt'), 'fake kit\n');
  if (extra) writeFileSync(join(work, extra), 'outside the kit folder\n');
  const name = `vibead-beta-${version}-${platform}.${zip ? 'zip' : 'tar.gz'}`;
  const archive = join(dir, name);
  const entries = [`vibead-beta-${platform}`, ...(extra ? [extra] : [])];
  if (zip) execFileSync('python3', ['-c', 'import shutil,sys; shutil.make_archive(sys.argv[1][:-4], "zip", sys.argv[2], sys.argv[3])', archive, work, entries[0]]);
  else execFileSync('tar', ['-czf', archive, '-C', work, ...entries]);
  const digest = corrupt ? '0'.repeat(64) : sha(archive);
  writeFileSync(join(dir, 'SHA256SUMS'), `${digest}  ${name}\n`);
  rmSync(work, { recursive: true, force: true });
  // The site's pinned manifest names the newest fake release. There is
  // deliberately no latest/download: the installers must never use it.
  writeFileSync(join(base, 'install.json'), `{\n  "version": "${version}"\n}\n`);
  return { dir, name };
}

function sandbox() {
  const home = mkdtempSync(join(tmpdir(), 'vibead-home-'));
  const rel = join(home, 'release');
  return { home, rel, base: pathToFileURL(rel).href, manifest: pathToFileURL(join(rel, 'install.json')).href };
}
const basePath = '/usr/local/bin:/usr/bin:/bin';

// detached: true runs the installer in a new session with no controlling
// terminal, like `curl | sh` from CI or a script.
function runSh(box, env = {}, { detached = true } = {}) {
  return spawnSync('sh', [installSh], {
    encoding: 'utf8', detached,
    env: { HOME: box.home, PATH: basePath, SHELL: '/bin/bash', VIBEAD_RELEASE_BASE: box.base, VIBEAD_MANIFEST_URL: box.manifest, ...env },
  });
}

test('install.sh: shellcheck finds no issues', { skip: !which('shellcheck') && 'shellcheck not installed' }, () => {
  const r = spawnSync('shellcheck', ['-s', 'sh', installSh], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
});

test('install.sh: installs the release pinned in the site manifest into a temp HOME without sudo', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const r = runSh(box);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Checksum verified\./);
  assert.match(r.stdout, /Installed VibeAd 0\.1\.0-beta\.99/);
  const link = join(box.home, '.local/bin/vibead');
  assert.ok(lstatSync(link).isSymbolicLink());
  assert.equal(readlinkSync(link), join(box.home, '.vibead/bin/vibead'));
  assert.equal(execFileSync(link, ['--version'], { encoding: 'utf8' }).trim(), '0.1.0-beta.99');
  assert.ok(existsSync(join(box.home, '.vibead/versions/0.1.0-beta.99-linux-x64/vibead-beta')));
  // No terminal: it must not prompt or edit shell profiles; zero-step (on since
  // vibead-ai#254) leaves setup to the first vibead run and says so.
  assert.match(r.stdout, /Setup finishes the first time you run vibead\./);
  assert.match(r.stdout, /export PATH=/);
  assert.ok(!existsSync(join(box.home, '.bashrc')));
  assert.ok(!existsSync(join(box.home, 'kit.log')), 'enable must not run without a terminal');
  // The launcher forwards arguments to the kit.
  execFileSync(link, ['status'], { env: { HOME: box.home, PATH: basePath } });
  assert.match(readFileSync(join(box.home, 'kit.log'), 'utf8'), /kit=0\.1\.0-beta\.99 args=status/);
});

test('install.sh, switch off: with a terminal, runs `vibead enable` with the stable launcher on PATH', { skip: (!linuxX64 || !which('script')) && 'needs Linux x64 and script(1)' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const env = { HOME: box.home, PATH: `${join(box.home, '.local/bin')}:${basePath}`, SHELL: '/bin/bash', VIBEAD_RELEASE_BASE: box.base, VIBEAD_MANIFEST_URL: box.manifest };
  const r = spawnSync('script', ['-qec', `sh '${switchedOff(box)}'`, '/dev/null'], { encoding: 'utf8', env, input: '' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const log = readFileSync(join(box.home, 'kit.log'), 'utf8');
  assert.match(log, /kit=0\.1\.0-beta\.99 args=enable tty=yes launcher_on_path=yes/);
  assert.doesNotMatch(r.stdout, /Add .* to your PATH/, 'bin dir already on PATH: no prompt');
});

// Run the installer under script(1) so it has a real terminal; `answers` is
// typed into that terminal (the PATH prompt reads /dev/tty).
function runTty(box, answers, env = {}, script = installSh) {
  const full = { HOME: box.home, PATH: basePath, SHELL: '/bin/bash', VIBEAD_RELEASE_BASE: box.base, VIBEAD_MANIFEST_URL: box.manifest, ...env };
  return spawnSync('script', ['-qec', `sh '${script}'`, '/dev/null'], { encoding: 'utf8', env: full, input: answers });
}

// install.sh with the zero-step switch set back to 0 (vibead-ai#235): the
// `vibead enable` path, kept tested so the switch can be turned off again.
function switchedOff(box) {
  const off = join(box.home, 'install-switch-off.sh');
  writeFileSync(off, readFileSync(installSh, 'utf8').replace(/^ZERO_STEP_CONSENT_APPROVED=1$/m, 'ZERO_STEP_CONSENT_APPROVED=0'));
  return off;
}

// CLI-2: the only question in an install is `vibead enable`'s consent. With
// ~/.local/bin off PATH the installer prints the export line; it never asks and
// never edits a profile. A profile with an earlier installer's block (cli#24)
// is recognised and left alone.
test('install.sh: off PATH it asks nothing and edits no profile, printing the export line; an earlier PATH block is recognised', { skip: (!linuxX64 || !which('script')) && 'needs Linux x64 and script(1)' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const first = runTty(box, 'y\n');
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.doesNotMatch(first.stdout, /\[Y\/n\]|to your PATH in .*\?/, 'no PATH question');
  const exportLine = `export PATH="${join(box.home, '.local/bin')}:$PATH"`;
  assert.ok(first.stdout.includes(`  ${exportLine}`), first.stdout);
  assert.ok(!existsSync(join(box.home, '.bashrc')), 'no profile written');
  writeFileSync(join(box.home, '.bashrc'), `# mine\n\n# >>> vibead installer PATH >>>\n${exportLine}\n# <<< vibead installer PATH <<<\n`);
  const before = readFileSync(join(box.home, '.bashrc'), 'utf8');
  const second = runTty(box, 'y\n');
  assert.equal(second.status, 0, second.stdout + second.stderr);
  assert.match(second.stdout, /already in your PATH in .*\.bashrc/);
  assert.equal(readFileSync(join(box.home, '.bashrc'), 'utf8'), before, 'profile untouched');
});

test('install.sh, switch off: answering n at the enable consent prints a neutral "Setup skipped" line', { skip: (!linuxX64 || !which('script')) && 'needs Linux x64 and script(1)' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const r = runTty(box, '', { VIBEAD_NO_MODIFY_PATH: '1', FAKE_DECLINE: '1' }, switchedOff(box));
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Setup skipped\. Run `vibead enable` any time\./);
  assert.doesNotMatch(r.stdout + r.stderr, /did not finish/);
});

test('install.sh: a checksum mismatch installs nothing', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99', { corrupt: true });
  const r = runSh(box);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Checksum mismatch/);
  assert.ok(!existsSync(join(box.home, '.vibead/bin/vibead')));
  assert.ok(!existsSync(join(box.home, '.local/bin/vibead')));
});

test('install.sh: rejects an archive with files outside the kit folder', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99', { extra: 'evil.sh' });
  const r = runSh(box);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /Unexpected files/);
  assert.ok(!existsSync(join(box.home, '.vibead/bin/vibead')));
});

test('install.sh: clear message when the release has no build for this platform', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99', { platform: 'darwin-arm64' });
  const r = runSh(box);
  assert.notEqual(r.status, 0);
  assert.match(r.stderr, /no build for linux-x64/);
});

test('install.sh: upgrades keep one stable launcher, pin VIBEAD_VERSION, keep two versions', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  for (const v of ['0.1.0-beta.97', '0.1.0-beta.98', '0.1.0-beta.99']) {
    release(box.rel, v);
    assert.equal(runSh(box, { VIBEAD_VERSION: v }).status, 0);
  }
  const link = join(box.home, '.local/bin/vibead');
  assert.equal(execFileSync(link, ['--version'], { encoding: 'utf8' }).trim(), '0.1.0-beta.99');
  assert.deepEqual(readdirSync(join(box.home, '.vibead/versions')).sort(), ['0.1.0-beta.98-linux-x64', '0.1.0-beta.99-linux-x64']);
  // Pinning an older version works and the link path stays the same.
  assert.equal(runSh(box, { VIBEAD_VERSION: 'v0.1.0-beta.98' }).status, 0);
  assert.equal(execFileSync(link, ['--version'], { encoding: 'utf8' }).trim(), '0.1.0-beta.98');
  assert.equal(readlinkSync(link), join(box.home, '.vibead/bin/vibead'));
});

test('install.sh: never replaces a vibead it did not install (for example an npm one)', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  mkdirSync(join(box.home, '.local/bin'), { recursive: true });
  writeFileSync(join(box.home, '.local/bin/vibead'), '#!/bin/sh\necho npm\n');
  const r = runSh(box);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stderr, /left it alone/);
  assert.equal(readFileSync(join(box.home, '.local/bin/vibead'), 'utf8'), '#!/bin/sh\necho npm\n');
});

// --- Windows installer, exercised with PowerShell 7 on Linux/macOS -------------
const ps = (box, env = {}) => spawnSync(pwsh, ['-NoProfile', '-NonInteractive', '-File', installPs1], {
  encoding: 'utf8',
  env: { HOME: box.home, PATH: process.env.PATH, VIBEAD_RELEASE_BASE: box.base, VIBEAD_MANIFEST_URL: box.manifest, VIBEAD_PLATFORM: 'win32-x64', VIBEAD_INSTALL_DIR: join(box.home, 'vibead'), VIBEAD_NO_ENABLE: '1', VIBEAD_NO_MODIFY_PATH: '1', ...env },
});

test('install.ps1: parses without errors', { skip: !pwsh && 'pwsh not installed' }, () => {
  const r = spawnSync(pwsh, ['-NoProfile', '-Command', `$e=$null; [System.Management.Automation.Language.Parser]::ParseFile('${installPs1}',[ref]$null,[ref]$e) | Out-Null; $e.Count`], { encoding: 'utf8' });
  assert.equal(r.stdout.trim(), '0', r.stderr);
});

test('install.ps1: installs a verified Windows zip and a stable vibead.cmd launcher', { skip: !pwsh && 'pwsh not installed' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99', { platform: 'win32-x64', zip: true });
  const r = ps(box);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Checksum verified\./);
  const exe = join(box.home, 'vibead/versions/0.1.0-beta.99-win32-x64/vibead-beta.exe');
  assert.ok(existsSync(exe));
  const cmd = readFileSync(join(box.home, 'vibead/bin/vibead.cmd'), 'utf8');
  assert.ok(cmd.includes(`"${exe}" %*`));
  assert.ok(cmd.includes('echo 0.1.0-beta.99'));
  assert.match(r.stdout, /Next: vibead enable/);
});

test('install.ps1: a checksum mismatch installs nothing', { skip: !pwsh && 'pwsh not installed' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99', { platform: 'win32-x64', zip: true, corrupt: true });
  const r = ps(box);
  assert.match(r.stdout, /checksum mismatch/);
  assert.ok(!existsSync(join(box.home, 'vibead/bin/vibead.cmd')));
});

test('install.ps1: no Windows build yet gives the npm and WSL one-liners, not an error dump', { skip: !pwsh && 'pwsh not installed' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const r = ps(box);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /no Windows build for win32-x64 yet/);
  assert.match(r.stdout, /npm i -g @vibead\/cli/);
  assert.match(r.stdout, /curl -fsSL https:\/\/www\.vibead\.ai\/install \| sh/);
});

test('install.sh: uses the pinned manifest version, not a newer release (cli#27)', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.98');
  release(box.rel, '0.1.0-beta.99');
  writeFileSync(join(box.rel, 'install.json'), '{"version":"0.1.0-beta.98","repo":"vibead/cli"}');
  const r = runSh(box);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Installed VibeAd 0\.1\.0-beta\.98/);
});

test('install.sh: an unreachable or empty manifest fails clearly with the npm command, installing nothing', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  for (const [manifest, message] of [[null, /Could not read the current version/], ['{}', /has no version/]]) {
    const box = sandbox();
    release(box.rel, '0.1.0-beta.99');
    if (manifest === null) rmSync(join(box.rel, 'install.json'));
    else writeFileSync(join(box.rel, 'install.json'), manifest);
    const r = runSh(box);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, message);
    assert.match(r.stderr, /Use npm instead: npm i -g @vibead\/cli$/m);
    assert.doesNotMatch(r.stdout, /Downloading/, 'stops before any release download');
    assert.ok(!existsSync(join(box.home, '.vibead/bin/vibead')));
  }
});

// A release whose SHA256SUMS names another version (a mis-uploaded or copied
// file) must be refused, whether the version came from the manifest or VIBEAD_VERSION.
function mismatchedRelease(box) {
  release(box.rel, '0.1.0-beta.24');
  const dir = join(box.rel, 'download', 'v0.1.0-beta.25');
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(box.rel, 'download', 'v0.1.0-beta.24', 'SHA256SUMS'), join(dir, 'SHA256SUMS'));
  writeFileSync(join(box.rel, 'install.json'), '{"version": "0.1.0-beta.25"}');
}

test('install.sh: refuses SHA256SUMS for a different version, installing nothing', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  for (const env of [{}, { VIBEAD_VERSION: '0.1.0-beta.25' }]) {
    const box = sandbox();
    mismatchedRelease(box);
    const r = runSh(box, env);
    assert.notEqual(r.status, 0);
    assert.match(r.stderr, /Checksums are for 0\.1\.0-beta\.24, not 0\.1\.0-beta\.25\./);
    assert.ok(!existsSync(join(box.home, '.vibead')));
  }
});

test('install.ps1: refuses SHA256SUMS for a different version, installing nothing', { skip: !pwsh && 'pwsh not installed' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.24', { platform: 'win32-x64', zip: true });
  const dir = join(box.rel, 'download', 'v0.1.0-beta.25');
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(box.rel, 'download', 'v0.1.0-beta.24', 'SHA256SUMS'), join(dir, 'SHA256SUMS'));
  writeFileSync(join(box.rel, 'install.json'), '{"version": "0.1.0-beta.25"}');
  const r = ps(box);
  assert.match(r.stdout, /checksums are for 0\.1\.0-beta\.24, not 0\.1\.0-beta\.25/);
  assert.ok(!existsSync(join(box.home, 'vibead/bin/vibead.cmd')));
});

test('installers never fall back to GitHub "latest"', () => {
  for (const f of [installSh, installPs1]) assert.doesNotMatch(readFileSync(f, 'utf8'), /latest\/download/, f);
});

test('install.ps1: uses the pinned manifest version; no manifest gives the npm one-liner', { skip: !pwsh && 'pwsh not installed' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.98', { platform: 'win32-x64', zip: true });
  release(box.rel, '0.1.0-beta.99', { platform: 'win32-x64', zip: true });
  writeFileSync(join(box.rel, 'install.json'), '{"version":"0.1.0-beta.98"}');
  const r = ps(box);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.ok(existsSync(join(box.home, 'vibead/versions/0.1.0-beta.98-win32-x64/vibead-beta.exe')));
  rmSync(join(box.rel, 'install.json'));
  const none = ps(sandbox());
  assert.match(none.stdout, /could not read the current version/);
  assert.match(none.stdout, /npm i -g @vibead\/cli/);
});

// --- Every channel is one command, npm first -------------------------------------
test('README: npm is listed first and every install channel is a single command', () => {
  const readme = readFileSync(join(root, 'README.md'), 'utf8');
  const channels = [
    'npm i -g @vibead/cli ',
    'curl -fsSL https://www.vibead.ai/install | sh',
    'irm https://www.vibead.ai/install.ps1 | iex',
    'brew install vibead/tap/vibead && vibead ',
  ];
  const lines = readme.split('\n');
  const at = channels.map(c => lines.findIndex(l => l.trim().startsWith(c)));
  channels.forEach((c, i) => assert.ok(at[i] >= 0, `README has no single-line command: ${c}`));
  assert.ok(at.every(i => at[0] <= i), 'npm must come first');
});

// Since beta.29 SHA256SUMS also covers the npm launcher tarball (signed with
// the kits). Its line comes first here on purpose: the installers must still
// pick their platform's kit line and install exactly as before.
function addLauncherLine(dir, version) {
  const tgz = join(dir, `vibead-cli-${version}.tgz`);
  writeFileSync(tgz, 'fake launcher tarball\n');
  writeFileSync(join(dir, 'SHA256SUMS'), `${sha(tgz)}  vibead-cli-${version}.tgz\n` + readFileSync(join(dir, 'SHA256SUMS'), 'utf8'));
}

test('install.sh: a SHA256SUMS that also lists the launcher tarball installs the kit as before', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const box = sandbox();
  const { dir } = release(box.rel, '0.1.0-beta.99');
  addLauncherLine(dir, '0.1.0-beta.99');
  const r = runSh(box);
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /Checksum verified\./);
  assert.match(r.stdout, /Installed VibeAd 0\.1\.0-beta\.99/);
  assert.ok(existsSync(join(box.home, '.vibead/versions/0.1.0-beta.99-linux-x64/vibead-beta')));
});

test('install.ps1: a SHA256SUMS that also lists the launcher tarball installs the kit as before', { skip: !pwsh && 'pwsh not installed' }, () => {
  const box = sandbox();
  const { dir } = release(box.rel, '0.1.0-beta.99', { platform: 'win32-x64', zip: true });
  addLauncherLine(dir, '0.1.0-beta.99');
  const r = ps(box);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /Checksum verified\./);
  assert.ok(existsSync(join(box.home, 'vibead/versions/0.1.0-beta.99-win32-x64/vibead-beta.exe')));
});

test('install.ps1: asks no PATH question and leaves the user PATH alone, printing how to add it', { skip: !pwsh && 'pwsh not installed' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99', { platform: 'win32-x64', zip: true });
  const r = ps(box);
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.doesNotMatch(r.stdout, /\[Y\/n\]/);
  assert.match(r.stdout, /add .*vibead.bin to your user PATH:/);
});

// vibead/vibead-ai#235: zero-step setup is the same kit command as the npm
// postinstall. The install-notice wording was approved in vibead-ai#254, so the
// switch is 1; with it set back to 0 the installer runs `vibead enable`.
test('install.sh: zero-step is on by default (the switch is 1): a terminal install runs the kit wire with no opt-in', { skip: (!linuxX64 || !which('script')) && 'needs Linux x64 and script(1)' }, () => {
  assert.match(readFileSync(installSh, 'utf8'), /^ZERO_STEP_CONSENT_APPROVED=1$/m);
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const r = runTty(box, '', { VIBEAD_NO_MODIFY_PATH: '1' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const log = readFileSync(join(box.home, 'kit.log'), 'utf8');
  assert.match(log, /args=__wrapperless wire --announce/);
  assert.doesNotMatch(log, /args=enable/);
});

test('install.sh: with the switch set back to 0 the default runs `vibead enable` and no zero-step wire', { skip: (!linuxX64 || !which('script')) && 'needs Linux x64 and script(1)' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const off = switchedOff(box);
  const env = { HOME: box.home, PATH: basePath, SHELL: '/bin/bash', VIBEAD_RELEASE_BASE: box.base, VIBEAD_MANIFEST_URL: box.manifest, VIBEAD_NO_MODIFY_PATH: '1' };
  const r = spawnSync('script', ['-qec', `sh '${off}'`, '/dev/null'], { encoding: 'utf8', env, input: '' });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const log = readFileSync(join(box.home, 'kit.log'), 'utf8');
  assert.match(log, /args=enable tty=yes/);
  assert.doesNotMatch(log, /__wrapperless/);
});

test('install.sh: with VIBEAD_ZERO_STEP=1 and a terminal, runs the kit wire once without reading the terminal, and an N to N+1 upgrade runs it again from the new kit', { skip: (!linuxX64 || !which('script')) && 'needs Linux x64 and script(1)' }, () => {
  const box = sandbox();
  release(box.rel, '0.1.0-beta.99');
  const first = runTty(box, '', { VIBEAD_ZERO_STEP: '1' });
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stdout, /FAKE NOTICE zero_step=1/);
  assert.match(first.stdout, /vibead disable/);
  let log = readFileSync(join(box.home, 'kit.log'), 'utf8');
  assert.equal(log, 'kit=0.1.0-beta.99 args=__wrapperless wire --announce tty=no launcher_on_path=yes\n', 'no enable prompt, stdin is not the terminal');
  release(box.rel, '0.1.0-beta.100');
  const upgrade = runTty(box, '', { VIBEAD_ZERO_STEP: '1' });
  assert.equal(upgrade.status, 0, upgrade.stdout + upgrade.stderr);
  log = readFileSync(join(box.home, 'kit.log'), 'utf8');
  assert.match(log.split('\n')[1], /^kit=0\.1\.0-beta\.100 args=__wrapperless wire --announce tty=no launcher_on_path=yes$/);
  // The launcher path the agents' hooks call did not move, so no manual step is needed.
  assert.equal(readlinkSync(join(box.home, '.local/bin/vibead')), join(box.home, '.vibead/bin/vibead'));
  assert.equal(execFileSync(join(box.home, '.vibead/bin/vibead'), ['--version'], { encoding: 'utf8' }).trim(), '0.1.0-beta.100');
});

test('install.sh: with VIBEAD_ZERO_STEP=1, CI, no terminal or root wire nothing at install; the first vibead run does it', { skip: (!linuxX64 || !which('script')) && 'needs Linux x64 and script(1)' }, () => {
  const ci = sandbox();
  release(ci.rel, '0.1.0-beta.99');
  const underCi = runTty(ci, '', { VIBEAD_ZERO_STEP: '1', CI: 'true' });
  assert.equal(underCi.status, 0, underCi.stdout + underCi.stderr);
  assert.match(underCi.stdout, /Setup finishes the first time you run vibead\./);
  assert.ok(!existsSync(join(ci.home, 'kit.log')), 'CI: the kit did not run');

  const piped = sandbox();
  release(piped.rel, '0.1.0-beta.99');
  const noTty = runSh(piped, { VIBEAD_ZERO_STEP: '1' });
  assert.equal(noTty.status, 0, noTty.stderr);
  assert.match(noTty.stdout, /Setup finishes the first time you run vibead\./);
  assert.ok(!existsSync(join(piped.home, 'kit.log')), 'no terminal: the kit did not run');

  const root = sandbox();
  release(root.rel, '0.1.0-beta.99');
  const fakeBin = join(root.home, 'fakebin');
  mkdirSync(fakeBin);
  writeFileSync(join(fakeBin, 'id'), '#!/bin/sh\n[ "$1" = -u ] && { echo 0; exit 0; }\nexec /usr/bin/id "$@"\n');
  chmodSync(join(fakeBin, 'id'), 0o755);
  const asRoot = runTty(root, '', { VIBEAD_ZERO_STEP: '1', PATH: `${fakeBin}:${basePath}`, SUDO_USER: 'someone' });
  assert.equal(asRoot.status, 0, asRoot.stdout + asRoot.stderr);
  assert.match(asRoot.stdout, /Setup finishes the first time you run vibead\./);
  assert.ok(!existsSync(join(root.home, 'kit.log')), 'root: nothing is wired from the installer');
});

// beta.36 (CLI Tester D6): install.sh creates ~/.local/bin (and ~/.local) when they are
// missing; it records exactly those in ~/.vibead/created-dirs so `vibead uninstall` can
// remove them when empty. A folder that already existed is never recorded.
test('install.sh: records only the launcher folders it created in ~/.vibead/created-dirs', { skip: !linuxX64 && 'Linux x64 only' }, () => {
  const fresh = sandbox();
  release(fresh.rel, '0.1.0-beta.99');
  assert.equal(runSh(fresh).status, 0);
  assert.deepEqual(readFileSync(join(fresh.home, '.vibead/created-dirs'), 'utf8').split('\n').filter(Boolean), [join(fresh.home, '.local/bin'), join(fresh.home, '.local')]);
  const had = sandbox();
  release(had.rel, '0.1.0-beta.99');
  mkdirSync(join(had.home, '.local'));
  assert.equal(runSh(had).status, 0);
  assert.deepEqual(readFileSync(join(had.home, '.vibead/created-dirs'), 'utf8').split('\n').filter(Boolean), [join(had.home, '.local/bin')], '~/.local was already there');
  const both = sandbox();
  release(both.rel, '0.1.0-beta.99');
  mkdirSync(join(both.home, '.local/bin'), { recursive: true });
  assert.equal(runSh(both).status, 0);
  assert.ok(!existsSync(join(both.home, '.vibead/created-dirs')), 'nothing created, nothing recorded');
  const outside = sandbox();
  release(outside.rel, '0.1.0-beta.99');
  const elsewhere = mkdtempSync(join(tmpdir(), 'vibead-bin-'));
  assert.equal(runSh(outside, { VIBEAD_BIN_DIR: join(elsewhere, 'a/b') }).status, 0);
  assert.ok(!existsSync(join(outside.home, '.vibead/created-dirs')), 'a bin dir outside HOME is never recorded');
  for (const b of [fresh, had, both, outside]) rmSync(b.home, { recursive: true, force: true });
  rmSync(elsewhere, { recursive: true, force: true });
});
