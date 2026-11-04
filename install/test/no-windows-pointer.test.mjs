// beta.36 RC3 (W1, approved by Nina, delegated wording owner (Gaurav, Oct 29 2026), 02:29
// AEDT Oct 30): VibeAd does not support Windows, so no shipped file and no README may point
// anyone at a Windows install: no `irm`, `iex`, `iwr`, Invoke-Expression/RestMethod/
// WebRequest, .ps1 download URL, or winget/scoop/choco install. Case-insensitive.
// Scans every tracked text file and what `npm pack` ships (RC3 QA, 03:48 AEDT Oct 30).
// ALLOWED names the three files that must spell the forms out: install/install.ps1, the
// Windows refusal script (served byte-identical at www.vibead.ai/install.ps1), its test,
// and this guard. vibead/vibead distribution/no-windows-pointer.test.mjs and
// vibead/homebrew-tap scripts/check-no-windows.sh use the same patterns.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);

export const WINDOWS_POINTERS = [
  /\birm\b/iu, /\biex\b/iu, /\biwr\b/iu, /\bInvoke-(Expression|RestMethod|WebRequest)\b/iu,
  /https?:\/\/[^\s"'`)<>]*\.ps1\b/iu, /\b(winget|scoop|choco)\s+install\b/iu,
];
export const windowsPointers = (text) => text.split('\n').flatMap((line, i) => (WINDOWS_POINTERS.some((re) => re.test(line)) ? [`${i + 1}: ${line.trim().slice(0, 140)}`] : []));
// Scope (RC3 QA, 03:48 AEDT Oct 30): every tracked text file (READMEs, guides, internal docs,
// code, tests, workflows) plus what `npm pack` ships. Allow-list, by name only.
export const ALLOWED = new Set([
  'install/install.ps1', // the Windows refusal script: its comments say how it is invoked
  'install/test/install.test.mjs', // runs that refusal script the way PowerShell would
  'install/test/no-windows-pointer.test.mjs', // this guard: its comment and pattern tests spell the forms out
]);

test('W1: the patterns catch every Windows install pointer form and leave the refusal alone', () => {
  for (const s of ['irm https://www.vibead.ai/install.ps1 | iex', 'IRM x', '... | IEX', 'iwr -useb x', 'Invoke-Expression (x)', 'invoke-restmethod x', 'Invoke-WebRequest x',
    'powershell -c "(new-object net.webclient)" https://www.vibead.ai/install.ps1', 'winget install vibead', 'scoop install vibead', 'choco install vibead',
    'decides what `curl | sh` and `irm | iex` install', 'Site -- "curl | sh, irm | iex" --> User'])
    assert.equal(windowsPointers(s).length, 1, s);
  for (const s of ['vibead: Windows is not supported yet.', '`install/install.ps1` (served at www.vibead.ai/install.ps1) prints that line', 'firmware', 'irmgard', 'the iexec tool'])
    assert.equal(windowsPointers(s).length, 0, s);
});

test('W1: no tracked text file points at a Windows install (allow-list: the refusal script, its test, this guard)', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: new URL('npm/', root), encoding: 'utf8' }))[0].files.map((f) => `npm/${f.path}`);
  assert.ok(packed.length > 3 && packed.includes('npm/README.md'), 'npm pack lists the package files');
  for (const must of ['README.md', 'install/README.md', 'npm/README.md', 'docs/system-design/README.md', 'packaging/homebrew/README.md', 'lessons/README.md',
    'LESSONS.md', 'docs/quality/definition-of-done.md', 'BETA.md', 'ENTERPRISE-DEMO.md', 'install/install.sh', ...packed])
    assert.ok(tracked.includes(must) || packed.includes(must), `scan misses ${must}`);
  const hits = [];
  let scanned = 0;
  for (const f of [...new Set([...tracked, ...packed])]) {
    if (ALLOWED.has(f)) continue;
    let bytes; try { bytes = readFileSync(new URL(f, root)); } catch { continue; }
    if (bytes.includes(0)) continue; // binary
    scanned++;
    hits.push(...windowsPointers(bytes.toString('utf8')).map((h) => `${f}:${h}`));
  }
  assert.ok(scanned > 40, `${scanned} text files scanned`);
  assert.deepEqual(hits, [], `Windows install pointers ship:\n${hits.join('\n')}`);
});
