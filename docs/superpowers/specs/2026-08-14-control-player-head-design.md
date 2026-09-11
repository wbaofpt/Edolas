# Control Player Head Design

## Mục tiêu

Hiển thị đầu skin Minecraft cạnh mỗi người chơi trong bảng `PLAYER DIRECTORY` tại `/control/minecraft` mà không thay đổi payload telemetry hoặc cơ sở dữ liệu.

## Thiết kế

- Tạo component client `MinecraftPlayerHead` nhận `uuid` và `username`.
- Chuẩn hóa UUID bằng cách chỉ giữ ký tự hex trước khi tạo URL ảnh.
- Tải avatar `40x40` từ MCHeads theo UUID.
- Ảnh là thông tin trang trí vì tên người chơi đã nằm ngay cạnh, do đó dùng `alt=""`.
- Trong lúc tải và khi ảnh lỗi, hiển thị chữ cái đầu của username trên nền cùng ngôn ngữ Control Center.
- Khung vuông pixel có viền cyan, chấm trạng thái online và không thêm animation lặp.
- Ô Player đổi thành layout ngang gồm đầu skin và khối tên/UUID; các cột còn lại giữ nguyên.

## Luồng lỗi

- UUID rỗng hoặc không hợp lệ: không gọi dịch vụ ảnh, dùng fallback.
- Ảnh từ MCHeads lỗi: `onError` khóa ảnh cho lần render đó và giữ fallback.
- Telemetry và bảng người chơi vẫn hoạt động bình thường khi dịch vụ ảnh ngoài không khả dụng.

## Kiểm thử

- Test helper chuẩn hóa UUID và tạo URL an toàn.
- Test source UI xác nhận có fallback, ảnh trang trí và layout player identity.
- Chạy toàn bộ test, TypeScript, lint và production build.
