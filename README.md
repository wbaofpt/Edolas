# EdolasSG

## Paper telemetry

Plugin Paper 1.21 nam tai `plugins/edolas-telemetry`. Chay migration va build bang Java 21:

```powershell
npm run db:migrate:minecraft
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.10'
Set-Location plugins\edolas-telemetry
.\gradlew.bat clean test shadowJar
```

Huong dan tao key, cau hinh nhieu server va cai JAR nam trong `plugins/edolas-telemetry/README.md`.

Tao them mot Paper backend cho BungeeCord network:

```powershell
npm run minecraft:add-server -- --id survival-02 --group survival --name "Survival 02" --endpoint "https://example.com/api/minecraft/telemetry"
```

Moi backend dung `server-id` va key rieng. Cac backend cung che do dung chung `group`; gia tri `group` tu dong map voi `game_modes.slug`. Restart website sau khi CLI cap nhat `.env`, sau do dan config duoc sinh vao backend Paper tuong ung va restart backend.

Website cộng đồng cho server Minecraft EdolasSG, xây bằng Next.js + TypeScript + MySQL.

## Chạy local

```bash
npm install
npm run dev
```

## Database

Các file SQL nằm trong `database/`:

- `00_create_database.sql`
- `01_schema.sql`
- `02_seed.sql`

Thông tin kết nối mặc định:

- database: `edolas_db`
- user: `sa`
- password: `123456`

`DATABASE_URL` mẫu:

```env
DATABASE_URL="mysql://sa:123456@localhost:3306/edolas_db"
```

## Gmail gửi mã xác nhận

Tạo App Password 16 ký tự trong tài khoản Google đã bật xác minh hai bước, sau đó cấu hình file `.env`:

```env
GMAIL_USER="your-account@gmail.com"
GMAIL_APP_PASSWORD="your-16-character-app-password"
EMAIL_FROM_NAME="EdolasSG"
```

Khởi động lại server sau khi đổi biến môi trường. Không dùng mật khẩu Gmail thông thường và không đưa file `.env` lên Git.

## Store và thanh toán QR

Áp dụng schema Store trước khi mở `/store` hoặc `/control/store`:

```powershell
npm run db:migrate:store
```

Mặc định dự án chạy sandbox, không gọi nhà cung cấp và không nhận tiền thật:

```env
STORE_PAYMENT_MODE="sandbox"
STORE_SANDBOX_ALLOW_DELIVERY="false"
APP_PUBLIC_URL="http://localhost:3000"
```

Khi chuyển sang live, `APP_PUBLIC_URL` phải là URL HTTPS công khai. Điền đủ một hoặc cả hai bộ key; hệ thống không tự fallback về sandbox nếu thiếu key:

```env
STORE_PAYMENT_MODE="live"
APP_PUBLIC_URL="https://your-domain.example"

PAYOS_CLIENT_ID=""
PAYOS_API_KEY=""
PAYOS_CHECKSUM_KEY=""

MOMO_PARTNER_CODE=""
MOMO_ACCESS_KEY=""
MOMO_SECRET_KEY=""
MOMO_ENDPOINT="https://test-payment.momo.vn/v2/gateway/api/create"
```

Webhook live:

- payOS: `https://your-domain.example/api/store/payments/payos/webhook`
- MoMo IPN: `https://your-domain.example/api/store/payments/momo/ipn`

Không lưu merchant key trong database hoặc Control. Webhook hợp lệ mới được tự động duyệt đơn và tạo delivery; redirect từ trình duyệt chỉ dùng để hiển thị trạng thái.
