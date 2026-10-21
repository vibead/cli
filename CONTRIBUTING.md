# Contributing

## Feature flags

Features such as sign-in providers, house ads and test or QA clients must sit behind **per-environment config flags**, never hard-coded in the launchers or installers here.

- The npm launcher and the install scripts take options only from documented `VIBEAD_*` environment variables (see `install/README.md`), and each has a safe default.
- Test-only overrides, such as `VIBEAD_RELEASE_BASE` for a local mirror, must never change the default behaviour a user gets from the one-line install.
- Add a test for both the default and the flagged behaviour.
