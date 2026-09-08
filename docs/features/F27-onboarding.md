# F27 — Onboarding (ca đầu tiên, hướng dẫn, guest → đăng nhập)

> 🟢 **Ràng buộc** (chủ dự án chốt 08/09/2026, sau bản draft cùng ngày). Doc này chốt **luật + đầu vào + đầu ra + số đo + key config**; *cách trình bày* (coachmark, ghost hand, NPC nói, làm mờ UI…) do dev tự quyết theo layout của mình. Tham khảo một cách làm: `09-SPEC` §9.
> Config: `docs/config/economy.tbh.json` → `onboarding` (tier C). Liên quan: F25 (guest/đăng nhập), 03-SPEC §9 (serve/grace), F23 §8 (mạng), 10-SPEC §9 (lưu local trước).

## 1. Luật chủ dự án (nguyên văn, đã cấu trúc)

1. **Chơi không cần đăng ký.** Guest vào chơi ngay. Game **khuyến khích** đăng ký (Google) để: lưu tiến độ, lưu thành tích, đua top bảng xếp hạng (F28). Khuyến khích ≠ ép: không chặn gameplay lõi, không dark pattern (09 §11).
2. **Đăng nhập giữa lúc đang chơi → thành tích đang chơi được lưu realtime.** Ca đang chạy không bị ngắt; từ thời điểm đăng nhập, mọi mutation (serve, xu, uy tín, sổ ca) gắn vào tài khoản ngay; tiến độ guest trước đó merge vào tài khoản (F25 §4, 1 chiều).
3. **Bắt đầu game: 1 khách vào, gọi 1 cốc bia.** Người chơi phục vụ như bình thường (1 chạm ✅). Không kịp trong thời gian quy định → khách rời đi + **toast icon/số xu và uy tín thực trừ** (owner cập nhật 08/09; không text giải thích hoặc nút Đóng).
4. **Khách rời đi 3 lần liên tiếp → toast số trừ + hướng dẫn step-by-step theo config.**
5. **Lần đầu chơi game cũng có hướng dẫn step-by-step.**

## 2. Product rules (suy ra để dev không phải hỏi)

- **Step guide = chuỗi bước có thứ tự, mỗi bước chờ người chơi làm đúng 1 việc** (xem khách vào → chờ đủ bia → chạm ✅ → thấy xu/boa → hết ca → mở Nâng cấp). Số bước, nội dung bước là **content tier C** (`onboarding.stepGuide.steps[]`), dev dựng engine hiển thị chung, không hardcode bước.
- **Guide lần đầu** chạy ngay ca 1 (`stepGuide.onFirstPlay`). Người chơi **được bỏ qua** (`stepGuide.skippable`, mặc định true) — bỏ qua thì luật #4 vẫn bắt lại nếu mất 3 khách liên tiếp.
- **Guide do mất khách** (`lostStreakToGuide` = 3, đếm *liên tiếp* trong cùng ca, reset khi serve thành công): chạy lại từ bước "chờ đủ bia → chạm ✅"; sau khi chạy, đếm lại từ 0; tối đa `stepGuide.maxAutoRepeatsPerDay` lần/ngày để không làm phiền người đã biết chơi.
- **Ca 1 engine thật, chỉ khác qua cờ** `firstShift.*`: nhóm đầu = 1 khách `thuong`, gọi đúng 1 `bia`, xuất hiện ≤ `guaranteedFirstGroupWithinMs`; tắt Giờ Vàng + rủi ro trong ca 1; các nhóm sau spawn bình thường. Thời gian "quy định" = patience của khách theo config chung (03-SPEC), **không** có timer riêng.
- **Phản hồi mất khách** (luật #3, owner cập nhật 08/09): toast ngắn chỉ có icon xu/uy tín và số thực trừ, không pause, không thông báo giải thích hoặc bước xác nhận. Engine xuất số trừ đã clamp; UI không tự tính lại luật phạt.
- **Khuyến khích đăng nhập** (luật #1): điểm chạm = cuối ca 1, khi mở Xếp hạng/Bàn Thờ, khi sắp đóng tab với tiến độ đáng kể; lời mời nêu đúng 3 lợi ích (lưu tiến độ · thành tích · đua top); tần suất theo `loginPrompt.cooldownShifts`.
- **Đăng nhập giữa ca** (luật #2): không reload, không mất tick; `eventLog` local từ đầu ca upload kèm; sau đó ghi tiếp realtime (khi có server) — trước khi có server: lưu local như cũ nhưng gắn `accountId`.
- Mở dần tính năng theo `featureReveal.*`; người quay lại ≥ `returningPlayerResetAfterDays` chỉ được nhắc lại 1 bước lõi, không chạy full guide.
- Copy qua i18n key `onboarding.*`; giọng GDD §17; ≤ 12 từ/bước.

## 3. Đầu vào → đầu ra

| Đầu vào | Đầu ra mong muốn | Đo bằng |
|---|---|---|
| Guest mới, state khởi đầu từ config | Phục vụ được khách đầu (1 bia) không đọc hướng dẫn | `order_served` đầu ≤ `targets.firstServeWithinMs` |
| Không phục vụ kịp | Toast số xu/uy tín thực trừ; không text giải thích, không pause | `order_expired` / queue `customer_left` + mức trừ thực tế |
| Mất 3 khách liên tiếp | Step guide tự chạy | `onboarding_guide_started{trigger:'lost_streak'}` |
| Lần đầu chơi | Step guide chạy, bỏ qua được | `onboarding_guide_started{trigger:'first_play'}`, `onboarding_guide_skipped` |
| Đăng nhập Google giữa ca | Ca tiếp tục, tiến độ gắn tài khoản ngay | `guest_claimed` (F25) + `onboarding_login_mid_shift{shiftElapsedMs}` |

## 4. Data & config

- `onboarding` (tier C): `enabled`, `firstShift.{guaranteedFirstGroupWithinMs, firstGroupType, firstGroupSize=1, firstOrder=['bia'], riskEventsDisabled, rushDisabled}`, `lostStreakToGuide=3`, `stepGuide.{onFirstPlay, skippable, maxAutoRepeatsPerDay, steps[]}`, `loginPrompt.{afterFirstShift, onLeaderboardOpen, cooldownShifts}`, `hints.*`, `featureReveal.*`, `targets.*`. Thêm key = luật 3 nơi.
- Player state (local rồi server): `onboarding.{firstPlayGuideDone, guideRunsToday, lostStreak, hintsDone[], featuresRevealed[], lastResetAt}`.
- Listener event bus (10-SPEC §6); engine không có nhánh onboarding — cờ `firstShift.*` đi qua cùng cơ chế override config như campaign.

## 5. Analytics (gộp vào `docs/analytics-events.md`)

`onboarding_started` · `onboarding_guide_started {trigger, stepCount}` · `onboarding_guide_step_done {step}` · `onboarding_guide_skipped {atStep}` · `onboarding_notice_shown {reason}` · `onboarding_lost_streak {n}` · `onboarding_login_prompt_shown {touchpoint}` · `onboarding_login_mid_shift {shiftElapsedMs}` · `onboarding_first_shift_closed {served, lost, guideRuns}` · `onboarding_feature_revealed {feature}`.
Funnel dashboard admin (BRD §3): mở ca 1 → serve đầu → đóng ca 1 → đăng nhập → mở ca 2.

## 6. Acceptance

- Guest chơi trọn ca 1 không thấy màn đăng ký bắt buộc nào; đóng tab rồi mở lại cùng máy → tiến độ còn (10-SPEC §9).
- Ca 1 trên seed cố định: khách đầu đến ≤ `guaranteedFirstGroupWithinMs`, order = 1 `bia`, không `rush_started`/`risk_event_spawned`.
- Để khách đầu hết patience → `customer_left` + thông báo trong ≤ 1 s, ca vẫn chạy.
- 3 `customer_left` liên tiếp → guide chạy tự động đúng 1 lần; serve thành công ở giữa → đếm lại.
- Lần đầu chơi: guide chạy; bấm bỏ qua → chơi tiếp ngay; reload không chạy lại (`firstPlayGuideDone`).
- Đăng nhập Google ở phút 5 của ca: ca chạy tiếp, xu/uy tín trước và sau đăng nhập đều có trong tài khoản; không có serve nào bị đếm 2 lần (`idempotencyKey`).
- `onboarding.enabled=false` → ca 1 giống người cũ; **k không đổi** (04-SPEC §5).
- 5 người mới chưa được giải thích: ≥ 4/5 phục vụ khách đầu ≤ 30 s, ≥ 4/5 đóng được ca 1.
- Mọi ngưỡng/bước ở §4 đổi được ở admin không deploy; `npm run check:config` xanh; 2 ngôn ngữ; `prefers-reduced-motion`.

## Changelog (append-only)
| Ver | Thay đổi |
|---|---|
| v1.0 | Bản đầu 2026-09-08 (draft). |
| v1.1 | **Lên ràng buộc** theo 5 luật chủ dự án 08/09: guest chơi không đăng ký + khuyến khích đăng nhập Google, đăng nhập giữa ca lưu realtime, ca 1 = 1 khách 1 bia, không kịp → khách đi + thông báo, 3 lần liên tiếp → step guide, lần đầu chơi có step guide. JSON `onboarding` cập nhật. |

| 2026-09-08 | Owner overrides lost-customer explanation: numeric loss toast only, without changing configured coachmark triggers. |
