# Bản guest trên Cloudflare — quyết định chủ dự án 2026-09-30

Đích: **https://trumbiahoi.com/** trên Cloudflare Workers static assets, gói Free. Thay cho
`trumbiahoi.netlify.app` ([Netlify guest](netlify-guest.md)). Gói Free của Netlify giờ tính theo credit: 300 credit/tháng,
15 credit mỗi lần deploy production, 20 credit/GB băng thông; hết credit thì cả site bị dừng. Bản build hiện tại
nặng 55 MB (123 file), màn hình đầu đã tải khoảng 5,6 MB.

## Quyết định 2026-09-30

- **Chuyển bản guest sang Cloudflare Workers static assets**, tên miền `trumbiahoi.com`. Không có Worker script:
  mọi request đều là file tĩnh trong `apps/web/dist`. Chế độ build giữ nguyên `VITE_TBH_GUEST_ONLY=1`.
- **Chấp nhận save bắt đầu lại.** Save của bản guest nằm trong IndexedDB và gắn với origin;
  `trumbiahoi.com` là origin mới nên người chơi bắt đầu lại từ đầu. Không làm công cụ chuyển save.
  Từ đây tên miền cố định, sau này đổi nhà host không làm mất save.
- **API (M4) không chạy trên Cloudflare Workers** (lý do và số đo ở mục cuối). Kế hoạch: Oracle Cloud VM + Cloudflare Tunnel.
- Engine, economy, config và gameplay không đổi.

## Trong repo

| File | Vai trò |
|---|---|
| `wrangler.jsonc` | Worker `trumbiahoi`: chỉ có assets từ `./apps/web/dist`, gắn custom domain `trumbiahoi.com`. `workers_dev: false` để production chỉ có một origin; `preview_urls: true` để mỗi version có URL xem trước cho smoke test. |
| `deploy/static/_headers`, `deploy/static/_redirects` | Đổi tên từ `deploy/netlify/` (nội dung không đổi). Netlify và Cloudflare đọc cùng định dạng; `npm run build:guest` chép hai file vào `apps/web/dist`. |
| `npm run cf -- <lệnh>` | Chạy `wrangler@4.144.0` cố định phiên bản qua `npx`; không thêm dependency vào lockfile. |
| `netlify.toml` | Giữ đến khi chuyển hẳn sang Cloudflare, rồi xoá trong một thay đổi riêng. |

## Thiết lập một lần (chủ dự án làm trên dashboard)

1. **Đưa tên miền vào Cloudflare:** *Add a domain* → `trumbiahoi.com` → gói Free → đổi nameserver ở nơi mua tên miền
   → chờ trạng thái **Active**. Custom domain của Worker chỉ gắn được khi zone đã nằm trong cùng tài khoản.
2. **Nối repo** (khuyên dùng, không phải giữ API token): *Workers & Pages → Create → Import a repository* →
   `maingocanh1702/trum-bia-hoi`:
   - Project name: `trumbiahoi` (phải trùng `name` trong `wrangler.jsonc`)
   - Build command: `npm run build:guest`
   - Deploy command, **lần đầu**: `npx wrangler@4.144.0 deploy` — tạo Worker và gắn `trumbiahoi.com`.
     Tên miền chưa có người chơi nên được lên thẳng.
   - Build variables: `NODE_VERSION` = `22.22.1` (giống `netlify.toml`)
   - Production branch: `main`
3. **Sau lần deploy đầu thành công**, vào *Settings → Build*, đổi **Deploy command** và **Non-production branch deploy
   command** thành `npx wrangler@4.144.0 versions upload`. Từ đó mỗi lần push chỉ tạo *version* kèm URL xem trước,
   không tự lên production; bản đã test được promote bằng tay (xem Phát hành). Quy trình này giống draft → promote bên Netlify.
4. **(Tuỳ chọn) `www` → tên miền gốc:** *Rules → Redirect Rules → template "Redirect from WWW to root"*,
   làm theo hướng dẫn DNS của template. Không gắn `www` làm custom domain thứ hai: đó sẽ là một origin khác với save riêng.
5. **Giữ HTML không bị chỉnh:** không bật Rocket Loader, không bật tự chèn Web Analytics/RUM cho hostname này.
   Nhờ vậy file được phục vụ giống hệt file đã upload và hash trong biên nhận so khớp được (Netlify thì có chèn thẻ).

Nếu không nối repo mà deploy bằng máy local: chạy `npm run cf -- login` (đăng nhập bằng trình duyệt), hoặc đặt
`CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` trong môi trường tiến trình. Không commit token, không đưa token vào bản build.

## Phát hành (mỗi lần)

1. Verify source như với Netlify: `npm run verify:all`, `npm run check:assets`.
2. Tạo version, **chưa lên production**:
   - Nối repo: push lên `main` → *Deployments* hiện version ID và preview URL.
   - Hoặc CLI: `npm run build:guest && npm run cf -- versions upload --message "<source sha>"`.
3. Smoke trên preview URL (`https://<version-prefix>-trumbiahoi.<account>.workers.dev`):
   `TBH_GUEST_URL=<preview-url> TBH_GUEST_COMMIT=<source sha> npx playwright test --config playwright.guest.config.ts --workers=1`.
4. Promote đúng version đã test: dashboard *Deployments* → version đó → *Deploy* 100%, hoặc
   `npm run cf -- versions deploy <version-id>@100% --yes`.
5. Smoke công khai: như bước 3 với `TBH_GUEST_URL=https://trumbiahoi.com`.
6. Ghi biên nhận vào [deploy-log](deploy-log.md): source commit, version ID mới và cũ (để rollback),
   SHA-256 của `index.html` đã upload, SHA-256 manifest file, SHA-256 `index.html` đang phục vụ (phải bằng file upload), kết quả smoke.

## Rollback

Dashboard *Deployments* → version trước → *Rollback*, hoặc `npm run cf -- rollback <version-id>` (có hỏi xác nhận).
Rollback chỉ đổi file được phục vụ, không đụng tới save trong trình duyệt. Quay về được một trong 100 version gần nhất.

## Chuyển hẳn khỏi Netlify

- Site Netlify giữ nguyên đến khi bản đầu tiên trên Cloudflare qua smoke công khai.
- Sau đó, **chỉ khi chủ dự án đồng ý**: deploy lên Netlify một site chỉ chứa `_redirects` với
  `/* https://trumbiahoi.com/:splat 301!` (tốn một lần deploy, 15 credit), hoặc để site cũ đứng yên.
  Người chơi trên Netlify sẽ bắt đầu lại ở `trumbiahoi.com` (đã chấp nhận ngày 2026-09-30).
- Xoá `netlify.toml` trong một thay đổi riêng.

## Kiểm tra cục bộ 2026-09-30 (chưa deploy)

`npm run build:guest` tại source `a775fc0`, phục vụ bằng `wrangler dev` 4.144.0 (runtime workerd và asset-worker giống production):

| Kiểm tra | Kết quả |
|---|---|
| `/` | 200, `Cache-Control: public, max-age=0, must-revalidate`, `nosniff`, `strict-origin-when-cross-origin`, `DENY` |
| `/assets/index-*.js` | 200, `Cache-Control: public, max-age=31536000, immutable` (một header, rule của `_headers` thắng mặc định) |
| `/index.html` | 307 → `/` (`html_handling: auto-trailing-slash`) |
| `/admin`, `/admin/x` | 302 → `/` |
| `/_headers`, `/_redirects`, đường dẫn lạ | 404; file cấu hình không bị phục vụ ra ngoài |
| `index.html` đang phục vụ | SHA-256 trùng file build (`d9a44ff3…c3d6fd`); không bị chèn gì |
| `apps/web/guest-test/guest.spec.ts` với `TBH_GUEST_URL=http://127.0.0.1:8788` | **3/3 PASS** (390×844, 360×740, 1280×720; 2,7 phút; `--workers=1`) |
| `npm run cf -- deploy --dry-run` | Config hợp lệ, đọc toàn bộ thư mục assets, không có binding |

Chromium trong môi trường kiểm tra là bản cài sẵn, được trỏ tới qua một config tạm (không commit).
Log: `artifacts/verification/claude-happy-turing-66ttlh/cf-local-wrangler-dev.txt` (bị ignore, không publish).
Chưa có deploy thật nào, chưa chạm tới cài đặt Cloudflare hay Netlify.

## API (M4): vì sao không chạy trên Workers, và kế hoạch

Đo ngày 2026-09-30 trên `GameStore` thật (Node 22, SQLite): một người chơi guest, sau `startShift` thì không thao tác,
gửi 780 heartbeat cách nhau 1 giây (một ca 12 phút cộng phần đóng quán). Heartbeat 1 giây vì
`network.reconnectingUiDelayMs = 2000` và chu kỳ heartbeat bằng một nửa giá trị đó (`registry.ts` `heartbeatTiming`).

| Số đo | Giá trị |
|---|---|
| CPU mỗi heartbeat | p50 10,5 ms · p90 20 ms · p99 33 ms; 430/780 vượt 10 ms |
| `startShift` | khoảng 98 ms CPU |
| Nạp lại từ checkpoint (cache trống) | khoảng 20 ms CPU |
| Dòng SQLite ghi | khoảng 3,7 dòng/heartbeat, khoảng 2.900 dòng/ca |

- **Workers Free:** CPU tối đa 10 ms/request, nên hơn nửa số heartbeat sẽ lỗi. Durable Objects Free cho 100.000 dòng ghi/ngày,
  chỉ đủ khoảng 34 ca/ngày.
- **Workers Paid:** đủ tài nguyên, nhưng phải viết lại `store.ts`, `registry.ts`, `http.ts` sang Durable Objects;
  ba job worker (nhập save, đo k, chốt mùa, heap tới 1 GiB) không vừa giới hạn 128 MB; ổ đĩa của Containers là tạm thời.
- **Kế hoạch:** Oracle Cloud VM (Ubuntu 24.04 ARM, A1 2 OCPU/12 GB) chạy `apps/server` cùng `cloudflared`.
  `/api/*` trên `trumbiahoi.com` đi qua Tunnel và **không đi qua Worker**, vì mỗi ca khoảng 780 request còn Workers Free
  chỉ cho 100.000 request/ngày. Custom domain của Worker nhận mọi đường dẫn, nên khi API lên sẽ đổi sang Worker routes
  (hoặc cách tương đương); việc này chốt ở M4.
- **Việc phải làm trước khi mở API:**
  - Giới hạn request theo IP ở `http.ts` đang dùng `req.socket.remoteAddress`. Qua Tunnel, mọi người chơi đều là loopback,
    nên phải đọc `CF-Connecting-IP` khi request tới từ loopback.
  - Bỏ tiền tố `/api` trước khi request tới server.
  - Đặt `TBH_ORIGIN=https://trumbiahoi.com`.
  - Tạo Google Client ID với origin `https://trumbiahoi.com`.
  - Backup SQLite lên R2.
  - Hoàn tất các tiêu chí M4 còn mở.

| Date | Change |
|---|---|
| 2026-09-30 | Owner moves the guest edition to Cloudflare Workers static assets on `trumbiahoi.com` and accepts the origin save reset. Added `wrangler.jsonc`, `npm run cf`, host-neutral `deploy/static/`; local workerd checks and guest smoke 3/3 PASS. No deployment performed. API stays off Workers (measured) and is planned for Oracle VM + Cloudflare Tunnel. |
