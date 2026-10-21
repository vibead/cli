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
