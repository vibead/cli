// beta.36 RC3b (CLI Tester): the first Gemini form through npm, before the kit was ever
// fetched, prints only the refusal and exits 2: no "downloading…" line, no download,
// nothing written in HOME or the cache. Whole-output check.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { GEMINI_REFUSAL, refusesGemini } from '../lib/gemini.mjs';

const bin = new URL('../bin/vibead.mjs', import.meta.url).pathname;
const FORMS = [
  ['gemini'], ['Gemini'], ['GEMINI'], ['gemini-cli'], ['gemini', '-p', 'hi'], ['gemini', '--', 'x'],
  ['--agent', 'gemini'], ['--agent=GEMINI'], ['--debug', 'gemini'], ['--mode', 'fixture', 'gemini'], ['--mode=fixture', 'gemini'],
  ['--model', 'x', 'gemini'], ['--report-dir', '/x/r', 'gemini'], ['--binary', '/usr/bin/gemini', 'claude'], ['--cleanup', '--agent', 'gemini'],
  ['enable', 'gemini'], ['enable', 'Gemini', '--yes'], ['enable', 'claude', 'GEMINI'], ['disable', 'gemini'], ['uninstall', 'Gemini'],
  ['status', 'gemini'], ['status', 'GEMINI'], ['telemetry', 'GEMINI'], ['telemetry', 'off', 'gemini'],
  ['GEMİNİ'], ['gemını'], ['--agent', 'GEMİNİ'], ['enable', 'GEMİNİ'], ['ＧＥＭＩＮＩ'],
];

test('the approved refusal line, byte-exact', () => {
  assert.equal(GEMINI_REFUSAL, "Gemini CLI isn't supported. Choose an agent: claude, codex or opencode");
});

test('every first Gemini form prints only the refusal and exits 2, before any download', async t => {
  const home = await mkdtemp(join(tmpdir(), 'vibead-npm-gemini-'));
  t.after(() => rm(home, { recursive: true, force: true }));
  const cache = join(home, 'cache');
  for (const args of FORMS) {
    // A download would print "vibead: downloading verified …" and fail on this mirror.
    const r = spawnSync(process.execPath, [bin, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: home, VIBEAD_CACHE_DIR: cache,
      VIBEAD_RELEASE_BASE: 'file:///nowhere', VIBEAD_TEST_RELEASE: '1', HTTPS_PROXY: 'http://127.0.0.1:9' } });
    const label = args.join(' ');
    assert.equal(r.status, 2, `${label}: exit\n${r.stdout}${r.stderr}`);
    assert.equal(r.stdout, '', `${label}: stdout`);
    assert.equal(r.stderr, `vibead: ${GEMINI_REFUSAL}\n`, `${label}: the whole output is the refusal line`);
    assert.deepEqual(await readdir(home), [], `${label}: nothing written (no cache, no kit)`);
  }
});

test('only agent positions are refused: the agent\'s own arguments may name Gemini', () => {
  for (const args of [['claude', 'gemini'], ['codex', '-p', 'compare with Gemini'], ['opencode', '--', 'GEMINI'], ['--debug', 'claude', 'gemini'],
    ['--', 'gemini'], ['telemetry', 'status'], ['enable', '--dry-run'], ['status'], ['--version'], []])
    assert.equal(refusesGemini(args), false, args.join(' '));
  for (const args of FORMS) assert.equal(refusesGemini(args), true, args.join(' '));
});
