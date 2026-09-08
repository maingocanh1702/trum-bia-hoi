# docs/reference — ảnh tham khảo layout (chủ dự án gửi 08/09/2026)

> **Tham khảo, không phải hợp đồng.** Dev tự quyết layout; đây là *hướng ưu tiên* của chủ dự án (game gốc trumviahe.com). Cái gì vẫn bắt buộc dù layout nào: `00-HANDOFF` §6 "UI invariants". Khác biệt cần giữ cho Trùm Bia Hơi: Order/bong bóng theo **bàn** (1 mâm, 03-SPEC §9.5), không theo từng khách; 6 món thay 5 nguyên liệu; thiết bị bia hơi (bom/bồn/hầm/quầy/bếp).

| Ảnh | Màn | Nhìn gì | Doc liên quan |
|---|---|---|---|
| `trumviahe-hud-layout-2026-09-08.png` | HUD ca (desktop) | Sân quán không gian: pill top (xu · thể lực+ca · Tỉnh Táo · next rush) + chip thời tiết; quầy + chủ quán tâm trên, thiết bị vây quanh **kèm badge số** (18/18 nguyên liệu, 11/12 cốc); chó/quà/QR/điện thoại là object trên sân; bàn ghế rải trên nền hex, khách ngồi thật, bong bóng + thanh kiên nhẫn tại chỗ; rail phải (avatar · 5 pill kho · chuông · loa · nhiệm vụ · trợ lý); đáy: sổ · thùng hàng · ⭐ · Bàn Thờ (chấm đỏ) + 4 nút SHIFT/RESTOCK/UPGRADE/RANK; 2 panel tranh hai bên khi màn rộng | 09-SPEC §3, 03-SPEC §9.5 |
| `trumviahe-sheet-upgrade-equipment.png` | Sheet Nâng cấp · tab Thiết bị | Bottom sheet không pause, nền sân vẫn thấy; lưới card 3 cột: sprite · tên · badge cấp/đếm (2/9, 12, Lv.4) · nút giá (đỏ) hoặc MAX (xám) | F10, 09 §4.4 |
| `trumviahe-sheet-upgrade-business.png` | Sheet Nâng cấp · tab Kinh doanh | Mở khoá một lần (Owned / ✓Activated), Tờ rơi mua bằng ⭐ uy tín, đổi style biển, chó (Lv + MAX), **mặt bằng** dạng hàng ngang có trạng thái "Expired · Renew" | F10, F14, F18, 08 §10–§12 |
| `trumviahe-sheet-restock.png` | Sheet Nhập hàng | Balance trên cùng; mỗi nguyên liệu 1 hàng: icon · tên · `stock/cap` + thanh; 2 nút **+10** (giá) và **Full** (giá phần còn thiếu); nút mờ khi không đủ chỗ | F11, 08 §2, 09 §4.3 |
| `trumviahe-sheet-shift-summary.png` | Sheet Ca (giữa ca) | Thống kê ca đang chạy: thời gian · đến · phục vụ (%) · bỏ đi (%) · boa (%) · gross (tip %) · net · uy tín; **Upcoming rush** 2 mốc kế; nút "End shift early" | GDD §10, F08, 09 §4.2/§4.5 |
| `trumviahe-modal-shrine-leaderboard.png` | Bàn Thờ Ông Địa (bảng vàng Vụ trước) | Modal prestige: tab Vụ cũ / Huy chương / Vụ hiện tại; **podium top 3**; **Wall of Legacy** hạng 4–10 khắc tên; nút rời | **F28**, F12, 09 §5 |
| `trumviahe-dialog-flyer-campaign.png` | Dialog Tờ rơi | Dialog nhỏ giữa màn: mô tả hiệu ứng (hút khách 90 s), số tờ còn, trạng thái thiếu → trỏ sang Nâng cấp; Launch/Close | 08 §11, F10 |
| `trumviahe-popover-upgrade-inplace.png` | **Nâng cấp tại chỗ** (chạm thiết bị trên sân) | Popover neo cạnh thiết bị: tên + cấp hiện tại; **2 ô sprite cấp hiện → cấp kế** với stat đếm được dưới mỗi ô (3 slots/Wash 3s → 5 slots/Wash 2s); nút Upgrade + giá; X. Không rời sân, không pause | F10 §6, checklist A3–A7 (sprite từng cấp phải đếm được), 08 §8 |

Quy ước: thêm ảnh mới = thêm 1 dòng ở đây; tên file `trumviahe-<loại>-<màn>.png`; ảnh của Trùm Bia Hơi (khi có) đặt tiền tố `tbh-`.
