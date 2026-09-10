# Google account panel

Base `caa9cc6`. This slice connects the verified same-player transport to the
existing settings sheet. Source: F25§3/4/10, F27§1.2 and the owner's menu-pause rule.
It does not certify complete account/save-choice/competitive acceptance.

- Settings opens a VI/EN account panel using the existing native modal and art.
- A guest sees exactly save progress, achievements and leaderboard benefits.
- Fetch the configured server challenge before loading the existing shared GIS
  loader. Use Google's rendered button and popup callback; no redirect or token
  decoding/storage in the UI. See the [official button guide](https://developers.google.com/identity/gsi/web/guides/display-button).
- A callback may call RemoteGame.linkGoogle only while its panel generation is
  current. Clear the consumed button; duplicate/stale callbacks do not authenticate.
- Await the transport's canonical identity. A committed link may finish after the
  panel closes; keep gameplay paused while accountBusy, then restore menu presence.
- SDK/config/nonce/network failures have translated retry/close actions. Retry
  requests a fresh challenge. A confirmed Google identity takes precedence over
  an earlier transient error; no success is inferred from the SDK callback alone.
- Another Google save displays accountConflict and retains guest progress. Explicit
  switch/recovery is a separate identity-changing slice; no merge/overwrite here.
- Local archives keep their existing recovery/export path. This panel cannot start
  a remote career, upload or lose the current local save. It explains this limitation.
- Do not add logout, live Google configuration, automatic invitations or ranking
  writes. These remain required follow-ups; the owner has no live Client ID.

Verification: real UI→RemoteGame→HTTP→Google SDK signed-token fixtures; test both
locales, small portrait/desktop, unchanged live shift/outbox, menu pause through
verification, stale callbacks, retries, missing SDK/config, existing-account refusal
and local archive preservation. Existing remote/local/admin regression, config/build,
relevant unit suite and independent full-diff review. No engine/economy changes.

## Changelog (append-only)
| Date | Change |
|---|---|
| 2026-09-10 | Pin the Google panel integration; keep account switch/recovery and configured automatic invitations as separate follow-ups. |
