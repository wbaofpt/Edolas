# Minecraft Operations Dashboard Design

## Mục tiêu

Thiết kế lại `/control/minecraft` thành bảng điều hành network dễ quét, sửa việc đầu skin người chơi chỉ hiện fallback, và cho phép owner/admin xóa dữ liệu telemetry của một cụm đã offline sau bước xác nhận rõ ràng.

## Phạm vi

- Chỉ thay đổi khu vực Control Minecraft và API Control liên quan.
- Không thay đổi payload plugin Paper, cấu trúc API telemetry gửi vào hoặc khóa trong `MINECRAFT_TELEMETRY_KEYS`.
- Xóa cụm chỉ xóa dữ liệu vận hành trong `minecraft_servers`, `minecraft_online_players` và `minecraft_telemetry_nonces`.
- Không xóa hàng `game_modes`, banner, tag, nội dung website hoặc API key trong `.env`.
- Nếu backend vẫn chạy và gửi telemetry mới, cụm được tạo lại tự động.

## Bố cục Operations Dashboard

### Command header

Phần đầu giữ nhận diện `NETWORK TELEMETRY`, nhưng chia rõ thành:

- Tiêu đề và mô tả ngắn.
- Trạng thái toàn network ở góc phải.
- Dòng thời gian cập nhật cuối cùng.

### Health strip

Bốn chỉ số ưu tiên theo thứ tự vận hành:

1. Người chơi online toàn network.
2. Cụm khỏe trên tổng số cụm.
3. Backend đang gửi tín hiệu trên tổng backend.
4. Backend mất tín hiệu cần xử lý.

Màu cyan dành cho khỏe, vàng cho degraded và đỏ cho offline. Số liệu dùng tabular numerals, không dùng hiệu ứng glow làm affordance chính.

### Cluster inventory

Mỗi cụm là một disclosure panel có:

- Tên hiển thị và `group_key`.
- Trạng thái `ONLINE`, `DEGRADED` hoặc `OFFLINE`.
- Số người online, backend hoạt động và tổng backend.
- Nhãn cảnh báo nếu chưa map với `game_modes.slug`.
- Khu backend chi tiết nằm bên trong disclosure.
- Chỉ cụm `OFFLINE` có nút `Xóa dữ liệu cụm`.

Khi tồn tại cụm lỗi, các cụm degraded/offline mở mặc định; khi mọi cụm đều khỏe, chỉ mở cụm đầu tiên.

### Player directory và integrations

- Player Directory giữ bảng tìm kiếm nhưng cell người chơi có đầu skin, tên và UUID theo một hàng identity rõ ràng.
- Critical Integrations giữ ở panel riêng, backend stale hiển thị `UNKNOWN`.
- Trên màn hình nhỏ, bảng vẫn cuộn ngang và các panel chuyển về một cột.

## Sửa đầu skin

Nguyên nhân hiện tại là Content Security Policy tại Control chỉ cho `img-src 'self' data: blob:` nên trình duyệt chặn `https://mc-heads.net`.

Thay đổi:

- Mở chính xác `https://mc-heads.net` trong `img-src`; không dùng wildcard.
- Giữ `next.config.mjs` chỉ cho hostname và pathname `/avatar/**`.
- Component tiếp tục dùng UUID đã chuẩn hóa, ảnh `40x40`, `alt=""` và fallback chữ cái.
- Nếu dịch vụ ảnh không hoạt động, bảng vẫn dùng được và fallback vẫn hiển thị.

## Xóa cụm offline

### Endpoint

`DELETE /api/control/minecraft/groups/[group]`

Điều kiện truy cập:

- Control session còn hiệu lực.
- Vai trò là `owner` hoặc `admin`.
- Same-origin hợp lệ.
- CSRF cookie và header khớp nhau.
- `group` phải khớp pattern identifier hiện có.

### Transaction DB

Service nhận `group`, actor và thời điểm hiện tại:

1. Bắt đầu transaction.
2. `SELECT server_id,last_seen_at FROM minecraft_servers WHERE group_key=? FOR UPDATE`.
3. Trả `404` nếu không có backend nào trong cụm.
4. Trả `409` nếu bất kỳ backend nào còn fresh trong cửa sổ 30 giây.
5. Xóa nonce theo danh sách `server_id` vì bảng nonce chưa có foreign key cascade.
6. Xóa các hàng `minecraft_servers`; player tự cascade theo foreign key.
7. Ghi `admin_audit_logs` với action `minecraft.group.delete`, target là group và metadata chứa danh sách server đã xóa.
8. Commit và trả số backend đã xóa.

Khóa hàng bảo đảm backend không thể chuyển từ offline thành fresh giữa bước kiểm tra và bước xóa. Nếu plugin gửi lại sau commit, backend được tạo lại như một snapshot mới.

## Hộp xác nhận

Nút xóa chỉ có ở cụm offline và dùng một alert dialog riêng:

- Tiêu đề: `Xóa dữ liệu cụm <tên>?`
- Hiển thị group key và số backend bị xóa.
- Nêu rõ không xóa chế độ chơi/banner/API key và cụm có thể xuất hiện lại nếu plugin còn chạy.
- Focus mặc định vào `Hủy`.
- `Escape` và click backdrop đóng dialog khi chưa gửi request.
- Trong lúc xóa, khóa nút và không cho đóng dialog.
- Thành công: đóng dialog, cập nhật dashboard ngay từ response hoặc tải status lại, thông báo bằng `aria-live`.
- Lỗi `409`: đóng trạng thái busy, giữ dialog và báo cụm vừa online trở lại nên không thể xóa.

## Trạng thái và lỗi

- API status vẫn polling 10 giây và refresh khi tab visible.
- Khi xóa đang diễn ra, polling không được ghi đè trạng thái busy của dialog.
- Lỗi tải dashboard giữ snapshot gần nhất và hiện cảnh báo.
- Không dùng `window.confirm`; alert dialog có semantic, accessible name, focus ban đầu và nút hành động rõ ràng.

## Kiểm thử

### Service

- Xóa cụm khi tất cả backend stale.
- Từ chối khi một backend fresh.
- Trả not found khi group không tồn tại.
- Xóa nonce trước server và ghi audit trong cùng transaction.
- Rollback khi bất kỳ bước nào lỗi.

### HTTP

- Từ chối session thiếu, staff, CSRF sai và cross-origin.
- Kiểm tra group identifier.
- Ánh xạ `404`, `409`, `200` và `503` đúng.

### UI

- Chỉ cụm offline có nút xóa.
- Dialog có `role="alertdialog"`, label, description, focus Hủy và trạng thái busy.
- Request dùng `controlFetch` để gửi CSRF.
- Success xóa cụm khỏi UI; lỗi vẫn giữ dữ liệu.
- CSP cho đúng `https://mc-heads.net` và không mở wildcard.
- Bố cục responsive, trạng thái không chỉ dựa vào màu.

### Xác minh cuối

- `npm test`
- `npx tsc --noEmit`
- `npm run lint`
- `npm run build`
- Runtime check `/control/minecraft`, ảnh MCHeads và endpoint xóa với một DB mock/test, không xóa dữ liệu thật trong kiểm tra tự động.
