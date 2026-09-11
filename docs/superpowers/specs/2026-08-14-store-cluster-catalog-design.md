# Store Cluster Catalog Design

## Mục tiêu

Thiết kế lại `/control/store` theo cấu trúc `Cụm Store -> Danh mục -> Gói`, cho phép quản trị viên đặt tên hiển thị riêng cho từng cụm trong Store. Tên này chỉ xuất hiện tại Store và khu vực quản trị Store; telemetry, `/control/minecraft`, plugin Paper và khóa kỹ thuật `group_key` không thay đổi.

## Phạm vi

- Thêm metadata cụm dành riêng cho Store.
- Mỗi danh mục thuộc đúng một cụm Store.
- Làm lại bố cục `/control/store` để quản trị theo cụm đang chọn.
- Cho phép sửa tên hiển thị của cụm Store.
- Dùng font Minecraft hiện có (`Press Start 2P`, biến `--font-pixel`) cho tên cụm.
- Trang Store công khai dùng tên tùy chỉnh và chỉ hiển thị danh mục thuộc cụm tương ứng.
- Giữ nguyên dữ liệu và luồng xử lý của `store_orders` và `store_command_deliveries`.

Không thuộc phạm vi:

- Đổi tên cụm trong telemetry hoặc trang quản trị Minecraft.
- Tạo, xóa hay đổi `group_key` kỹ thuật từ Store.
- Thay đổi cơ chế thanh toán và giao lệnh console.

## Mô hình dữ liệu

### `store_groups`

Bảng mới lưu metadata Store theo cụm telemetry hiện có:

- `group_key VARCHAR(40)` là khóa chính và khớp với `minecraft_servers.group_key`.
- `display_name VARCHAR(80)` là tên tùy chỉnh chỉ dành cho Store.
- `sort_order SMALLINT UNSIGNED` điều khiển thứ tự cụm.
- `is_active BOOLEAN` điều khiển việc cụm xuất hiện trong Store công khai.
- `created_by`, `updated_by`, `created_at`, `updated_at` phục vụ quản trị và audit.

Không tạo khóa ngoại tới `minecraft_servers` vì bảng telemetry có nhiều backend dùng cùng một `group_key`, không có khóa duy nhất phù hợp để tham chiếu. Service chỉ cho phép tạo metadata từ danh sách cụm telemetry đã biết.

### `store_categories`

Thêm `group_key VARCHAR(40) NOT NULL`. Slug danh mục chỉ cần duy nhất trong một cụm, do đó unique key chuyển từ `slug` sang `(group_key, slug)`. Chỉ mục catalog chuyển sang `(group_key, is_active, sort_order)`.

Mỗi gói phải tham chiếu danh mục có cùng `group_key`. Ràng buộc này được kiểm tra trong transaction của service vì khóa ngoại hiện tại chỉ tham chiếu `category_id`.

### Migration dữ liệu

Migration có thể chạy lại an toàn:

1. Tạo `store_groups` nếu chưa có.
2. Tạo một hàng `store_groups` cho từng `group_key` đang xuất hiện trong `minecraft_servers` hoặc `store_packages`.
3. Tên mặc định lấy từ tên backend đã chuẩn hóa; nếu không có thì chuyển `group_key` thành nhãn dễ đọc.
4. Thêm `store_categories.group_key` ở trạng thái nullable.
5. Với danh mục đang có gói, lấy `group_key` của gói tham chiếu. Catalog hiện tại chỉ có `op-skyblock`, nên năm danh mục mẫu được gán vào cụm này.
6. Danh mục chưa được gói nào tham chiếu được gán vào cụm Store đầu tiên theo thứ tự ổn định.
7. Chuyển cột sang `NOT NULL`, thay unique key và thêm chỉ mục mới.

Nếu một danh mục cũ đang được các gói thuộc nhiều cụm cùng tham chiếu, migration dừng với lỗi rõ ràng thay vì tự đoán hoặc làm sai phân loại.

## Service và API

### Đọc dữ liệu quản trị

`listStoreAdminData()` trả về:

- Các cụm Store với tên hiển thị, trạng thái telemetry, số danh mục và số gói.
- Danh mục có `groupKey`.
- Gói, đơn hàng và dữ liệu hiện có.

### Sửa cụm Store

API Control mới cập nhật `displayName`, `sortOrder` và `active` theo `group_key`. API dùng session Control, CSRF và quyền account-admin giống các mutation Store hiện tại. `group_key` không được sửa.

### Danh mục

Tạo hoặc sửa danh mục yêu cầu `groupKey` hợp lệ. Service kiểm tra cụm Store tồn tại trong cùng transaction. Không cho chuyển danh mục sang cụm khác nếu danh mục đang chứa gói; quản trị viên phải chuyển hoặc xóa các gói trước.

### Gói

Khi lưu gói có `categoryId`, service xác nhận danh mục thuộc cùng `groupKey`. Nếu không khớp, trả lỗi validation có giới hạn và không ghi dữ liệu.

## Giao diện `/control/store`

### Điều hướng cụm

Đầu workspace là dải thẻ cụm Store. Mỗi thẻ hiển thị:

- Tên Store bằng `var(--font-pixel)`.
- Khóa kỹ thuật nhỏ hơn bằng font monospace.
- Trạng thái online/offline.
- Số danh mục và số gói.
- Nút sửa metadata cụm.

Thẻ được chọn có viền cyan và điểm nhấn tím; các thẻ còn lại giữ tương phản thấp hơn. Dải thẻ cuộn ngang trên màn hình hẹp và luôn để lộ một phần thẻ tiếp theo nhằm báo hiệu còn nội dung.

### Workspace theo cụm

Sau khi chọn cụm, nội dung chia thành:

1. Thanh tổng quan của cụm và các hành động `Thêm danh mục`, `Tạo gói`.
2. Danh sách danh mục dạng tab/chip có số gói; chọn một danh mục sẽ lọc catalog.
3. Lưới gói của cụm đang chọn, ảnh rõ, tên, giá, badge, trạng thái và nút chỉnh sửa.
4. Hàng đợi đơn hàng giữ nguyên ở phần dưới, có bộ lọc cụm hiện tại hoặc tất cả cụm.

Form danh mục tự gắn với cụm được chọn. Form gói chỉ liệt kê danh mục cùng cụm. Khi đổi cụm trong form gói, danh mục không phù hợp được đặt lại thành chưa phân loại.

### Typography và khả năng truy cập

- Font pixel chỉ dùng cho tên cụm, kicker và nhãn nhận diện ngắn; nội dung tiếng Việt dài tiếp tục dùng font sans để không giảm khả năng đọc.
- Tên cụm dùng cỡ responsive, line-height tối thiểu `1.35` vì `Press Start 2P` có chiều cao ký tự lớn.
- Giá và KPI dùng chữ số tabular để tránh xê dịch giao diện.
- Nút có vùng tương tác tối thiểu 44 px, trạng thái focus rõ và không dựa riêng vào màu sắc.
- Dialog sửa cụm có label thật, thông báo lỗi tại chỗ, khóa `group_key` chỉ đọc và trả focus về nút mở khi đóng.

## Store công khai

Catalog công khai nhận thêm danh sách cụm Store đang bật. Tên cụm ưu tiên `store_groups.display_name`; nếu metadata chưa tồn tại thì dùng nhãn telemetry hiện tại làm fallback. Danh mục được lọc theo `group_key`, nên hai cụm có thể dùng cùng slug như `ranks` mà không trộn gói.

Nếu một cụm Store bị tắt, gói của cụm đó không xuất hiện trong catalog công khai nhưng dữ liệu, đơn hàng cũ và delivery vẫn được giữ.

## Xử lý lỗi

- Cụm Store không tồn tại: `404`.
- Tên hiển thị, slug hoặc thứ tự không hợp lệ: `400` với thông báo ngắn.
- Danh mục và gói khác cụm: `409`.
- Chuyển danh mục đang có gói sang cụm khác: `409`.
- Lỗi MySQL không lộ câu SQL hay chi tiết nội bộ cho client.
- Mutation cụm, danh mục và gói ghi audit trong cùng transaction với thay đổi dữ liệu.

## Kiểm thử

- Schema và migration chạy mới lẫn chạy lại, đồng thời phát hiện danh mục cũ dùng chéo nhiều cụm.
- Validation tên hiển thị và `groupKey`.
- Service cập nhật cụm Store cùng audit trong một transaction.
- Service từ chối danh mục/gói bị gán chéo cụm.
- API bảo vệ bằng Control session, CSRF và quyền account-admin.
- UI có điều hướng cụm, bộ đếm, form sửa tên và font pixel đúng phạm vi.
- Store công khai nhóm đúng danh mục theo cụm và dùng tên Store tùy chỉnh.
- Toàn bộ test hiện có, TypeScript, ESLint và build vẫn đạt.

## Tiêu chí hoàn thành

- Quản trị viên có thể đổi `OP Skyblock` thành tên khác chỉ trong Store.
- Mỗi cụm quản lý độc lập nhiều danh mục và nhiều gói.
- Không thể gán gói vào danh mục của cụm khác.
- `/control/store` thể hiện rõ thứ bậc `Cụm -> Danh mục -> Gói` trên desktop và mobile.
- Tên cụm dùng font Minecraft hiện có mà nội dung tiếng Việt vẫn dễ đọc.
- Đơn hàng và delivery cũ không bị sửa hoặc xóa.
