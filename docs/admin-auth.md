# Admin authentication and registry transport

Base291264c. Implements BRD§2/§9.2: Google SSO, server-owned roles, independent
Authenticator factor for Super/Game and an eight-hour admin session. Uses the existing
Google signature/audience/issuer/nonce verifier; no player cookie or submitted role
can authorize an admin operation. Editor and scoped registry operations follow this boundary.

| Interaction | Decision |
|---|---|
| Configuration absent | Admin sign-in unavailable. Ordinary player API continues unchanged. No development login shortcut. |
| Identity | Verified immutable Google sub must appear in the private server directory. Email/domain/profile claims never assign a role. |
| Google challenge | Random HttpOnly cookie plus distinct nonce, five-minute lifetime, one Google consume. Nonce verification completes before synchronous transactional consumption. |
| MFA | Super/Game always require a separately provisioned TOTP secret. Other roles use it when provisioned. Google alone does not prove MFA. |
| OTP | RFC6238 SHA1, six digits,30second step,±1step tolerance, constant-time comparison. Accepted step cannot be reused across sessions/connections/restart. Five failures lock the subject for15minutes. |
| Session | Cookie rotates on complete authentication. Authenticated session expires after8hours; partial sessions never access registry. Logout removes only the admin credential. |
| Role/secret revocation | Private directory reread before access; removed subject or changed role/secret invalidates old sessions immediately. Re-adding identical records is an operator-controlled restoration. |
| Transactions | Login/logout/factor replay counter and security audit use the same SQLite transaction. OTP denial counters commit before returning errors. No tokens, OTPs or shared secrets in audit/HTTP responses. |
| HTTP | Existing exact-origin/CSRF, content-type, rate limits and timeout gate run before admin routing. Dedicated admin cookie; full config has a bounded larger body allowance. Auth rechecked after body/network IO. |
| Registry | Trusted actor from authenticated session goes directly to existing proposal/approval/publication handlers. Client subject/role/MFA/time fields are rejected. Read endpoints also require admin session. |

Production setup requires the already-requested Google Client ID and an absolute
`TBH_ADMIN_ACCOUNTS_FILE` outside the repository. File must be a regular file owned
by the server OS user, mode0600, max64KiB. JSON is an array of records:
`{"subject":"<verified Google sub>","role":"super|game|economy|support|viewer","totpSecret":"<unique32char Base32 secret>"}`.
Generate each secret in the deployment secret manager and securely enroll that same
secret into the administrator's Authenticator using TOTP/SHA1/6digits/30seconds.
Do not commit the file or reuse secrets. Missing/invalid required factors fail closed.
Admin account management/enrollment UI and account recovery are later admin work;
initial directory provisioning is an OS-operator action, never a public request.

Protocol references: [RFC6238](https://datatracker.ietf.org/doc/html/rfc6238),
[Google GIS nonce/callback](https://developers.google.com/identity/gsi/web/reference/js-reference).
Verification must include actual signed Google token/SDK, RFC vectors, role/MFA
forgery, cross-cookie/origin rejection, replay/restart/lockout and real registry publication.
No gameplay numbers, engine rules, public save upload or history tuning in this slice.

| Date | Change |
|---|---|
| 2026-09-10 | Authentication/transport decision table before implementation; editor remains next. |

| 2026-09-10 verified |6f42575:320full engine/server tests (10admin cases),10remote browser, config zero warnings/build PASS. Independent review CLEAN; independent typecheck PASS. Reviewer HTTP rerun blocked by sandbox EPERM; actual host tests passed. Receipt `.qa/admin-auth-verification.json`. Browser integration/editor remains next; real ClientID/directory absent. |

| 2026-09-10 browser context | `/admin` integrates GIS callback and independent OTP. Registry writes require the authenticated context from GET /admin/auth via X-TBH-Admin-Context; supplied stale contexts also reject reads. The digest is not a bearer token. Account-switch regression verifies no mutation under another cookie. See admin-editor.md; review pending. |

| 2026-09-10 editor verified |56a0a44 browser GIS/TOTP/editor workflow verified:321engine/server,11admin/10remote browser, config/build PASS and final review CLEAN. Context binding prevents stale identity actions; durable drafts/retries and snapshot replacement regressions pass. M4 now11/18 OPEN; scopes/full admin and live setup remain. See admin-editor.md. |
