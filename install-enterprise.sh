#!/bin/bash
# Public Mac setup for the pinned, hosted-publisher beta. No sudo or shell changes.
set -eu

vibead_stage=''
vibead_lock=''
cleanup() {
  if [ -n "$vibead_stage" ]; then rm -rf -- "$vibead_stage"; fi
  if [ -n "$vibead_lock" ]; then rmdir -- "$vibead_lock" 2>/dev/null || true; fi
}
fail() { printf '%s\n' "$*" >&2; exit 1; }
ready() {
  printf '\nReady. Run this from your usual terminal:\n\n"%s/vibead-enterprise" claude\n\n' "$vibead_install"
  printf '%s\n' 'Publisher: https://4180--01a0fa0e-1ee5-7350-b0ad-f976a181e629.us-east-1-01.gitpod.dev/woolworths-demo'
  printf '%s\n' 'Publish a Terminal line, then send another prompt in Claude. No restart needed.'
}

main() {
  [ "$#" -le 1 ] || fail 'Usage: install-enterprise.sh [absolute install folder]'
  [ "$(uname -s)" = Darwin ] || fail 'This publisher beta setup is for macOS.'
  case "$(uname -m)" in
    arm64)
      vibead_arch=arm64
      vibead_sha=0b9693641c825ccc8685cd093707abd3f5272638d8eba934ef7414171aa6b07a
      ;;
    x86_64)
      vibead_arch=x64
      vibead_sha=1db032b7fe8b6e6778b36b0f68c3bf262b7ce9a0d62445436f868c54fcbe700f
      ;;
    *) fail 'This beta supports Apple Silicon and Intel Macs.' ;;
  esac
  for vibead_command in curl shasum tar codesign; do
    command -v "$vibead_command" >/dev/null 2>&1 || fail "Missing macOS command: $vibead_command"
  done
  command -v claude >/dev/null 2>&1 || fail 'Claude Code must already be installed and available as claude.'
  vibead_install=${1:-"$HOME/.vibead-enterprise"}
  case "$vibead_install" in /*) ;; *) fail 'Use an absolute install folder.' ;; esac
  vibead_receipt="enterprise-demo.2 $vibead_arch $vibead_sha"
  if [ -e "$vibead_install" ] || [ -L "$vibead_install" ]; then
    if [ ! -L "$vibead_install" ] && [ -f "$vibead_install/.install-receipt" ] &&
       [ "$(cat "$vibead_install/.install-receipt")" = "$vibead_receipt" ] &&
       [ -x "$vibead_install/vibead-enterprise" ] &&
       codesign --verify "$vibead_install/vibead-enterprise" 2>/dev/null; then
      ready
      return
    fi
    fail "The folder $vibead_install already exists. It was left unchanged. Choose another install folder."
  fi
  vibead_parent=$(dirname -- "$vibead_install")
  mkdir -p -- "$vibead_parent"
  mkdir -- "$vibead_install.install-lock" 2>/dev/null || fail 'Another setup may be running for this folder.'
  vibead_lock="$vibead_install.install-lock"
  trap cleanup EXIT
  trap 'exit 130' INT
  trap 'exit 143' HUP TERM
  vibead_stage=$(mktemp -d "$vibead_parent/.vibead-enterprise-setup.XXXXXX")
  vibead_name="vibead-enterprise-demo-darwin-$vibead_arch"
  vibead_archive="$vibead_stage/$vibead_name.tar.gz"
  printf '%s\n' 'Downloading the Mac publisher beta…'
  curl --fail --silent --show-error --location --retry 2 --connect-timeout 20 --max-time 300 \
    --proto '=https' --proto-redir '=https' \
    --output "$vibead_archive" \
    "https://github.com/vibead/cli/releases/download/v0.1.0-enterprise-demo.2/$vibead_name.tar.gz"
  printf '%s\n' 'Verifying the release and preparing it for this Mac…'
  (cd "$vibead_stage" && printf '%s  %s\n' "$vibead_sha" "$vibead_name.tar.gz" | shasum -a 256 -c -) >/dev/null ||
    fail 'Download checksum did not match. Nothing was installed; run setup again.'
  tar -xzf "$vibead_archive" -C "$vibead_stage"
  vibead_unpacked="$vibead_stage/$vibead_name"
  # The Linux-built experimental executable needs a local ad hoc signature.
  # This changes no system security policy and is not Developer ID notarization.
  codesign --force --sign - "$vibead_unpacked/vibead-enterprise" ||
    fail 'macOS could not prepare the executable. Nothing was installed.'
  codesign --verify "$vibead_unpacked/vibead-enterprise" ||
    fail 'macOS signature verification failed. Nothing was installed.'
  printf '%s\n' "$vibead_receipt" > "$vibead_unpacked/.install-receipt"
  [ ! -e "$vibead_install" ] && [ ! -L "$vibead_install" ] || fail 'The install folder appeared during setup; it was left unchanged.'
  mv -- "$vibead_unpacked" "$vibead_install"
  ready
}

# Keep execution last so an incomplete download cannot start setup early.
main "$@"
