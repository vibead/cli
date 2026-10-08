import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, chmod, mkdir, mkdtemp, readFile, rename, rm } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execute = promisify(execFile);
export const release = JSON.parse(await readFile(new URL('../releases.json', import.meta.url), 'utf8'));

export function platformKey(platform = process.platform, arch = process.arch) {
  const key = `${platform}-${arch}`;
  if (!release.platforms[key]) throw new Error(`Unsupported platform ${key}. Supported: macOS arm64/x64 and Linux x64 (glibc >= 2.34).`);
  return key;
}

export async function verifyChecksum(file, expected) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  const actual = hash.digest('hex');
  if (actual !== expected) throw new Error(`Release checksum mismatch. Expected ${expected}, received ${actual}.`);
}

async function download(url, destination) {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy || process.env.ALL_PROXY || process.env.all_proxy;
  if (proxy) {
    try {
      await execute('curl', ['--fail', '--location', '--silent', '--show-error', '--retry', '2', '--max-time', '300', '--proto', '=https', '--proto-redir', '=https', '--output', destination, url]);
    } catch (error) {
      throw new Error(error.code === 'ENOENT' ? 'curl is required to download through your configured HTTPS proxy.' : 'Release download through the configured proxy failed. Check your network and retry.');
    }
    return;
  }
  const response = await fetch(url, { signal: AbortSignal.timeout(300_000) });
  if (!response.ok || !response.body) throw new Error(`Release download failed: HTTP ${response.status}.`);
  await pipeline(Readable.fromWeb(response.body), createWriteStream(destination, { mode: 0o600 }));
}

export async function ensureInstalled() {
  const key = platformKey();
  const cache = resolve(process.env.VIBEAD_CACHE_DIR || join(homedir(), '.cache', 'vibead'));
  const target = join(cache, `${release.version}-${key}-${release.platforms[key].slice(0, 12)}`);
  const executable = join(target, 'vibead-beta');
  try { await access(executable); return executable; } catch {}
  await mkdir(cache, { recursive: true, mode: 0o700 });
  const staging = await mkdtemp(join(cache, '.install-'));
  try {
    console.error(`vibead: downloading verified ${release.version} for ${key} (first run only)…`);
    const archive = join(staging, 'release.tar.gz');
    const url = `https://github.com/vibead/cli/releases/download/v${release.version}/vibead-beta-${release.version}-${key}.tar.gz`;
    await download(url, archive);
    await verifyChecksum(archive, release.platforms[key]);
    try { await execute('tar', ['-xzf', archive, '-C', staging]); }
    catch (error) { throw new Error(error.code === 'ENOENT' ? 'tar is required to extract the official release.' : `Could not extract release: ${error.message}`); }
    const extracted = join(staging, `vibead-beta-${key}`);
    await chmod(join(extracted, 'vibead-beta'), 0o755);
    try { await rename(extracted, target); }
    catch (error) {
      // A concurrent first invocation may have finished the same verified kit.
      if (!['EEXIST', 'ENOTEMPTY'].includes(error.code)) throw error;
      await access(executable);
    }
    return executable;
  } finally {
    await rm(staging, { recursive: true, force: true });
  }
}
