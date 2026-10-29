#!/usr/bin/env node
import { spawn } from 'node:child_process';
import { ensureInstalled, release } from '../lib/install.mjs';
import { npmUninstall } from '../lib/uninstall.mjs';
import { GEMINI_REFUSAL, refusesGemini } from '../lib/gemini.mjs';

const runKit = (executable, args) => new Promise((done, fail) => {
  const child = spawn(executable, args, { stdio: 'inherit' });
  child.on('error', fail);
  child.on('exit', code => done(code ?? 1));
});

try {
  const args = process.argv.slice(2);
  if (refusesGemini(args)) {
    // RC3b: before ensureInstalled, so a first Gemini form downloads and writes nothing.
    console.error(`vibead: ${GEMINI_REFUSAL}`);
    process.exitCode = 2;
  } else if (args.length === 1 && (args[0] === '--version' || args[0] === '-v')) {
    console.log(release.version);
  } else if (args.length === 1 && args[0] === 'uninstall') {
    // beta.36: the kit restores settings and removes its files, then this
    // launcher removes the npm package (npm runs no uninstall scripts).
    process.exitCode = await npmUninstall({ runKit: async () => {
      let executable;
      try { executable = await ensureInstalled(); }
      catch (error) { if (/^Unsupported platform/u.test(error.message)) return 0; throw error; } // no kit ever ran: nothing to restore
      return runKit(executable, args);
    } });
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
  console.error(error.line ?? `vibead: ${error.message}`);
  process.exitCode = 1;
}
