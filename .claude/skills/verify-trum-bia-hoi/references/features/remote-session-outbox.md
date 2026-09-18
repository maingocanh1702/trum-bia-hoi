# Remote session, outbox & account linking (`apps/web/README.md`; `apps/web/src/remote.ts`)

## Observable contract

- `Connection` state enum (`remote.ts:18`): `'connecting' | 'online' | 'reconnecting' | 'invalidSession' |
  'conflict' | 'storage'` — this is the exact edge-status value the shell renders; `fail()`
  (`:245-254`) is the single place that maps a thrown `RemoteError`/network failure onto one of
  these six values (4xx except 429, or one of `conflict/invalidClient/sequenceGap/sequenceConflict/
  idempotencyConflict/presenceManaged` → `'conflict'`; `storage`/`invalidSession` pass through
  as-is; everything else → `'reconnecting'`).
- localStorage journal, key `tbh.remote.v1` (`remote.ts:4`, same string used as the Web Lock name at
  `:82`). Real shape (`Journal` type, `:8`): `{playerId, clientId, nextSeq, heartbeatSeq, cursor,
  pending, accountSwitch?: true}`. **Correction to `apps/web/README.md`'s quoted shape:** the README
  paragraph ("`remote.ts` persists `{playerId, clientId, nextSeq, heartbeatSeq, cursor, pending}`...")
  is accurate but incomplete — the real type also carries an optional `accountSwitch: true` flag, set
  only during a Google account-switch (`keepAccount`) reconciliation and required to have an *empty*
  `pending` array whenever present (`readJournal()`, `:26`). `readJournal()` (`:20-28`) validates the
  whole shape on every read and throws `RemoteError('storage')` on any malformation, including
  reconstructing each pending action's expected `clientSeq` from its array position (`:25`) and
  rejecting a stored `'activity'` command outright.
- One writer per device: `navigator.locks.request(JOURNAL_KEY, {ifAvailable: true}, ...)`
  (`:78-86`). A second tab that can't acquire the lock rejects with `RemoteError('otherTab')`
  (`:83`) — "must close the first or retry" (README) is this exact code path, not a UI convention.
- Capacity: `command()` (`:255-265`) refuses **without throwing** once `pending.length >=
  config.values.network.commandBufferMax` — returns `Promise.resolve({ok:false, reason:'bufferFull'})`
  (`:259`), a normal `Result`, not a `RemoteError`/state change.
- Idempotency: every queued action gets `idempotencyKey: crypto.randomUUID()` (`:260`); the head of
  the queue is retried until the server acknowledges it — "Ordered acknowledgements are never
  inferred from snapshots. Retry even a possibly committed head." (`:293` comment).
- Heartbeat (`beat()`, `:271-284`): increments and **persists `heartbeatSeq` before sending**
  (`:273-274` comment: "a lost acknowledgement is followed by a NEW beat"), posts `{clientId,
  beatSeq, active, paused}` to `/player/heartbeat`. A `heartbeatStale` server reply reconciles the
  local counter forward **and then still throws** (`:278-279`: `j.heartbeatSeq =
  Math.max(j.heartbeatSeq, reply.heartbeatSeq); ...; throw new RemoteError(reply.error)`) — this beat
  attempt fails (state moves to `'reconnecting'`, per the `fail()` mapping above, since
  `heartbeatStale` isn't one of the `'conflict'`-mapped codes), but the reconciled counter makes the
  *next* retried beat succeed. Not a silent instead-of-failing recovery — a visible reconnect blip
  followed by a self-correcting retry. `watchLiveness()` (`:232-237`) is a plain
  `setTimeout` for `config.values.network.reconnectingUiDelayMs` (assigned at `:129` from the pinned
  config) — if no successful `apply()` lands before it fires while state is `online`/`connecting`,
  state flips to `'reconnecting'` even though the underlying `fetch` may still be hanging (README's
  "heartbeat deadline changes the edge status... even if fetch hangs").
- **`connection_lost`/`connection_expired` are the engine-side counterpart of this module's
  presence-sweep mechanism**, not client-dispatched events. `store.ts`'s `syncPresence()` (`:647-654`)
  calls `game.disconnect(at, shiftId, lossId)` (`engine.ts:679-682`, wraps the trusted
  `connectionLost` system command) once a player's live `client_presence` rows all expire — this
  emits `connection_lost` (`engine.ts:745` for `shiftId: null`/resting, `:753` for an open shift) and,
  for an open shift, arms `w.disconnection.expiresAt = now + network.reconnectGraceMs`.
  `game.reconnect()` (`:684-687`, wraps `connectionRestored`) clears it on return. If no reconnect
  lands before the deadline, `advance()`/`catchUp()` (`engine.ts:184`) — reached again via
  `syncPresence()`'s own `game.catchUp(at)` call — fires `connection_expired` and force-closes a
  still-`'open'` shift (`shift_closing` reason `'disconnected'`). Neither event is reachable through a
  public HTTP route directly; both are internal, driven by presence expiry, not a client command.
- Reconnect cadence is **server-driven, not exponential backoff**: `cycle()`'s `finally` block
  (`:312-321`) reschedules via `setTimeout(() => this.wake(), this.again ? 0 : Math.min(this.interval,
  ...deadlines))`, where `interval` is the last heartbeat's `heartbeatIntervalMs` (`:282`) and
  `deadlines` (`:316-318`) additionally wakes the client early, right when an in-flight order's
  patience+grace window would lapse — so no client-side game clock runs, but UI countdowns still
  land on time.
- Account linking / switching lives inside this same module (`googleChallenge`, `linkGoogle`,
  `finishGoogleLink`, `finishGoogleRecovery`, `reconcileSession`, `adoptSwitch`, `:141-227`).
  `accountBusy` (`:35`, true while `linking` is set or `reconcileAccount` is true) makes `command()`
  refuse with `{ok:false, reason:'accountBusy'}` (`:256`) — gameplay is not blocked, but new commands
  are, for the duration of a link/switch. Key invariants, each with its own inline rationale comment:
  cookie rotation is queued **after** acknowledged commands, "without recreating the player/stream"
  (`:153`); a still-verifying request is fenced by re-issuing the nonce before trusting a canonical
  read (`:170`, `:192-193`); an explicit 4xx rejection means the cookie did **not** rotate, but a
  network/5xx failure is ambiguous and must be resolved by re-checking `/auth/session`, never assumed
  either way (`:208`); an audited switch target that's already connected must never reconnect its old
  stream (`:100`).
- **HTTP error-code → status mapping** (server `http.ts:299-329`, the catch-all for every route below):
  `store:invalidSession`/`store:invalidGoogleChallenge`/`auth:googleVerificationFailed` → 401;
  `store:accountConflict`/`store:signOutRequired` → 409; `store:importBusy` → 429
  (`recoveryBusy`)/`store:importInterrupted` → 503 (`recoveryUnavailable`, see Uncovered paths);
  `store:invalidCursor`/`invalidCommand`/`invalidHeartbeat` → 400, but **`store:invalidClient` → 403**,
  not 400 (`:326`, an intentional asymmetry inside the same `input` bucket); anything else → 500
  `serverError`. Confirmed by reading `http.ts:299-329` in full, not inferred.
- **`claimLocal` (local-archive import) has no HTTP route** — `grep -nE
  "localImport|local-import|localArchive|claimLocal" apps/server/src/http.ts` returns zero matches.
  This is the same **owner-deferred** gap [save-replay-local](save-replay-local.md)'s Uncovered paths
  documents in full (store.ts doc comment, F25 doc, `apps/server/README.md`); it applies equally to
  this module's route surface (remote.ts has no client for it either) — see that file for the full
  four-way citation rather than repeating it here. `apps/web/README.md` §"Existing local careers"
  verbatim: *"local.ts/IndexedDB remain for the explicit legacy continuation and test fixtures while
  the owner-deferred public archive upload/review flow is unfinished."*

## How to reach it

- Boot dispatch, `apps/web/src/start.ts` (25 lines, full file is the decision tree): `mode ===
  'local'` or `VITE_TBH_LOCAL==='1'` → `boot()` (web-local, owned by
  [save-replay-local](save-replay-local.md)). Otherwise, **only when no mode was forced and no
  `tbh.remote.v1` journal exists yet** (`:10`), it first checks for an existing local career via
  `BrowserSave.open()`/`.read()` or the legacy `tbh.save.v1` key — if found, returns `{local, legacy}`
  so the UI can offer export/continue-local *before* any server career exists. A corrupt local
  archive (`storage.recoveryText !== null`, `:17`) still routes into the local forensic-recovery boot
  even though the default mode is remote. Anything else calls `RemoteGame.open(mode ===
  'reauthenticate')` (`:21`); `remote.reauthenticating` (set at `remote.ts:94` when re-auth finds a
  different identity than the stored journal) short-circuits to `{reauth: remote}` — "Authentication
  only: no world/connect/heartbeat or outbox mutation" (`remote.ts:93`).
- `RemoteGame.open()` (`remote.ts:78-118`): acquire the Web Lock → `readJournal()` → resolve owner via
  `/auth/session` (or `reconcileSession()` if `accountSwitch` is pending) → `POST /player/connect`
  (passing the stored `clientId` when resuming) → validate continuity — `connected.acknowledgedSeq >=
  journal.nextSeq || connected.acknowledgedSeq < journal.nextSeq - pending - 1` throws `conflict`
  (`:112`) — this exact check is what makes "session expiry/account mismatch stops sending while
  retaining commands; it never resets the journal" (README) true.
- Server routes actually implementing this surface (`apps/server/src/http.ts`, methods+paths
  grep-verified): `POST /auth/session` (`:216`, creates or returns a guest session; a stale/revoked
  cookie still permits exactly one new anonymous visit via `guestCredentialPlayerId`, `:224`), `POST
  /auth/logout` (`:232`), `POST /auth/guest/restart` (`:240`), `POST /auth/google/challenge` (`:246`,
  503 `googleUnavailable` when no Client ID is configured — matches F25's "Owner has no Client ID"),
  `POST /auth/google` (`:251`), `POST /player/connect` (`:262`), `POST /player/heartbeat` (`:267`,
  also calls `arm()` at `:271`, which restarts the server's presence-sweep timer's countdown early —
  the timer itself starts independently at server listen (`:345`) and self-reschedules every
  `store.heartbeatIntervalMs` regardless of traffic; see Gotchas), `GET /player/config?version=`
  (`:276`, 404 `configMissing` on an unknown pinned
  version — the same cache `RemoteGame.apply()` keys by version at `remote.ts:123-128`), `GET
  /player/state` (`:283`), `GET /player/events?after=` (`:284`, cursor pagination, events passed
  through `publicEvent()` before leaving the server), `POST /player/command` (`:290`, validates
  `clientSeq>=1` and that every command field is in that command type's `commandFields` allowlist
  before reaching `store.clientCommand`).
- UI, exact ARIA/text the specs drive: settings `'Cài đặt'`, account panel trigger `/Tài khoản/`
  (shared with [save-replay-local](save-replay-local.md)'s local-mode citation), reload-continue
  button `'Tiếp tục quán đã lưu'` (`remote.spec.ts:260`).

## Existing proof

- `packages/engine/test/disconnection.test.ts:17` `'a lost connection freezes grace, closes an
  unserved table at the deadline and never grants absent attendance or resting stamina'` is direct
  proof of both engine events: it calls the `disconnect()` test helper, reads `w.disconnection!.expiresAt`
  (= `lostAt + network.reconnectGraceMs`), advances to one tick before the deadline (shift stays
  `'open'`, nothing else changes), then advances to the deadline and asserts
  `count(g, 'connection_expired') === 1` and `count(g, 'shift_closing') === 1`. Run via `npm test` or
  targeted: `node --import tsx --test packages/engine/test/disconnection.test.ts`. The end-to-end web
  counterpart is `remote.spec.ts:111` (already cited below) — it drives the same grace-then-close
  behavior through the real HTTP fixture, not just the engine.
- `apps/server/test/http.test.ts` (server tier, 12 tests total in file), the ones pinning this
  surface: `'HTTP requires owned stream sequencing, returns recoverable gap/conflict
  acknowledgements and resumes the exact cursor after restart'` (`:251`), `'real HTTP guests own
  separate state; serving retries, paused stock purchases and event catch-up survive restart'`
  (`:83`), `'long-lived players catch up in bounded repeatable pages across restart without
  replaying or advancing the game'` (`:193`), `'guest restart validates origin, body and exact
  cookie owner before rotating the visit'` (`:66`), `'cookie sessions expire and revoke durably,
  store only hashes and refuse CSRF, cross-origin reads and hostile preflights'` (`:143`),
  `'identity, clock and totals cannot be supplied by clients; malformed JSON, query cursors and
  oversized bodies cannot mutate state'` (`:119`), `'every public action refuses injected authority
  fields before durable command logging'` (`:165`), `'configured HTTP rate limits apply before
  allocating players and invalid server options fail closed'` (`:233`), `'HTTPS deployment uses
  host-only Secure cookies and never exposes credentials in cached JSON'` (`:242`).
- `apps/web/remote-test/remote.spec.ts` (web tier, `playwright.remote.config.ts`), the outbox/journal
  contract: `'real server serves once after lost acknowledgement, retains queue across reload, menus
  pause and reports resync'` (`:22`), `'offline restock and in-shift upgrade use durable ordered
  commands and current menu presence on return'` (`:69`), `'server closes beyond grace while the
  visible client yard stays frozen'` (`:111`), `'existing local archive is untouched and a second tab
  cannot overwrite the remote action stream'` (`:124` — covers local-preservation **and** the
  one-writer lock in the same test), `'journal storage failure refuses the action before any network
  mutation'` (`:143`), `'config bounds the durable queue and account rotation cannot send its
  commands to another player'` (`:158` — `commandBufferMax` capacity), `'a silent hung transport
  shows reconnecting at the configured deadline without hiding the yard'` (`:184`), `'a fresh guest
  visit keeps the yard accessible before heartbeat recovery'` (`:202`), a 2-way parametrized pair over
  `['missing chunk', 'invalid revision']` titled `` `normal startup preserves ${damage} forensic
  recovery before any server career is created` `` (`:222`), plus a 3-viewport (`390x844`, `360x740`,
  `1280x720`) parametrized pair `` `M1-SCREENS seven core screens through the server at
  ${viewport.width}x${viewport.height}` `` / `` `M1-TIMEOUT first loss is painted within one second of
  authoritative expiry at ${viewport.width}x${viewport.height}` `` (`:266`, `:305`) — broader UI
  regression riding the same remote fixture, not dedicated outbox proof.
- `apps/web/remote-test/dev-identity.spec.ts`, 1 test: `'explicit dev provider links a live shift
  once and restores it in a fresh browser context without loading Google'` (`:18`) — the
  `identityProvider`/`dev` escape hatch surfaced by `/auth/google/challenge` (`http.ts:249`) and typed
  at `remote.ts:141`.
- `apps/web/remote-test/google-link.spec.ts`, 19 tests covering the full link/switch lifecycle end to
  end (this file is the real proof for `remote.ts:141-227`, not a peripheral spec): `'link waits for a
  live-shift upgrade acknowledgement and retains the exact player, stream and served order'` (`:33`),
  `'lost authentication body after Set-Cookie reconciles once without replaying the Google
  credential'` (`:73`), `'pre-mutation network failure stays guest and an explicit retry can link the
  same history'` (`:86`), `'an existing Google save is never selected or merged by the guest-link
  transport'` (`:98`), `'invalid and replaced-nonce tokens are rejected without invalidating
  gameplay'` (`:116`), `'a failed queued command keeps its outbox and rejects linking before cookie
  rotation'` (`:126`), `'closing during verification settles the link promise and makes no
  reconciliation request'` (`:141`), `'a different canonical cookie after authentication cannot
  attach the old stream to another player'` (`:165`), `'an ambiguous guest result is fenced before
  resume so the old credential cannot arrive late'` (`:223`), `'explicit Google choice drains the
  source outbox then uses an audited fresh target stream'` (`:242`, the `keepAccount`/`accountSwitch`
  path), `'a corrupted switch intent with pending old commands fails before any server request'`
  (`:323` — the direct hand-corrupted-journal proof of the `accountSwitch` empty-pending invariant,
  `readJournal()`/`remote.ts:26`: it writes `localStorage['tbh.remote.v1']` with `accountSwitch: true`
  **and** a non-empty `pending` array, then asserts `RemoteGame.open()` rejects with `'storage'`
  before any network request) — remaining 8 tests (`:154,185,201,266,277,291,305,314`) cover
  unavailable-Google,
  lost-canonical-read retry, paused-during-verification, and every lost-response/reload/unrelated-
  cookie permutation of the switch flow; open the file directly for those exact names before citing
  one in a report.
- `apps/server/test/accounts.test.ts` (7 cases) — `GameStore`-level proof of guest/Google linking, one
  layer beneath `http.test.ts` above: `'a new guest visit atomically retires only the expected guest
  and never a Google account'`, `'linking a server guest mid-shift preserves its exact world, history
  and command receipts across restart'`, `'existing Google progress conflicts without mutation;
  explicit keep-account switches without merging either history'` (the `accountTransition`/
  `keepAccount` mechanics `google-link.spec.ts` drives over HTTP), `'a logout, expiry, replaced nonce
  or other session cannot consume a pending Google authentication'`, `'authentication commits mapping,
  consumed nonce, revoked credentials, new session and audit atomically'`, `'two SQLite connections
  cannot reuse a nonce, claim one guest twice or fork one Google account'`, `'schema3 migration
  preserves guest credentials, active history and ordered receipts without inventing an account'`.
- `apps/server/test/store.test.ts` (11 cases) — the core `GameStore` persistence/durability proof
  every route above ultimately relies on: command idempotency and cache invalidation across two live
  connections, a real SQLite-failure rollback (`'a real SQLite failure between command and event
  inserts rolls everything back and evicts mutated cache before retry'`), append-only/foreign-key/
  schema enforcement, config-version dedup and rejection, a legacy rules19→rules20 migration backfill,
  and — the two cases most relevant to this file's own scope — `'a paid lease survives SQLite restart;
  offline expiry refunds the stored deposit once without earning credit'` and `'season rollover and
  old service retries survive SQLite restart without moving revenue into the next season'` (both
  restart-durability proofs, not gameplay-rule proofs — see [location-lease](location-lease.md) and
  [seasons-leaderboard](seasons-leaderboard.md) for the rule-level citations).

## Verification procedure

- `node --import tsx --test apps/server/test/http.test.ts apps/server/test/accounts.test.ts apps/server/test/store.test.ts`
  (targeted; bare `tsx` is not guaranteed on `PATH` outside an npm script). `npm test` runs these
  alongside every other engine/server file.
- `npx playwright test --config playwright.remote.config.ts apps/web/remote-test/remote.spec.ts
  apps/web/remote-test/google-link.spec.ts` — `testDir` for this config is `apps/web/remote-test`, a
  different directory than the legacy `playwright.config.ts` (`apps/web/test`); passing a bare
  `apps/web/test/...` path with this config matches zero tests. **This config's own `testIgnore:
  ['dev-identity.spec.ts', 'accessibility.spec.ts']` (`playwright.remote.config.ts:4`) drops
  `dev-identity.spec.ts` even if it's named explicitly on the command line** — it never runs here.
- `npx playwright test --config playwright.dev-identity.config.ts
  apps/web/remote-test/dev-identity.spec.ts` — the dev-identity flow's actual command; this config's
  `testMatch: 'dev-identity.spec.ts'` (`playwright.dev-identity.config.ts:3`) is the one that runs it.
- `npm run verify` is the whole-repo gate for any change here (it already runs `test` and the sims);
  no dedicated `sim:*` covers this module.

## Uncovered paths

- **`claimLocal` has no HTTP route** — see [save-replay-local](save-replay-local.md#uncovered-paths)
  for the full corroborated citation; this module has no client for it either.
- **`store:commandSequence`/`store:eventSequence`/`store:checkpointMismatch`/`store:projectionMismatch`
  never surface over HTTP.** `grep -n "commandSequence\|eventSequence\|checkpointMismatch\|
  projectionMismatch" apps/server/src/http.ts` → zero matches. Reading `http.ts:299-329`'s full
  catch-all confirms only `store:invalidCursor/invalidCommand/invalidHeartbeat/invalidClient` are
  mapped to 4xx for non-admin routes; any of the four sequence/checkpoint invariant errors would
  reach a real client as an opaque `500 serverError`. They're exercised today only as typed errors in
  `apps/server/test/checkpoint.test.ts` (direct `store.ts` calls), never through `/player/command` in
  `http.test.ts` or `remote.spec.ts` — a client-visible reproduction of one of these codes is
  unverified.
- **`store:importBusy`(429)/`store:importInterrupted`(503) are wired in `http.ts`'s error table
  (`:322`) and are reachable — this is not dead code.** `GET /player/competition` (`:236-238`) calls
  `store.competitiveStatus()` (`store.ts:353`), which calls `ensureImportBaseline()` (`:355`) whenever
  the caller's competition state carries a pending `localImport`, which calls `validateLocalArchive()`
  (`:342`) — the same single-flight lock/worker-timeout that throws these two codes
  (`local-archive.ts:46,54,56-57`). `competitiveStatus()` throwing `importBusy` is directly tested:
  `apps/server/test/competition.test.ts:247` `'legacy baseline inflation runs only in the admitted
  worker while concurrent recovery is refused'` (assertion at `:254`). What's still unverified: no test
  drives the 429/503 HTTP status code through an actual `/player/competition` request —
  `http.test.ts`'s own `/player/competition` cases cover 401/400/404/200 only — so the HTTP-layer
  surfacing of these two codes remains unproven even though the underlying throw is real and reachable.
- `apps/web/remote-test/account-ui.spec.ts` (456 lines) and `login-invitation.spec.ts` (107 lines)
  exercise the Account settings panel and the login-invitation prompt UI that *calls into* this
  module's `linkGoogle`/`googleChallenge` — they were read for cross-reference but are not cited as
  primary proof here; they belong to the account-panel/onboarding UI surface, not the
  journal/transport contract this file owns. If a future change touches `Account.tsx` directly, open
  those specs rather than assuming this file's citations cover them.

## Variants

- **success** — `remote.spec.ts:22` (lost-ack resync), `google-link.spec.ts:33` (normal link).
- **cancel** — `google-link.spec.ts:141` (closing mid-verification settles the promise, no request).
- **reason** — most `store:*` codes in the Observable-contract mapping are asserted in `http.test.ts`;
  **`auth:googleVerificationFailed` is asserted in `apps/server/test/google.test.ts`, not
  `http.test.ts`** (grep-confirmed: 2 hits in `google.test.ts`, 0 in `http.test.ts`) — a separate file
  this doc hadn't previously named for this code. `store:importBusy`/`store:importInterrupted` are
  **not** asserted through any HTTP request today (see Uncovered paths) — don't read the "every code"
  claim as covering them. Client-side `RemoteError` codes (`otherTab`, `bufferFull`, `accountBusy`,
  `conflict`) are asserted in `remote.spec.ts`/`google-link.spec.ts`.
- **empty** — a fresh guest with no prior journal: `remote.spec.ts:202`.
- **persistence** — `remote.spec.ts:22` (reload retains queue), `dev-identity.spec.ts:18` (fresh
  browser context restores linked identity).
- **capacity** — `commandBufferMax` refusal, `remote.spec.ts:158`.
- **duplicate/idempotent** — idempotency-key retry of a possibly-committed head, `remote.spec.ts:22`;
  `google-link.spec.ts:266` (lost switch response reconciles once, no replay).
- **stale** — `heartbeatStale` reconciliation (`remote.ts:278`, not independently spec-cited by name);
  `google-link.spec.ts:116` (replaced-nonce tokens).
- **time-jump** — not directly exercised here; the patience/grace early-wake logic
  (`remote.ts:316-318`) is covered indirectly by `remote.spec.ts:111`'s grace-closing test, not by a
  dedicated clock-jump case.
- **offline-reconnect** — `remote.spec.ts:69` (offline queue + return), `remote.spec.ts:184` (hung
  transport → reconnecting).

## Gotchas

- The README's journal-shape paragraph is real but incomplete — it omits `accountSwitch`; don't
  treat prose summaries (including this file's own) as a substitute for `remote.ts:8`.
- `command()`'s capacity refusal is a normal `Result` (`{ok:false, reason:'bufferFull'}`), not a
  `RemoteError`/state transition — a caller checking `game.state` after a refused command sees no
  change at all.
- `store:invalidClient` is the one `input`-bucket code that maps to **403**, not 400
  (`http.ts:326`) — every sibling code in that same list (`invalidCursor/invalidCommand/
  invalidHeartbeat`) is 400.
- The presence-sweep timer is a **free-running interval, armed once at server startup**
  (`server.on('listening', ...)` → `sweep(); arm(); seasons();`, `http.ts:345`) and self-rescheduling
  every `store.heartbeatIntervalMs` from inside its own `setTimeout` callback (`arm()`, `:335`) — it
  does not depend on client traffic to start or keep running. `/player/heartbeat`'s own call to
  `arm()` (`:271`) just restarts that countdown early (a debounce, not an ignition switch): an active
  heartbeat postpones the next sweep, but a player who never heartbeats after connecting is still
  caught by the next regularly scheduled sweep, not left unswept forever.
- Reconnect backoff is not exponential: cadence is whatever the last heartbeat's
  `heartbeatIntervalMs` was, with an early wake for the closest order-patience deadline
  (`remote.ts:316-320`). **A config change to `network.reconnectingUiDelayMs` changes more than the
  UI-visible "reconnecting" threshold** — `heartbeatTiming()` (`registry.ts:32-35`) derives BOTH
  `heartbeatTimeoutMs` (= `reconnectingUiDelayMs` directly, what `watchLiveness()` uses) AND
  `heartbeatIntervalMs` (= `Math.floor(timeoutMs / 2)`) from this one value; the server returns
  `heartbeatIntervalMs` on every `/player/heartbeat` reply and `remote.ts:282` adopts it as
  `this.interval`, which is exactly what drives the client's actual heartbeat cadence and the
  reconnect/retry scheduling in `cycle()`'s `finally` block (`:312-321`). The same
  `heartbeatTiming().heartbeatIntervalMs` is also `store.heartbeatIntervalMs` (`store.ts:692`), the
  interval the server's presence-sweep timer self-reschedules on (see the presence-sweep Gotcha
  above). So tuning this one config value moves the UI threshold, the real heartbeat/retry traffic
  cadence, and the server's presence-sweep cadence together — confirmed end to end by
  `apps/server/test/presence.test.ts:164` (`reconnectingUiDelayMs: 40`) asserting
  `beat.heartbeatIntervalMs === 20` and `beat.heartbeatTimeoutMs === 40`.

## Related

[save-replay-local](save-replay-local.md) — the `claimLocal`/local-archive boundary this module
shares, and the web-local tier `start.ts` falls back to. [admin-registry](admin-registry.md) — a
structurally separate cookie/session system; admin auth (`admin-auth.ts`) does not reuse
`store.session()`/the player cookie this file relies on. [onboarding-guide](onboarding-guide.md) —
`login-prompt.ts`'s `canInvite()` touchpoints (`firstShift`/`leaderboard`/`leave`) drive when the UI
opens the account panel that calls into `linkGoogle`/`googleChallenge`.
[multi-system-journeys](multi-system-journeys.md) — local→Google→server and guest→Google-switch are
exactly the cross-tier journeys that belong there, not duplicated here.


### Wave B — 2026-09-16 proof
- `apps/web/remote-test/remote.spec.ts` — 'real server serves once after lost acknowledgement, retains queue across reload, menus pause and reports resync' now compares all six displayed metrics with the authoritative API report before/after reload. Run with playwright.remote.config.ts (isolated server, no mocked responses).
