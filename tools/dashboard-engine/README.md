# Dashboard Engine — Trùm Bia Hơi

> **Port từ project MyMoneyWent** (`tools/dashboard-engine/`), giữ nguyên pipeline. Render dashboard tiến độ dev từ `docs/implementation-tracker.md`.

## Chạy

```bash
python3 tools/dashboard-engine/build_dashboard.py --no-network
```

Sinh 3 view trong `docs/`: `dashboard.html` (UI đầy đủ, tab overview/PRs/features/risks/docs), `dashboard.md` (render trên GitHub), `dashboard.json` (machine-read).

- **Nguồn (source of truth):** `docs/implementation-tracker.md` — sửa tracker rồi rebuild, KHÔNG edit output trực tiếp.
- HTML self-contained (CSS inline; chỉ Chart.js từ CDN) + tự refresh mỗi 60s + JS poll commit SHA (kích hoạt khi đã có git repo).

## Khác bản gốc MyMoneyWent (đã adapt)

- Path: `ROADMAP` → `06-ROADMAP-trum-bia-hoi.md`; `TRACKED_DOCS` → GDD + 3 SPEC + roadmap; `PHASE_DATES` → Phase 0–4.
- Branding "MyMoneyWent" → "Trùm Bia Hơi"; repo slug `maingocanh1702/trum-bia-hoi`.
- **Shim Python 3.10:** `from datetime import UTC` (3.11+) đổi thành `timezone.utc` ở 3 file (`build_json.py`, `work_state/engine.py`, `work_state/signal_collectors/filesystem.py`). Nếu chạy 3.11+ thì shim vô hại.

## Trạng thái realtime (2 tầng)

- **Tầng 1 (đang chạy):** render từ tracker, status edit tay. Build local / mở HTML là thấy.
- **Tầng 2 (chờ hạ tầng):** git-reconcile (`detect_git_state` so tracker ↔ git thật), GitHub Actions auto-rebuild, Railway serve, browser SHA-poll. **Hiện no-op** vì Trùm Bia Hơi chưa có git repo / CI / deploy. Tự kích hoạt khi có repo + wire `.github/workflows/dashboard.yml` (xem bản gốc MyMoneyWent) — đây là việc Phase 1.
- **Engine `work_state/`** (artifact-derived state): copy kèm, chạy **shadow mode** (soft-fail khi thiếu git/CI/network) → không ảnh hưởng build.

## Gap đã biết

- **Features tab trống** (`0 features`): parser roadmap cần section `## 1./## 2./## 6./## 7.`; `06-ROADMAP` dùng heading khác → không trích được. Mọi feature vẫn hiện đủ ở **tab PRs** (từ tracker). Muốn lấp: hoặc thêm section đánh số vào roadmap, hoặc trỏ parser sang bảng Feature Module của `06`. Để Tier-2.
