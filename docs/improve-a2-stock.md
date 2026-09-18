# A2 — quick beer restock, balance acceptance still open

Owner decision, 2026-09-16: ship the bounded stock-friction option. Show a small HUD warning and a direct full-stock purchase; retain the configured stock ladder, production rules and emergency-pack status.

## UI contract

`GameView` reads `beerStatus(...).batchSize` for the low threshold and the existing `restockQuote(world, config, 'bia', 'full')` for quantity, price and affordability. The button uses the existing `run({type:'restock', dish:'bia', mode:'full'})` path. It never opens a management sheet or requests a pause. The existing Nhập hàng sheet still pauses gameplay and keeps purchases inside the open sheet.

| Raw beer stock | HUD behaviour |
|---|---|
| Zero, even with poured beer or an active batch | “Kho bia đã hết. Nhập thêm để nạp tiếp.” / “Beer stock empty. Refill to keep replenishing.” No claim that serving is impossible. |
| Positive and below the configured batch size | Low-stock copy and the canonical full-stock quantity/price. |
| Enough for a batch, or already full | No warning or zero-quantity purchase. |
| Low/empty but unaffordable | Exact full price remains visible; disabled action and existing insufficient-coins copy. |

The existing raw-stock/capacity, poured reserve and glass counts remain visible and describe the purchase for assistive technology. The action has a minimum 44px hit height, no hover dependency, and VI/EN keys. All authoritative stock, coin, event, replay and remote-command handling remains unchanged.

## Diagnostic evidence and limits

The read-only pressure probe is retained at `.qa/wave-a2-pressure-20260916/` in the main checkout (`README.md`, `probe.mjs`, `receipt.json`, `SHA256SUMS`). Authority: `7d4061afbd91e10aea9adb18ef7d2848b6c7c178`; run HEAD: `927ef4c69fa18e658e5eb4adf4eab5a60037f7fc`. Relevant config, engine and policy bytes were verified unchanged. Config version: 2.0.3; Node: v22.22.1. Receipt SHA-256: `685257dd34c703fc0271e76ed2ee200d00357c8a56f8b03c5e5e9e722f05e2e6`; probe SHA-256: `8b97e5a181598e7357c4aec6e73de9ccca3e212cf6e8ea82434cd96b80a179cc`.

Reproduce from that checkout with `node --import tsx .qa/wave-a2-pressure-20260916/probe.mjs`. This artifact uses disposable engine objects; it does not read or modify a player save. Five seeds (20260611, 42, 20260908, 7, 99), three shifts each, 100ms samples, full restock of each affordable unlocked dish every second, default wallet/equipment/glasses, no rush, no upgrades/rewards/money injection, active rest to full, and `serveNext` only.

| Diagnostic | Lost / arrived | Queue expiry | Seated expiry | Loss rate | Shifts below 10% | Shifts with zero clean-glass shortage samples |
|---|---:|---:|---:|---:|---:|---:|
| Current cap 15, full-restock policy | 221 / 1020 | 211 | 10 | 21.6667% | 2 / 15 | 7 / 15 |
| Hypothetical cap 45 | 198 / 1022 | 181 | 17 | 19.3738% | 5 / 15 | 3 / 15 |

**A2 balance acceptance is OPEN.** Neither profile meets the plan's per-shift below-10% loss or zero-clean-glass-shortage requirements. Cap 45 also makes the paid capacity ladder non-monotonic and is not shipped. No capacity, spawn, dwell, emergency or engine/config changes are part of this slice.

The baseline recorded no raw-beer or glass preparation-block samples; this is distinct from transient zero-clean-glass samples. Every baseline queue-loss snapshot had a leisurely group attached to a table, including possible cleaning phases. These observations do not prove a single cause. Samples approximate blocked order-time, can overlap across tables and record the last state before expiry. Served counts include repeated customer rounds; loss rates use arrived as the denominator. Capacities affect affordable side-dish purchases and later random consumption. The ideal full-restock policy removes avoidable stock gaps and does not model human menu frequency. The HUD change reduces interactions; its UI checks cannot certify the balance targets, manual play feel, k or a deployment.

## Verification ownership

- `apps/web/test/quick-beer-stock.spec.ts`: VI/EN × 360/390/1280px DOM purchase, exact coins/stock and single event, live timer, reload, 44px and warning-specific axe; active-batch, unaffordable-low-stock, partial stock at the configured batch boundary, and full-stock boundaries.
- `apps/web/remote-test/quick-beer-stock.spec.ts`: real isolated API, stock consumed through DOM serving, direct restock, unchanged pause state, running shift and reload. Use `playwright.remote.config.ts`, not the local config.
- Existing `menu.spec.ts`, `pause.spec.ts`, `game.spec.ts` and engine `game.test.ts`, `menu.test.ts`, `menu-pause.test.ts` protect surrounding purchases, management pause, save and replay. The full accessibility matrix uses `playwright.accessibility.config.ts`.
- Receipts and the exact-source review are under `artifacts/verification/codex-improve-ui-clarity/a2-report.md`. Unchanged engine/config reuse the A5 `verify:all` receipt with an explicit diff check; the parent runs the integrated full gate. This source slice does not authorize merge, deployment or runtime cutover.

## Changelog

| Date | Change |
|---|---|
| 2026-09-16 | Implement owner option 2: live HUD full-beer purchase; preserve OPEN balance acceptance and diagnostic limitations. |
