# Wave A3 — VIP arrival proof

Source base: `927ef4c69fa18e658e5eb4adf4eab5a60037f7fc`. Scope: the existing headless sim and proof documentation; no production engine/config changes.

`Game.spawn()` admits every positive-weight table customer. VIP has no LP/phase unlock; the first onboarding group alone is forced to the configured ordinary type. In the sunny, non-rush, no-sign pool the eligible weights sum to 1.53, so the first eligible draw has VIP probability 0.1/1.53 (about 6.54%). Weather, rush and signs modify that denominator. The per-group cap suppresses later VIP draws after the cap is reached. Values remain sourced from `docs/config/economy.tbh.json`.

## Reproduce

Run `npm run sim:onboarding`. This is already part of `npm run verify`; no separate optional gate is needed. The existing headless whole-table/restock policy runs seeds 20260611, 42, 20260908, 7 and 99 in cold/full-menu, onboarding-on/off cohorts, with at least 1000 served customer-rounds per seed.

The arrival census reads each new `customer_spawned` event and resolves its live group, counting each customer ID once. It refuses missing or duplicate observations and reconciles admitted plus rejected customers with the engine's shift arrival totals. Queue overflow has no customer types in its event, so rejected customers are reported separately and never assigned invented types. Repeat orders/serves do not inflate arrivals.

Baseline comparison excludes the forced onboarding group and all non-sunny, rush or sign-modified groups. Its expectation is `E[min(Binomial(group size, VIP weight / eligible weight sum), configured VIP cap)]`, summed across the observed admitted baseline groups. The 30% plan tolerance applies to each pooled five-seed cohort, not separately to a short shift containing only a few expected VIPs. Overflow is excluded, so this is an admitted-arrival mix proof, not a claim about the unobservable types of rejected customers.

## Acceptance boundary

The engine census passes all four five-seed cohorts (2026-09-16). Human observation of at least one VIP in shift 2 on the public build remains **PENDING**. No new unlock hint is appropriate because no unlock gate was found. Engine evidence cannot establish whether players recognize the VIP sprite in the browser.

## Measured baseline

| Onboarding | Menu | Eligible admitted guests | VIP | Cap-adjusted expected VIP | Observed rate | Difference from expected |
|---|---|---:|---:|---:|---:|---:|
| true | cold-menu | 1077 | 75 | 68.841 | 6.96% | +8.95% |
| true | full-menu | 1337 | 99 | 85.429 | 7.40% | +15.89% |
| false | cold-menu | 1526 | 109 | 97.537 | 7.14% | +11.75% |
| false | full-menu | 1169 | 80 | 74.714 | 6.84% | +7.07% |

Across all cohorts, every admitted arrival is resolved and counted once; overflow is reconciled separately. Full per-seed/type counts are in `artifacts/verification/codex-improve-vip-proof/vip-census.txt`, extracted from the successful `sim:onboarding` section of `verify.txt`. The 20 original k rows and 15 rush cases also pass; the source changes neither weights nor bot commands.
