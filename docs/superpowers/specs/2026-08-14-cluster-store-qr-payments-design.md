# Cluster Store And QR Payments Design

## Mục tiêu

Mở rộng Store thành catalog độc lập theo từng cụm máy chủ và bổ sung thanh toán QR tự động có thể phát triển an toàn khi chưa có merchant key.

Phạm vi:

- Thêm các cụm Store `survival`, `fantasy-skyblock` và `smp`; giữ nguyên `op-skyblock`.
- Mỗi cụm quản lý danh mục và gói riêng trong `/control/store`.
- CRUD đầy đủ cho danh mục và gói, gồm xóa có xác nhận.
- Tên cụm dùng font Minecraft hiện có trên Control Store và Store công khai.
- Tạo QR thanh toán theo provider.
- Sandbox mặc định để phát triển không dùng tiền thật.
- Chuẩn bị adapter live cho payOS/VietQR và MoMo Business.
- Tự động xác minh webhook, ghi log và đưa lệnh vào hàng đợi plugin đúng một lần.

Không thuộc phạm vi:

- Đăng nhập hoặc scrape ứng dụng MBBank cá nhân.
- Lưu mật khẩu Internet Banking, OTP hay merchant secret trong database.
- Tự động hoàn tiền.
- Tự động tạo gói trả phí hoặc lệnh console mẫu.
- Thay đổi khóa kỹ thuật của telemetry hay plugin Paper.

## Quyết định kiến trúc

### Cổng thanh toán

- `bank` dùng payOS để tạo VietQR. Tài khoản nhận có thể là MBBank đã liên kết trong kênh payOS.
- `momo` dùng API merchant chính thức của MoMo.
- `sandbox` là adapter nội bộ có cùng interface với provider live, không gọi mạng và không nhận tiền thật.
- Không gọi trực tiếp API tài khoản MBBank cá nhân.

MoMo yêu cầu kiểm tra chữ ký IPN và đối chiếu `partnerCode`, `orderId`, `amount`. payOS cung cấp payment link, dữ liệu QR và webhook có chữ ký. Redirect phía trình duyệt chỉ dùng để hiển thị; webhook server-to-server mới là nguồn xác nhận thanh toán.

### Ranh giới module

`lib/store/payments/` chứa các module độc lập:

- `types.ts`: interface provider và kiểu dữ liệu chuẩn hóa.
- `config.ts`: đọc và kiểm tra biến môi trường.
- `sandbox.ts`: tạo phiên thử nghiệm và xác minh token thử nghiệm.
- `payos.ts`: tạo payment link, kiểm tra webhook payOS.
- `momo.ts`: ký request HMAC SHA-256, tạo payment session và kiểm tra IPN.
- `service.ts`: điều phối attempt, event, order và delivery.

UI, route handlers và Store service không biết chi tiết chữ ký từng provider. Chúng chỉ gọi interface chuẩn hóa.

## Catalog theo cụm

### Dữ liệu khởi tạo

Migration chạy lặp an toàn sẽ thêm metadata Store nếu chưa tồn tại:

| group_key | Tên Store | Thứ tự |
| --- | --- | --- |
| `op-skyblock` | OP Skyblock | 0 |
| `survival` | Survival | 10 |
| `fantasy-skyblock` | Fantasy Skyblock | 20 |
| `smp` | SMP | 30 |

Các cụm được bật trong Store nhưng hiển thị offline cho tới khi có telemetry mới. Store không nhận đơn cho cụm offline.

Ba cụm mới có danh mục khởi tạo, dùng upsert theo `(group_key, slug)`:

- Survival: `ranks`, `items`, `utilities`.
- Fantasy Skyblock: `ranks`, `crates`, `battle-pass`.
- SMP: `ranks`, `cosmetics`, `bundles`.

Không tạo gói trả phí mẫu. Admin phải nhập giá và lệnh console thật trước khi bật gói.

### Hành vi Control

- Dải thẻ cụm là điều hướng cấp cao nhất.
- Bấm một cụm đặt `selectedGroupKey`.
- Danh mục, bộ lọc danh mục, lưới gói và nút tạo mới chỉ dùng dữ liệu có `groupKey` trùng cụm đang chọn.
- Đổi cụm đặt lại danh mục đang lọc và editor danh mục.
- Form gói chỉ liệt kê danh mục cùng cụm.
- Empty state giải thích cụm chưa có danh mục hoặc chưa có gói.
- Số lượng danh mục và gói trên thẻ cụm cập nhật ngay sau CRUD.

### Xóa gói

API `DELETE /api/control/store/packages/:id`:

1. Xác minh Control session, Origin/CSRF và quyền account-admin.
2. Khóa gói trong transaction.
3. Xóa bản ghi gói và ghi audit.
4. `store_orders.package_id` tự thành `NULL`; snapshot tên, giá, lệnh và cụm trong đơn cũ không đổi.
5. Sau commit, xóa ảnh gói bằng helper đường dẫn an toàn. Lỗi dọn ảnh không rollback dữ liệu và được ghi log server.

UI luôn hỏi xác nhận tên gói trước khi xóa.

## Mô hình thanh toán

### `store_payment_attempts`

- `id BIGINT UNSIGNED`
- `order_id BIGINT UNSIGNED`
- `provider ENUM('sandbox','payos','momo')`
- `provider_order_id VARCHAR(100)`
- `status ENUM('creating','awaiting_payment','paid','expired','cancelled','failed','simulated')`
- `amount_vnd INT UNSIGNED`
- `checkout_url VARCHAR(1000) NULL`
- `qr_content TEXT NULL`
- `provider_transaction_id VARCHAR(120) NULL`
- `account_username_snapshot VARCHAR(40)`
- `account_email_snapshot VARCHAR(254)`
- `minecraft_username_snapshot VARCHAR(16)`
- `expires_at`, `paid_at`, `created_at`, `updated_at`

Mỗi lần thử thanh toán là một hàng riêng. `(provider, provider_order_id)` là duy nhất. Một order không thể có hai attempt đã thanh toán.
Snapshot tài khoản được server đọc từ bảng `users`, không nhận username hoặc email do client gửi lên.

### `store_payment_events`

- `id BIGINT UNSIGNED`
- `attempt_id BIGINT UNSIGNED NULL`
- `provider ENUM('sandbox','payos','momo')`
- `event_key CHAR(64)`
- `event_type VARCHAR(50)`
- `signature_valid BOOLEAN`
- `provider_transaction_id VARCHAR(120) NULL`
- `amount_vnd INT UNSIGNED NULL`
- `outcome ENUM('accepted','duplicate','rejected','ignored','error')`
- `payload_json JSON`
- `received_at`, `processed_at`

`(provider, event_key)` là duy nhất để webhook retry không giao gói lần hai. Payload được lọc; không lưu merchant secret, API key, authorization header hay token thanh toán đầy đủ.

### Trạng thái đơn

Giữ enum trạng thái đơn hiện tại:

- Tạo đơn: `pending_payment`.
- Webhook hợp lệ: `approved`.
- Plugin claim: `delivering`.
- Plugin hoàn tất: `fulfilled`.
- Admin vẫn có thể duyệt thủ công khi cần.

Attempt lỗi khi khởi tạo làm order chuyển `cancelled`; người dùng có thể tạo đơn mới. Redirect hoặc polling không tự duyệt đơn.

## Luồng tạo đơn và QR

1. Người dùng đăng nhập, chọn player, cụm, gói và `bank` hoặc `momo`.
2. Client gửi một idempotency key ngẫu nhiên; server dùng unique key theo user để thao tác retry không tạo hai order.
3. Server khóa gói, kiểm tra cụm Store active và telemetry online.
4. Server tạo order `pending_payment` cùng attempt `creating`.
5. Sau khi transaction kết thúc, adapter provider tạo payment session.
6. Server cập nhật attempt thành `awaiting_payment` và trả mã đơn, provider, số tiền, QR/checkout URL và thời gian hết hạn.
7. UI mở màn hình QR, cho sao chép nội dung, hiển thị countdown và polling trạng thái.
8. Nếu provider không khởi tạo được, attempt thành `failed`, order thành `cancelled`.

QR được render bằng thư viện cục bộ từ `qr_content`; client không nhận merchant key.

## Luồng webhook và giao lệnh

### Endpoint

- `POST /api/store/payments/payos/webhook`
- `POST /api/store/payments/momo/ipn`
- `POST /api/store/payments/sandbox/:token/complete`
- `GET /api/store/orders/:reference/payment`

Endpoint trạng thái chỉ trả dữ liệu khi session sở hữu order. Endpoint sandbox chỉ tồn tại khi `STORE_PAYMENT_MODE=sandbox`.

### Xử lý

1. Parse body có giới hạn kích thước.
2. Xác minh chữ ký bằng `timingSafeEqual` hoặc SDK chính thức.
3. Tạo event key ổn định từ provider transaction ID và nội dung đã chuẩn hóa.
4. Ghi event nhận được.
5. Khóa attempt và order trong transaction.
6. Đối chiếu provider order ID, reference, số tiền, currency và trạng thái thành công.
7. Nếu event đã xử lý, trả thành công idempotent.
8. Cập nhật attempt paid, order approved và tạo `store_command_deliveries` trong cùng transaction.
9. Unique key của delivery theo `order_id` là lớp bảo vệ cuối chống giao trùng.

Logic tạo delivery được tách khỏi thao tác admin để webhook và duyệt thủ công dùng chung một hàm transaction-safe.

## Sandbox

`STORE_PAYMENT_MODE=sandbox`:

- Không gọi payOS hoặc MoMo.
- Sinh QR thử nghiệm có watermark `SANDBOX - KHÔNG CHUYỂN TIỀN`.
- Có nút mô phỏng thanh toán trên UI development.
- Token mô phỏng là ngẫu nhiên, băm trong database và có thời hạn.
- Sandbox có thể tạo delivery trong development để kiểm thử end-to-end.
- Production từ chối khởi động nếu sandbox được cấu hình cho phép tạo delivery.

Khi `STORE_SANDBOX_ALLOW_DELIVERY=false`, hoàn tất sandbox chỉ đánh dấu attempt là `simulated`; order không được duyệt và không tạo delivery. Khi bật trong development, cùng luồng transaction-safe của webhook được dùng để kiểm thử giao lệnh.

Cấu hình mặc định:

    STORE_PAYMENT_MODE="sandbox"
    STORE_SANDBOX_ALLOW_DELIVERY="false"
    APP_PUBLIC_URL="http://localhost:3000"

    PAYOS_CLIENT_ID=""
    PAYOS_API_KEY=""
    PAYOS_CHECKSUM_KEY=""

    MOMO_PARTNER_CODE=""
    MOMO_ACCESS_KEY=""
    MOMO_SECRET_KEY=""
    MOMO_ENDPOINT="https://test-payment.momo.vn/v2/gateway/api/create"

Live mode yêu cầu HTTPS public URL và đủ key của provider được bật. Thiếu key làm provider unavailable, không fallback âm thầm sang sandbox.

## Giao diện Store

Sau khi tạo đơn:

- QR lớn, rõ, có khoảng trắng an toàn.
- Tên provider, số tiền, player, cụm, gói và mã đơn.
- Nút sao chép nội dung/mã đơn.
- Countdown hết hạn.
- Trạng thái `Đang chờ`, `Đã nhận thanh toán`, `Đang giao`, `Hoàn tất`.
- Sandbox có nhãn cảnh báo và nút mô phỏng riêng.
- Polling dừng khi attempt đạt trạng thái cuối.

Tên cụm dùng `var(--font-pixel)`; nội dung thanh toán dài dùng font sans. Nút có vùng bấm tối thiểu 44px, focus rõ, thông báo qua `aria-live` và animation tôn trọng `prefers-reduced-motion`.

## Giao diện Control và log

`/control/store` thêm khu vực `Payment Activity`:

- Bộ lọc provider, trạng thái, cụm, tài khoản web và player.
- Hiển thị reference, account username/email, Minecraft username, cụm, gói, amount, provider transaction ID và thời gian.
- Mở chi tiết để xem timeline attempt, webhook event, duyệt đơn và delivery.
- Event chữ ký sai hiển thị cảnh báo nhưng không lộ payload nhạy cảm.
- Không có nút sửa log.

## Bảo mật

- Merchant key chỉ đọc server-side từ environment.
- Không trả secret hoặc chữ ký gốc cho client.
- Webhook không dùng cookie nhưng bắt buộc chữ ký provider.
- Control mutation giữ Origin/CSRF, session riêng và role guard.
- Số tiền luôn lấy từ snapshot server, không tin amount client.
- So sánh amount và order ID trước mọi chuyển trạng thái.
- Transaction và unique key bảo vệ idempotency.
- Unique idempotency key theo tài khoản bảo vệ thao tác tạo order khỏi double-click và retry mạng.
- Truy vấn log có giới hạn và phân trang.
- Raw lỗi provider không trả trực tiếp cho browser.
- Live mode không chạy với HTTP callback URL.

## Xử lý localhost

Sandbox hoạt động hoàn toàn trên localhost. Khi thử webhook live, `APP_PUBLIC_URL` phải là URL HTTPS public từ Cloudflare Tunnel hoặc môi trường deploy. Endpoint provider luôn được tạo từ `APP_PUBLIC_URL`; không dùng `127.0.0.1` cho callback bên ngoài.

## Migration

- Tạo bảng payment bằng `CREATE TABLE IF NOT EXISTS`.
- Kiểm tra column/index qua `information_schema` khi mở rộng database hiện có.
- Upsert ba Store group và chín danh mục khởi tạo; không cập nhật đè tên admin đã sửa.
- Không xóa hoặc sửa order/delivery hiện có.
- Migration phải chạy hai lần liên tiếp thành công.

## Kiểm thử

- Migration mới và replay trên MySQL thật.
- Ba cụm và danh mục khởi tạo không trộn nhau.
- CRUD gói, xóa gói, audit và ảnh.
- Validation payment config.
- MoMo request/IPN signature bằng fixture.
- payOS webhook verification bằng fixture.
- Webhook sai chữ ký, sai amount, sai reference.
- Webhook retry và race với admin approval không tạo delivery trùng.
- Sandbox token hết hạn và production delivery guard.
- API status chỉ cho chủ order.
- Payment Activity không lộ secret.
- UI đổi cụm chỉ hiện đúng category/package.
- QR UI, polling stop, focus và reduced motion.
- Toàn bộ test, TypeScript, ESLint và production build.

## Tiêu chí hoàn thành

- Control có bốn cụm độc lập và font Minecraft.
- Bấm cụm chỉ thấy danh mục/gói của cụm đó.
- Admin thêm, sửa, xóa được danh mục và gói theo đúng cụm.
- Sandbox tạo được order và QR thử nghiệm mà không nhận tiền thật.
- Kiến trúc live sẵn sàng cho payOS/MBBank và MoMo khi thêm key.
- Webhook hợp lệ tự duyệt và tạo đúng một delivery.
- Log truy được tài khoản web, email, player, cụm, gói và transaction.
- Không có secret trong client, database log hoặc source control.
