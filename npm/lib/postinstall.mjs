// When npm allows this script to run (npm 10 and 11; npm 12 blocks it), it
// connects every detected agent at install. Otherwise, and on any failure, the
// first `vibead` run does it: agents connect on install or on the first run,
// whichever comes first. A failure here never fails the install.
// On since the install-notice wording was approved (./consent.mjs, vibead-ai#254).
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { detectAncestorStdoutIsTTY, installTimeWiringAllowed, reexecAsInstallUser, writeInstallNotice } from './identity.mjs';
import { ensureInstalled } from './install.mjs';
import { zeroStepEnabled } from './consent.mjs';

export const SETUP_LATER = 'vibead: setup finishes the first time you run vibead';

export async function runPostinstall({
  env = process.env,
  stdoutIsTTY = Boolean(process.stdout.isTTY),
  uid = typeof process.getuid === 'function' ? process.getuid() : 0,
  argv = process.argv,
  spawn = spawnSync,
  ensure = ensureInstalled,
  kit = env.VIBEAD_KIT || '',
  warn = console.error,
  lookup,
  ancestorStdoutIsTTY = detectAncestorStdoutIsTTY(),
  showNotice = writeInstallNotice,
  approved,
} = {}) {
  if (!zeroStepEnabled(env, approved)) return { code: 0, skipped: 'pending-sign-off' };
  if (!installTimeWiringAllowed({ env, stdoutIsTTY, ancestorStdoutIsTTY })) return { code: 0, skipped: 'gated' };
  const dropped = reexecAsInstallUser({ uid, env, argv, spawn, ...(lookup ? { lookup } : {}) });
  if (dropped.identity?.refuse) {
    warn(SETUP_LATER);
    return { code: 0, skipped: 'root-unresolved' };
  }
  if (dropped.dropped) {
    if (dropped.status !== 0) warn(SETUP_LATER);
    return { code: 0, dropped: true, status: dropped.status };
  }
  let executable = kit;
  if (!executable) {
    try { executable = await ensure(); }
    catch (error) {
      // beta.36: an unsupported platform never finishes setup later; say so.
      if (/^Unsupported platform/u.test(error?.message ?? '')) { warn(`vibead: ${error.message} Remove it with: npm uninstall -g @vibead/cli`); return { code: 0, skipped: 'unsupported-platform' }; }
      warn(SETUP_LATER);
      return { code: 0, skipped: 'no-kit' };
    }
  }
  const child = spawn(executable, ['__wrapperless', 'wire', '--announce'], { env, encoding: 'utf8' });
  const announced = `${child?.stdout ?? ''}${child?.stderr ?? ''}`;
  if (child?.error || child?.status !== 0 || !announced.trim()) {
    warn(SETUP_LATER);
    return { code: 0, status: child?.status ?? 1, skipped: 'wire-failed' };
  }
  showNotice(announced.trimEnd(), { stdoutIsTTY });
  return { code: 0, status: 0 };
}

function invokedDirectly() {
  const entry = process.argv[1];
  if (!entry) return false;
  return import.meta.url === pathToFileURL(resolve(entry)).href;
}

if (invokedDirectly()) {
  runPostinstall()
    .then(() => { process.exitCode = 0; })
    .catch(() => { console.error(SETUP_LATER); process.exitCode = 0; });
}
