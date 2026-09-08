# docs/content — content bank (tier C, admin nhập) — ⏸ **PENDING, chưa chốt**

> **Trạng thái 08/09 (chủ dự án):** content bank **chưa chốt**. 3 file dưới đây là **đề xuất schema + 5 ví dụ** để khi chốt là có sẵn khuôn; **chưa** dùng làm ràng buộc, chưa phải nội dung duyệt. Riêng `inspection-questions.json` còn phụ thuộc **tính năng kiểm tra (policy check) cũng đang pending** — F15 §4, ship với `risk.inspection.enabled = false`.
>
> Nguyên tắc khi chốt: chỉ chốt **schema + ví dụ tối thiểu**; nội dung đầy đủ sinh sau theo schema. Bản chạy thật nằm ở Config Registry admin (BRD §5.2, tier C, `immediate`). Không hardcode nội dung vào code.

| File | Trạng thái | Dùng ở | Schema tóm tắt | Tối thiểu khi live |
|---|---|---|---|---|
| `inspection-questions.json` | ⏸ pending (cả tính năng lẫn nội dung) | F15 §4 kiểm tra ATTP/trật tự/cồn (08 §17) | `id · topic · difficulty · text{vi,en} · options[] · correct (server-only) · explain` | ≥ 20 câu/topic |
| `quest-pool.json` | ⏸ pending | F17 nhiệm vụ | `id · type · bucket · event · filter · targetBase · reward{coinsBase,repBase,items} · copyKey · weight` | ≥ 12 daily + 6 shift + 3 social |
| `customer-lines.json` | ⏸ pending | Bong bóng/lời thoại khách (đi cùng emotion face, asset-list §5) | `id · customerType · situation · vi · en · weight` | ≥ 3 dòng/situation |

Quy ước (khi chốt): hậu tố `Base` → ×k (08 §0); copy hiển thị **luôn qua i18n key** (vi bắt buộc, en fallback + log); `enabled=false` để rút mà không xoá; đổi schema = sửa `_schema` + thêm dòng changelog. Câu hỏi kiểm tra: `correct` không bao giờ rời server (F15 §3).

| Ver | Thay đổi |
|---|---|
| v1.0 | 2026-09-08 — tạo 3 file theo audit HANDOFF §2.4 (schema + 5 ví dụ). |
| v1.0-pending | 2026-09-08 — chủ dự án: **content bank pending**, tính năng kiểm tra (policy check) pending luôn; đánh dấu trạng thái, chưa dùng làm ràng buộc. |
