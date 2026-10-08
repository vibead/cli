# Official Homebrew listing candidate

**Not submitted or accepted by Homebrew.** The file in `Casks/v/vibead.rb` is a
candidate for the official macOS catalog. Continue using the working public tap:

```sh
brew install vibead/tap/vibead
```

Homebrew creates a dedicated `formulae.brew.sh/cask/vibead` page only after its
maintainers accept a cask into `Homebrew/homebrew-cask`. A custom tap does not
create that page. No separate Homebrew account is needed.

## Acceptance gaps checked on 2026-10-08

- **Apple signing and notarization:** beta.12's macOS builds use ad hoc signatures
  and have no Developer ID notarization, as documented in [BETA.md](../../BETA.md#platform-notes).
  The [official cask policy](https://docs.brew.sh/Acceptable-Casks#platform-compatibility-and-macos-security-protections)
  requires executable artifacts to pass Gatekeeper checks. Publish a new release
  with properly signed and notarized Mac builds, then update this candidate's
  version and checksums. Do not replace the existing release assets or disable
  quarantine to obtain a passing check.
- **Public adoption:** `vibead/cli` was created on 2026-10-01 and had zero stars,
  forks and subscribers when checked. The [shared acceptance policy](https://docs.brew.sh/Package-Acceptance-Policy#notability)
  normally requires a repository at least 30 days old, plus 90 forks, 90 watchers,
  or 225 stars for an upstream owner's submission. The repository reaches 30 days
  on 2026-10-31; age alone will not satisfy the other requirements. Casks can
  receive consideration for independently verifiable adoption or other documented
  exceptions. Such evidence still needs to be supplied, and acceptance remains
  Homebrew's decision.
- **Release channel:** Homebrew 7.0.8's new-cask audit rejects the current GitHub
  prerelease. The current cask policy permits an upstream-recommended beta
  channel, but the candidate still needs a documented exception acceptable to
  maintainers or a genuinely qualified stable release. Do not relabel beta.12 as
  stable just to suppress the audit.

`homebrew/core` is not the appropriate route for the current proprietary,
platform-specific binaries. Its [formula requirements](https://docs.brew.sh/Acceptable-Formulae)
include an eligible open-source license and source-build requirements.

## Candidate design and validation

The candidate uses official release downloads and their published SHA-256 hashes
for Apple Silicon and Intel Macs. Linking the executable leaves its bundled Node
runtime and native modules together in the Caskroom. Linux users continue using
the existing formula. The update check explicitly tracks the documented beta
channel and excludes the separate enterprise-demo releases.

Validation on 2026-10-08 with Homebrew 7.0.8:

- `brew style` passed with no offenses.
- `brew livecheck --cask` selected `0.1.0-beta.12` correctly.
- `brew audit --cask --new --os=macos --arch=arm` downloaded and checked the
  candidate but failed on the GitHub prerelease and repository notability.
- The audit ran from Linux with macOS simulation. Apple signature/notarization
  checks and real Mac installation were not validated by this run.

Before an upstream PR, validate on Apple Silicon and Intel Macs with Homebrew's
normal quarantine protections enabled. In a checkout of `Homebrew/homebrew-cask`,
copy the updated candidate to `Casks/v/vibead.rb`, then run:

```sh
export HOMEBREW_NO_INSTALL_FROM_API=1
brew style Casks/v/vibead.rb
brew audit --cask --new vibead
brew livecheck --cask vibead
brew install --cask vibead
vibead --help
vibead-beta --help
brew uninstall --cask vibead
```

All checks must pass before submission. The current candidate is not a claim of
passing Mac installation or Gatekeeper validation. Its CLI is the release's
native entry point; the custom formula's additional `--version` wrapper is not
part of this candidate.

Search for existing and previously declined Vibead casks before opening a PR.
Follow Homebrew's [contribution instructions](https://github.com/Homebrew/homebrew-cask/blob/master/AGENTS.md)
and disclose AI assistance and the checks actually performed. Maintainer review
and publication of the page are separate from preparing this candidate.
