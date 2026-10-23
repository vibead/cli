// Same install-time rules as vibead/vibead beta/lib/install-identity.mjs.
// This package cannot import that repo, so the gate lives here too.
import { spawnSync } from 'node:child_process';
import { closeSync, openSync, readFileSync, readlinkSync, writeSync } from 'node:fs';

export function parsePasswd(line) {
  const [user, , uid, gid, , home] = String(line ?? '').split(':');
  if (!user || !home || !/^\d+$/u.test(uid ?? '') || !/^\d+$/u.test(gid ?? '')) return null;
  return { user, uid: Number(uid), gid: Number(gid), home };
}

export function lookupPasswd(user) {
  if (!user || !/^[A-Za-z0-9._-]+$/u.test(user)) return null;
  try {
    const run = spawnSync('getent', ['passwd', user], { encoding: 'utf8' });
    if (run.status !== 0) return null;
    return parsePasswd(String(run.stdout).split('\n')[0]);
  } catch { return null; }
}

// CI, `npm --ignore-scripts`, or an install with no terminal makes no file changes.
// npm pipes a lifecycle script's own stdout, so a normal `npm i` only counts
// when an ancestor process still has a terminal on stdout.
export function installTimeWiringAllowed({ env = {}, stdoutIsTTY = false, ancestorStdoutIsTTY = false } = {}) {
  const ci = env.CI;
  if (typeof ci === 'string' && ci !== '' && ci !== '0' && ci.toLowerCase() !== 'false') return false;
  if (env.npm_config_ignore_scripts === 'true') return false;
  if (!stdoutIsTTY && !ancestorStdoutIsTTY) return false;
  return true;
}

function fdIsTerminal(pid, fd) {
  try {
    const target = readlinkSync(`/proc/${pid}/fd/${fd}`);
    return target === '/dev/tty' || target.startsWith('/dev/tty') || target.startsWith('/dev/pts/');
  } catch { return false; }
}

function parentPid(pid) {
  try {
    const line = readFileSync(`/proc/${pid}/status`, 'utf8').split('\n').find(row => row.startsWith('PPid:'));
    return Number(line?.split(/\s+/u)[1] ?? 0);
  } catch { return 0; }
}

// True when this process, or one that started it, has a terminal for stdout.
// Linux reads /proc. Elsewhere, an openable /dev/tty is the signal.
export function detectAncestorStdoutIsTTY(pid = process.pid) {
  if (process.stdout.isTTY) return true;
  let sawProc = false;
  for (let i = 0; i < 12 && pid > 1; i++) {
    try { readlinkSync(`/proc/${pid}/fd/1`); sawProc = true; } catch { /* not linux, or the process is gone */ }
    if (fdIsTerminal(pid, 1) || fdIsTerminal(pid, 2)) return true;
    const parent = parentPid(pid);
    if (!parent || parent === pid) break;
    pid = parent;
  }
  if (sawProc) return false;
  try { const fd = openSync('/dev/tty', 'r'); closeSync(fd); return true; } catch { return false; }
}

// npm hides lifecycle stdout. The notice goes to the terminal when there is one.
export function writeInstallNotice(text, { stdoutIsTTY = Boolean(process.stdout.isTTY), write = console.log, warn = console.error } = {}) {
  if (stdoutIsTTY) { write(text); return 'stdout'; }
  try {
    const fd = openSync('/dev/tty', 'w');
    writeSync(fd, `${text}\n`);
    closeSync(fd);
    return 'tty';
  } catch {
    warn(text);
    return 'stderr';
  }
}

export function resolveInstallIdentity({
  uid = typeof process.getuid === 'function' ? process.getuid() : 0,
  env = process.env,
  lookup = lookupPasswd,
  rootHome = lookup('root')?.home || '/root',
} = {}) {
  if (uid !== 0 || env.VIBEAD_WIRE_DROPPED === '1') {
    return { drop: false, uid, home: env.HOME || null, user: env.USER || null };
  }
  const sudoUser = env.SUDO_USER;
  if (!sudoUser || sudoUser === 'root') return { drop: false, uid: 0, home: env.HOME || rootHome, user: 'root', root: true, rootHome };
  const pw = lookup(sudoUser);
  if (!pw || pw.uid === 0) return { drop: false, refuse: true, uid: 0, user: sudoUser, rootHome };
  return { drop: true, uid: pw.uid, gid: pw.gid, home: pw.home, user: pw.user, rootHome };
}

// Re-run this process as SUDO_USER. The parent returns { dropped: true } and
// must exit without writing. `spawn` is injectable so tests never setuid.
export function reexecAsInstallUser({
  uid = typeof process.getuid === 'function' ? process.getuid() : 0,
  env = process.env,
  argv = process.argv,
  lookup = lookupPasswd,
  spawn = spawnSync,
} = {}) {
  const identity = resolveInstallIdentity({ uid, env, lookup });
  if (!identity.drop) return { dropped: false, identity };
  const result = spawn(argv[0], argv.slice(1), {
    uid: identity.uid,
    gid: identity.gid,
    env: { ...env, HOME: identity.home, USER: identity.user, LOGNAME: identity.user, VIBEAD_WIRE_DROPPED: '1' },
    stdio: 'inherit',
  });
  return { dropped: true, status: result?.status ?? 1, identity };
}
