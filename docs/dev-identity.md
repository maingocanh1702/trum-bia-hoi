# Local dev identity — owner waiver 2026-09-10

For playable-v0 acceptance without a Google Client ID, start the API with explicit
`TBH_AUTH_DEV=1`. Startup refuses `NODE_ENV=production` and non-loopback origins.
When the flag is absent or not exactly `1`, normal Google verification remains
unchanged; without a Client ID it reports unavailable and never simulates login.

The challenge explicitly advertises development mode. The existing account/admin
button renders a labelled test-account form instead of loading Google's SDK.
Names match `[a-z][a-z0-9-]{0,31}` and map to `tbh-dev:<name>` subjects. A credential
is bound to the existing server-issued session nonce; it cannot select a real
Google subject. Changing the frontend cannot enable the server stub.

Only identity verification changes. Player cookie rotation, guest attachment,
account restore, expected-player guard, transition receipts, outbox and replay use
the existing code paths. Admins still need a private allowlist and server TOTP;
no default admin/secret, MFA shortcut, score injection or public test endpoint.
Use a local development database; test identities are not production accounts.
Explicit development mode takes precedence over a configured Client ID locally.

```sh
TBH_AUTH_DEV=1 TBH_DB=/absolute/path/local-game.sqlite TBH_ORIGIN=http://127.0.0.1:5174 npm run dev:server
```

Checks: `node --import tsx --test apps/server/test/google.test.ts apps/server/test/admin-auth.test.ts`
and `npx playwright test --config playwright.dev-identity.config.ts`.
Normal remote-browser tests exclude the dedicated dev-provider test. The real
Google tests remain enabled, including signed-token rejection/expiry/rotation.
Minute-five server attachment, exact receipts, restore and admin MFA regressions
pass. Verification: 406/406 unit/server tests; dedicated dev-provider browser path 1/1; normal Google browser regressions 5/5; Google/admin auth suites 29/29; independent auth review CLEAN. Full verify receipt: `.qa/dev-identity-verify.txt`.
No economy, engine, config numbers or production login mode change.

| Date | Change |
|---|---|
| 2026-09-11 | Owner Steer7/12: explicit local-only identity stub through existing login paths; production refused. Acceptance label after verification: verified via dev identity stub; real Client ID pending — owner waiver 2026-09-10. |
