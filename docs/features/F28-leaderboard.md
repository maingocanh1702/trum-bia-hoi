# F28 — Bảng Xếp Hạng & Bàn Thờ Ông Địa (Leaderboard)

> Tách từ F12 §6 "Views" (2 dòng) thành feature riêng theo yêu cầu chủ dự án 08/09. **F12** giữ bậc Giải Nhậu, Vụ Bia, thưởng; **F28** = bản thân các bảng: ai được lên bảng, xếp thế nào, hiện gì, đóng băng khi nào, lưu danh ra sao. Outcome/acceptance — cách trình bày do dev tự quyết; ảnh tham khảo `docs/reference/trumviahe-modal-shrine-leaderboard.png` (Bàn Thờ) và nút RANK ở `trumviahe-hud-layout-2026-09-08.png`.
> Ngày: 2026-09-08. Config: `docs/config/economy.tbh.json` → `leaderboard` (tier **A** — thứ hạng). Cần server (F23); trước khi có server: bảng chỉ có mình + trạng thái "Chưa có ai".

## 1. Scope

- **Xếp hạng Vụ** (nút RANK): bảng sống trong Vụ Bia đang chạy, theo bậc Giải Nhậu, xuyên mặt bằng. 2 Vụ song song (Phân Hạng 7 ngày · Tranh Bá 14 ngày, F12).
- **Bàn Thờ Ông Địa**: bảng vàng **Vụ đã kết** — podium top 3 + Wall of Legacy hạng 4–`wallSize`; xem lại Vụ cũ; huy chương của tôi.
- **Dạo Phố** (hàng xóm theo `location × bậc`, thẻ quán, react/quà/chặn) — vẫn ở F12/F14, không lặp ở đây; F28 chỉ cung cấp thứ hạng cho nó.
- Ngoài scope: phần thưởng (F12 §5), huy hiệu referral (F16).

## 2. Product rules

- **Điểm xếp hạng** = `seasonEarned` của Vụ tương ứng (sổ "thu Vụ", 08 §15; quest/tặng quà không tính — F17). Tie-break `firstReachedCurrentSeasonEarnedAt` (config F12).
- **Điều kiện lên bảng:** tài khoản đã đăng nhập (guest xem được nhưng không có hàng — F25); đã đóng ≥ `minShiftsToRank` ca trong Vụ; không bị `flagged` (F23 §6). Bị gắn cờ giữa Vụ → ẩn khỏi bảng ngay, thứ hạng người khác dồn lên; gỡ cờ → trở lại.
- **Hiển thị:** top `topN` mỗi bậc + **hàng của tôi** luôn thấy kèm `neighborsWindow` người trên/dưới; bậc trống hiện "Chưa có ai" (F12). Mỗi hàng: hạng · tên · thu Vụ · ⭐ uy tín · mốc Đường Lên Trùm; tên hiển thị qua bộ lọc từ (tier C).
- **Làm mới:** server tính lại tối đa mỗi `refreshMs`; client hiện mốc "cập nhật … trước"; không realtime từng serve.
- **Kết Vụ:** tại `endsAt` bảng **đóng băng** (F12 §5) → snapshot bất biến → Bàn Thờ hiện podium + wall; huy chương top 10 ghi vào hồ sơ; giữ `historySeasonsKept` Vụ gần nhất để xem lại.
- **Đếm ngược kết Vụ** hiện trên bảng; 24 h cuối có nhãn "sắp kết" (cách thể hiện tự quyết).
- **Bàn Thờ** là màn prestige: không có nút mua gì; chỉ xem + react (nếu F12 Dạo Phố có react).
- **Không pause ca** khi mở bảng (sheet/modal như mọi màn meta, 09 §2); xem quán người khác (Dạo Phố) mới pause.

## 3. Data & config

- Config `leaderboard` (tier A, `next_season` trừ `refreshMs`/`topN` là hiển thị → Economy Admin, `next_day`): `topN`, `neighborsWindow`, `refreshMs`, `minShiftsToRank`, `shrineTop`, `wallSize`, `historySeasonsKept`, `hideFlagged`, `displayNameFilter`.
- Server projection `season_rank(seasonId, tier, playerId, seasonEarned, firstReachedAt, rank, updatedAt)`; snapshot `season_result(seasonId, tier, rank, playerId, medal)` khi kết Vụ (bất biến).
- Client cache bảng gần nhất trong `localStorage` chỉ để hiện tức thì khi mở (kèm mốc thời gian) — không phải nguồn sự thật.

## 4. API (gợi ý — F12 §7 đã có `GET /leaderboard`)

`GET /leaderboard?seasonId&tier&page` (trả top + `me`) · `GET /leaderboard/me?seasonId` · `GET /shrine?seasonId` (podium + wall + medals của tôi) · `GET /seasons/history?limit`.

## 5. Analytics (gộp vào `docs/analytics-events.md`)

`leaderboard_viewed {seasonKind, tier, page, myRank}` · `leaderboard_me_viewed {rankDelta}` · `shrine_viewed {seasonId}` · `season_result_snapshotted {seasonId, tier, entries}` · `rank_hidden_flagged {playerId}`.

## 6. Acceptance

- Người chưa đăng nhập: xem được bảng, không có hàng của mình, có lời mời đăng nhập (F25).
- 2 tài khoản cùng `seasonEarned` → thứ hạng theo `firstReachedCurrentSeasonEarnedAt`, ổn định qua các lần refresh.
- Người bị `flagged` không xuất hiện ở bảng lẫn snapshot; bỏ cờ trước kết Vụ → có mặt lại.
- Snapshot kết Vụ **không đổi** sau khi tạo, kể cả khi player đổi tên/xoá tài khoản (giữ tên tại thời điểm khắc).
- Mở bảng giữa ca: ca vẫn chạy, không mất tick; bảng tải từ cache tức thì rồi thay bằng dữ liệu server.
- Mọi ngưỡng ở §3 đổi được ở admin, `npm run check:config` xanh; thứ hạng/snapshot không bao giờ tính ở client.

## Changelog (append-only)
| Ver | Thay đổi |
|---|---|
| v1.0 | Bản đầu 2026-09-08 — tách từ F12 §6 theo yêu cầu chủ dự án; ảnh tham khảo Bàn Thờ. |

## Owner update — imported local history (2026-09-10)

After sign-in, retain the player's local progress. The owner chose **review local
history before it counts**: imported local results remain excluded from ranking until
server-recorded approval, then receive credit once. Replay consistency alone is not
approval. This supplements F25's migration/conflict rules and does not claim the
review/approval or community leaderboard implementation is finished.

| Date | Change |
|---|---|
| 2026-09-10 owner | Imported local history must be reviewed before competitive credit; preserve progress and prevent duplicate credit. |


## Imported history boundary implemented — 2026-09-10 (review pending)

The internal server claim core now records immutable archive provenance and the
imported command/event cutoff. Its receipt reports `pending`; there is still no
approval operation or community ranking projection. A future ranking consumer must
read server eligibility for these exact recorded results, not trust raw imported
world.seasonEarned or a client flag. Preserve the owner's decision: approved local
history may count once; pending history cannot count. No compensation credit is added.

| Date | Change |
|---|---|
| 2026-09-10 provenance | Schema5 records pending local-history origin/cutoffs for the later review and ranking boundary; approval and rank projection remain required work. |


| Date | Change |
|---|---|
| 2026-09-10 verified local claim core |51a0734 passes271tests/config/build and80MB exact import/reopen/retry; native independent code/security review found no actionable introduced defect. `.qa/local-import-verification.json`. Imported history remains pending approval; public upload, cold-read performance and web cutover remain unfinished. |

| Date | Change |
|---|---|
| 2026-09-10 moderation prerequisite |521e901 implements server-owned imported-history review and current flag state through protected audited operations. A rank consumer must still exclude unapproved local contribution and flagged/ineligible players; no rank projection or immutable season snapshot is claimed. Full F28 remains unimplemented. |

| 2026-09-10 score boundary | Server now derives caller-only competitive totals from engine season accounting and exact imported baseline, excludes pending/rejected local earnings/shifts, applies current Google/flag and pinned qualification rules. New authenticated read does not implement global ordering/snapshots or make F28 complete. Verification tracked in competitive-eligibility.md. |

| 2026-09-10 competitive score verified | E23 at7e7f337:376unit/server,19admin browser,32focused,config/build and final independent review PASS. Exact local baseline/Google/flag eligibility and worker recovery verified; no global ordering/snapshot/admin review UI or full milestone claim. |

| 2026-09-10 admin history/review verified | E24 at85fbdfb: protected imported-prefix pages, Support read-only and MFA Game/Super approval/flags, per-operator exact retries and identity cleanup.378unit/server +24admin browser, final5 affected browser/config/build/review PASS. See [E24 evidence](../competitive-eligibility.md#admin-historyreview-closure--e24-2026-09-10); public rank/snapshot and full M4/F28 remain open. |


## Changelog (append-only)
| Date | Change |
|---|---|
| 2026-09-10 public board | Implemented live query and VI/EN web on basec53b6f0: `GET /leaderboard?kind=ranking\|contest&tier&page&revision` resolves the authenticated current period, with configured pages/own neighbors, safe public aliases and dated optional cache. Pseudonymous aliases ship until editable profile names/content filtering exists. The owner all-menu pause rule supersedes §2/§4 no-pause statements: board stays paused until closed. Immutable end-season snapshots/shrine and filtered profile names remain unfinished; full F28 is not claimed. |

| 2026-09-10 E25 verified | Live query/VI–EN UI628eb72 passes386unit/server,11affected remote/24admin browser,config/build and final CLEAN review; unsafe display settings rejected by shared server admission/consumer. Foundation88remote/2local pass. End snapshots/shrine/filtered profiles remain. See competitive-eligibility.md E25. |


| Date | Change |
|---|---|
| 2026-09-11 | Steer18 M5-F28-RANK acceptance refreshed:4 real-server browsers and409unit/server PASS. Existing paginated live-board/tie/flag/unflag/server-threshold code needs no change; immutable end snapshot/name-at-capture/history is next, not claimed complete. |
