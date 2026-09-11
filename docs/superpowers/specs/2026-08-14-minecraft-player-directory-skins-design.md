# Minecraft Player Directory And Mojang Skins Design

## Goal

Làm rõ trang `/control/minecraft`, thêm bộ lọc người chơi và hiển thị skin hiện tại bằng tên Minecraft thay vì UUID offline của Bungee/Paper.

## Root Cause

Dashboard hiện gửi UUID từ `Player#getUniqueId()` sang MCHeads. Trên mạng Bungee chạy backend offline-mode, UUID này có thể không phải UUID tài khoản Mojang nên ảnh trả về là Steve dù người chơi có skin. Tên cụm và tên hiển thị được đặt cạnh nhau không có phân cấp, còn grid hai cột giữ nửa màn hình trống khi cụm chỉ có một backend.

## Mojang Skin Flow

- Trình duyệt yêu cầu `GET /api/control/minecraft/player-skin/[username]` bằng Control cookie hiện tại.
- Handler chỉ cho Owner/Admin, xác thực username theo `[A-Za-z0-9_]{1,16}` rồi gọi module `resolveMojangSkinUrl(username, fetch?)`.
- Module tra UUID từ `api.mojang.com`, đọc texture property từ `sessionserver.mojang.com`, giải mã Base64 và chỉ chấp nhận URL HTTPS tại `textures.minecraft.net/texture/<hash>`.
- Route trả redirect có cache riêng 5 phút. Upstream fetch dùng revalidation 5 phút để tránh gọi Mojang theo mỗi lần polling.
- Player head dùng hai lớp CSS crop từ skin PNG: mặt tại tọa độ 8,8 và lớp mũ tại 40,8. Ký tự đầu tên luôn nằm dưới làm fallback; không dùng Steve giả khi Mojang không tìm thấy tài khoản.
- Tên đổi được nhận ở snapshot telemetry tiếp theo và tạo URL route mới. Skin đổi được cập nhật sau cửa sổ cache tối đa 5 phút.

## Player Filters

- Thanh tìm kiếm giữ chức năng tìm tên, UUID, cụm, backend và world.
- Thêm select Cụm, Backend, World và Ping (`Tất cả`, `<= 50 ms`, `51-100 ms`, `> 100 ms`).
- Backend options phụ thuộc cụm đang chọn; đổi cụm sẽ xóa backend filter cũ.
- Hiển thị `n / tổng người chơi` và nút `Xóa bộ lọc` khi có điều kiện lọc.
- Tất cả input/select có label thật hoặc accessible name, focus visible và reflow trên mobile.

## Cluster And Backend Layout

- Summary hiển thị tên cụm là heading chính; slug nằm ở dòng metadata riêng, không ghép sát thành một chuỗi.
- Backend card hiển thị `BACKEND // server-id`; tên hiển thị nằm ở heading riêng.
- Nếu một cụm có đúng một backend, card chiếm toàn bộ chiều ngang. Hai backend trở lên mới dùng grid hai cột ở màn hình rộng.
- Plugin health dùng formatter loại bỏ phần tên trùng nhau, ví dụ chỉ còn `OP Skyblock / v5.5.55` thay vì lặp hai lần.

## Security And Failure Handling

- Không nhận URL do người dùng cung cấp và không redirect sang host ngoài whitelist.
- Route skin không công khai cho phiên website thường; chỉ Control session có quyền quản lý tài khoản được truy cập.
- Mojang 404, payload sai, timeout hoặc texture không an toàn đều trả 404/no-store; UI giữ fallback ký tự.
- CSP thay `mc-heads.net` bằng `textures.minecraft.net`; không thêm wildcard.

## Verification

- Unit tests cho username, Base64 texture, whitelist host/path, lỗi upstream và cache route.
- Unit tests cho tổ hợp filter và formatter vị trí không lặp.
- UI source test cho labels, count, clear action, single-card layout và lớp crop skin.
- Chạy toàn bộ Node tests, Gradle plugin tests không cần thay plugin, production build, TypeScript và ESLint.
