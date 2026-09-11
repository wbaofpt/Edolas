# Secure Control Portal Design

## Muc tieu

Thay khu `/admin` bang cong dieu hanh doc lap `/control`, tach khoi giao dien website cong khai va chi mo sau khi tai khoan co quyen xac thuc lai bang mat khau va OTP Gmail.

## Xac thuc va phien

- Nguoi dung phai co phien website hop le va vai tro Owner/Admin/Staff.
- `/control/access` yeu cau nhap lai mat khau, sau do gui OTP den email cua chinh tai khoan.
- OTP ton tai 10 phut, toi da 5 lan thu va bi gioi han tan suat theo tai khoan.
- Xac minh OTP thanh cong tao cookie `edolas_control_session` rieng, `HttpOnly`, `Secure` tren production va `SameSite=Strict`.
- Phien Control het hieu luc sau 30 phut khong hoat dong. Moi request hop le cap nhat `last_used_at`.
- Dang xuat Control chi huy phien Control, khong dang xuat website.

## Bao ve request

- Mutation API nam tai `/api/control/*` va bat buoc phien Control.
- Moi mutation kiem tra `Origin` cung host va double-submit CSRF token rang buoc voi phien Control.
- Security headers cho `/control` va `/api/control`: CSP, `frame-ancestors 'none'`, no-store, nosniff, strict referrer va permissions policy.
- API cu `/api/admin/*` khong con thuc hien mutation; route `/admin/*` chuyen huong sang `/control/*`.
- Moi quyen han van duoc kiem tra server-side bang ma tran Owner/Admin/Staff/Player.

## Quan ly thanh vien

- Khoa/mở khoa, thu hoi phien va doi vai tro nhu hien tai.
- Vo hieu hoa theo 1-365 ngay cho Admin/Owner; chi Owner co the vo hieu hoa vinh vien.
- Vo hieu hoa thu hoi toan bo phien website va Control, giu nguyen profile/bai viet.
- Tai khoan tu hoat dong lai khi het han; Owner khong the bi tac dong.
- Admin chi khoi tao reset mat khau qua email. Mat khau khong hien thi va Admin khong duoc dat mat khau thay nguoi dung.

## Pham vi dieu hanh

- Thanh vien, dien dan, Wiki, media, thong bao, che do choi, noi quy, thong ke server, cau hinh, phien va audit.
- Xoa noi dung dung thung rac 30 ngay; xoa vinh vien chi Admin/Owner va co xac nhan.
- Thay doi cau hinh cong khai phan anh truc tiep tren website.

## Giao dien

- `/control` khong hien SiteHeader, cinematic loader, ambient world hay footer website.
- Menu tai khoan mo `/control` trong tab moi.
- Access screen va Control shell co visual language dark command-center, ban phim dung duoc, focus ro va reduced-motion.
- Thanh dieu huong gom Tong quan, Thanh vien, Noi dung, Website, Wiki, Bao mat, Nhat ky va Cai dat; item tu an theo quyen.

## Tieu chi hoan tat

- Phien website khong the goi mutation Control.
- Password + OTP + control cookie + idle timeout hoat dong va co test.
- CSRF/origin va security headers co test.
- Vo hieu hoa co thoi han/vinh vien dung phan quyen va revoke session.
- `/control` SSR khong render chrome website; `/admin` redirect.
- Migration replay-safe; test, typecheck, lint, build va migration MySQL deu qua.
