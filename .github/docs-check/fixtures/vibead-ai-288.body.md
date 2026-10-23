## Spec
**User outcome:** When the lasting web session is on (#278), a page load is cheap. An anonymous visitor's session check is a quiet "signed out" (204, not a 401 in the console), and a signed-in reload doesn't call Cognito unless the access token is about to expire. When the access token does expire on an open page, the sponsor home and `/sponsor` recover by themselves (one restore, one retry) instead of showing an error or the sign-in gate (#292).
**Audiences affected:** AI users: none (flag off on www today; no CLI API change) · Sponsors/advertisers (all brands): with #278 on, signed-in reloads show Account faster (no Cognito round trip most of the time), and an expired token on the sponsor home, `/sponsor`, the share page or account delete is renewed once without a reload · Admins: none
**Acceptance criteria:**
- [x] `restore()` still rotates `vibead_sid` on every call, and returns the stored access token when `access_exp > now + 180 s` (`REFRESH_MARGIN_S = 180`, #292). Cognito is called whenever 180 s or less is left, so a restored token always has more than 180 s.
- [x] `POST /api/auth/session` with no `vibead_sid` cookie answers 204 (empty body, `Cache-Control: no-store`, no cookie, no table read). Unknown, expired or revoked ids are still 401, and CSRF is still checked first (403).
- [x] The client treats 204 as signed out (`restoreWebSession` returns null).
- [x] #292: on `/login` (sponsor home, role, lead, account delete) and `/sponsor`, a 401 restores the session once and retries the call once (`withSessionRetry`, `SESSION_RETRIES = 1`), then shows the existing gate or "We couldn't open your sponsor account just now…". No loops (at most one restore and two requests per call). The share page does the same. Only when `webSessionEnabled === true`. No renewal timer: the retry is enough for the pages to recover.
- [x] Tests: 121 s and 119 s left both refresh; 179/180/181 boundary (1/1/0 calls); a fresh token makes 0 Cognito calls while the sid rotates; anonymous 204; a grace reissue with 190 s left makes 0 Cognito calls (kills the #284 `_reissue` +200 survivor); the retry-once path, with zero-retry and infinite-retry mutants killed.
- [x] No approved legal text changes (1f byte-identical).
**Risks:** A restored access token can have 181 s to 15 min left instead of a fresh 15 min. There is still no renewal timer; instead the first 401 on the sponsor home, `/sponsor`, the share page or account delete restores once and retries once, so an expired token costs one extra round trip, not an error (#292). If that restore fails (signed out elsewhere, family revoked, Cognito down) the page shows what it showed before. A retry after a refused `DELETE /api/account` is safe: a 401 deletes nothing. Each retry is one extra restore, i.e. one id rotation and at most one Cognito refresh. No security change: the stored access token is the one `_reissue` already returns in the grace path, and the id still rotates on every restore (theft detection unchanged). The renewed token overwrites the tab's existing `vibead.access` copy only; nothing new is stored.

## What and why

This is the decision on QA's #242 note for #278: with the flag on, every www page load POSTs `/api/auth/session` (anonymous visitors got a 401), and every signed-in load did a Cognito refresh even with a valid token.

- `functions/auth-api/web_session.py`: adds `REFRESH_MARGIN_S = 180` (120 in round 1; 180 per #292). `restore()` returns the stored tokens after the id swap when the stored token has more than 180 s left, otherwise it refreshes as before (with the existing fallback). `post_session` answers 204 when no session cookie is present.
- `apps/static-web/web-session.js`: `restoreWebSession` returns null on 204 explicitly (it previously only relied on `res.json()` throwing). New `withSessionRetry(request, token, { enabled, onToken })`: on a 401 it restores once and retries once (#292).
- `apps/static-web/login/login.js`: `me()` (`sessionMeApi`) and `withSession()` (`sessionRetry`) wrap the sponsor home, role, lead and account-delete calls; `meApi` and `deleteAccount` errors now carry `status`. The renewed token replaces `tokens` and the tab's `vibead.access` copy if one exists.
- `apps/static-web/sponsor/index.html` + `sponsor/dashboard.js` (`fetchDashboard`), `apps/static-web/earnings/page.js` (`loadShare`): the same retry, gated on `webSessionEnabled`.
- Tests: `test_web_session.py` (4 new tests; the grace and reuse tests restore inside the margin, so they still exercise the Cognito path), `scripts/session-retry.test.mjs` (new, 10 tests), `scripts/share-page.test.mjs` (+1), `scripts/web-session.test.mjs` (204 → signed out), and the render-test stub in `scripts/site-header-render.test.mjs`, which mirrors auth-api (404 flag off, 204 anonymous).
- Design doc: what a page load costs with the flag on (180 s margin, retry-once recovery), the rotation bullet, and QA's DOC-6 nit: `/login` restores too, from `login.js`; only `site-header.js` skips `/login` and `/device`.

Branched from main at `99ad08c` (#242 merged). Round 2 folds the #292 fix into this PR (one more commit, no rebase or force-push), so both ship in one deploy. Merge order: this lands **before #278** (the www flag flip). It has no infra change.

Part of #217

Fixes #292

## Definition of Done

Head SHA handed to QA: `7517e2c` (round 1 passed `9a06e6d`, which is an ancestor)
Cost impact (SAFE-5): an anonymous restore is one API Gateway request plus one short Lambda call (no DynamoDB). A signed-in restore is about 3 DynamoDB reads and 4 writes, plus a Cognito token call at most once per 15-minute token (before: every load). The 180 s margin (#292) doesn't add refreshes: still at most one per token, just up to 60 s earlier. A #292 retry costs one extra restore (the same figures) and happens at most once per expired token per page. At www's traffic for Oct 16–23, 2026 (`ANY /api/auth/{proxy+}` 767 calls in 7 days, an upper bound for JS page loads, so about 3,300 restores a month once #278 is on) that is **under US$0.01/month**. At 10 times that, with 20% of loads signed in, it is **about US$0.05–0.10/month** (API Gateway, Lambda arm64 256 MB, CloudFront requests, DynamoDB on-demand). Cognito Essentials bills per monthly active user, not per refresh. That is far below the US$20/month hold. Cognito refreshes count against UserAuthentication (120 RPS per account and Region); at most one per session per 15 min, about 0.01 RPS at 10 times. Read-only CloudWatch, ap-southeast-2 and CloudFront us-east-1.
Docs (DOC-1): `docs/system-design/README.md` (lasting web session section)

### Merge
- [x] MERGE-0 this block is complete: every applicable line ticked with evidence, the rest `N/A - <reason>`
- [x] MERGE-7 the body opens with the spec above: outcome, audiences, acceptance criteria as checks, risks
- [x] MERGE-8 self-verified end to end on the handed-off head before handoff: `7517e2c` (unit + node suites, mutants, SAFE-9, plans below)
- [x] MERGE-9 DoD edits only: N/A - no DoD change
- [x] MERGE-1 `PR tests` green on head, in the ready_for_review run or later: https://github.com/vibead/vibead-ai/actions/runs/39914275254 (pull_request, `ready_for_review`) success @ `7517e2c`
- [x] MERGE-2 every required check ran, in the ready_for_review run or later: `gh pr checks 288` after ready: "Site copy, script, function and Terraform tests (Linux)" pass 3m38s (run 39914275254). Docs check run https://github.com/vibead/vibead-ai/actions/runs/39914275248 (`ready_for_review`): "Docs updated (or 'docs: n/a')" success and "Design doc updated (or 'Design doc: N/A — <reason>')" success. The skipped docs jobs (run 39914267721) are the body edit made while the PR was a draft. No path skips.
- [x] MERGE-3 clean merge with current main plus the suite green on the merge result: main is now `b2394c5` (#260). `git merge-tree --write-tree origin/main HEAD` is clean (tree `d310cd7`). On that merge result (a local commit, not pushed): test:scripts 483 tests, 480 pass, 0 fail, 1 skip, 2 todo; Python suites 12 run, 0 failed
- [x] MERGE-5 carry-over only: N/A - not a carry-over: round 2 adds new code (the #292 fix) on top of the QA'd head
- [x] MERGE-6 true 2-parent merges: N/A - no merges; two commits on `99ad08c` (`9a06e6d`, then `7517e2c`), no force-push; `git merge-base --is-ancestor 9a06e6d 7517e2c` exits 0

### Tests
- [x] TEST-1 full suite on head `7517e2c` (Node 22.23.4): test:scripts 480 tests, 477 pass, 0 fail, 1 skip (`VIBEAD_CLI_SRC` not set), 2 todo (manual pending). Python suites: 12 run, 0 failed (auth-api 180 OK, including `test_web_session` 20 OK; round 1's body said 182, the correct figure at `9a06e6d` was 179). check:copy, check:workflows and test:legal (43 pass) exit 0.
- [x] TEST-2 mutants killed for every new guard/fix, all on this head: 30/30 killed (round 1's M1–M10 and C1 are re-run as P1–P8 against the 180 margin plus the last row; R1–R18 are new for #292):

| Mutant | Result |
|---|---|
| P1 margin 180 → 179 | killed by `test_cognito_is_called_only_within_the_refresh_margin` (180 s left must refresh) |
| P2 margin 180 → 181 | killed (same test: 181 s left must not refresh) |
| P3 margin 180 → 120 (round 1's value) | killed (121 s left must refresh) |
| P4 `>` → `>=` (the 180 s boundary) | killed (same test) |
| P5 remove the expiry guard (always refresh) | killed by `test_fresh_token_rotates_the_sid_without_calling_cognito` and the margin test |
| P6 never refresh | killed (margin, grace and reuse tests) |
| P7 `_reissue` `now + 5` → `now + 200` (#284 survivor) | killed by `test_grace_reissue_of_a_fresh_token_never_calls_cognito` (restore at 200 s left, old id again at 190 s left: 0 refreshes) |
| P8 anonymous 204 → 401 | killed by `test_anonymous_restore_is_204_with_no_cookie_and_no_store_read` |
| R1 zero retries (`SESSION_RETRIES = 0`) | killed by `session-retry.test.mjs` "one retry, no more", "an expired token restores once and retries once…", the /login, delete, /sponsor and share-page retry tests |
| R2 infinite retries (drop `attempt >= SESSION_RETRIES`) | killed by "a second 401 after the retry goes to the caller: two requests, one restore, no loop" (the fake request stops itself after 6 calls) |
| R3 two retries | killed ("one retry, no more" and the second-401 test) |
| R4 retry on any error (not just 401) | killed by "flag off or a non-401 error: no restore, no retry" |
| R5 ignore the flag | killed (same test, and the /login flag-off case) |
| R6 retry with the old token | killed |
| R7 drop `onToken` (page keeps the expired token) | killed (/login tokens and `vibead.access` checks, share page) |
| R8 let a thrown restore escape | killed ("a failed restore … shows the 401") |
| R9 `meApi` error without `status` | killed |
| R10 `deleteAccount` error without `status` | killed |
| R11 account delete called directly (no retry) | killed (source check in "both pages route…") |
| R12 /login retry not gated on the flag | killed |
| R13 sponsor home calls `meApi` directly | killed |
| R14 `fetchDashboard` returns the 401 instead of throwing | killed |
| R15 `/sponsor` page without the retry | killed |
| R16 share page: 401 not thrown | killed |
| R17 share page retry not gated on the flag | killed |
| R18 share page doesn't update `vibead.access` | killed |
| Round 1 M4/M9/M10, C1 (remove the anonymous branch, return the old sid, drop `no-store` on the 204, client 204 check) | killed again on this head |

- [x] TEST-3 rendered/behavioural test for UI show/hide/route: `scripts/site-header-render.test.mjs` passes with a stub that answers 204 for an anonymous visitor (header keeps Sign in) and 404 with the flag off, the same as auth-api. The share page's retry is tested on its rendered note/total (`share-page.test.mjs`); `/login` and `/sponsor` through their exported request paths plus source checks of the page wiring (`session-retry.test.mjs`).

### Docs
- [x] DOC-1 `docs/system-design/README.md`
- [x] DOC-2 design doc updated for the auth flow change (page-load cost, 204, 180 s refresh margin, retry-once recovery, rotation bullet, `/login` restore from `login.js`). No diagram changed; the mermaid blocks are untouched (#282 tracks the existing README.md:238 parse error)
- [x] DOC-3 status labels unchanged (the lasting session stays off on www via `web_session_enabled = false`); no stale self-labels: `git diff origin/main...HEAD -- docs/system-design/README.md | grep '^+' | grep -iE "this PR|once merged|when merged|once deployed|pending deploy|In review"` gives no output
- [x] DOC-4 legal/privacy/terms claims: no legal text changed. `git diff 99ad08c..HEAD -- apps/static-web/privacy apps/static-web/terms copy docs/system-design/LEGAL-SIGNOFF-BATCH.md` is empty (0 bytes), so 1f stays byte-identical to #254 @df6cdae. `legal-claims.test.mjs` 43 pass. The new behaviour sets no new cookie and stores nothing new (the retry overwrites the existing tab-only `vibead.access` value), so no 1f/section 14 claim changes.
- [x] DOC-5 `node scripts/check-design-doc.mjs --base origin/main --head HEAD --body-file <body>`: `Design-doc check passed (origin/main...HEAD, 12 files): design doc changed: docs/system-design/README.md.` exit 0
- [x] DOC-6 doc claims checked against main `99ad08c` (this head's base) and `b2394c5` (#260 touches no auth or static-web file). QA's r1 nit fixed: the doc now says `site-header.js` skips `/login` and `/device`, and `/login` restores from `login.js`

### UI (www)
- [x] UI-1 N/A - no visible UI change: no new copy, element or layout; the same states show, the expired-token case just reaches the success state instead of the error or gate
- [x] UI-2 N/A - homepage unchanged
- [x] UI-3 N/A - sponsor CTAs unchanged
- [x] UI-4 N/A - sponsor isolation unchanged: the server still finds the sponsor from the token's account; the retry only swaps in a token from the same session (`/api/me` handlers untouched)
- [x] UI-5 N/A - roles unchanged
- [x] UI-6 N/A - roles unchanged
- [x] UI-7 N/A - JS-off paths (GET start, callback, home) unchanged; only the JS `POST /api/auth/session` changes
- [x] UI-8 no dead ends: the #292 dead end is gone. After an expired token, "Sponsor home" and `/sponsor` period switches recover with one restore and retry instead of repeating the error with the same token (tests R1–R15 above). When the session really is gone, the error and gate keep their existing way forward (Sponsor home button, `/login?as=sponsor` link). No links changed
- [x] UI-9 `npm run check:copy` exit 0
- [x] UI-10 flag unchanged: `web_session_enabled = false` on www and prod (`env/dev.tfvars`, `env/prod.tfvars`); the client restores only when `webSessionEnabled === true`

### CLI / agents
- [x] CLI-1 N/A - installers unchanged: `apps/static-web/install` and `install.ps1` are not in this diff
- [x] CLI-2 N/A - installers unchanged: `apps/static-web/install` and `install.ps1` are not in this diff
- [x] CLI-3 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched)
- [x] CLI-4 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched)
- [x] CLI-5 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched)
- [x] CLI-6 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched)
- [x] CLI-7 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched)
- [x] CLI-8 N/A - installers unchanged: `apps/static-web/install` and `install.ps1` are not in this diff
- [x] CLI-9 N/A - the CLI lives in vibead/vibead and vibead/cli; no CLI code here
- [x] CLI-10 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched)
- [x] CLI-11 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched); no CLI screenshots needed
- [x] CLI-12 N/A - no API the CLI uses changed: only the web-only `/api/auth/session` routes changed, and the CLI never calls them (get-ads, record-impressions, install keys and `/api/me/installs` are untouched)
- [x] CLI-13 N/A - no hosted test machine or install keys used
- [x] CLI-14 N/A - installers unchanged: `apps/static-web/install` and `install.ps1` are not in this diff

### Safety / infra
- [x] SAFE-1 N/A - no new deploy script; the flag and its guard tests are unchanged
- [x] SAFE-2 plans show 0 to destroy for every changed root (plan only, no apply), on `7517e2c`, one at a time: functions/auth-api `Plan: 0 to add, 2 to change, 0 to destroy.` (https://github.com/vibead/vibead-ai/actions/runs/39913776117): only the code artefact, i.e. the Lambda `source_code_hash`/`s3_object_version`/`last_modified` and the S3 `artifact` etag/version. apps/static-web `Plan: 0 to add, 6 to change, 0 to destroy.` (https://github.com/vibead/vibead-ai/actions/runs/39913957373): only `site_asset` etags for `earnings/page.js`, `login/login.js`, `sponsor`, `sponsor/index.html`, `sponsor/dashboard.js` and `web-session.js`. Both ran after the latest main deploy (#260, https://github.com/vibead/vibead-ai/actions/runs/39911284435) finished. No destroy or replace in either. No other root changed.
- [x] SAFE-3 N/A - no workflow files changed
- [x] SAFE-4 no secrets in output: tests use `rt-` fixture tokens. The 204 path logs nothing, and no token or email was printed in the evidence.
- [x] SAFE-5 cost impact stated (above)
- [x] SAFE-6 N/A - no install keys
- [x] SAFE-7 per-env flag unchanged (`web_session_enabled` has no default; www false, prod false, staging true but not applied); guards `scripts/web-session.test.mjs` and `auth_api.tftest.hcl` pass
- [x] SAFE-8 `VIBEAD_AWS_*` → `AWS_*`, VibeAd account only, read-only CloudWatch, Cognito and DynamoDB describe calls for the cost figures; Terraform via the deploy workflow; well under the US$20/month hold
- [x] SAFE-9 `python3 scripts/check-lambda-packages.py auth-api` on the head: `auth-api: import handler from the build.py artifact: ok` / `Lambda package imports: 1 entry points in 1 artifacts, 0 failed`

### Data / privacy
- [x] DATA-1 N/A - no retention change (the sid row and family keep their 30-day `expires_at`)
- [x] DATA-2 N/A - server sign-out and delete unchanged (their tests pass); the client only retries `DELETE /api/account` once after a 401, which deletes nothing, with a restored token for the same account

### Money
- [x] MONEY-1 N/A - no billing, click, ledger, balance or earnings change

### Release
- [x] REL-1 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-2 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-3 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-4 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-5 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-6 N/A - `apps/static-web/install` and `install.ps1` unchanged
- [x] REL-7 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-8 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-9 `npm run check:install-release`: `install release guard: v0.1.0-beta.25 has SHA256SUMS, its signature and all 3 archives.` exit 0
- [x] REL-10 N/A - no versioned artefact here (vibead-ai ships no CLI release, npm package or kit)
- [x] REL-11 N/A - not the linked PR of a CLI release; no status moves to Live (the web session stays off on www)

### Bugs
- [x] BUG-2 `Fixes #292` in this body and in commit `7517e2c`. #217 stays "Part of" (it closes with #278).
- [x] BUG-3 root cause: round 1 returned the stored access token (as little as 121 s left) and no page renewed it, so the next `/api/me` call after expiry failed with no way back short of a reload. Regression tests: `test_cognito_is_called_only_within_the_refresh_margin` (180 margin), `session-retry.test.mjs` (retry-once, no loop), `share-page.test.mjs` "#292: …", `test_grace_reissue_of_a_fresh_token_never_calls_cognito`
- [x] BUG-4 N/A - no recurring class
- [x] BUG-5 N/A - no QA FAIL (round 1 passed; #292 was filed as a follow-up)
- [x] BUG-6 QA round 2 of 3



