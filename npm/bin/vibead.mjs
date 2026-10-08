#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { ensureInstalled, release } from '../lib/install.mjs';

try {
  const args = process.argv.slice(2);
  if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
    console.log(release.version);
  } else {
    const executable = await ensureInstalled();
    const child = spawn(executable, args, { stdio: 'inherit' });
    // Keep the wrapper alive until the native process finishes its cleanup.
    const handlers = new Map(['SIGINT', 'SIGTERM', 'SIGHUP'].map(signal => [signal, () => child.kill(signal)]));
    for (const [signal, handler] of handlers) process.on(signal, handler);
    child.on('error', error => { console.error(`vibead: ${error.message}`); process.exitCode = 1; });
    child.on('exit', (code, signal) => {
      for (const [signal, handler] of handlers) process.removeListener(signal, handler);
      if (signal) process.kill(process.pid, signal);
      else process.exitCode = code ?? 1;
    });
  }
} catch (error) {
  console.error(`vibead: ${error.message}`);
  process.exitCode = 1;
}
