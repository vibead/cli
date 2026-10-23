#!/bin/sh
# VibeAd installer (backup channel; npm `npm i -g @vibead/cli` stays primary).
#
#   curl -fsSL https://www.vibead.ai/install | sh
#
# Reads the pinned version from https://www.vibead.ai/install.json (never
# GitHub's "latest"), downloads that release for this computer, verifies its
# SHA-256 against the release's SHA256SUMS (and the Sigstore signature of
# SHA256SUMS when `cosign` is installed), installs it under ~/.vibead with a
# `vibead` command in ~/.local/bin (no sudo), then runs `vibead enable`, which
# lists every file it will change and asks before touching anything.
#
# Optional environment:
#   VIBEAD_VERSION=0.1.0-beta.27   install this version instead of the pinned one
#   VIBEAD_INSTALL_DIR=~/.vibead   where versions and the launcher live
#   VIBEAD_BIN_DIR=~/.local/bin    where the `vibead` command is linked
#   VIBEAD_NO_ENABLE=1             install only; run `vibead enable` yourself
#   VIBEAD_NO_MODIFY_PATH=1        accepted for older scripts; the installer never edits profiles
#   VIBEAD_REQUIRE_SIGNATURE=1     fail unless cosign verifies SHA256SUMS
#   VIBEAD_ZERO_STEP=1             opt in to zero-step setup (see below)
#
# Zero-step setup (vibead/vibead-ai#235) connects every detected agent, on
# install or on the first `vibead` run, whichever comes first, without a
# question, the same kit command as the npm postinstall. It is on since the
# install-notice wording was approved (vibead/vibead-ai#254);
# ZERO_STEP_CONSENT_APPROVED=0 goes back to `vibead enable`, which asks. CI, no
# terminal or root installs wire nothing here; the first `vibead` run does it
# as the user.
#
# The whole script is a function called on the last line, so a partial
# download runs nothing.

set -u

ZERO_STEP_CONSENT_APPROVED=1

main() {
  release_base=${VIBEAD_RELEASE_BASE:-https://github.com/vibead/cli/releases}
  install_dir=${VIBEAD_INSTALL_DIR:-$HOME/.vibead}
  bin_dir=${VIBEAD_BIN_DIR:-$HOME/.local/bin}
  signer='^https://github\.com/vibead/cli/\.github/workflows/sign-release\.yml@refs/heads/main$'
  issuer='https://token.actions.githubusercontent.com'

  command -v curl >/dev/null 2>&1 || fail "curl is required."
  command -v tar >/dev/null 2>&1 || fail "tar is required."
  if command -v sha256sum >/dev/null 2>&1; then sha() { sha256sum "$1" | cut -d' ' -f1; }
  elif command -v shasum >/dev/null 2>&1; then sha() { shasum -a 256 "$1" | cut -d' ' -f1; }
  else fail "sha256sum or shasum is required to verify the download."; fi

  platform=$(detect_platform) || exit 1

  tmp=$(mktemp -d 2>/dev/null || mktemp -d -t vibead) || fail "Could not create a temporary folder."
  trap 'rm -rf "$tmp"' EXIT INT TERM

  # The version comes from VIBEAD_VERSION or the site's pinned manifest, never
  # GitHub's "latest" release, which can point at a release without SHA256SUMS.
  if [ -n "${VIBEAD_VERSION:-}" ]; then
    want=${VIBEAD_VERSION#v}
  else
    manifest_url=${VIBEAD_MANIFEST_URL:-https://www.vibead.ai/install.json}
    fetch "$manifest_url" "$tmp/install.json" || fail "Could not read the current version ($manifest_url). Use npm instead: npm i -g @vibead/cli && vibead enable"
    want=$(tr -d '\n\r' < "$tmp/install.json" | grep -oE '"version"[[:space:]]*:[[:space:]]*"[0-9A-Za-z.+-]+"' | head -n 1 | sed -E 's/.*"([^"]+)"$/\1/')
    [ -n "$want" ] || fail "The version manifest ($manifest_url) has no version. Use npm instead: npm i -g @vibead/cli && vibead enable"
  fi
  sums_url="$release_base/download/v$want/SHA256SUMS"
  fetch "$sums_url" "$tmp/SHA256SUMS" || fail "Could not download the release checksums ($sums_url). Use npm instead: npm i -g @vibead/cli && vibead enable"

  # SHA256SUMS lines: "<64 hex>  vibead-beta-<version>-<platform>.tar.gz"
  line=$(grep -E "^[0-9a-f]{64}  vibead-beta-[0-9A-Za-z.+-]+-$platform\.tar\.gz\$" "$tmp/SHA256SUMS" | head -n 1)
  [ -n "$line" ] || fail "This release has no build for $platform yet. See https://github.com/vibead/cli#quick-start"
  expected=${line%% *}
  archive=${line##* }
  version=${archive#vibead-beta-}
  version=${version%-"$platform".tar.gz}
  [ "$version" = "$want" ] || fail "Checksums are for $version, not $want."

  verify_signature "$release_base/download/v$version/SHA256SUMS.sigstore.json"

  say "Downloading VibeAd $version for $platform..."
  fetch "$release_base/download/v$version/$archive" "$tmp/$archive" || fail "Download failed. Check your network and retry."
  actual=$(sha "$tmp/$archive")
  [ "$actual" = "$expected" ] || fail "Checksum mismatch for $archive (expected $expected, got $actual). Nothing was installed."
  say "Checksum verified."

  # Refuse absolute paths, parent-directory entries and anything outside the kit folder.
  folder="vibead-beta-$platform"
  tar -tzf "$tmp/$archive" > "$tmp/list" || fail "The archive is damaged."
  if grep -Ev "^$folder(/|\$)" "$tmp/list" | grep -q . || grep -Eq '(^|/)\.\.(/|$)' "$tmp/list"; then
    fail "Unexpected files in $archive. Nothing was installed."
  fi

  mkdir -p "$install_dir/versions" "$install_dir/bin" "$bin_dir" || fail "Could not create $install_dir or $bin_dir."
  stage=$(mktemp -d "$install_dir/versions/.stage.XXXXXX") || fail "Could not write to $install_dir."
  tar -xzf "$tmp/$archive" -C "$stage" || { rm -rf "$stage"; fail "Could not extract $archive."; }
  [ -f "$stage/$folder/vibead-beta" ] || { rm -rf "$stage"; fail "$archive has no vibead-beta executable."; }
  chmod 755 "$stage/$folder/vibead-beta"
  target="$install_dir/versions/$version-$platform"
  rm -rf "$target"
  mv "$stage/$folder" "$target" || fail "Could not install into $target."
  rm -rf "$stage"
  touch "$target"

  # Stable launcher: its path never changes across upgrades, so agent hooks
  # that `vibead enable` writes keep working after the next install.
  launcher="$install_dir/bin/vibead"
  cat > "$launcher.tmp" <<LAUNCHER || fail "Could not write $launcher."
#!/bin/sh
# Installed by https://www.vibead.ai/install. Points at the current version.
if [ "\$#" -eq 1 ] && { [ "\$1" = "--version" ] || [ "\$1" = "-v" ]; }; then
  printf '%s\\n' '$version'
  exit 0
fi
exec '$target/vibead-beta' "\$@"
LAUNCHER
  chmod 755 "$launcher.tmp" || fail "Could not write $launcher."
  mv -f "$launcher.tmp" "$launcher" || fail "Could not write $launcher."

  link="$bin_dir/vibead"
  if [ -e "$link" ] && [ ! -L "$link" ]; then
    warn "$link exists and was not installed by this script; left it alone. Use $launcher."
  else
    ln -sf "$launcher" "$link" || fail "Could not link $link."
  fi

  # Keep the current and the previous version; remove older ones (ls skips
  # the hidden .stage folders).
  # shellcheck disable=SC2012
  ls -1t "$install_dir/versions" 2>/dev/null | tail -n +3 | while IFS= read -r old; do
    rm -rf "${install_dir:?}/versions/$old"
  done

  say "Installed VibeAd $version: $link"
  ensure_path

  if [ -n "${VIBEAD_NO_ENABLE:-}" ]; then
    say "Next: vibead enable"
  elif zero_step; then
    say ""
    if ci_set || ! has_tty || [ "$(id -u)" = 0 ]; then
      say "Setup finishes the first time you run vibead."
    else
      # Prints the one-line notice (it names `vibead disable`); a re-install changes
      # no byte. Never reads the terminal.
      PATH="$install_dir/bin:$PATH" "$launcher" __wrapperless wire --announce < /dev/null || say "Setup finishes the first time you run vibead."
    fi
  elif has_tty; then
    say ""
    # A non-zero exit is almost always a deliberate "n" at the consent prompt
    # (the kit prints its own error otherwise), so say so neutrally.
    PATH="$install_dir/bin:$PATH" "$launcher" enable < /dev/tty || say "Setup skipped. Run \`vibead enable\` any time."
  else
    say "Next: vibead enable   (reviews and approves the changes)"
  fi
}

say() { printf '%s\n' "$*"; }
warn() { printf 'vibead: %s\n' "$*" >&2; }
fail() { printf 'vibead install: %s\n' "$*" >&2; exit 1; }

fetch() {
  curl --fail --silent --show-error --location --retry 2 --proto '=https,file' --proto-redir '=https' --output "$2" "$1"
}

has_tty() { (: < /dev/tty) 2>/dev/null; }

zero_step() { [ "$ZERO_STEP_CONSENT_APPROVED" = 1 ] || [ "${VIBEAD_ZERO_STEP:-}" = 1 ]; }

# Same rule as the npm postinstall: CI set to anything but empty, 0 or false.
ci_set() { case "${CI:-}" in ''|0|false|FALSE|False) return 1 ;; *) return 0 ;; esac; }

detect_platform() {
  os=$(uname -s); arch=$(uname -m)
  case "$arch" in x86_64|amd64) arch=x64 ;; arm64|aarch64) arch=arm64 ;; esac
  case "$os" in
    Darwin)
      # Apple Silicon under Rosetta reports x86_64; prefer the native build.
      if [ "$arch" = x64 ] && [ "$(sysctl -n sysctl.proc_translated 2>/dev/null)" = 1 ]; then arch=arm64; fi
      [ "$arch" = arm64 ] || [ "$arch" = x64 ] || { warn "unsupported Mac architecture $arch."; return 1; }
      echo "darwin-$arch" ;;
    Linux)
      [ "$arch" = x64 ] || { warn "Linux $arch is not supported yet (Linux x64 only)."; return 1; }
      glibc=$(getconf GNU_LIBC_VERSION 2>/dev/null | awk '{print $2}')
      if [ -n "$glibc" ]; then
        major=${glibc%%.*}; minor=${glibc#*.}; minor=${minor%%.*}
        if [ "$major" -lt 2 ] || { [ "$major" -eq 2 ] && [ "$minor" -lt 34 ]; }; then
          warn "VibeAd needs glibc 2.34 or newer (found $glibc)."; return 1
        fi
      fi
      echo "linux-x64" ;;
    *) warn "unsupported system $os. On Windows, run in PowerShell: irm https://www.vibead.ai/install.ps1 | iex"; return 1 ;;
  esac
}

verify_signature() {
  if ! command -v cosign >/dev/null 2>&1; then
    [ -z "${VIBEAD_REQUIRE_SIGNATURE:-}" ] || fail "VIBEAD_REQUIRE_SIGNATURE is set but cosign is not installed."
    return 0
  fi
  if fetch "$1" "$tmp/SHA256SUMS.sigstore.json" 2>/dev/null &&
    cosign verify-blob --bundle "$tmp/SHA256SUMS.sigstore.json" \
      --certificate-identity-regexp "$signer" --certificate-oidc-issuer "$issuer" \
      "$tmp/SHA256SUMS" >/dev/null 2>&1; then
    say "Signature verified (Sigstore)."
  else
    fail "Could not verify the signature of SHA256SUMS. Nothing was installed."
  fi
}

ensure_path() {
  case ":$PATH:" in *":$bin_dir:"*) return 0 ;; esac
  case "${SHELL:-}" in */zsh) rc="$HOME/.zshrc" ;; */bash) rc="$HOME/.bashrc"; [ "$(uname -s)" = Darwin ] && rc="$HOME/.bash_profile" ;; */fish) rc="" ;; *) rc="$HOME/.profile" ;; esac
  line="export PATH=\"$bin_dir:\$PATH\""
  begin='# >>> vibead installer PATH >>>'
  # A profile that already has the block or the exact line from an earlier
  # installer (cli#24) needs nothing.
  if [ -n "$rc" ] && [ -f "$rc" ] && { grep -qxF "$begin" "$rc" || grep -qxF "$line" "$rc"; }; then
    say "$bin_dir is already in your PATH in $rc. Open a new terminal to use \`vibead\`."
    return 0
  fi
  # No question here (CLI-2: the one consent is `vibead enable`'s) and no
  # profile edit: print the line to add.
  say "To use \`vibead\` in new terminals, add this to your shell profile:"
  say "  $line"
}

main "$@"
