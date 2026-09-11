# Edolas Store, Header And Command Delivery Design

## Mục tiêu

Thiết kế lại header công khai và thêm cửa hàng mô phỏng tại `/store`. Người chơi đăng nhập có thể chọn cụm, gói nạp, phương thức MoMo hoặc ngân hàng rồi tạo đơn chờ. Owner/Admin duyệt thanh toán trong `/control/store`; website sau đó giao đúng một lệnh console cho một backend Paper đang hoạt động trong cụm đã chọn.

Phiên bản này không kết nối API thanh toán thật. MoMo và ngân hàng chỉ là phương thức hướng dẫn/mô phỏng. Nút phía người chơi không được phép tự đánh dấu đã thanh toán hoặc tạo lệnh console.

## Phạm vi

### Bao gồm

- Header công khai mới, rõ hierarchy hơn trên desktop và mobile.
- Mục `Cửa hàng` nổi bật trong điều hướng.
- Trang `/store` có luồng bốn bước: danh tính Minecraft, cụm, gói, thanh toán và xác nhận.
- Gói nạp do Owner/Admin thêm, sửa, bật/tắt trong Control Center.
- Đơn hàng của tài khoản hiện tại và biên nhận trạng thái.
- Quản lý đơn hàng trong Control Center với tìm kiếm/lọc và xác nhận có chủ đích.
- Hàng đợi lệnh console theo cụm, claim bởi đúng một backend Paper.
- Plugin báo kết quả chạy lệnh về website.
- Audit cho thao tác tạo/sửa gói, duyệt đơn và xử lý giao gói.

### Không bao gồm

- API merchant MoMo, webhook ngân hàng hoặc đối soát tự động.
- Tự cộng số dư tài khoản.
- Plugin BungeeCord riêng.
- Chạy một lệnh trên tất cả backend.
- Tự động chạy lại lệnh đã claim khi plugin hoặc mạng lỗi.

## Quyết định an toàn

Lệnh phân tán không thể bảo đảm “exactly once” tuyệt đối nếu tiến trình chết sau khi chạy lệnh nhưng trước khi báo kết quả. Hệ thống ưu tiên **at-most-once**: một delivery chỉ được claim một lần và không tự trả về hàng chờ. Nếu mất kết quả, admin xem trạng thái `Cần kiểm tra` rồi chủ động tạo lần giao mới sau khi kiểm tra server. Cách này tránh cấp rank hoặc vật phẩm hai lần.

Chỉ Owner/Admin có quyền quản lý gói và duyệt đơn. Người chơi chỉ tạo và xem đơn của chính mình. Tất cả mutation Control dùng Control session, same-origin và CSRF hiện có.

## Mô hình dữ liệu

### `store_packages`

- `id`, `slug`, `name`, `description`
- `group_key`: cụm áp dụng
- `price_vnd`: số nguyên dương
- `command_template`: một lệnh, không có slash đầu dòng hoặc ký tự xuống dòng
- `accent`, `sort_order`, `is_active`
- `created_by`, `updated_by`, timestamps

Biến được phép: `{player}`, `{package}`, `{amount}`, `{cluster}`. Mọi biến khác bị từ chối. Username Minecraft phải khớp `[A-Za-z0-9_]{1,16}`. Giá và tên gói được snapshot vào đơn để chỉnh gói sau này không làm đổi lịch sử.

### `store_orders`

- `id`, `reference`, `user_id`
- snapshot: `package_id`, `package_name`, `price_vnd`, `group_key`, `minecraft_username`
- `payment_method`: `momo` hoặc `bank`
- `status`: `pending_payment`, `approved`, `delivering`, `fulfilled`, `failed`, `needs_review`, `cancelled`
- `approved_by`, `approved_at`, `fulfilled_at`, `failure_message`, timestamps

### `store_command_deliveries`

- `id`, `order_id`, `group_key`, `command_text`
- `status`: `pending`, `claimed`, `succeeded`, `failed`, `needs_review`
- `claimed_by_server`, `claim_token_hash`, `claimed_at`, `completed_at`
- `output_summary`, timestamps

Mỗi order chỉ có tối đa một delivery đang tồn tại. Claim khóa row trong transaction, kiểm tra backend thuộc đúng cụm và đổi trạng thái trước khi trả lệnh. Claim token ngẫu nhiên chỉ trả một lần cho plugin; database chỉ lưu hash.

## Luồng người chơi

1. Khách có thể xem gói nhưng phải đăng nhập để tạo đơn.
2. Người chơi nhập Minecraft username, chọn một cụm có gói đang bật và chọn gói.
3. Chọn MoMo hoặc ngân hàng. Giao diện hiển thị thông tin mô phỏng rõ ràng, mã tham chiếu sẽ được tạo ở server.
4. Màn hình review tóm tắt username, cụm, gói, giá và phương thức.
5. Submit tạo đơn `pending_payment`; trang hiển thị mã đơn và trạng thái, không tuyên bố đã thanh toán.
6. Người chơi có thể xem danh sách đơn của mình trong cùng trang.

## Luồng Control Center

- `/control/store` có ba vùng: KPI, quản lý gói và hàng đợi đơn.
- Bộ lọc đơn theo trạng thái, cụm, phương thức và tìm kiếm mã đơn/username.
- Form gói có preview lệnh sau thay biến bằng dữ liệu mẫu.
- Duyệt đơn mở dialog xác nhận, hiển thị đầy đủ lệnh sắp được queue.
- Transaction duyệt khóa order, snapshot package, render lệnh, tạo delivery và ghi audit.
- Không cho duyệt lại order đã rời `pending_payment`.
- Delivery lỗi được hiển thị rõ; thao tác retry không tự động và không nằm trong phiên bản đầu.

## Giao thức plugin

Plugin thêm `delivery-endpoint` và `delivery-interval-seconds`. Endpoint dùng HMAC hiện có với canonical request, timestamp và nonce giống telemetry.

### Claim

Plugin gửi POST `{ "schemaVersion": 1, "action": "claim" }`. Website xác thực server ID, tìm server trong `minecraft_servers`, lấy `group_key`, khóa delivery `pending` cũ nhất của cụm và đổi sang `claimed`. Response `200` trả `deliveryId`, `claimToken`, `command`; `204` nghĩa là không có việc.

### Complete

Plugin chạy command trên main thread bằng `Bukkit.dispatchCommand(Bukkit.getConsoleSender(), command)`, sau đó POST `{ "schemaVersion": 1, "action": "complete", "deliveryId": ..., "claimToken": ..., "success": true|false, "output": "..." }`.

Website kiểm tra server claim, token hash và trạng thái. Success chuyển delivery/order sang `succeeded/fulfilled`; failure chuyển sang `failed`. Nếu plugin không báo kết quả, delivery vẫn `claimed` và Control Center hiển thị `Cần kiểm tra` theo tuổi claim, không tự requeue.

## Header mới

- Header dùng ba vùng: wordmark, nav chính, actions.
- `Cửa hàng` là CTA có icon, glow cyan-violet nhẹ và trạng thái active theo pathname.
- Desktop giảm số link hiển thị trực tiếp bằng nhóm `Cộng đồng` cho Diễn đàn/Wiki/Kỷ luật; mobile vẫn hiển thị danh sách rõ ràng.
- Account menu giữ hành vi hiện tại, bổ sung liên kết `Đơn hàng của tôi`.
- Header thu nhỏ nhẹ khi cuộn, không thay đổi chiều cao đột ngột và tôn trọng reduced motion.
- Tất cả menu dùng button/link native, Escape đóng dropdown, focus rõ ràng và touch target tối thiểu 44px.

## Ngôn ngữ hình ảnh

Giữ palette xanh đen, tím điện, sapphire và cyan hiện có. Cửa hàng dùng cảm giác “network terminal marketplace”: card gói có đường viền sáng, số thứ tự bước, receipt panel cố định trên desktop và progress rõ ràng. Không dùng glass blur dày hoặc animation trang trí liên tục; chuyển bước dùng opacity/translate ngắn và tắt khi reduced motion.

## API

- `GET /api/store/catalog`: catalog công khai và cụm khả dụng.
- `POST /api/store/orders`: yêu cầu website session, validate server-side.
- `GET /api/store/orders`: chỉ trả đơn của user hiện tại.
- `POST /api/control/store/packages`: tạo gói.
- `PATCH /api/control/store/packages/[id]`: sửa/bật/tắt gói.
- `POST /api/control/store/orders/[id]/approve`: duyệt và queue lệnh.
- `POST /api/control/store/orders/[id]/cancel`: hủy đơn đang chờ.
- `POST /api/minecraft/deliveries`: claim/complete có HMAC.

Mọi response chứa dữ liệu đơn dùng `Cache-Control: no-store`. API công khai không bao giờ trả `command_template` hoặc `command_text`.

## Xử lý lỗi

- Database unavailable: catalog hiển thị trạng thái tạm không khả dụng; không tạo đơn giả.
- Cụm offline: vẫn cho xem gói nhưng chặn tạo đơn và giải thích lý do.
- Gói bị tắt giữa lúc review: API trả lỗi cụ thể, không tạo đơn.
- Duyệt trùng: transaction trả conflict.
- Backend không online: order ở `approved`/delivery `pending` cho đến khi một backend cụm claim.
- Command dispatch trả false hoặc ném lỗi: plugin báo `success=false`.
- Claim không được complete sau ngưỡng cảnh báo: Control hiển thị `Cần kiểm tra`, không tự chạy lại.

## Kiểm thử và tiêu chí hoàn thành

- Validation test cho package, order, template và placeholder.
- Repository transaction test cho tạo order, approve, claim và complete.
- HTTP test cho session/CSRF/HMAC/quyền sở hữu.
- UI source test cho header, wizard, trạng thái, dialog và accessibility labels.
- Java unit test cho config, request protocol, command worker và main-thread dispatch boundary.
- Full `npm test`, TypeScript, lint, Next production build và Gradle Java 21 phải đạt.
- Runtime smoke test catalog, unauthorized mutations và migration replay-safe.

