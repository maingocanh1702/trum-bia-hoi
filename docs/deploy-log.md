# Deployment log

This log records deployment receipts. A source commit or a passing test suite does not establish what is currently served.

## Historical Netlify guest release — 2026-09-11

Recorded here on 2026-09-16 from the committed September 11 receipt; no deployment or live-site verification was performed for this entry.

| Field | Historical receipt |
|---|---|
| Site | https://trumbiahoi.netlify.app/ |
| Source commit | `c7724254b2e3dca28800dec5261d975478c1562c` (`codex/netlify-guest`) |
| Immutable Netlify deployment | `6aa3df1ade7c9b5eeba5662b` — promoted from the verified draft |
| Published files | 123 static files; browser-only guest edition |
| Index SHA-256 | `2a9a80fdac977a60f0fefecb4b1f23c5d408eda3392dbe13e0e96bbdf7e0b45e` |
| File-manifest SHA-256 | `3710891ad808c9c88f3549499d918a4803533160562dd262b241fe18b7465f81` |
| Previous deployment / rollback | `6a9fa78f9bec4e0d3bfa19b7` |
| Recorded public smoke | Anonymous HTTPS 200 matching the index digest; 3/3 viewports (360×740, 390×844, 1280×720); zero page errors, failed asset responses or API/Google requests; reload/new-tab recovery passed |
| Save boundary | Browser/Netlify-origin IndexedDB progress; no cross-device restore or backend deployment |

Source of this historical entry: `docs/netlify-guest.md` at receipt commit `223ec608874e7258a6ab278dcbca9cd8af5e8f7a`, read from the existing Netlify worktree. Reproduce the committed source with `git show 223ec608874e7258a6ab278dcbca9cd8af5e8f7a:docs/netlify-guest.md`. That receipt names `.qa/netlify-published.json`, `.qa/netlify-public-http.json`, `.qa/netlify-visibility.json`, `.qa/local-preserved.json`, and `.qa/guest-public-smoke.txt` as its original evidence; those ignored artifacts are not republished by this log.

The historical receipt also records public visitor access, the optional Netlify badge disabled to avoid intercepting mobile controls, and the local 5174/5175 services preserved. These are September 11 observations, not current settings assertions.

## Build identification

Settings displays the first 12 characters of the build's existing `__TBH_COMMIT__` value, with its full value in the element title. This is the source SHA captured when Vite starts/builds, not a deployment ID or a live-host status check. A new source commit must be rebuilt before that label changes; the September 11 deployed build predates this label.

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 | A6: reconstruct the September 11 Netlify receipt and explain the Settings build label; no new deployment or current-site claim. |
