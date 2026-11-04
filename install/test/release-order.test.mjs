// beta.36 RC2 (T1, CLI Tester): the tap's scheduled update bumps main's formula from
// npm `latest` and keeps main's caveats, so npm `latest` must not move before the tap
// PR for that version merges. Release's npm and promote-npm jobs check tap main first;
// this test runs that check's script against a fake tap formula, and pins the order in
// install/README.md.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdtempSync, mkdirSync, chmodSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

const root = new URL('../..', import.meta.url).pathname;
const workflow = readFileSync(join(root, '.github/workflows/release.yml'), 'utf8');
const STEP = 'Homebrew tap main already ships this version (npm_tag latest only)';

function jobSteps(job) {
  const start = workflow.indexOf(`\n  ${job}:\n`);
  assert.ok(start > 0, `job ${job}`);
  const next = workflow.slice(start + 1).search(/\n {2}[a-z-]+:\n/u);
  return workflow.slice(start, next < 0 ? undefined : start + 1 + next);
}

test('T1: npm and promote-npm check tap main before any dist-tag change, latest only', () => {
  for (const [job, before] of [['npm', 'npm publish "./vibead-cli-$VERSION.tgz"'], ['promote-npm', 'npm dist-tag add']]) {
    const body = jobSteps(job);
    const at = body.indexOf(STEP);
    assert.ok(at > 0, `${job} has the tap step`);
    assert.ok(at < body.indexOf(before), `${job}: tap check runs before ${before}`);
    assert.match(body.slice(at, at + 400), /if: inputs\.npm_tag == 'latest'/u, `${job}: only for latest`);
  }
});

test('T1: the tap check passes only when tap main ships the version', () => {
  const body = jobSteps('npm');
  const lines = body.slice(body.indexOf(STEP)).split('run: |\n')[1].split('\n');
  const run = lines.slice(0, lines.findIndex(l => !/^ {10}/u.test(l))).map(l => l.slice(10)).join('\n');
  assert.match(run, /^set -euo pipefail\n/u);
  const dir = mkdtempSync(join(tmpdir(), 'vibead-tap-order-'));
  try {
    mkdirSync(join(dir, 'bin'));
    const formula = join(dir, 'vibead.rb');
    writeFileSync(join(dir, 'bin', 'curl'), `#!/bin/sh\ncat '${formula}'\n`); chmodSync(join(dir, 'bin', 'curl'), 0o755);
    const check = (tapVersion, VERSION) => {
      writeFileSync(formula, `class Vibead < Formula\n  version "${tapVersion}"\nend\n`);
      return spawnSync('bash', ['-c', run], { encoding: 'utf8', env: { PATH: `${join(dir, 'bin')}:/usr/bin:/bin`, VERSION } });
    };
    const ok = check('0.1.0-beta.36', '0.1.0-beta.36');
    assert.equal(ok.status, 0, ok.stdout + ok.stderr);
    const ahead = check('0.1.0-beta.34', '0.1.0-beta.36');
    assert.equal(ahead.status, 1);
    assert.match(ahead.stdout, /ships 0\.1\.0-beta\.34, not 0\.1\.0-beta\.36: merge the tap PR for 0\.1\.0-beta\.36 first/u);
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

test('T1: install/README documents the order: release (next), re-gate the real archives, merge the tap, then latest', () => {
  const doc = readFileSync(join(root, 'install/README.md'), 'utf8');
  const order = ['npm_tag` `next`: the GitHub Release is published', 'Hash the real published archives', 'Then merge the tap PR', 'Promote to npm `latest`'].map(s => doc.indexOf(s));
  assert.ok(order.every(i => i > 0), JSON.stringify(order));
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'in this order');
  assert.doesNotMatch(doc, /Homebrew needs no step here|Homebrew follows by itself/u);
});
