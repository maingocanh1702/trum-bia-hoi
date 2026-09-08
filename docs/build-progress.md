# Build progress — Trùm Bia Hơi

Started 2026-09-08 from `30c0285`. Active worktree: `/Users/maingocanh/.codex/worktrees/trum-bia-hoi-game`, branch `codex/game-build-isolated` based on `bc79af5`. A concurrent Claude docs commit captured the first engine files in the original checkout; original files were preserved, and further work was isolated. Authority: HANDOFF v1.15,
PROMPT PACK part B, GDD decisions, 03-SPEC table rules, JSON numbers. This is the
complete-game goal; milestones below are implementation order, not scope cuts.

| Milestone | Status | Evidence / remaining |
|---|---|---|
| M0 — config, pure engine, deterministic replay, k sim, workspaces | Verification passed; review pending | Config/schema + workspaces + pure engine + replay + actual 5-seed k sim; build/unit checks pass |
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

1. Complete M1/M3 rule edge cases: well-rested bonus, segment/day caps, queue loss,
   kick-all accounting/analytics, larger-table price rows beyond the existing 10-seat
   curve, per-customer round/patience behavior and fully unlocked-menu balance tests.
2. Replace the spatial scene's labelled placeholders with reviewed pixel-art assets;
   complete the 75-event audio set and listening QA. The current 32 clips are original
   synthesis drafts, not claimed as final mastered assets.
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
