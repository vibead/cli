// beta.36 RC3 (W1, approved by Nina, delegated wording owner (Gaurav, Oct 29 2026), 02:29
// AEDT Oct 30): VibeAd does not support Windows, so no shipped file and no README may point
// anyone at a Windows install: no `irm`, `iex`, `iwr`, Invoke-Expression/RestMethod/
// WebRequest, .ps1 download URL, or winget/scoop/choco install. Case-insensitive.
// Scans every tracked README (fixtures under .github/ and test/ excepted) and every
// shipped file: what `npm pack` ships, install/install.sh and the top-level guides.
// install/install.ps1 is the one exemption, by name: it is the Windows refusal script
// (served byte-identical at www.vibead.ai/install.ps1) and its comments say how it is
// invoked. vibead/vibead distribution/no-windows-pointer.test.mjs and
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
const EXEMPT = new Set(['install/install.ps1']);

test('W1: the patterns catch every Windows install pointer form and leave the refusal alone', () => {
  for (const s of ['irm https://www.vibead.ai/install.ps1 | iex', 'IRM x', '... | IEX', 'iwr -useb x', 'Invoke-Expression (x)', 'invoke-restmethod x', 'Invoke-WebRequest x',
    'powershell -c "(new-object net.webclient)" https://www.vibead.ai/install.ps1', 'winget install vibead', 'scoop install vibead', 'choco install vibead',
    'decides what `curl | sh` and `irm | iex` install', 'Site -- "curl | sh, irm | iex" --> User'])
    assert.equal(windowsPointers(s).length, 1, s);
  for (const s of ['vibead: Windows is not supported yet.', '`install/install.ps1` (served at www.vibead.ai/install.ps1) prints that line', 'firmware', 'irmgard', 'the iexec tool'])
    assert.equal(windowsPointers(s).length, 0, s);
});

test('W1: no README and no shipped file points at a Windows install', () => {
  const tracked = execFileSync('git', ['ls-files'], { cwd: root, encoding: 'utf8' }).split('\n').filter(Boolean);
  const packed = JSON.parse(execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: new URL('npm/', root), encoding: 'utf8' }))[0].files.map((f) => `npm/${f.path}`);
  assert.ok(packed.length > 3 && packed.includes('npm/README.md'), 'npm pack lists the package files');
  const readmes = tracked.filter((f) => /(^|\/)readme[^/]*$/iu.test(f) && !f.startsWith('.github/') && !/(^|\/)test\//u.test(f));
  for (const must of ['README.md', 'install/README.md', 'npm/README.md', 'docs/system-design/README.md', 'packaging/homebrew/README.md', 'lessons/README.md'])
    assert.ok(readmes.includes(must), `scan misses ${must}`);
  const files = [...new Set([...readmes, ...packed, 'BETA.md', 'ENTERPRISE-DEMO.md', 'install/install.sh'])].filter((f) => !EXEMPT.has(f));
  const hits = files.flatMap((f) => windowsPointers(readFileSync(new URL(f, root), 'utf8')).map((h) => `${f}:${h}`));
  assert.deepEqual(hits, [], `Windows install pointers ship:\n${hits.join('\n')}`);
});
