# Handoff economy 2.0 — accepted update, 2026-09-09

Owner requested checking and following the latest handoff. Compared the actual uncommitted original checkout against the isolated game's current source, using common ancestor bc79af5a34f95f408242653ca3e745fbb6f56d94. The original handoff header v1.16 contains newer economy content than this worktree's v1.21: version counters from separate edits do not establish recency.

The accepted target is original `economy.tbh.json`2.0.0, `08-SPEC`v1.5.0 and `03-SPEC`v1.3. Existing config 1.7.3 remains the verified runtime until integration and validation finish. Source engine 19-test results and career estimates describe the original checkout, not this game branch. Current evidence remains in build-progress and the implementation tracker.

| Mechanism | Accepted rule / config |
|---|---|
| Beer tank | Storage3/6/10/18/40; refill batch2/3/5/8/14 in12/8/6/5/4seconds. Initial shift fill from actual raw stock. |
| Taps | Concurrent1/2/3/4/6; pour2/1.8/1.6/1.4/1.2seconds. Full glasses on trays are separate from tank storage. |
| Automatic batches | Start whenever work exists and station is idle; cap each batch at configured capacity, defer midbatch arrivals. Existing batch quantity/deadline survives upgrades. |
| Kitchen | Per pan2/2/3/3 portions, same dish; same order first. Configured1/2/2/3 pans. Base prep4/5/7seconds, multipliers1/.9/.8/.7. Stable batch identity must distinguish simultaneous same-dish pans. |
| Glasses | Buy cap40, storage50, price400base (1000displayed at k2.5). Shared purchase quote, safe count/cost, exact-once debit. |
| Side dishes | Choose only unlocked, unreserved stock. Hot probability.5, groups withVIP/ngoily.8; empty side-dish stock yields beer only. Serve only when the entire order is ready. |
| Rush | Heavy from LP1; earlier shifts use light slots with full configured timing. |
| Equipment | New price tables and next-level LP gates; keg/washer/cooler/stall Lv4→LP2,Lv5→LP3; kitchen Lv3→LP3,Lv4→LP4. |
| Tables | New level prices and extra-seat schedule11–48; purchasing more tables after capacity upgrades remains supported. |
| Locations | Configured rent0/4000/6800/10000/14000/18000/24000/32000/44000base per day; LP gates0/1/1/2/3/3/4/5/6; seven-day prepaid lease,25%deposit, normal-end refund, early-leave forfeiture. |
| Validation | Actual engine career sim8 shifts/day plus canonical k cohorts, rush pressure, replay, engine/server and browser checks. Reference results are not imported as proof. |

Direct owner decisions remain effective: management/restock/equipment menus pause until closed; restock retains menu; upgrades are available in shift; numeric loss toast; portrait street-game HUD and contextual whole-table service. The original JSON's outside-shift flag and some no-pause prose are older boilerplate and are not reintroduced.

F13§5 still specifies eligible/unclaimed/claimed rewards and gates independent of claiming. The complete existing secondary LP requirements and claim-once reward ledger are retained; the original engine's explicitly unfinished `requires` handling is not adopted. Source metadata that describes automatic coin-only rewards must be reconciled to this full contract. The original spawn formula predates the verified ordinary-floor fix; retain that fix. These reconciliations require a distinct config identity (planned 2.0.1), never changing the content of an existing snapshot version.

Confirmed reference defect: counting cooking pans by `(dish,readyAt)` merges two same-dish pans started together. A production-shaped probe admits 6 portions while2 pans × 2 portions allow 4. Use one stable identity per actual pan batch in the integrated engine and a regression for this case.

Work order: finish rules19 disconnection verification; integrate versioned station/demand/glass/LP-gate mechanics and HUD; then lease lifecycle/UI and actual career simulation. Server liveness/outbox/remote cutover follows; missing Google Client ID does not block this work. Full M0–M9 remains unfinished.

Source SHA256: handoff 8849b0ecd37f6a0ee6833f1f3b9e10876d3fafbae7ff2f196c8408ca774a1814; JSON ff10ee2e3ef913c9215acf0bb9dbe8be8aea9ace9c2ba9065fbc70c3028c8c55. Full intake snapshot and merge/probe evidence are retained under `.qa/`.

| Date | Change |
|---|---|
| 2026-09-09 | Accepted latest owner handoff/economy delta, pinned source content, recorded precedence and integration order without claiming unimplemented or unverified behavior. |
