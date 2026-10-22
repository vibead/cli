// Shared by install/test/workflows.test.mjs: pull a step's shell out of a workflow
// so tests (and a dry run) execute the exact script the workflow runs.
import assert from 'node:assert/strict';

// The `run: |` block of the step named `name` (or with `id: <name>`), dedented.
export function stepRun(yaml, name) {
  const lines = yaml.split('\n');
  const at = lines.findIndex(l => l.trim() === `- name: ${name}` || l.trim() === `- id: ${name}`);
  assert.ok(at >= 0, `step "${name}" not found`);
  const stepIndent = lines[at].indexOf('-');
  let i = at + 1;
  for (; i < lines.length && !/^\s+run: \|$/.test(lines[i]); i++) {
    assert.ok(lines[i].trim() === '' || lines[i].search(/\S/) > stepIndent, `step "${name}" has no run block`);
  }
  const body = [];
  const indent = lines[i].search(/\S/) + 2;
  for (i++; i < lines.length && (lines[i].trim() === '' || lines[i].search(/\S/) >= indent); i++) body.push(lines[i].slice(indent));
  return body.join('\n');
}
