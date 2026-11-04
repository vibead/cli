// beta.36 RC3b (CLI Tester): the npm launcher refuses every Gemini form itself, so a
// first `vibead gemini` (kit not yet fetched) prints only the refusal and exits 2: no
// "downloading…" line, no download, nothing written. Same rule as the kit's
// refusesGemini (vibead beta/lib/arguments.mjs; keep the two in step):
// - after a user command (enable, disable, uninstall, telemetry, status), any
//   non-option argument naming Gemini;
// - otherwise the agent position (VibeAd's options come first) and the --agent or
//   --binary value. The agent's own arguments are never inspected.
// Approved line, byte-exact (Nina 01:06 AEDT Oct 30; refusal only, Nina 03:47).
export const GEMINI_REFUSAL = "Gemini CLI isn't supported. Choose an agent: claude, codex or opencode";
const VALUE_OPTIONS = new Set(['--agent', '--mode', '--report-dir', '--model', '--binary']);
const USER_COMMANDS = new Set(['enable', 'disable', 'uninstall', 'telemetry', 'status']);
// Locale-safe: GEMİNİ (U+0130), gemını (U+0131), fullwidth and accented letters fold first.
const fold = name => name.normalize('NFKD').replace(/\p{M}/gu, '').replace(/\u0131/gu, 'i').toLowerCase();
export const namesGemini = name => typeof name === 'string' && fold(name).includes('gemini');

export function refusesGemini(input) {
  if (USER_COMMANDS.has(input[0])) return input.slice(1).some(arg => !arg.startsWith('-') && namesGemini(arg));
  for (let i = 0; i < input.length; i++) {
    const arg = input[i];
    if (arg === '--') return false;
    if (arg.startsWith('-')) {
      const name = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
      if (!VALUE_OPTIONS.has(name)) continue;
      const value = arg.includes('=') ? arg.slice(name.length + 1) : input[++i];
      if ((name === '--agent' || name === '--binary') && namesGemini(value)) return true;
      continue;
    }
    return namesGemini(arg);
  }
  return false;
}
