# Bản guest trên Cloudflare — quyết định chủ dự án 2026-09-30, sửa 2026-10-14

Bản guest phát hành lên **hai host song song** từ cùng một lần build (`npm run build:guest` → `apps/web/dist`):
**https://trumbiahoi.com/** trên Cloudflare Workers static assets (gói Free) và **https://trumbiahoi.netlify.app/** trên Netlify
([Netlify guest](netlify-guest.md)). Netlify không bị thay thế (quyết định 2026-10-14). Gói Free của Netlify giờ tính theo credit:
300 credit/tháng, 15 credit mỗi lần deploy production, 20 credit/GB băng thông; hết credit thì cả site Netlify bị dừng,
còn `trumbiahoi.com` không bị ảnh hưởng. Bản build hiện tại nặng 55 MB (123 file), màn hình đầu đã tải khoảng 5,6 MB.

> **Ghi chú 2026-10-23 (quyết định founder 2026-10-23):** hiện chỉ `https://trumbiahoi.com/` nhận bản phát hành; `https://trumbiahoi.netlify.app/` giữ bản cũ v6 (JSON 2.0.4) và không được khôi phục `v-fb2`. Hệ quả cho thủ tục: mục "Phát hành lên hai host". Số đo: [deploy-log "Host check — 2026-10-23"](deploy-log.md#host-check--2026-10-23-no-deployment).

## Quyết định 2026-09-30

_Sửa 2026-10-14: không chuyển hẳn khỏi Netlify, hai host chạy song song. Xem mục kế tiếp._

- **Chuyển bản guest sang Cloudflare Workers static assets**, tên miền `trumbiahoi.com`. Không có Worker script:
  mọi request đều là file tĩnh trong `apps/web/dist`. Chế độ build giữ nguyên `VITE_TBH_GUEST_ONLY=1`.
- **Chấp nhận save bắt đầu lại.** Save của bản guest nằm trong IndexedDB và gắn với origin;
  `trumbiahoi.com` là origin mới nên người chơi bắt đầu lại từ đầu. Không làm công cụ chuyển save.
  Từ đây tên miền cố định, sau này đổi nhà host không làm mất save.
- **API (M4) không chạy trên Cloudflare Workers** (lý do và số đo ở mục cuối). Kế hoạch: Oracle Cloud VM + Cloudflare Tunnel.
- Engine, economy, config và gameplay không đổi.

## Quyết định 2026-10-14 (sửa quyết định 2026-09-30)

- **Phát hành song song, không chuyển hẳn.** Cùng một bản build lên cả Cloudflare (`https://trumbiahoi.com/`) và Netlify
  (`https://trumbiahoi.netlify.app/`). Netlify không bị bỏ và không gắn redirect sang `trumbiahoi.com`; `netlify.toml` ở lại.
  Mục "Chuyển hẳn khỏi Netlify" của bản trước không còn áp dụng.
- **Hai origin, hai save riêng, đã chấp nhận.** Save của bản guest nằm trong IndexedDB theo origin, nên tiến độ ở
  `trumbiahoi.netlify.app` và ở `trumbiahoi.com` không thấy nhau. Vẫn không làm công cụ chuyển save.
- Không đổi: Worker không có script, API (M4) không chạy trên Workers, engine/economy/config/gameplay.

## Trong repo

| File | Vai trò |
|---|---|
| `wrangler.jsonc` | Worker `trumbiahoi`: chỉ có assets từ `./apps/web/dist`, gắn custom domain `trumbiahoi.com`. `workers_dev: false` để production chỉ có một origin; `preview_urls: true` để mỗi version có URL xem trước cho smoke test. |
| `deploy/static/_headers`, `deploy/static/_redirects` | Đổi tên từ `deploy/netlify/` (nội dung không đổi). Netlify và Cloudflare đọc cùng định dạng; `npm run build:guest` chép hai file vào `apps/web/dist`. |
| `npm run cf -- <lệnh>` | Chạy `wrangler@4.144.0` cố định phiên bản qua `npx`; không thêm dependency vào lockfile. |
| `netlify.toml` | Giữ: Netlify vẫn là host song song (2026-10-14). Cùng lệnh `npm run build:guest` và thư mục `apps/web/dist` với Cloudflare, nên hai host nhận đúng một bộ file. Không xoá. |

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
   - **Ghi chú 2026-10-23 (quyết định founder 2026-10-23): Web Analytics đang bật và giữ bật** (câu "không bật tự chèn
     Web Analytics/RUM" ở trên không còn áp dụng). Cloudflare chèn một thẻ `<script>` beacon
     (`static.cloudflareinsights.com/beacon.min.js`) trước `</body>` của `index.html` khi request có `Accept: text/html`
     (trình duyệt luôn gửi); request không có header đó (mặc định của curl là `Accept: */*`) nhận đúng file đã upload.
     Vì vậy kiểm tra "trùng byte" của biên nhận (bước 6 của "Phát hành", bước 8 của "Phát hành lên hai host") **dùng request
     không có `Accept: text/html`, hoặc bỏ thẻ `<script>` beacon trước khi hash**. Hash lấy kèm beacon đổi theo thẻ được chèn
     (826 byte lúc 17:34Z ngày 22/10, 828 byte lúc đo 23/10), không dùng làm biên nhận. Số đo:
     [deploy-log "Host check — 2026-10-23"](deploy-log.md#host-check--2026-10-23-no-deployment).

Nếu không nối repo mà deploy bằng máy local: chạy `npm run cf -- login` (đăng nhập bằng trình duyệt), hoặc đặt
`CLOUDFLARE_API_TOKEN` và `CLOUDFLARE_ACCOUNT_ID` trong môi trường tiến trình. Không commit token, không đưa token vào bản build.

**Từ 2026-10-14**, phát hành hai host đi bằng CLI từ máy local với một `apps/web/dist` duy nhất (mục "Phát hành lên hai host"),
nên cần đường đăng nhập CLI ở trên. Build tự động khi nối repo (bước 2) chạy trên máy của Cloudflare và tạo một dist riêng:
version sinh ra từ push chỉ để xem thử, không promote làm bản phát hành, vì không chứng minh được trùng byte với bản Netlify.

## Phát hành (mỗi lần)

Đây là phần Cloudflare. Mỗi lần phát hành đi theo [Phát hành lên hai host](#phát-hành-lên-hai-host) ngay bên dưới.

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

## Phát hành lên hai host

Mỗi lần phát hành (quyết định 2026-10-14): **một lần `npm run build:guest`, một thư mục `apps/web/dist`, đưa lên cả hai host.**
Build lại giữa chừng là hai host có thể phục vụ hai bản khác nhau, nên không làm.

> **Ghi chú 2026-10-23 — quyết định founder 2026-10-23 "Netlify giữ bản cũ (v6), không khôi phục `v-fb2`".** Đo 23/10:
> Netlify phục vụ v6 (deploy `6aad0f63f2091edfe7f7cf7b`, publish lại lúc 2026-10-22T14:56:24Z, trước đó chưa ghi ở đâu),
> Cloudflare phục vụ `v-fb2` ([deploy-log "Host check — 2026-10-23"](deploy-log.md#host-check--2026-10-23-no-deployment)).
> Mặc định suy ra từ quyết định đó (founder sửa nếu khác ý): **bản phát hành chỉ lên `https://trumbiahoi.com`** — làm phần
> Cloudflare của các bước dưới (1, 1b, 2, 3 Cloudflare, 4–8 cho Cloudflare), bỏ phần Netlify; Netlify đứng yên ở v6 cho tới khi
> founder nói khác. Luật "hai host luôn phục vụ cùng một bản build" (quyết định 2026-10-14) **tạm ngưng** từ 2026-10-22 14:56Z.
> Thủ tục hai host giữ nguyên để dùng lại khi founder cho Netlify nhận bản mới.

1. **Verify source một lần:** `npm run verify:all`, `npm run check:assets`. Ghi source commit (`git rev-parse HEAD`).
   1b. **Bảng cân bằng trên đúng source commit đó:** `npm run sim:balance` (~70 s) phải exit 0 với hàng `shift1.plan` ("shift 1 earns table 2 …") ĐẠT.
   Ghi kết quả hàng đó và commit đã chạy (bước 8). Không đạt thì ngoại lệ "hai dòng soft" của bước 4 và 7 không áp dụng: smoke đọc theo luật dừng như viết.
2. **Build một lần:** `npm run build:guest`. Ghi SHA-256 của `apps/web/dist/index.html` và SHA-256 manifest file; một cặp số
   này là biên nhận chung của cả hai host.
3. **Stage cả hai, chưa host nào lên production.** Upload đúng thư mục đó bằng CLI từ máy local:
   - Cloudflare: `npm run cf -- versions upload --message "<source sha>"`. Ghi version ID mới, version ID đang chạy (để rollback) và preview URL.
   - Netlify: `netlify deploy --no-build --filter @tbh/web --dir=apps/web/dist` (không có `--prod` nên chỉ là draft; xem
     [Netlify guest](netlify-guest.md)). Ghi draft deploy ID, deploy ID đang chạy (để rollback) và draft URL.
4. **Smoke cả hai bản stage**, đủ ba viewport, `--workers=1`:
   `TBH_GUEST_URL=<preview-url hoặc draft-url> TBH_GUEST_COMMIT=<source sha> npx playwright test --config playwright.guest.config.ts --workers=1`.
   Một bên đỏ thì không promote bên nào; sửa rồi quay lại bước 1, hai bản stage cũ bỏ.
   **Ngoại lệ duy nhất (chủ dự án, 2026-10-22):** lượt smoke đỏ CHỈ ở hai dòng soft "mua bàn 2" của `apps/web/guest-test/guest.spec.ts`
   (`P0: table 2 (1.070 xu) must be affordable …` và `table 2 is bought`), mọi assertion khác xanh ở cả ba viewport, và bước 1b ĐẠT
   (`npm run sim:balance` exit 0, hàng `shift1.plan` ĐẠT trên đúng source commit đang phát hành): không phải dừng, đưa sang bước 5 —
   ghi rõ viewport nào đỏ ở hai dòng đó; promote vẫn chỉ theo lời chủ dự án. Đỏ ở bất kỳ dòng nào khác, ở viewport nào, vẫn dừng như trên.
   Bước 1b không đạt thì không có ngoại lệ.
5. **Dừng và báo chủ dự án** hai biên nhận stage (ID, URL, hash, kết quả smoke). **Chỉ promote khi chủ dự án nói.** Smoke xanh không phải là lệnh promote.
6. **Promote cả hai** đúng bản đã test, theo lời chủ dự án: Cloudflare `npm run cf -- versions deploy <version-id>@100% --yes` (hoặc dashboard);
   Netlify promote đúng draft đã test (restore deploy, không build lại). Nếu chỉ một host lên được: ghi trạng thái lệch vào deploy-log và thử lại
   host còn lại; chỉ rollback host đã lên khi chủ dự án nói.
7. **Smoke công khai cả hai:** như bước 4 với `TBH_GUEST_URL=https://trumbiahoi.com`, rồi với `TBH_GUEST_URL=https://trumbiahoi.netlify.app`.
   Đọc như bước 4, cùng luật dừng và cùng ngoại lệ: đỏ CHỈ ở hai dòng soft "mua bàn 2", mọi assertion khác xanh ở cả ba viewport và bước 1b ĐẠT
   thì ghi vào biên nhận (viewport nào); đỏ ở dòng nào khác, ở viewport nào, là dừng — báo chủ dự án, sửa rồi quay lại bước 1.
8. **Một mục [deploy-log](deploy-log.md) mang cả hai biên nhận:** source commit; index SHA-256 và manifest SHA-256 của dist (một cặp cho cả hai host);
   Netlify: deploy ID mới và cũ, SHA-256 index đang phục vụ (Netlify chèn thẻ nên chỉ ghi lại, không đòi bằng file upload);
   Cloudflare: version ID mới và cũ, SHA-256 index đang phục vụ (phải bằng file upload); kết quả smoke từng host;
   **viewport đỏ ở hai dòng soft** (từng host, bước 4 và bước 7; "không có" nếu xanh trọn); **kết quả `shift1.plan` và commit** của bước 1b.

## Rollback

Dashboard *Deployments* → version trước → *Rollback*, hoặc `npm run cf -- rollback <version-id>` (có hỏi xác nhận).
Rollback chỉ đổi file được phục vụ, không đụng tới save trong trình duyệt. Quay về được một trong 100 version gần nhất.

## Chuyển hẳn khỏi Netlify — không làm (2026-10-14)

Kế hoạch cũ của mục này (redirect, xoá `netlify.toml`) đã bị chủ dự án bỏ ngày 2026-10-14; Netlify ở lại song song.

- Site Netlify tiếp tục được phát hành cùng bản build với Cloudflare, theo mục "Phát hành lên hai host". `netlify.toml` giữ nguyên.
- **Không** deploy lên Netlify một site chỉ chứa `_redirects` với `/* https://trumbiahoi.com/:splat 301!`, và không xoá `netlify.toml`.
- Người chơi ở mỗi origin giữ save riêng của origin đó (đã chấp nhận); không chuyển save giữa hai origin.
- Nếu sau này muốn chuyển hẳn khỏi Netlify (redirect, xoá `netlify.toml`), đó là một quyết định mới của chủ dự án, ghi thành mục riêng.
- **Ghi chú 2026-10-23:** quyết định founder 2026-10-23 không phải "chuyển hẳn": Netlify ở lại, không redirect, `netlify.toml` giữ,
  nhưng site giữ bản v6 và không nhận bản phát hành mới cho tới khi founder nói khác (mục "Phát hành lên hai host").

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
- **Trang admin** (`/admin`, `apps/web/src/Admin.tsx` + `/admin/*` trên server) lên cùng lúc với API, không lên sớm hơn:
  - Bản guest cố ý tắt admin: không có trong bundle, `/admin` bị redirect 302 về trang chủ. Game guest dùng config đóng gói sẵn,
    nên thay đổi config từ admin chỉ có tác dụng với người chơi trên server.
  - Phải cùng origin `trumbiahoi.com`: server chỉ nhận đúng một `TBH_ORIGIN` và cookie `__Host-tbh-admin` là `SameSite=Strict`.
  - Khi chuyển sang bản build thường, `_redirects` đổi `/admin` thành rewrite `/admin / 200`. Đã thử bằng `wrangler dev`
    2026-09-30: trả `index.html` với mã 200, đường dẫn vẫn là `/admin` nên `main.tsx` mở trang admin; `/admin/` cần thêm một rule riêng.
  - Cần `TBH_ADMIN_ACCOUNTS_FILE` trên VM (quyền 0600, ngoài repo; Google `sub`, vai trò, khoá TOTP) theo
    [admin-auth](admin-auth.md), cùng Google Client ID.
  - Nên đặt thêm Cloudflare Access trước `/admin` và `/api/admin/*` làm lớp bảo vệ thứ hai; lớp này không thay Google + TOTP của server.

| Date | Change |
|---|---|
| 2026-09-30 | Owner moves the guest edition to Cloudflare Workers static assets on `trumbiahoi.com` and accepts the origin save reset. Added `wrangler.jsonc`, `npm run cf`, host-neutral `deploy/static/`; local workerd checks and guest smoke 3/3 PASS. No deployment performed. API stays off Workers (measured) and is planned for Oracle VM + Cloudflare Tunnel. |
| 2026-09-30 | Recorded the admin page plan: ships with the M4 API on the same origin, `/admin / 200` rewrite verified on the local Cloudflare runtime, Cloudflare Access recommended as an extra layer. |
| 2026-10-14 | Owner decision: the guest edition is published on both hosts in parallel from one build — Netlify (`trumbiahoi.netlify.app`, `netlify.toml` stays) and Cloudflare (`trumbiahoi.com`). Netlify is not retired and gets no redirect; the two origins keep separate browser saves (accepted). Rewrote the opening paragraph and the `netlify.toml` row, replaced the "Chuyển hẳn khỏi Netlify" plan, added the "Phát hành lên hai host" procedure. No deployment performed, no host setting changed. |
| 2026-10-22 | Stage 07 review round 1 (D2) — how to read the release smoke of the "Vui 3 ca" build (Waves 2–3, JSON 2.1.0): `apps/web/guest-test/guest.spec.ts` carries two SOFT assertions on the table-2 step of owner decision 1 (`P0: table 2 (1.070 xu) must be affordable …` and `table 2 is bought`); about one random game in five misses that purchase, so the spec can exit 1 at exactly those two lines while the rest of the journey is green (stage 07: Windows 3 of 6 three-viewport runs had such a red viewport, 4 of 18 viewport-runs; Linux 1 of 1 run, 2 of 3 viewports). The stop rule of step 4 and step 7 is unchanged: a red line OTHER than those two stops the release. Whether a run red ONLY at those two lines (or a re-run) may be promoted is an OWNER CALL ("đọc smoke guest của bản này", merge packet of `feat/economy-2-1` → `main`); until the owner decides, the rule as written applies. No procedure step changed, nothing deployed. |
| 2026-10-22 | Owner call 4 answered (the founder, 2026-10-22; option B with a guardrail) — how to read the release smoke: the stop rule of step 4 keeps its words and gains ONE exception: a smoke red ONLY at the two soft "mua bàn 2" lines of `apps/web/guest-test/guest.spec.ts` (`P0: table 2 (1.070 xu) must be affordable …` and `table 2 is bought`), every other assertion green at all three viewports, may go on to step 5, provided the new step 1b holds on the exact source commit being released (`npm run sim:balance` exit 0 with the row `shift1.plan` PASS); otherwise the old stop rule applies. Red at any other line, at any viewport, still stops (fix, then back to step 1). Promotion still needs the owner's word at step 5. Step 7 reads the public smoke the same way; step 8's deploy-log entry gains two fields ("viewports red at the two soft lines", "`shift1.plan` result and commit"); `docs/deploy-log.md` lists the entry fields. The two `expect.soft` lines stay soft; no code change, nothing deployed. Supersedes the "OWNER CALL" sentence of the row above. |
| 2026-10-23 | Docs sync after PR #32, no deployment, no setting changed — two founder decisions of 2026-10-23 recorded as dated notes (the old text stays): (1) Netlify keeps v6 and is not restored to `v-fb2` → defaults, for the founder to correct: releases go to `https://trumbiahoi.com` only (the Cloudflare half of "Phát hành lên hai host"), the "two hosts always serve the same build" rule is suspended from 2026-10-22 14:56Z, the procedure stays for later use, and this is not the "Chuyển hẳn khỏi Netlify" move (no redirect, `netlify.toml` stays); (2) Cloudflare Web Analytics stays on → setup step 5's "do not enable Web Analytics/RUM" no longer applies, and the byte-identical receipt check uses a request without `Accept: text/html` or removes the beacon `<script>` before hashing. Measurements: `docs/deploy-log.md` "Host check — 2026-10-23". |
