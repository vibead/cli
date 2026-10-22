// Zero-step install (vibead/vibead-ai#235) waits for Gaurav's legal sign-off of
// the install-notice wording. Until this is true the postinstall does nothing:
// no download, no file change, and `vibead enable` (which asks) stays the way
// to turn ads on. Flip it in the PR that puts the signed-off sentence in
// npm/README.md; vibead/vibead beta/lib/notices.mjs and install/install.sh
// carry the same switch.
export const ZERO_STEP_CONSENT_APPROVED = false;

// VIBEAD_ZERO_STEP=1 is an explicit opt-in (QA, simulations, anyone who asks).
export const zeroStepEnabled = (env = process.env, approved = ZERO_STEP_CONSENT_APPROVED) =>
  approved === true || env?.VIBEAD_ZERO_STEP === '1';
