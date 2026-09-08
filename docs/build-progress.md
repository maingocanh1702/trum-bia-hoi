# Build progress — Trùm Bia Hơi

Started 2026-09-08 from `30c0285`. Active worktree: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-game`, branch `codex/game-build-isolated` based on `bc79af5`. A concurrent Claude docs commit captured the first engine files in the original checkout; original files were preserved, and further work was isolated. Authority: HANDOFF v1.15,
PROMPT PACK part B, GDD decisions, 03-SPEC table rules, JSON numbers. This is the
complete-game goal; milestones below are implementation order, not scope cuts.

| Milestone | Status | Evidence / remaining |
|---|---|---|
| M0 — config, pure engine, deterministic replay, k sim, workspaces | Verification passed; correction review CLEAN | Config/schema + workspaces + pure engine + replay + actual 5-seed k sim; 27 unit checks pass; review evidence below |
| M1 — serve loop, glasses, stock, upgrades, local save, spatial UI, core audio | In progress | Playable loop, local save/replay, stock/equipment/table UI, core SFX wired; final sprites and listening QA pending |
| M2 — guest, vi/en, onboarding | In progress | Local guest + matching vi/en keys + event-driven guide with skip/repeat cap; Google account linking and 5-person evidence pending |
| M3 — full menu, customer mix, weather, rush, business unlocks | In progress | 6 menu entries and hot prep, 5 seated types, 5 weather states, basic scheduled rush. Shipper/football, business unlocks and exhaustive balance/edge QA remain |
| M4 — server authority, accounts, reconnect, config registry/admin | Pending | |
| M5 — seasons, leaderboard/shrine, life path, leases, quests/referrals | Pending | |
| M6 — risks, dog, emergency supplies | Pending | |
| M7 — voluntary donations, cosmetic gifts, age notice | Pending | |
| M8 — football events, season shop, legal-gated lottery | Pending | |
| M9 — complete art/audio, accessibility, replay/security/performance QA, release | Pending | |

## Decisions and boundaries

- Build fresh; do not modify or inherit archived prototype code/UI.
- React DOM + CSS for the first spatial yard: accessible native controls, stable
  keyed objects, no canvas dependency before a measured need.
- Shared pure TypeScript rules, seeded RNG, explicit time, JSON config snapshots,
  append-only commands/events with idempotency keys. Local persistence before server.
- Held content is never fabricated: inspection remains disabled. Lottery must be
  disabled until legal approval; the seed flag has been reconciled to `false`.
- Manual donation confirmation and admin-entered football fixtures are the defaults.
- Asset placeholders are labelled through the manifest until replacement art passes QA.
- Keep real external setup and human playtest evidence distinct from local checks.

## Verification

Current checkpoint (2026-09-08):

- `npm run check:config`: passes against the new runtime loader (40 root sections).
- `npm run build`: strict typecheck + Vite production bundle passes.
- `npm test`: 15 tests pass (serve/grace/stale/expiry, replay/idempotency, cap,
  restock, frame-independent rest, locale parity, guide repeat cap).
- `npm run sim`: 5 seeds, 500–501 customer serves each, k = 2.2702 / 2.3728 /
  2.4326 / 2.3873 / 2.5072. Real gameplay bot, stock costs included, no throughput term.
- Browser acceptance: 390×844, 360×740, 1280×720; first serve, persistence,
  live sheets, language switch, full 12-minute closure, corrupt-save recovery,
  mute/guide persistence. No horizontal overflow or page exceptions observed.
- `npm run check:assets`: 113 entries; 8 existing sprites, 41 declared placeholders,
  32 new SFX × two codecs. Release check intentionally rejects draft art/audio.
- Local preview in this worktree: `npm run dev -- --port 5174`.

No complete-game or release-ready claim. Further implementation stays in this worktree.

## Immediate next work

1. Complete M1/M3 rule gaps: well-rested bonus, segment/day caps, manual ejection
   accounting/analytics, larger-table price rows beyond the existing 10-seat curve,
   full rush schedule, shipper/football demand and business unlocks. Version new
   replay semantics; preserve the current mixed-round/patience/midnight regressions.
2. Finish the 14 illustrated drafts, replace 30 remaining sprite placeholders and
   complete the 75-event audio set with listening QA. The current 32 clips are
   original synthesis drafts; final export/performance/family polish remains.
3. Add server SaveStore/authority + Google linking/reconnect and Config Registry with
   real role/approval/schedule/override handling. Keep the existing log/config pinning.
4. Continue all meta, risk, event and release rows above; preserve legal/content holds.

## Known implementation limits

- Local runtime only; settings Config screen is a snapshot viewer, not an admin editor.
- No Google credentials, live rankings, bank receiving details, remote deployment or
  human playtest evidence have been configured or fabricated.
- Earning is credited at service time (08-SPEC §9 per-earn); later table cleanup does
  not credit it again. Previously served rounds remain earned if a later round fails.
- Procedural sound IDs use `audio:<clip-id>:<format>` in the manifest to avoid collisions
  with sprite ids such as `glass-stale`; the checklist clip id remains `audioId`.


## Changelog

| Date | Change |
|---|---|
| 2026-09-08 | Started complete-game build and recorded authority, order and boundaries. |
| 2026-09-08 | M0 verified; playable M1/M2 and initial M3 code in isolated worktree. Added explicit remaining work and evidence instead of treating the local slice as the full game. |

## Owner steering — 2026-09-08

- Reference art boards archived in `docs/reference/assets-owner-2026-09-08/`; use with the existing no-handle green glass anchor. One supplied PNG was an error JSON; seven valid boards retained.
- Lost customers now show only a short numeric/icon coin + reputation toast, using actual clamped deductions and no explanatory/dismissal popover. Relevant docs are updated.
- Foundation review at `041cdc5` predates this steering; re-review the final diff before a clean/completed claim.

## Foundation review and next corrections

The independent CLI review of `30c0285..041cdc5` completed 2026-09-08 with findings, not CLEAN. Evidence: `.qa/review-foundation.txt` (local diagnostic); it predates owner steering at `5940ef2` and does not certify later commits. CLI 0.152 rejected the current model; CLI 0.153.4 with the repo wrapper's gpt-5.6-sol model completed. Native `exec review` rejects `--base` plus custom prompt, so the immutable range was specified in its custom prompt. Its returned format differs from the requested rubric; no clean gate claim is made.

| Finding | Disposition |
|---|---|
| Save drops domain events / command configVersion | Accept. Add a versioned shared history and actual v1 migration before changing rule semantics. |
| Tip should use minimum order patience | Reject with authority: 03-SPEC section 4 explicitly computes tip/payment per customer; the order timeout is the minimum. Add a mixed-table regression to preserve this distinction. |
| New shifts after earnings cap | Resolve against GDD section 10: existing service must credit zero at cap. Add explicit coverage of exhausted earnings vs remaining shift allowance. |
| Rounds must read all relevant config ranges | Accept; pin mixed-group precedence and preserve old replay semantics. |
| Hidden local game must pause | Accept local behavior described in 10-SPEC section 8 and GDD anti-idle. Keep real VN-day timestamps; do not implement pause by drifting the calendar. Server reconnect policy remains a separate M4 responsibility. |
| Queue gets order grace | Accept; grace belongs to placed orders. Version the timing change for old saved logs. |
| Early zero-tip customer classified late | Accept; classify by timing, and localize truthful no-tip feedback. |
| Corrupt-save recovery is a dead end | Accept; add validated import and a deliberate restart with preserved backup. |
| Grouped queue loss counts only one guest | Accept; use emitted customer count, with existing successful-serve reset. |
| No midnight cap regression | Accept; test earnings on each VN day and shift attribution on finalize. |

Additional checks completed: startup config rejects invalid levels, fractional stock/costs, zero-weight populations and invalid audio gain; UI exposes existing retail `one` restock; canonical sim now covers five seeds each for cold/full menu. Current verification: 17 unit tests + 6 browser tests; cold k 2.2702–2.5072, full-menu k 2.4662–2.6965. These corrections are not a completed-M3 claim.


## Review corrections — local history and time

Implemented after `681538a`, awaiting independent re-review:

- Save v2 persists emitted events and command-level config/rules versions. A fixture produced by the original `041cdc5` engine proves that v1 replay retains coins, reputation, IDs, glass ownership and a running second shift. Historical v1 commands retain their original rules; new commands use rules v2. Event replay permits additive diagnostic fields but rejects changed recorded values.
- Hidden/offline local play shifts gameplay deadlines while preserving wall-clock VN day keys. It does not spend stamina, expire orders, stale beer, or recover resting stamina. Visible sheets keep time running. The shift book excludes paused time and stops elapsed time at actual close.
- Queue patience no longer gets seated-order grace. Round selection reads configured bounds with mixed-group precedence: ngồi-lỳ, then vội, then VIP, then thường. Ngồi-lỳ samples the range; other non-hurried groups choose lower/upper via `pSecondRound`; vội samples its configured range when nonconstant.
- An available shift can open after the daily earnings cap; actual gameplay credit remains zero. Earnings straddling VN midnight use separate day buckets, while the shift count uses its closing day.
- Service timing and tip amount are independent: early zero-tip guests get early feedback without claiming a tip. Per-customer patience for tips is retained per 03-SPEC section 4. Clearing an already-served/expired table cannot fine it again.
- Recovery now validates imports before replacing saves and offers a deliberate fresh start; either path stores the original under a separate backup key before replacement. A failed validation/storage write leaves the current save intact. Three queued guests leaving count as three for onboarding.

Verification: `npm run verify` passes (26 unit tests). `npm run test:e2e` passes all 9 browser tests, including hidden/offline resume, invalid/valid import, confirmed fresh start, and numeric-only customer-loss toasts. Sim values after timing/round fixes: cold **2.3401 / 2.3249 / 2.3746 / 2.3481 / 2.4498**, full menu **2.7020 / 2.5748 / 2.4766 / 2.6760 / 2.6970**; at least 500 customer serve records per seed/profile. No M3 or release completion claim.

| Date | Change |
|---|---|
| 2026-09-08 | Addressed accepted foundation findings with versioned historical replay, local pause/recovery and targeted rule regressions; recorded false-positive tip disposition against 03-SPEC. Re-review pending. |

### Independent correction review follow-up — 2026-09-09

Codex reviewed `681538a..12afb011cb7c4f68b3bfa7ea866578b24f852985` and returned two findings: missing mixed-group/nonconstant-hurried round regressions, and an accidentally rewritten tracker v0.8.0 history label. The history label is restored; deterministic seed 8/9 mixed groups now prove ngồi-lỳ > vội > VIP > thường and both outcomes of a nonconstant hurried range. Unit suite: 27 pass. Focused re-review pending. The newer owner-directed layout/art work is a separate ongoing change, outside that immutable review.

Focused follow-up completed: **VERDICT: CLEAN** for `12afb011cb7c4f68b3bfa7ea866578b24f852985..830787c9633e149867053d1b915fb12d0b692bf7`. Both findings resolved. Evidence: `.qa/review-rounds-followup.txt`. This closes the recorded correction findings; it does not certify later uncommitted UI/art or unfinished milestones.

## Owner layout and illustrated art — 2026-09-09

- Applied the latest screenshot as a composition reference: tall blue hex-tiled playfield, illustrated Hanoi sides, compact HUD, owner/counter/equipment above the tables, right inventory rail and bottom actions.
- Orders open on table tap; their clocks keep running. Escape returns focus, switching to a sheet closes the panel, and order expiry closes it automatically. Customer departure still produces only the actual numeric/icon deductions. Whole-table service rules are unchanged.
- Ten original imagegen PNGs now cover the street, owner, ordinary customer, low blue table, red stool, three starter equipment objects, peanuts and nem chua. Full prompts/provenance live under `docs/reference/assets-owner-2026-09-08/`. Source alpha is retained; final image size/export optimization is pending. The original green glass set is unchanged. Neutral placeholders remain for the other 34 sprite entries, with IDs retained in the manifest.
- `npm run verify` passes: config, build, 27 unit tests, all ten sim rows within **k 2.3249–2.7020**. Final UI build and **11 E2E** pass, including 360×740, 390×844, 1280×720 and 1280×400; table hitboxes do not overlap. Popup keyboard/liveness/expiry, hidden/offline save recovery and numeric losses are covered.
- Visual screenshots at 390×844 and 1280×900 load all displayed images without horizontal overflow. `check:assets`: **116 entries, 34 sprite placeholders, 74 draft files**. Art remains draft; no release claim. Independent review of this UI/art diff follows its commit.

| Date | Change |
|---|---|
| 2026-09-09 | Closed the two correction-review findings at `830787c`. Applied owner layout/art steering, preserved gameplay economics and numeric loss feedback, added order-panel/short-window checks. Full game remains in progress. |

### Interaction verification follow-up

Browser measurement found the new stock rail buttons were only 38px wide. They
are now 46×48px, with an assertion at all four tested viewport sizes. Table-panel
focus records the actual opener and a stable table-button fallback: keyboard
switching between tables returns to the latest opener, while expiry returns to
the surviving table button after its order hint disappears. Build and all 11
E2E tests pass. These refinements follow `999dc57` and require review with it.

### Independent layout review and corrections

Review of `830787c..999dc57` returned six findings (`.qa/review-reference-layout.txt`):
hidden HUD labels, focus restoration, omitted grace time in the hint, hidden
special-customer identity in mixed groups, duplicate stools, and a missing chair
prompt. All are accepted and corrected: visually hidden accessible labels;
captured opener + stable fallback; one shared countdown formatter; VIP then
non-ordinary label priority; one sprite per actual seat; restored original prompt.

The browser suite now has **12 passing tests**. A production-engine-generated
save reproduces `[thuong, voi]` with no beer during grace, checking the urgent
label, matching live timers and disabled serving. Accessibility snapshots retain
coin/glass labels; actual seat counts and focus behavior are covered. The fixture
uses the same tsx loader as the unit/sim suite for Node JSON-import compatibility.

Four more customer drafts now replace the vội/VIP/ngồi-lỳ/Chí Phèo placeholders.
Opaque checkerboard edits were rejected before import. Accepted files retain
actual alpha; the VIP draft's soft halo still needs final art cleanup. Current
manifest: **116 entries, 14 generated sprite drafts, 30 sprite placeholders and
78 draft files including audio**. Prompts and provenance are in
`generated-customer-types.md`. Full-size image optimization/family review and all
remaining M9 work are still pending. This corrected UI/art snapshot awaits its
independent follow-up review; no complete-game or release claim.

### Layout/art review closed — 2026-09-09

The independent follow-up reviewed the entire immutable range
`830787c9633e149867053d1b915fb12d0b692bf7..2d80437b493ee1628f851e9e57aeed6d68369706`
and returned **VERDICT: CLEAN**, confirming all six prior findings are corrected
and finding no remaining introduced correctness, accessibility, responsiveness
or security defects. Evidence: `.qa/review-layout-followup.txt` and its log.

Final verification remains green: config/build, **27 engine tests, 12 browser
tests**, ten sim rows at **k 2.3249–2.7020**, and asset-manifest validation. Latest
390×844 and 1280×900 screenshots load every displayed image, with six seat
sprites for six configured seats and no horizontal overflow. The subsequent
documentation receipt only records this verdict and removes an extra EOF blank
line from provenance; it changes no gameplay/rendering code.

Next: implement the well-rested credit lifecycle with historical replay preserved.
Read-only diagnosis and a real pre-bonus v2 save/expected result from `2d80437`
are prepared under `.qa/next-m3-well-rested.md` and
`.qa/well-rested-legacy-v2-{save,expected}.json`. Full M0–M9 goal remains active.

### Mobile serving sequence — 2026-09-09, review pending

Owner IMG_5002–5006 now guide the service interaction. Bubbles show actual ordered
dishes/quantities with one patience bar; tapping opens the live dark-green panel,
ready dishes have checks, and the red button still serves the whole table. A
successful order shows one numeric/icon gain near the HUD, using the engine's
actual credited amount. Each customer gets the appropriate early/tipped, early
without tip, late, grace or stale reaction. Consumption time and special customer
identity stay visible; departed customers are removed from the scene during
cleaning. Loss feedback remains only actual numeric/icon deductions.

Short CSS entrances/pop motions are inferred from the static references and turn
off under reduced motion. No new dependencies, generated art, engine, economy or
save changes. The Tỉnh Táo mechanism remains next in M3; its pre-change legacy-v2
fixture and decision table are preserved in `.qa/next-m3-well-rested.md`.

Config/build and 27 unit tests pass; all 16 browser tests pass, including real
engine saves for multi-dish early/late/grace/stale results, actual balance/gain,
reload without replaying gain, reduced motion, existing four viewports and numeric
losses. Visual before/panel/after captures cover 390×844, 1280×720 and 1280×400.
A final visual refinement keeps the two dish icons on one bubble row; the final
build/check and independent review follow. Full M0–M9 goal is still active.

### Mobile service review closed — 2026-09-09

Independent Codex review of the immutable range
`fa792326b2d8563795c8c5c00492fc62cb8647a7..1e30b7816563b014e6a994433768de43ac03fc7b`
returned **VERDICT: CLEAN** with no introduced correctness, accessibility,
responsiveness or security findings. Evidence: `.qa/review-service.txt` and
`.qa/review-service.log`. The final two-icon row refinement and disappearing
customer regression are included in that reviewed commit.

Final config/build, **27 unit + 16 E2E** checks pass; no engine/economy/sim source
changed. Stable screenshots at the three recorded viewports confirm the before,
order-panel and after-service sequence. Existing art remains draft and the full
M0–M9 game remains in progress. Next mechanism: Tỉnh Táo credit/lifecycle with
legacy replay preservation; owner service UI is now verified and reviewed.

| Date | Change |
|---|---|
| 2026-09-09 | Closed owner mobile-service UI review at `1e30b78`; final 27 unit/16 E2E/config/build green, numeric departure feedback preserved. No merge/deploy/full-game completion claim. |
