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
  assert.match(npm, /npm publish --provenance/);
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
  assert.doesNotMatch(y.replace(branches[1], ''), /--latest(?!=false)/, '--latest only in the npm_tag latest branch');
  // Homebrew is a Live channel: the tap job runs only for npm_tag latest, so a `next` run never touches it.
  const tap = y.slice(y.indexOf('\n  tap:'));
  assert.match(tap.split('\n    steps:')[0], /^    if: inputs\.npm_tag == 'latest'$/m, 'tap job gated on npm_tag latest');
});
