# Wiki Batch Media And Cluster Navigation

## Mục tiêu

Mở rộng trải nghiệm Wiki theo hai hướng:

1. Staff có thể chọn và tải nhiều ảnh, GIF hoặc video trong một lần, theo dõi trạng thái từng tệp và chèn toàn bộ media thành công vào bài theo đúng thứ tự đã chọn.
2. Người đọc có thể chuyển nhanh sang các bài Wiki đã xuất bản khác trong cùng cụm mà không cần quay về trang danh sách.

Tính năng tiếp tục sử dụng bảng `wiki_media`, cú pháp token media và bảng `wiki_pages` hiện tại. Không cần migration database mới.

## Upload nhiều media

### Chọn tệp

- Nút `Ảnh`, `GIF`, `Video` hiện tại được giữ lại.
- Mỗi bộ chọn hỗ trợ thuộc tính `multiple`.
- Một lượt chọn có thể thêm nhiều tệp vào hàng đợi; các lượt chọn tiếp theo nối thêm, không xóa hàng đợi đang có.
- Loại và giới hạn giữ nguyên:
  - JPG, PNG, WebP, GIF: tối đa 10 MB mỗi tệp.
  - MP4, WebM: tối đa 50 MB mỗi tệp.
- Tệp sai định dạng, vượt giới hạn hoặc trùng trong cùng hàng đợi được báo ngay tại dòng tương ứng.

### Hàng đợi

Mỗi dòng hiển thị:

- Tên tệp và dung lượng.
- Loại media bằng icon.
- Ô chú thích riêng, tối đa 300 ký tự.
- Trạng thái `Chờ tải`, `Đang tải`, `Đã tải`, hoặc `Lỗi`.
- Thanh tiến trình riêng.
- Nút xóa khi chưa tải và nút thử lại khi lỗi.

Upload chạy tuần tự, mỗi lần một tệp. Cách này giảm đỉnh sử dụng RAM trên VPS và giữ phản hồi API ổn định với video lớn.

### Chèn vào nội dung

- Tất cả tệp tải thành công được gom theo thứ tự ban đầu.
- Sau khi hàng đợi kết thúc, editor chèn một nhóm token media tại vị trí con trỏ hiện tại.
- Các token cách nhau bằng một dòng trống để renderer tạo các khối media độc lập.
- Editor dùng cập nhật state dạng hàm để không ghi đè nội dung người dùng vừa nhập trong lúc upload.
- Tệp lỗi không tạo token; người dùng có thể thử lại rồi chèn phần thành công còn thiếu.
- Nút lưu bài vẫn hoạt động. Media đã tải nhưng chưa chèn vẫn tồn tại trong thư viện upload; hệ thống không đưa đường dẫn ngoài `/uploads/wiki/` vào nội dung.

### Phản hồi và accessibility

- Tổng tiến trình hiển thị dạng `x/y tệp hoàn tất`.
- Trạng thái thay đổi được công bố bằng `aria-live="polite"`.
- Nút có tên truy cập rõ ràng, vùng bấm tối thiểu 44px và trạng thái focus hiện hữu.
- Chuyển động chỉ dùng opacity/transform; reduced-motion loại bỏ chuyển động không thiết yếu.

## Điều hướng Wiki cùng cụm

### Dữ liệu

- Trang bài viết gọi `listPublishedWikiPages(page.clusterSlug)` sau khi tải bài hiện tại.
- Chỉ bài đã xuất bản trong cùng cụm được đưa vào điều hướng.
- Thứ tự dùng quy tắc hiện tại: `sort_order`, sau đó `title`.
- Bài hiện tại được xác định bằng `page.id`; bài trước và bài sau được suy ra từ vị trí trong danh sách.
- Nếu truy vấn danh sách lỗi, nội dung bài vẫn hiển thị và thanh điều hướng chuyển sang trạng thái tối giản thay vì làm trang 404.

### Desktop

- Bố cục trang đọc mở rộng thành hai cột: nội dung chính và sidebar khoảng 18rem.
- Sidebar sticky nằm dưới header, có tiêu đề cụm, số bài và danh sách liên kết.
- Bài hiện tại có vạch cyan, nền sáng nhẹ, `aria-current="page"` và nhãn `Đang đọc`.
- Các bài khác hiển thị số thứ tự, tiêu đề và tóm tắt ngắn một dòng.
- Cuối sidebar có hai nút `Bài trước` và `Bài tiếp theo`; nút không có đích được ẩn.

### Mobile và tablet

- Dưới 960px, sidebar chuyển thành dock ngang đặt phía trên bài viết.
- Danh sách cuộn ngang bằng thao tác native, mỗi mục có chiều rộng ổn định và không gây cuộn ngang toàn trang.
- Bài hiện tại tự nổi bật; các nút trước/sau nằm dưới nội dung bài để thao tác thuận tiện bằng ngón cái.

### Visual direction

- Giữ hệ màu xanh đen, tím điện, sapphire và cyan của website.
- Sidebar mang phong cách `knowledge rail`: đường dẫn dọc, chỉ số pixel và điểm sáng cyan cho bài hiện tại.
- Hiệu ứng hover dịch chuyển tối đa 2px, nhanh 180ms; không thêm animation trang trí liên tục.

## Thành phần dự kiến

- Mở rộng `WikiMediaUploader` thành hàng đợi upload tuần tự.
- Mở rộng callback của `WikiArticleEditor` để nhận một mảng media đã tải và chèn theo nhóm.
- Thêm `WikiClusterRail` nhận danh sách bài, ID hiện tại và slug cụm.
- Trang `app/wiki/[slug]/page.tsx` tải danh sách cùng cụm và dựng bố cục rail + article.
- Bổ sung CSS responsive trong vùng Wiki hiện có của `app/globals.css`.

## Kiểm thử chấp nhận

- Chọn nhiều tệp tạo đúng số hàng đợi và input có `multiple`.
- Upload chạy tuần tự, giữ thứ tự và lỗi một tệp không dừng các tệp còn lại.
- Retry chỉ tải lại tệp lỗi.
- Nhóm token được chèn theo đúng thứ tự và không làm mất nội dung vừa nhập.
- Renderer hiển thị nhiều ảnh, GIF và video trong cùng một bài.
- Service chỉ trả bài đã xuất bản trong đúng cụm và đúng thứ tự.
- Rail đánh dấu bài hiện tại bằng `aria-current="page"`.
- Trang có liên kết bài trước/bài tiếp theo đúng vị trí.
- Desktop dùng sticky sidebar; mobile dùng danh sách ngang không tràn viewport.
- Toàn bộ test, TypeScript, lint và production build đều qua.

## Ngoài phạm vi

- Kéo thả để đổi thứ tự media.
- Chuyển mã hoặc nén video phía server.
- Crop/chỉnh sửa ảnh.
- Thư viện media dùng chung giữa nhiều bài.
- Điều hướng sang bài ở cụm khác ngay trong sidebar bài viết.
