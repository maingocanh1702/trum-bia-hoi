# Chuẩn bị đăng nhập Google — Trùm Bia Hơi

Ngày09/09/2026, chủ dự án xác nhận **chưa có OAuth Web Client ID**. Bản chơi5174
vẫn lưu local. Server đã có Google HTTP/session theo cấu hình tùy chọn; web chưa
nối đăng nhập, claim save local hay cloud. Chưa có Client ID thật hoặc xác nhận đã
đăng nhập Google ngoài môi trường kiểm thử.

## Tạo Client ID khi sẵn sàng

1. Mở [Google Cloud Clients](https://console.developers.google.com/auth/clients), chọn hoặc tạo project cho game.
2. Trong Google Auth Platform → Branding, điền tên **Trùm Bia Hơi**, email hỗ trợ và các thông tin Google yêu cầu.
3. Chọn **Create client → Web application**.
4. Thêm Authorized JavaScript origins: `http://localhost` và `http://localhost:5174` cho thử nghiệm. Khi có tên miền thật, thêm origin HTTPS chính xác.
5. Chọn luồng nút đăng nhập với JavaScript callback; luồng này không cần redirect URI. Chỉ cần scope đăng nhập mặc định: `openid`, `email`, `profile`.
6. Lưu rồi gửi **Client ID** có đuôi `.apps.googleusercontent.com`. Không gửi Client Secret.

Tham khảo [hướng dẫn thiết lập chính thức của Google](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid).

## Cấu hình của game

| Thành phần | Giá trị / trạng thái |
|---|---|
| Web client ID | Chưa có; server đọc `TBH_GOOGLE_CLIENT_ID` khi được cung cấp |
| Origin thử Google | `http://localhost:5174`, bằng profile thử riêng |
| API khi thử trên localhost | `TBH_ORIGIN=http://localhost:5174`; gọi API qua `http://localhost:5175` để giữ cùng site |
| Bản đang chơi | `http://127.0.0.1:5174` giữ nguyên; localStorage của localhost là origin khác |
| Tên miền production | Chưa cấu hình; không tự đăng ký hay publish |

Launcher đọc `TBH_GOOGLE_CLIENT_ID` từ môi trường tiến trình, cùng các biến trong
[server README](../apps/server/README.md); không tự đọc file `.env`. Không có ID thì
Google API trả `googleUnavailable`; ID sai định dạng khiến server từ chối khởi động.
GIS ở web sẽ dùng cùng Client ID server trả trong challenge; không cần Client Secret.
Giao diện GIS và nhập save local vẫn chưa nối, nên chỉ đặt biến chưa hoàn thành login.

## Phần triển khai còn lại

Server phải kiểm tra chữ ký, audience, issuer và expiry của ID token, dùng `sub`
làm định danh Google; email không phải khóa tài khoản. Dùng thư viện xác minh chính
thức, không tự tin vào payload JWT đã decode. Xem [hướng dẫn xác minh ID token](https://developers.google.com/identity/gsi/web/guides/verify-google-id-token).

Đăng nhập/claim phải giữ ca đang chạy và tiến trình, không cộng lại lượt phục vụ;
xung đột save theo [F25](features/F25-localization-account.md). Chưa bật nút Google
thật trước khi có xác minh token, liên kết một lần, kiểm thử và Client ID thực.
Việc thiếu Client ID không cản các phần server, config registry và reconnect khác.

| Ngày | Thay đổi |
|---|---|
| 2026-09-09 | Ghi nhận chủ dự án chưa có Client ID; chuẩn bị hướng dẫn và origin thử nghiệm, giữ Google/cloud integration ở trạng thái chưa hoàn tất. |


## Tiến độ xác minh token — 10/09/2026

Đã có module `apps/server/src/google.ts` dùng `google-auth-library` 11.0.2.
`googleVerifier(clientId)` trả về hàm xác minh `(credential, expectedNonce)`;
thiếu Client ID trả về chưa khả dụng. Hàm chỉ trả `subject` sau xác minh, không tạo
phiên đăng nhập. SDK kiểm tra chữ ký, issuer, audience và thời gian; game kiểm tra
thêm nonce, authorized party, kiểu claim và expiry chính xác. Lỗi không chứa token.

Launcher chưa đọc biến Google, web chưa bật GIS. Bước tiếp theo là nonce gắn cookie
và giao dịch tạo/liên kết tài khoản; sau đó mới nối claim và giao diện. Kiểm thử RSA
và chứng thư HTTP cục bộ không thay cho đăng nhập bằng Client ID thật.

| Ngày | Thay đổi |
|---|---|
| 2026-09-10 | Thêm module xác minh token và kiểm thử chữ ký thật; phân biệt rõ prerequisite với đăng nhập/claim thực tế chưa bật. |

| 2026-09-10 verified | Verifier917f862 qua review sau khi siết issuer đúng Google Sign-In;255tests/config/build qua. Chưa có Client ID/nonce transaction/login endpoint/cloud UI. |


## Google API và phiên tài khoản — 10/09/2026

1. `POST /auth/session` với JSON `{}` và `credentials: include` để tạo/khôi phục phiên.
2. `POST /auth/google/challenge` với `{}`; nhận `{clientId, nonce, expiresAt}`.
3. GIS callback phải dùng đúng `clientId` và `nonce` đó, rồi gửi ID token ở
   `POST /auth/google` body `{credential}`. Server xác minh token và kiểm tra lại
   cookie/nonce sau khi chờ Google. Challenge có hiệu lực tối đa5phút, dùng một lần.
4. Google mới gắn với guest do server tạo mà không thay player ID/lịch sử/ca. Cookie
   cũ bị thu hồi, cookie mới chỉ trả sau khi giao dịch hoàn tất.
5. Nếu Google đã có tiến độ khác:409`accountConflict`, giữ nguyên cả hai. Sau lựa
   chọn rõ ràng của người chơi, gửi `{credential, keepAccount: true}` để dùng tài
   khoản có sẵn; không cộng/gộp hay ghi đè lịch sử. Nếu nonce hết hạn thì xin lại.
6. Đổi sang Google chưa đăng ký khi đang ở một Google khác:409`signOutRequired`.
   `POST /auth/logout` cũng xóa được cookie đã hết hiệu lực; lịch sử vẫn được giữ.

Mọi POST yêu cầu Origin chính xác và JSON. Nonce/cookie/token không được log hoặc
nhận từ query string. Luồng trên chỉ nối tiến độ guest **do server quản lý**; save
local vẫn cần import/review riêng theo F25/F28. Chưa có live Google login vì owner
chưa có Client ID.264engine/server tests, config/build và CLI smoke qua; independent review tại `ebe820c` không tìm thấy lỗi mới.

| Ngày | Thay đổi |
|---|---|
| 2026-09-10 account API | Nối cấu hình Client ID, nonce/cookie/account transaction và xung đột qua HTTP; giữ web/local import tách rõ ở trạng thái chưa hoàn tất. |


| Ngày | Thay đổi |
|---|---|
| 2026-09-10 xác minh | Server account/session ebe820c qua264tests/config/build/CLI và independent review; reviewer tự chạy6kiểm thử store, HTTP bị sandbox EPERM. Chưa có Client ID thật, chưa nối GIS/web/local claim. `.qa/google-session-verification.json`. |
