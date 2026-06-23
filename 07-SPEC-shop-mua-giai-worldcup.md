# 🏟️ SPEC — Shop Vụ Bia (World Cup) — Trùm Bia Hơi

> Spec triển khai cho dev. Đào sâu **§14.0 Shop Vụ Bia** của `02-GDD-trum-bia-hoi.md` (v1.6): data model item + flow mua/sở hữu/áp theme, validate server-side. Trả lời 4 câu hỏi triển khai: (1) model item & quyền sở hữu, (2) mua/validate ở đâu, (3) theme áp lên render thế nào, (4) danh sách đội động lấy từ đâu.
> Ngày: 2026-06-11. **Phase: 🔵 4 (POST-MVP)** — không thuộc scope MVP, chỉ là spec sẵn để khi tới Phase 4 build ngay. Nguồn sự thật vẫn là GDD §14/§14.0/§14.1/§16/§18.
> Nhãn: 🟢 CORE = cốt lõi không đổi · 🟡 = số cần balance · 🔧 = chốt khi vào sản xuất.

---

## 0. Bối cảnh & ràng buộc nền (từ GDD) 🟢

- **3 loại item** trong Shop Vụ Bia, **tất cả mua bằng xu in-game** (không tiền thật):
  1. **Bản quyền phát sóng (TV)** — gate Giờ Vàng bóng đá, hạn 1 Vụ Bia.
  2. **Lịch thi đấu** — booster (hiện lịch HUD + cổ vũ spawn ×1.15/Vụ Bia), hạn 1 Vụ Bia.
  3. **Theme đội tuyển** — cosmetic thuần (re-hue cờ/đèn/biển), **sở hữu vĩnh viễn**.
- **Lằn ranh P2P-win (§16):** TV + lịch tác động *throughput/demand* nhưng **chỉ trong event có cap** (không phá trần 500k/ngày, không cộng `seasonEarned`/Giải Nhậu). Theme **tuyệt đối không** đụng gameplay. Mua bằng xu → ai cũng cày được → không pay-to-win.
- **Server-authoritative (§18):** mọi giao dịch (trừ xu, cấp quyền, gia hạn Vụ Bia) **validate & ghi server-side**; client chỉ render shop + áp theme. Chống chỉnh xu client.
- **Dữ liệu Vụ Bia động (§14.1):** danh sách đội + lịch + tỉ số fetch server-side, **KHÔNG hardcode**.

---

## 1. Domain model 🟢 (TypeScript)

```ts
// ─── Định danh Vụ Bia & đội (server cấp, từ nguồn §14.1) ───
type SeasonId = string          // vd "wc-2026"
type TeamCode = string          // mã nội bộ ổn định, vd "BRA","ARG" (KHÔNG phải nhãn hiệu)

// Vụ Bia hiện hành — server đẩy xuống client lúc vào game.
type Season = {
  id: SeasonId
  label: string                 // tên nhại, vd "Cúp Bóng Đá Thế Giới 2026"
  startsAt: number              // ms epoch (UTC; client đổi giờ VN khi hiện)
  endsAt: number                // hết Vụ Bia → TV/lịch hết hiệu lực (theme vẫn giữ)
  teams: SeasonTeam[]           // tập đội tham dự = nguồn sinh theme khả dụng
}

// Một đội trong Vụ Bia — KÈM dữ liệu cosmetic nhại (IP-safe, xem §6).
type SeasonTeam = {
  code: TeamCode
  nickname: string              // biệt danh nhại, vd "Vũ Công Samba"
  palette: { primary: string; secondary: string; accent: string }  // hex re-hue
}

// ─── Catalog item (server định nghĩa, client chỉ đọc) ───
type ShopItemKind = 'broadcast' | 'schedule' | 'team_theme' | 'theme_bundle'

type ShopItem = {
  id: string
  kind: ShopItemKind
  seasonId: SeasonId
  teamCode?: TeamCode           // chỉ 'team_theme'
  bundleTeamCodes?: TeamCode[]  // chỉ 'theme_bundle' (người chơi tự chọn 6, xem §4.3)
  priceXuBase: number           // GIÁ GỐC (chưa ×k) — xem §5
  durability: 'season' | 'permanent'   // broadcast/schedule = season; theme = permanent
}

// ─── Quyền sở hữu của người chơi (state server-authoritative) ───
type Ownership = {
  // Item hạn-Vụ Bia: map seasonId -> đã mua chưa (reset mỗi Vụ Bia)
  broadcastBySeason: Record<SeasonId, boolean>
  scheduleBySeason:  Record<SeasonId, boolean>
  // Theme: sở hữu VĨNH VIỄN, không gắn mùa (mua 1 lần dùng mọi mùa sau)
  ownedThemes: TeamCode[]
  activeThemeCode: TeamCode | null   // theme đang áp lên quán (0 hoặc 1)
}
```

**Vì sao `Ownership` tách 2 nhóm (🟢):** item hạn-Vụ Bia lưu *theo `seasonId`* để Vụ Bia mới phải mua lại (sink lặp); theme lưu *phẳng theo `TeamCode`* vì đã mua là giữ đời → Vụ Bia sau cùng đội đó không phải mua lại, chỉ active lại.

---

## 2. State machine — Item hạn-Vụ Bia (TV / lịch) 🟢

```
        (mua: trừ xu, Vụ Bia còn hạn)
NOT_OWNED ───────────────────────────────▶ ACTIVE
    ▲                                          │ (now > season.endsAt)
    │ (Vụ Bia mới: seasonId khác → coi như chưa mua)
    └──────────────────────────────────────  EXPIRED
```

| State | Điều kiện | Hệ quả |
|---|---|---|
| `NOT_OWNED` | `ownership[kind][seasonId]` falsy | TV: không có Giờ Vàng bóng đá. Lịch: không hiện lịch HUD, không buff spawn. |
| `ACTIVE` | đã mua & `now ≤ season.endsAt` | TV: bật Giờ Vàng "xem bóng" §14.1. Lịch: hiện lịch + cổ vũ spawn ×1.15 🟡. |
| `EXPIRED` | `now > season.endsAt` | Hiệu lực tắt; **không refund**. Vụ Bia mới (seasonId mới) → trạng thái về `NOT_OWNED`. |

> **Theme KHÔNG có EXPIRED** — owned vĩnh viễn. Chỉ có `OWNED` ⇄ `ACTIVE` (đang áp / không áp), xem §3.

---

## 3. State machine — Theme đội 🟢

```
NOT_OWNED ──(mua: trừ xu)──▶ OWNED ──(chọn áp)──▶ ACTIVE
                              ▲                      │
                              └──(gỡ / áp theme khác)┘
```

- **Sở hữu vĩnh viễn:** một khi `OWNED`, không bao giờ mất, không gắn Vụ Bia.
- **Tại một thời điểm áp tối đa 1 theme** (`activeThemeCode`). Chọn theme khác → theme cũ về `OWNED` (không mất).
- **Áp/gỡ theme là free & tức thì** (không tốn xu), chỉ đổi lớp render (§6).
- 🟡 Đề xuất: theme chỉ **áp được khi Vụ Bia có đội đó** *hoặc* cho áp **bất kỳ lúc nào** (kể cả ngoài Vụ Bia) để người chơi "khoe" — **chốt: cho áp mọi lúc** (đã mua thì xài tự do; cosmetic không ảnh hưởng balance).

---

## 4. Flow mua — server-authoritative 🟢

### 4.1 Sơ đồ chung
```
[Client] mở Shop → GET /shop/season       (server trả Season + catalog ShopItem[] + Ownership)
[Client] bấm Mua item X  → POST /shop/purchase { itemId, (bundleTeamCodes?) }
[Server] validate (§4.2) → trừ xu → ghi Ownership → trả {ok, newCoins, ownership}
[Client] render lại shop + (nếu theme) cho phép áp ngay
```

### 4.2 Server validate (BẮT BUỘC, 🟢)
1. **Item tồn tại** trong catalog của `season` hiện hành.
2. **Đủ xu:** `coins ≥ priceXuBase × k` (k server-side, KHÔNG nhận từ client).
3. **Chống mua trùng:**
   - TV/lịch: chưa sở hữu cho `seasonId` này.
   - Theme: `teamCode` chưa nằm trong `ownedThemes`.
4. **Vụ Bia còn hợp lệ** với item hạn-Vụ Bia: `now ≤ season.endsAt` (mua TV/lịch lúc gần hết Vụ Bia → cảnh báo client, vẫn cho mua nhưng tính theo thời gian còn lại — 🟡 hoặc chặn nếu < ngưỡng).
5. **Bundle (§4.3):** đủ đúng 6 mã hợp lệ, thuộc Vụ Bia, loại bỏ mã đã sở hữu trước khi tính giá (xem §5).
6. Trừ xu = **chỉ trừ `coins` (xu tiêu được)**, KHÔNG đụng `seasonEarned`/Đường Lên Trùm → không ảnh hưởng Giải Nhậu (đồng nhất quy tắc §15 xổ số).

> Mọi bước fail → trả lỗi mã hoá (`INSUFFICIENT_XU`, `ALREADY_OWNED`, `SEASON_ENDED`, `INVALID_BUNDLE`) để client hiện toast đúng.

### 4.3 Bundle "Cờ Vụ Bia" 🟡
- Người chơi **tự chọn 6 đội** từ danh sách Vụ Bia → tạo `theme_bundle`.
- **Giá = (Σ giá lẻ 6 đội) × 0.75** (giảm 25%). Server tính lại, không tin client.
- **Khử trùng:** nếu trong 6 đội có đội đã `OWNED` → loại khỏi bundle, chỉ tính phần chưa sở hữu (tránh bắt mua lại). Nếu sau khử < ngưỡng (vd còn ≤1) → gợi ý mua lẻ thay vì bundle.
- Mua xong: thêm cả 6 (phần chưa có) vào `ownedThemes`.

---

## 5. Pricing 🟡 (đồng bộ GDD §14.0 — đơn vị **base ×k**)

| Item | `priceXuBase` | ×k (k=2.5) | durability |
|---|--:|--:|---|
| `broadcast` (TV) | 50.000 | 125.000 | Vụ Bia |
| `schedule` (lịch) | 15.000 | 37.500 | Vụ Bia |
| `team_theme` (mỗi đội) | 8.000 | 20.000 | permanent |
| `theme_bundle` (6 đội) | Σlẻ × 0.75 ≈ 36.000 | ≈ 90.000 | permanent |

- **`k` là hằng số server-side** (hiện 2.5, sẽ neo lại sau prototype Phase 0). Giá hiển thị = `priceXuBase × k`, tự co theo k → **không sửa spec khi k đổi**.
- **Neo theo trần thu 500k xu/ngày:** TV ≈ ¼ ngày cày · lịch ≈ 7,5% · theme ≈ 4%. (Kiểm lại khi có số k thật.)
- 🟡 Balance khi đo: nếu theme bán quá chạy/quá ế → chỉnh `priceXuBase`; nếu lịch ×1.15 làm rush quá dễ → hạ hệ số (xem §7).

---

## 6. Áp theme lên render 🟢 (cosmetic layer, KHÔNG đụng logic)

- Theme = **lớp re-hue** áp lên 3 nhóm sprite cosmetic sẵn có (§17/§05-SPEC): **cờ trang trí · đèn lồng · biển hiệu**.
- Cơ chế 🔧: mỗi asset cosmetic nền vẽ ở dạng **grayscale/mask** → shader/tint áp `palette` của `SeasonTeam` lúc render (Pixi tint). → 1 bộ asset nền dùng cho **mọi đội** = 48 đội khả thi rẻ (đúng note art GDD §14).
- **Ranh giới cứng:** theme **chỉ** đổi màu/hoạ tiết trang trí. **Cấm** đụng: spawn, patience, tip, Giờ Vàng, giá, throughput. (Reviewer & test phải verify không có nhánh logic nào đọc `activeThemeCode`.)
- Render order: theme layer nằm **trên** sprite nền quán, **dưới** HUD/khách — không che tương tác.

---

## 7. Hệ số & móc nối gameplay (TV/lịch) 🟡

- **TV** → bật `footballRush` trong suất chiếu (§14.1): áp `spawn×/patience×/ngồi-lâu×` của event (số ở GDD §14/economy-spec, không lặp lại đây). UI gọi là **Giờ Vàng xem bóng**.
- **Lịch** → 2 hiệu ứng:
  1. **UI:** render lịch trận + đếm ngược suất chiếu kế trên HUD (giúp canh chuẩn bị NL).
  2. **Buff nhẹ:** `cheerGroupSpawn ×1.15` suốt Vụ Bia (🟡). Áp **cộng dồn nhân** với TV Giờ Vàng, nhưng **vẫn chịu cap event + trần ngày** → không phá Giải Nhậu.
- ⚠️ Cả hai **chỉ × throughput/demand trong event có cap** → đúng quy tắc "throughput không cộng vào k" (`04-SPEC` §5, GDD §3).

---

## 8. Danh sách đội động 🟢 (nguồn = §14.1)

- Client **không hardcode** đội. `Season.teams` đẩy từ server cùng pipeline lịch/tỉ số.
- Vụ Bia mới → server cập nhật `Season` (id mới + teams mới) → shop tự đổi theme khả dụng; theme cũ vẫn `OWNED` nhưng có thể không nằm trong Vụ Bia mới (vẫn áp được, §3).
- WC2026 = **48 đội**; 🔧 nếu art vẽ riêng (không re-hue) thì server chỉ phát subset có asset → client chỉ thấy đội bán được.

---

## 9. Edge cases & quy tắc 🟡
- **Mua TV/lịch sát giờ hết Vụ Bia:** client cảnh báo "Vụ Bia sắp hết, hiệu lực còn N ngày"; vẫn cho mua (hoặc chặn nếu < ngưỡng 🔧). Không refund khi hết Vụ Bia.
- **Đổi Vụ Bia giữa lúc đang chơi:** server đẩy `Season` mới qua websocket → client refresh shop; TV/lịch Vụ Bia cũ về `EXPIRED`.
- **Mua bundle chứa đội đã sở hữu:** khử trùng & tính lại giá (§4.3); nếu khử hết → lỗi `INVALID_BUNDLE`.
- **Áp theme của đội không còn trong Vụ Bia hiện tại:** vẫn cho (cosmetic, §3).
- **Hết xu giữa chừng:** lỗi `INSUFFICIENT_XU`, không trừ phần nào (giao dịch atomic server-side).
- **Anti-cheat:** client gửi `itemId` (+ `bundleTeamCodes`), **không** gửi giá/k/coins; server là nguồn duy nhất (GDD §18 + CAPTCHA chống bot).

---

## 10. Tối thiểu khi build (Phase 4) — thứ tự đề xuất
1. `Season` + catalog server-side (mock 1 mùa, vài đội) + `GET /shop/season`.
2. `Ownership` + `POST /shop/purchase` với validate §4.2 (atomic, trừ `coins`).
3. Theme re-hue layer (§6) + áp/gỡ tức thì; verify **không** rò vào logic.
4. TV/lịch hiệu lực Vụ Bia (§2/§7) + buff ×1.15 + UI lịch HUD.
5. Bundle (§4.3) sau cùng.
6. Nối nguồn đội/lịch thật (§8, §14.1) khi pipeline event sẵn sàng.

> Không phụ thuộc Phase 0. Nhưng **k phải đã neo** (sau Phase 0) để giá `×k` đúng.

---

## Changelog (append-only — thêm dòng mới, KHÔNG ghi đè)

| Ver | Thay đổi |
|---|---|
| v0.1 | Bản đầu: domain model item/ownership (TS); state machine item hạn-Vụ Bia (TV/lịch) + theme vĩnh viễn; flow mua server-authoritative + validate; bundle 6 đội −25% + khử trùng; pricing đồng bộ §14.0 (base ×k); theme re-hue layer (ranh giới cosmetic cứng); danh sách đội động (§14.1); edge cases + anti-cheat; thứ tự build Phase 4. |

*Nguồn: `02-GDD-trum-bia-hoi.md` §14/§14.0/§14.1/§16/§18, `04-SPEC-prototype-phase0.md` §5 (k bất biến), `05-SPEC-design-uiux.md` §5 (cosmetic assets).*
