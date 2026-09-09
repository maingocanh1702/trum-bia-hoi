# Chuẩn bị đăng nhập Google — Trùm Bia Hơi

Ngày09/09/2026, chủ dự án xác nhận **chưa có OAuth Web Client ID**. Bản chơi5174
vẫn lưu local; server đã có phiên khách nhưng chưa có Google login, claim tiến trình
hay đồng bộ cloud. Tài liệu này chuẩn bị cấu hình; không phải xác nhận đã bật Google.

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
| Web client ID | Chưa có; chưa gắn vào runtime |
| Origin thử Google | `http://localhost:5174`, bằng profile thử riêng |
| API khi thử trên localhost | `TBH_ORIGIN=http://localhost:5174`; gọi API qua `http://localhost:5175` để giữ cùng site |
| Bản đang chơi | `http://127.0.0.1:5174` giữ nguyên; localStorage của localhost là origin khác |
| Tên miền production | Chưa cấu hình; không tự đăng ký hay publish |

Hiện launcher chỉ đọc các biến triển khai ghi trong [server README](../apps/server/README.md).
Chưa có biến Google nào được runtime tiêu thụ; đặt Client ID vào file `.env` lúc này
chưa bật đăng nhập. Tích hợp tiếp theo sẽ dùng cùng một Web Client ID cho GIS và
kiểm tra audience ở server; không dùng Client Secret trong frontend.

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
