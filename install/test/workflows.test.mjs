// Workflows must never carry a person's email address (for example as a git
// author or committer). Bot commits use the Actions noreply identity.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.github', 'workflows');
const EMAIL = /[A-Za-z0-9._%+[\]-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const ALLOWED = /^[0-9]+\+[A-Za-z0-9[\]-]+@users\.noreply\.github\.com$/;

export function personalEmails(text) {
  return [...text.matchAll(EMAIL)].map(m => m[0]).filter(e => !ALLOWED.test(e));
}

test('no personal email address in .github/workflows', () => {
  const files = readdirSync(dir).filter(f => /\.ya?ml$/.test(f));
  assert.ok(files.length > 0);
  for (const f of files) assert.deepEqual(personalEmails(readFileSync(join(dir, f), 'utf8')), [], f);
});

test('the check catches a personal address and allows the Actions bot', () => {
  assert.deepEqual(personalEmails('git -c user.email="someone@gmail.com" commit'), ['someone@gmail.com']);
  assert.deepEqual(personalEmails('user.email="41898282+github-actions[bot]@users.noreply.github.com"'), []);
});

// npm Trusted Publishing (cli#30): release.yml publishes only on a manual run,
// to `next` by default, through OIDC, never with a token.
test('release.yml: manual only, OIDC in the npm environment, next by default, no token', () => {
  const y = readFileSync(join(dir, 'release.yml'), 'utf8');
  const on = y.slice(y.indexOf('\non:'), y.indexOf('\npermissions:'));
  assert.match(on, /workflow_dispatch:/);
  assert.doesNotMatch(on, /^\s+(push|pull_request|release|schedule|workflow_run):/m);
  const npm = y.slice(y.indexOf('\n  npm:'), y.indexOf('\n  tap:'));
  assert.match(npm, /environment: npm/);
  assert.match(npm, /id-token: write/);
  assert.match(npm, /contents: read/);
  assert.match(npm, /node-version: '22'/);
  assert.match(npm, /npm@\^11\.5\.1/);
  assert.match(npm, /npm publish "\.\/vibead-cli-\$VERSION\.tgz" --provenance/);
  assert.match(y, /npm_tag:[\s\S]*?default: next/);
  assert.doesNotMatch(y, /NPM_TOKEN|NODE_AUTH_TOKEN:\s*\$|secrets\.NPM/);
  assert.equal(JSON.parse(readFileSync(join(dir, '..', '..', 'npm', 'package.json'), 'utf8')).name, '@vibead/cli');
  // The GitHub Release is Latest only when npm gets `latest`: a `next` or `beta` run makes a
  // pre-release that is not Latest, so releases/latest and /install stay on the promoted version.
  const pub = y.slice(y.indexOf('\n  publish-release:'), y.indexOf('\n  npm:'));
  assert.match(pub, /NPM_TAG: \$\{\{ inputs\.npm_tag \}\}/);
  const branches = pub.match(/if \[ "\$NPM_TAG" = latest \]; then\n(.*)\n\s*else\n(.*)\n\s*fi/);
  assert.ok(branches, 'publish-release branches on npm_tag');
  assert.match(branches[1], /--prerelease=false --latest$/);
  assert.match(branches[2], /--prerelease --latest=false$/);
  assert.equal(pub.match(/gh release edit/g).length, 2, 'no other release edit can mark it Latest');
  // The promote path (cli#58) has the same two branches and no others.
  const prom = y.slice(y.indexOf('\n  promote-release:'));
  const pbranches = prom.match(/if \[ "\$NPM_TAG" = latest \]; then\n(.*)\n\s*else\n(.*)\n\s*fi/);
  assert.ok(pbranches, 'promote-release branches on npm_tag');
  assert.equal(pbranches[1], branches[1]);
  assert.equal(pbranches[2], branches[2]);
  assert.equal(prom.match(/gh release edit/g).length, 2);
  assert.doesNotMatch(y.replaceAll(branches[1], ''), /--latest(?!=false)/, '--latest only in the npm_tag latest branches');
  // Homebrew is a Live channel: the tap job runs only for npm_tag latest, so a `next` run never touches it.
  const tap = y.slice(y.indexOf('\n  tap:'), y.indexOf('\n  promote-npm:'));
  assert.match(tap.split('\n    steps:')[0], /^    if: \$\{\{ !cancelled\(\) && inputs\.npm_tag == 'latest' && \(needs\.npm\.result == 'success' \|\| needs\.promote-release\.result == 'success'\) \}\}$/m, 'tap job gated on npm_tag latest and on one path having succeeded');
  assert.match(tap, /needs: \[npm, promote-release\]/);
});

// Drafts are visible only to tokens with push access (cli#37 QA R2-1): every job
// that reads the DRAFT release must run with contents:write, or gh says
// "release not found" and nothing publishes. The workflow default stays read.
test('release.yml: jobs that read the draft have contents:write; the default stays read', () => {
  const y = readFileSync(join(dir, 'release.yml'), 'utf8');
  assert.match(y.slice(y.indexOf('\npermissions:'), y.indexOf('\nconcurrency:')), /^  contents: read$/m);
  const job = (a, b) => y.slice(y.indexOf(`\n  ${a}:`), b ? y.indexOf(`\n  ${b}:`) : undefined);
  for (const [name, next] of [['check', 'sign'], ['sign', 'publish-release'], ['publish-release', 'npm'], ['promote-release']]) {
    const head = job(name, next).split('\n    steps:')[0];
    assert.match(head, /^    permissions:\n(?:      .*\n)*?      contents: write$/m, `${name} needs contents:write to see the draft`);
  }
  const sign = readFileSync(join(dir, 'sign-release.yml'), 'utf8');
  assert.match(sign.slice(sign.indexOf('\npermissions:'), sign.indexOf('\nconcurrency:')), /^  contents: write$/m);
});

// REL-2 (cli#39): the npm launcher tarball is in the signed SHA256SUMS, and npm
// publishes that same signed tarball. These tests run the workflow steps' own
// shell, extracted from the YAML, against fake releases in a temp dir.
import { execFileSync, spawnSync } from 'node:child_process';
import { cpSync, mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { stepRun } from './workflow-steps.mjs';

const bash = (script, cwd, env = {}) =>
  spawnSync('bash', ['-c', script], { cwd, env: { ...process.env, ...env }, encoding: 'utf8' });
const sha = (dir, f) => execFileSync('sha256sum', [f], { cwd: dir, encoding: 'utf8' });
const V = '0.1.0-beta.99';
const signYml = () => readFileSync(join(dir, 'sign-release.yml'), 'utf8');
const releaseYml = () => readFileSync(join(dir, 'release.yml'), 'utf8');

// A fake draft: kits and/or launcher tgz, each with its .sha256, in <root>/assets.
function fakeRelease({ kits = ['darwin-arm64', 'darwin-x64', 'linux-x64'], tgz = [`vibead-cli-${V}.tgz`] } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'vibead-sign-'));
  const assets = join(root, 'assets');
  mkdirSync(assets);
  for (const f of [...kits.map(p => `vibead-beta-${V}-${p}.tar.gz`), ...tgz]) {
    writeFileSync(join(assets, f), `fake ${f}\n`);
    writeFileSync(join(assets, `${f}.sha256`), sha(assets, f));
  }
  return { root, assets };
}

test('sign-release.yml: downloads the launcher tgz with the kits', () => {
  const dl = stepRun(signYml(), 'Download archives, the launcher tarball and their .sha256 files');
  assert.match(dl, /--pattern 'vibead-beta-\*'/);
  assert.match(dl, /--pattern 'vibead-cli-\*\.tgz\*'/);
});

test('sign-release.yml: SHA256SUMS lists every kit and the launcher tgz', () => {
  const step = stepRun(signYml(), 'Verify each archive and the launcher tarball, write SHA256SUMS');
  const { root, assets } = fakeRelease();
  const r = bash(step, assets, { TAG: `v${V}` });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const sums = readFileSync(join(root, 'SHA256SUMS'), 'utf8').trim().split('\n');
  assert.equal(sums.length, 4);
  assert.ok(sums.includes(sha(assets, `vibead-cli-${V}.tgz`).trim()), 'tgz line in SHA256SUMS');
  for (const p of ['darwin-arm64', 'darwin-x64', 'linux-x64']) assert.ok(sums.includes(sha(assets, `vibead-beta-${V}-${p}.tar.gz`).trim()), p);
});

test('sign-release.yml: refuses to sign without exactly one same-version tgz, a kit, or a matching .sha256', () => {
  const step = stepRun(signYml(), 'Verify each archive and the launcher tarball, write SHA256SUMS');
  const cases = {
    'no tgz': fakeRelease({ tgz: [] }),
    'tgz for another version': fakeRelease({ tgz: ['vibead-cli-0.1.0-beta.98.tgz'] }),
    'two tgz': fakeRelease({ tgz: [`vibead-cli-${V}.tgz`, 'vibead-cli-0.1.0-beta.98.tgz'] }),
    'no kit': fakeRelease({ kits: [] }),
  };
  const tampered = fakeRelease();
  writeFileSync(join(tampered.assets, `vibead-cli-${V}.tgz`), 'tampered\n');
  cases['tampered tgz'] = tampered;
  const noSum = fakeRelease();
  execFileSync('rm', [join(noSum.assets, `vibead-cli-${V}.tgz.sha256`)]);
  cases['tgz without .sha256'] = noSum;
  for (const [what, { assets }] of Object.entries(cases)) {
    assert.notEqual(bash(step, assets, { TAG: `v${V}` }).status, 0, what);
  }
});

// npm pack of npm/ (package.json version set to `version`) into <root>/ref; returns
// the path it would have as vibead-cli-<V>.tgz. `mutate` edits npm/ after packing.
function packLauncher(root, mutate, version = V) {
  const npmDir = join(root, 'npm');
  cpSync(join(dir, '..', '..', 'npm'), npmDir, { recursive: true });
  const pkg = JSON.parse(readFileSync(join(npmDir, 'package.json'), 'utf8'));
  pkg.version = version;
  writeFileSync(join(npmDir, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
  const out = join(root, 'ref');
  mkdirSync(out);
  execFileSync('npm', ['pack', '--ignore-scripts', '--silent', '--pack-destination', out], { cwd: npmDir, stdio: 'ignore' });
  if (mutate) mutate(npmDir);
  return join(out, `vibead-cli-${version}.tgz`);
}

test('release.yml check: the draft tgz must be npm pack of npm/ at this commit', () => {
  const step = stepRun(releaseYml(), 'Launcher tarball on the draft is npm pack of npm/');
  const draft = (mutate) => {
    const { root, assets } = fakeRelease({ kits: [], tgz: [] });
    const ref = packLauncher(root, mutate);
    cpSync(ref, join(assets, `vibead-cli-${V}.tgz`));
    writeFileSync(join(assets, `vibead-cli-${V}.tgz.sha256`), sha(assets, `vibead-cli-${V}.tgz`));
    return { root, assets };
  };
  const ok = draft();
  const r = bash(step, ok.root, { VERSION: V });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  // npm/ changed after the tgz was packed: the draft no longer matches this commit.
  const stale = draft(npmDir => writeFileSync(join(npmDir, 'README.md'), 'changed\n'));
  assert.match(bash(step, stale.root, { VERSION: V }).stdout, /is not npm pack of npm\//);
  const none = fakeRelease({ kits: [], tgz: [] });
  packLauncher(none.root);
  const r2 = bash(step, none.root, { VERSION: V });
  assert.notEqual(r2.status, 0, 'draft without the tgz');
  assert.match(r2.stdout, /draft has no vibead-cli-/);
  const noSum = draft();
  execFileSync('rm', [join(noSum.assets, `vibead-cli-${V}.tgz.sha256`)]);
  assert.match(bash(step, noSum.root, { VERSION: V }).stdout, /draft has no vibead-cli-/, 'tgz without .sha256');
});

test('release.yml npm: publishes the signed tgz itself, after checking it against SHA256SUMS', () => {
  const y = releaseYml();
  const npm = y.slice(y.indexOf('\n  npm:'), y.indexOf('\n  tap:'));
  assert.match(npm, /needs: \[check, publish-release\]/);
  assert.match(npm, /--pattern SHA256SUMS --pattern "vibead-cli-\$VERSION\.tgz"/);
  const pub = npm.match(/^\s+run: (npm publish .*)$/m);
  assert.ok(pub, 'npm publish step');
  assert.equal(pub[1], 'npm publish "./vibead-cli-$VERSION.tgz" --provenance --access public --tag "$NPM_TAG"');
  assert.ok(npm.indexOf('Check it against the signed SHA256SUMS') < npm.indexOf(pub[1]), 'check runs before publish');
  const step = stepRun(y, 'Check it against the signed SHA256SUMS');
  const signed = (version = V) => {
    const { root, assets } = fakeRelease({ kits: ['linux-x64'], tgz: [] });
    cpSync(packLauncher(root, undefined, version), join(assets, `vibead-cli-${V}.tgz`));
    writeFileSync(join(assets, 'SHA256SUMS'), sha(assets, `vibead-beta-${V}-linux-x64.tar.gz`) + sha(assets, `vibead-cli-${V}.tgz`));
    return assets;
  };
  const ok = signed();
  const r = bash(step, ok, { VERSION: V });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  const unlisted = signed();
  writeFileSync(join(unlisted, 'SHA256SUMS'), sha(unlisted, `vibead-beta-${V}-linux-x64.tar.gz`));
  assert.match(bash(step, unlisted, { VERSION: V }).stdout, /must list/);
  const tampered = signed();
  execFileSync('bash', ['-c', `printf x >> vibead-cli-${V}.tgz`], { cwd: tampered });
  assert.notEqual(bash(step, tampered, { VERSION: V }).status, 0, 'tampered tgz');
  assert.notEqual(bash(step, signed(), { VERSION: '0.1.0-beta.98' }).status, 0, 'other version');
  // Listed and signed under V's name, but the package inside is another version.
  assert.match(bash(step, signed('0.1.0-beta.98'), { VERSION: V }).stdout, /is not @vibead\/cli@/);
});

// Promote an existing npm version (cli#58): no token, no publish, least privilege, and
// the tarball check runs the workflow step's own shell against fake gh and npm.
test('release.yml promote: mode input, OIDC dist-tag, no publish, least privilege', () => {
  const y = releaseYml();
  assert.match(y, /      mode:\n(?:        .*\n)*?        default: release$/m, 'mode defaults to release');
  assert.match(y, /options: \[release, promote\]/);
  const jobs = y.slice(y.indexOf('\n  promote-npm:'));
  const pn = jobs.slice(0, jobs.indexOf('\n  promote-release:'));
  assert.match(pn, /^    if: github\.ref == 'refs\/heads\/main' && inputs\.mode == 'promote'$/m);
  assert.match(pn, /environment: npm/);
  assert.match(pn, /permissions:\n      contents: read\n      id-token: write\n/);
  assert.match(pn, /npm@\^11\.21\.0/, 'dist-tag through OIDC needs npm 11.21.0');
  assert.match(pn, /npm dist-tag add "@vibead\/cli@\$VERSION" "\$NPM_TAG"/);
  assert.doesNotMatch(pn, /npm publish/, 'promote never publishes');
  assert.doesNotMatch(pn, /secrets\./, 'promote uses no secret');
  // Every release-mode job is off in promote mode, and no job of either mode is both.
  assert.match(y.slice(y.indexOf('\n  check:'), y.indexOf('\n  sign:')), /^    if: github\.ref == 'refs\/heads\/main' && inputs\.mode == 'release'$/m);
  assert.match(jobs.slice(jobs.indexOf('\n  promote-release:')), /needs: promote-npm/);
});

// Shims for gh and npm: `gh release view` answers from DRAFT, `gh release download` copies
// from <root>/rel, and `npm view @vibead/cli@V dist.integrity` answers from INTEGRITY.
function promoteRun({ draft = 'false', mutate, integrity, noNpm = false, version = V, sums } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'vibead-promote-'));
  const rel = join(root, 'rel'), bin = join(root, 'bin'), work = join(root, 'work');
  for (const d of [rel, bin, work]) mkdirSync(d);
  const ref = packLauncher(root, null, version);
  const tgz = `vibead-cli-${version}.tgz`;
  cpSync(ref, join(rel, tgz));
  writeFileSync(join(rel, 'SHA256SUMS'), sums ?? sha(rel, tgz));
  if (mutate) mutate(rel, tgz);
  const good = 'sha512-' + execFileSync('openssl', ['dgst', '-sha512', '-binary', join(ref)]).toString('base64');
  writeFileSync(join(bin, 'gh'), `#!/bin/bash
case "$2" in
  view) echo "$DRAFT" ;;
  download) while [ $# -gt 0 ]; do case "$1" in --dir) d=$2;; --pattern) cp "$REL/$2" "$d/" ;; esac; shift; done ;;
esac\n`, { mode: 0o755 });
  writeFileSync(join(bin, 'npm'), `#!/bin/bash\n[ -n "$NO_NPM" ] || echo "$INTEGRITY"\n`, { mode: 0o755 });
  const step = stepRun(releaseYml(), "The published release's signed tarball is the one npm holds");
  const r = bash(step, work, {
    PATH: `${bin}:${process.env.PATH}`, VERSION: version, GITHUB_REPOSITORY: 'vibead/cli',
    DRAFT: draft, REL: rel, INTEGRITY: integrity ?? good, NO_NPM: noNpm ? '1' : '',
  });
  return { ...r, out: r.stdout + r.stderr };
}

test('release.yml promote: passes only when the signed tarball is exactly what npm holds', () => {
  const ok = promoteRun();
  assert.equal(ok.status, 0, ok.out);
  assert.match(ok.out, /npm holds the signed vibead-cli-/);
  const cases = {
    'npm has other bytes': [promoteRun({ integrity: 'sha512-AAAA' }), /is not the signed/],
    'version not on npm': [promoteRun({ noNpm: true }), /is not on npm/],
    'release is still a draft': [promoteRun({ draft: 'true' }), /must be a published release/],
    'tarball changed after signing': [promoteRun({ mutate: (rel, tgz) => writeFileSync(join(rel, tgz), 'tampered\n') }), /FAILED|did NOT match|no properly formatted/i],
    'tgz not in SHA256SUMS': [promoteRun({ sums: 'deadbeef  other.tgz\n' }), /exactly once/],
    'tgz listed twice': [promoteRun({ mutate: (rel, tgz) => writeFileSync(join(rel, 'SHA256SUMS'), readFileSync(join(rel, 'SHA256SUMS'), 'utf8').repeat(2)) }), /exactly once/],
  };
  for (const [what, [r, msg]] of Object.entries(cases)) {
    assert.notEqual(r.status, 0, what);
    assert.match(r.out, msg, what);
  }
  assert.notEqual(promoteRun({ version: 'not a version' }).status, 0, 'bad version');
});
