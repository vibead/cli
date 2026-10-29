// beta.36 RC2 (Gaurav, 02:09 AEDT Oct 30): no unapproved-wording marker may ship. Every
// tracked doc and package file is scanned except tests and CI config, which name the
// markers on purpose. vibead/homebrew-tap scripts/check-no-pending.sh uses the same patterns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);

export const MARKERS = [
  /pending\s+nina/i, // PENDING NINA, any case
  /todo\s*\(\s*nina\s*\)/i, // TODO(nina), any case
  /\bPENDING\b/, // an all-caps PENDING approval marker
  /\bpending\s+(approval|sign[- ]?off|wording|review)\b/i, // "pending approval" and kin
];

export const markerHits = (text) => text.split('\n').flatMap((line, i) => (MARKERS.some((re) => re.test(line)) ? [`${i + 1}: ${line.trim().slice(0, 120)}`] : []));

const excluded = (f) => f.startsWith('.github/') || /(^|\/)test\//.test(f) || /\.test\.mjs$/.test(f) || /\.(gif|png|jpe?g|ico)$/i.test(f);

test('the marker patterns catch every marker form and leave code identifiers alone', () => {
  for (const s of ['(PENDING NINA)', 'pending nina', 'Pending  Nina', '**PENDING**', 'TODO(nina)', 'todo( Nina )', 'pending approval', 'Pending sign-off', 'PENDING wording'])
    assert.equal(markerHits(s).length, 1, s);
  for (const s of ["skipped: 'pending-sign-off'", 'NOTICE_PENDING_MARKER', 'the toast is pending vibead#141', 'Approved by Nina'])
    assert.equal(markerHits(s).length, 0, s);
});

test('no shipped doc or package file carries a PENDING NINA, PENDING or TODO(nina) marker', () => {
  const files = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean).filter((f) => !excluded(f));
  const pkg = JSON.parse(readFileSync(new URL('npm/package.json', root), 'utf8'));
  for (const must of ['README.md', 'BETA.md', 'ENTERPRISE-DEMO.md', 'install/README.md', 'install/install.sh', 'install/install.ps1', 'npm/package.json', ...pkg.files.map((f) => `npm/${f}`)])
    assert.ok(files.some((f) => f === must || f.startsWith(`${must}/`)), `scan misses ${must}`);
  const hits = files.flatMap((f) => markerHits(readFileSync(new URL(f, root), 'utf8')).map((h) => `${f}:${h}`));
  assert.deepEqual(hits, [], `unapproved-wording markers ship:\n${hits.join('\n')}`);
});
