// Zero-step install (vibead/vibead-ai#235). Gaurav approved the install-notice
// wording word for word in vibead/vibead-ai#254 (2a, 23 Oct 2026), and
// npm/README.md shows it above the install command. Set false to go back: the
// postinstall then does nothing (no download, no file change) and
// `vibead enable` (which asks) turns ads on. vibead/vibead
// beta/lib/notices.mjs and install/install.sh carry the same switch.
export const ZERO_STEP_CONSENT_APPROVED = true;

export const zeroStepEnabled = (approved = ZERO_STEP_CONSENT_APPROVED) => approved === true;
