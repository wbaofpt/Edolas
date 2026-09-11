# Wiki Batch Media And Cluster Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Cho phép upload tuần tự nhiều media vào một bài Wiki và điều hướng nhanh giữa các bài đã xuất bản trong cùng cụm.

**Architecture:** Giữ API upload một-tệp hiện tại và xây hàng đợi tuần tự hoàn toàn ở client để không tăng tải đồng thời lên VPS. Dữ liệu điều hướng tái sử dụng `listPublishedWikiPages(clusterSlug)`; component rail thuần nhận danh sách và ID hiện tại để suy ra bài trước/sau mà không thêm schema.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, MySQL, CSS thuần/Tailwind utilities, Node test runner.

## Global Constraints

- Không thêm dependency hoặc migration database.
- Chỉ staff được upload; giới hạn mỗi tệp giữ nguyên 10 MB cho ảnh/GIF và 50 MB cho video.
- Upload tuần tự, lỗi một tệp không dừng hàng đợi.
- Chỉ renderer token `/uploads/wiki/` an toàn hiện tại được sử dụng.
- Desktop có sticky rail; dưới 960px chuyển sang dock ngang và điều hướng trước/sau cuối bài.
- Tất cả control có accessible name, focus rõ và hit area tối thiểu 44px.

---

### Task 1: Cluster Rail Data And Navigation

**Files:**
- Create: `components/wiki/wiki-cluster-rail.tsx`
- Modify: `app/wiki/[slug]/page.tsx`
- Modify: `app/globals.css`
- Test: `tests/wiki-cluster-rail.test.mts`

**Interfaces:**
- Consumes: `WikiPageSummary[]`, `currentPageId: number`, `clusterName: string`, `clusterSlug: string`.
- Produces: `WikiClusterRail` với link có `aria-current="page"`, cùng helper `getAdjacentWikiPages(pages, currentPageId)` trả `{ previous, next }`.

- [ ] **Step 1: Viết test đỏ cho rail và helper trước/sau**

Test xác nhận bài hiện tại, thứ tự link, bài trước/sau, query cùng cụm và CSS sticky/mobile dock.

- [ ] **Step 2: Chạy test mục tiêu và xác nhận fail vì component chưa tồn tại**

Run: `node --experimental-strip-types --test tests/wiki-cluster-rail.test.mts`

- [ ] **Step 3: Tạo component và tích hợp trang đọc**

Trang tải `listPublishedWikiPages(page.clusterSlug)`, render rail bên cạnh article và prev/next dưới nội dung.

- [ ] **Step 4: Chạy test mục tiêu đến khi pass**

Run: `node --experimental-strip-types --test tests/wiki-cluster-rail.test.mts tests/wiki-service.test.mts`

### Task 2: Sequential Multi-Media Queue

**Files:**
- Create: `lib/wiki/upload-queue.ts`
- Modify: `components/wiki/wiki-media-uploader.tsx`
- Modify: `components/wiki/wiki-article-editor.tsx`
- Modify: `lib/wiki/content.ts`
- Modify: `app/globals.css`
- Test: `tests/wiki-upload-queue.test.mts`
- Test: `tests/wiki-media-reader-ui.test.mts`

**Interfaces:**
- Produces: `WikiUploadQueueItem`, `appendWikiUploadFiles`, `updateWikiUploadItem`, `buildWikiMediaGroupToken`.
- `WikiMediaUploader.onUploaded` nhận `UploadedMediaWithCaption[]` theo đúng thứ tự hàng đợi.

- [ ] **Step 1: Viết test đỏ cho thêm nhiều tệp, chống trùng, cập nhật riêng từng dòng và token nhóm**

- [ ] **Step 2: Chạy test và xác nhận fail vì module/helper chưa tồn tại**

Run: `node --experimental-strip-types --test tests/wiki-upload-queue.test.mts tests/wiki-media-reader-ui.test.mts`

- [ ] **Step 3: Cài đặt model hàng đợi thuần và upload XHR tuần tự**

Mỗi file có ID ổn định, caption, progress và trạng thái; vòng lặp tiếp tục sau lỗi. Retry chỉ đặt lại dòng lỗi và chạy riêng dòng đó.

- [ ] **Step 4: Tích hợp chèn nhóm vào editor bằng state updater**

Nhóm token được nối bằng hai newline và chèn một lần tại selection mới nhất khi batch kết thúc.

- [ ] **Step 5: Chạy test mục tiêu đến khi pass**

Run: `node --experimental-strip-types --test tests/wiki-upload-queue.test.mts tests/wiki-media-reader-ui.test.mts tests/wiki-media.test.mts`

### Task 3: Responsive Polish And Verification

**Files:**
- Modify: `app/globals.css`
- Modify: tests ở Task 1-2 nếu review chỉ ra khoảng trống hành vi.

**Interfaces:** Không tạo interface mới.

- [ ] **Step 1: Kiểm tra accessibility tĩnh**

Xác nhận input có label, icon-only controls có `aria-label`, queue dùng list semantics, trạng thái dùng `role="status"`/`aria-live`, rail dùng nav/list/link.

- [ ] **Step 2: Kiểm tra responsive và reduced motion trong CSS**

Rail sticky từ 960px; dock ngang dưới breakpoint; không gây `overflow-x` toàn trang; transition chỉ transform/color/opacity.

- [ ] **Step 3: Chạy xác minh đầy đủ**

Run: `npm test`

Run: `npx tsc --noEmit`

Run: `npm run lint`

Run: `npm run build`
