// beta.36 (CLI accuracy): `vibead uninstall` from npm leaves no `vibead`
// command. npm 7+ runs no uninstall scripts, so the launcher does it in order:
//   1. the kit's own `vibead uninstall`: turns ads off, restores the user's
//      agent and shell files byte-for-byte, removes ~/.vibead and the kits in
//      ~/.cache/vibead (vibead/vibead beta/lib/uninstall-files.mjs);
//   2. this launcher's cache folder, in case the kit could not run;
//   3. the npm package itself (`npm uninstall -g @vibead/cli` for the prefix
//      this launcher lives in), so `which vibead` comes back empty.
// If step 3 cannot run (npx, a local install, npm missing or refusing), it
// prints the one command that finishes the job instead of claiming success.
import { spawnSync } from 'node:child_process';
import { realpathSync, rmdirSync as rmdirSyncRaw } from 'node:fs';

// npm leaves the empty @vibead scope folder behind; it goes only if empty.
const rmdirSync = path => { try { rmdirSyncRaw(path); } catch {} };
import { readdir, rm, rmdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const PACKAGE = '@vibead/cli';
export const MANUAL = `Remove the vibead command with: npm uninstall -g ${PACKAGE}`;
const KIT_ENTRY = /^(?:\d[0-9A-Za-z.+-]*-(?:darwin|linux|win32)-(?:arm64|x64)-[0-9a-f]{12}|\.install-[A-Za-z0-9]+)$/u;

export const cacheDir = (env = process.env) => resolve(env.VIBEAD_CACHE_DIR || join(homedir(), '.cache', 'vibead'));

// Only kit-shaped entries go, then the folder if empty: a VIBEAD_CACHE_DIR
// pointing at a shared folder loses nothing else.
export async function removeKitCache(dir) {
  const names = await readdir(dir).catch(() => null);
  if (names === null) return false;
  for (const name of names.filter(n => KIT_ENTRY.test(n))) await rm(join(dir, name), { recursive: true, force: true });
  await rmdir(dir).catch(() => {});
  return true;
}

// <prefix>/lib/node_modules/@vibead/cli/bin/vibead.mjs (Unix global install).
export function globalPrefix(launcher = fileURLToPath(new URL('../bin/vibead.mjs', import.meta.url))) {
  let real = launcher;
  try { real = realpathSync(launcher); } catch {}
  const marker = `${sep}lib${sep}node_modules${sep}@vibead${sep}cli${sep}`;
  const at = real.lastIndexOf(marker);
  return at > 0 ? real.slice(0, at) : null;
}

export function removePackage({ prefix = globalPrefix(), spawn = spawnSync, env = process.env, execPath = process.execPath } = {}) {
  if (!prefix) return { removed: false, line: MANUAL };
  // npm next to this node first (nvm, fnm, Volta), then npm on PATH.
  for (const npm of [join(dirname(execPath), 'npm'), 'npm']) {
    const run = spawn(npm, ['uninstall', '--global', '--prefix', prefix, '--no-fund', '--no-audit', '--loglevel=error', PACKAGE], { env, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    if (run?.error?.code === 'ENOENT') continue;
    if (!run?.error && run?.status === 0) {
      rmdirSync(join(prefix, 'lib', 'node_modules', '@vibead'));
      return { removed: true, line: `Removed the npm package ${PACKAGE} (the vibead command).` };
    }
    break;
  }
  return { removed: false, line: MANUAL };
}

export async function npmUninstall({ runKit, env = process.env, log = console.log, remove = removePackage } = {}) {
  let code = 0;
  try { code = await runKit(); }
  catch (error) { log(`vibead: ${error.message}`); code = 1; }
  await removeKitCache(cacheDir(env));
  if (code !== 0) {
    // Settings were not restored: keep the command so the user can retry.
    log(`VibeAd kept the vibead command so you can run \`vibead uninstall\` again.`);
    return code;
  }
  const result = remove({ env });
  log(result.line);
  return result.removed ? 0 : 1;
}
