# Edolas Control Center Design

## Muc tieu

Xay dung mot khu quan tri tong hop tai `/admin` de nhom van hanh theo doi va kiem soat tai khoan, noi dung, Wiki, dien dan, media, cau hinh cong khai va bao mat cua website bang du lieu MySQL that.

## Phan quyen

- `owner`: quyen cao nhat, duy nhat danh cho username `edolas_admin`; khong the bi khoa, xoa hoac ha quyen.
- `admin`: quan ly tai khoan cap `staff` va `player`, thu hoi phien, quan ly noi dung, cau hinh va audit.
- `staff`: quan ly noi dung, Wiki, dien dan va media; khong duoc sua tai khoan, vai tro hoac cau hinh he thong.
- `player`: khong duoc truy cap khu quan tri.
- Moi API quan tri phai tu kiem tra session va quyen o server; an nut tren giao dien khong duoc xem la bao mat.

## An toan tai khoan

- Khoa tai khoan giu nguyen profile va noi dung, xoa toan bo session hien tai va chan dang nhap moi.
- Thu hoi phien khong khoa tai khoan.
- Owner khong the tu khoa, bi khoa, bi thu hoi quyen hoac bi ha quyen.
- Thay doi vai tro va trang thai tai khoan luon ghi audit log.

## Noi dung va thung rac

- Trung tam noi dung tong hop bai dien dan, bai Wiki va media.
- Xoa noi dung la soft-delete vao thung rac trong 30 ngay; co the khoi phuc trong thoi gian nay.
- Xoa vinh vien la hanh dong rieng, chi Owner/Admin duoc phep va phai xac nhan ro rang.
- Noi dung da xoa khong xuat hien tren trang cong khai.

## Cau hinh va nhat ky

- Cau hinh co nhom: thuong hieu, ket noi server, lien ket cong dong va bao tri.
- Gia tri cong khai duoc luu tai `site_settings`; secret khong duoc hien thi hay chinh sua trong UI nay.
- Audit log la bat bien tu giao dien, gom actor, hanh dong, doi tuong, mo ta va thoi gian.

## Giao dien

- Huong thiet ke: dark cinematic command center, phu hop bang mau `#080B18`, `#8B5CF6`, `#38BDF8`, `#67E8F9` va `#F8FAFC` hien co.
- Desktop dung sidebar co nhom; mobile dung thanh dieu huong cuon ngang gon, khong gay tran ngang trang.
- Dashboard co KPI, health strip, quick actions, recent activity va bang can xu ly.
- Bang co search/filter, label cot ro, empty/loading/error states, focus ring, touch target toi thieu 44px.
- Motion chi dung opacity/transform 180-320ms, co `prefers-reduced-motion`.
- Menu tai khoan moi hien avatar, ten, username, badge vai tro, link profile, link Control Center khi co quyen va dang xuat tach biet.

## Tieu chi hoan tat

- Migration chay lap lai an toan va dat `edolas_admin` thanh Owner duy nhat.
- Login/session tu choi tai khoan bi khoa.
- Quyen Owner/Admin/Staff/Player co unit test va route test.
- Dashboard va cac trang thanh vien, noi dung, cau hinh, audit lay du lieu MySQL that.
- Cac thao tac quan tri co feedback ro va audit log.
- `npm test`, `tsc --noEmit`, `npm run lint` va `npm run build` deu qua.
