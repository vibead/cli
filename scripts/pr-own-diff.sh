#!/usr/bin/env bash
# QA carry-over check (see CONTRIBUTING.md "QA PASS carry-over").
#   scripts/pr-own-diff.sh <passedSha> <newSha>
# A QA PASS on <passedSha> carries over to <newSha> only if:
#   (a) every commit after <passedSha> is a merge (only main was merged in);
#   (b) the PR's own diff, `git diff $(git merge-base $BASE X) X` with
#       --unified=0 and index lines and hunk line numbers stripped, ignoring
#       LESSONS.md, is identical for both heads;
#   (c) no merge resolution changed anything outside LESSONS.md, lessons/ or docs/.
# (d) PR tests green on <newSha> is checked on the PR itself. Exits 0 when (a)-(c)
# hold, 1 when any fails, 2 on bad usage. BASE defaults to origin/main; fetch first.
# The same file lives in vibead/vibead-ai (tested there), vibead/vibead and vibead/cli.
set -euo pipefail

[ $# -eq 2 ] || { echo "usage: scripts/pr-own-diff.sh <passedSha> <newSha>" >&2; exit 2; }
base=${BASE:-origin/main}
passed=$(git rev-parse --verify --quiet "$1^{commit}") || { echo "unknown commit: $1" >&2; exit 2; }
new=$(git rev-parse --verify --quiet "$2^{commit}") || { echo "unknown commit: $2" >&2; exit 2; }
git rev-parse --verify --quiet "$base^{commit}" >/dev/null || { echo "unknown base: $base (git fetch origin first)" >&2; exit 2; }

ok=1
say() { printf '%s\n' "$*"; }

# (a) only merge commits since the passed head.
if ! git merge-base --is-ancestor "$passed" "$new"; then
  say "FAIL (a): ${passed:0:7} is not an ancestor of ${new:0:7} (history was rewritten)."
  ok=0
else
  # The PR's own line of history is the first-parent chain; main's commits
  # arrive through each merge's second parent and must already be on $base.
  extra=$(git rev-list --first-parent --no-merges "$passed..$new")
  notmain=""
  for m in $(git rev-list --first-parent --merges "$passed..$new"); do
    for parent in $(git rev-list --parents -n 1 "$m" | cut -d' ' -f3-); do
      git merge-base --is-ancestor "$parent" "$base" || notmain="$notmain ${m:0:7}"
    done
  done
  if [ -n "$extra" ]; then
    say "FAIL (a): non-merge commits after ${passed:0:7}:"
    git log --first-parent --no-merges --format='  %h %s' "$passed..$new"
    ok=0
  elif [ -n "$notmain" ]; then
    say "FAIL (a): merges that bring in something other than $base:$notmain"
    ok=0
  else
    say "OK   (a): only merges of $base after ${passed:0:7} ($(git rev-list --first-parent --count "$passed..$new") merge(s))."
  fi
fi

# (b) identical own diff.
own_diff() {
  git diff --unified=0 --no-color "$(git merge-base "$base" "$1")" "$1" -- . ':(exclude)LESSONS.md' |
    sed -E -e '/^index [0-9a-f]+\.\.[0-9a-f]+/d' -e 's/^@@ -[0-9,]+ \+[0-9,]+ @@/@@/'
}
p=$(own_diff "$passed" | git hash-object --stdin)
n=$(own_diff "$new" | git hash-object --stdin)
if [ "$p" = "$n" ]; then
  say "OK   (b): own diff identical (ignoring LESSONS.md): $p"
else
  say "FAIL (b): own diff differs (passed $p, new $n):"
  diff <(own_diff "$passed") <(own_diff "$new") | sed 's/^/  /' | head -n 40 || true
  ok=0
fi

# (c) merge resolutions only in LESSONS.md, lessons/ or docs/.
bad=""
for m in $(git rev-list --first-parent --merges "$passed..$new" 2>/dev/null); do
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    case "$f" in LESSONS.md|lessons/*|docs/*) ;; *) bad="$bad ${m:0:7}:$f" ;; esac
  done < <(git show --remerge-diff --format= --name-only "$m")
done
if [ -n "$bad" ]; then
  say "FAIL (c): merge resolutions outside LESSONS.md, lessons/ or docs/:$bad"
  ok=0
else
  say "OK   (c): merge resolutions only in LESSONS.md, lessons/ or docs/ (or none)."
fi

if [ "$ok" = 1 ]; then say "CARRY OVER: ${passed:0:7} -> ${new:0:7}. Also confirm PR tests are green on ${new:0:7}."; exit 0; fi
say "NO CARRY OVER: get a fresh QA PASS on ${new:0:7}."
exit 1
