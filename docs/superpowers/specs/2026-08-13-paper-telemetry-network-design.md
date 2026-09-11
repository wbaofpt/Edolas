# Paper Telemetry Network Design

## Muc tieu

Tao plugin Paper 1.21 dung chung cho nhieu server Minecraft de day snapshot ve website EdolasSG. Website hien thi cong khai tong nguoi choi online/toi da va trang thai tung cum; Control Center cung cap so lieu van hanh chi tiet cho Owner/Admin.

He thong phai khong chan main thread cua Paper, khong lam hong website khi server game mat ket noi, va khong de lo danh tinh nguoi choi qua API cong khai.

## Pham vi

### Co trong phien ban dau

- Nhieu server backend cung gui du lieu ve mot website.
- So nguoi online/toi da, trang thai, TPS, MSPT, RAM, uptime va phien ban server.
- Thong ke world: ten world, so nguoi va so chunk dang load.
- Danh sach nguoi online: UUID, username, ping va world hien tai.
- Kiem tra trang thai cac plugin quan trong theo allowlist cau hinh.
- Tong hop toan network va theo `group`.
- So lieu cong khai tren trang chu; man hinh chi tiet tai `/control/minecraft`.
- Snapshot hien tai, khong luu lich su dai han.

### Khong co trong phien ban dau

- Dieu khien server, chay command, kick/ban hoac nhan tin tu website.
- WebSocket thoi gian thuc; website dung snapshot moi nhat va polling hop ly.
- Luu lich su TPS, bieu do dai han hoac he thong canh bao ngoai website.
- Cong khai username, UUID, ping, world hay danh sach plugin.

## Kien truc tong the

Moi Paper server cai cung mot plugin trong `plugins/edolas-telemetry`. Plugin tao snapshot tren server thread, chuyen snapshot thanh du lieu bat bien, sau do gui HTTPS bat dong bo den `POST /api/minecraft/telemetry` moi 10 giay.

API xac minh chu ky HMAC, timestamp va nonce truoc khi parse/ghi du lieu. Mot transaction MySQL se upsert snapshot server, thay the danh sach nguoi online cua server do va danh dau nonce da dung. Website doc cac snapshot con moi, tong hop thanh network/group va chi dua du lieu an toan vao giao dien cong khai.

Ranh gio module:

- Plugin collector: chi doc Paper API va tao snapshot.
- Plugin transport: chi ky, gui, retry va gioi han log.
- Telemetry verifier: chi xac minh request tho.
- Telemetry repository: chi ghi/doc MySQL theo transaction.
- Public aggregator: chi tra du lieu tong hop khong dinh danh.
- Control service: tra du lieu van hanh day du sau khi kiem tra quyen.

## Plugin Paper 1.21

### Nen tang va cau truc

- Java 21.
- Gradle Kotlin DSL va Gradle Wrapper.
- Paper API dong 1.21, `api-version: '1.21'`.
- Artifact: `plugins/edolas-telemetry/build/libs/edolas-telemetry-<version>.jar`.
- Package Java rieng cho config, collector, model, signing, transport va scheduler.

### Cau hinh

`config.yml` gom:

- `server-id`: ID duy nhat, dinh dang chu thuong/so/dau gach ngang, toi da 40 ky tu.
- `group`: cum de tong hop, vi du `lobby`, `survival`, `skyblock`.
- `display-name`: ten hien thi trong Control Center.
- `endpoint`: URL HTTPS cua API website.
- `api-key`: bi mat rieng cua server, toi thieu 32 byte ngau nhien.
- `interval-seconds`: mac dinh 10, cho phep 5-60.
- `connect-timeout-seconds`: mac dinh 5.
- `request-timeout-seconds`: mac dinh 8.
- `critical-plugins`: allowlist plugin can kiem tra, khong tu dong gui toan bo danh sach plugin.

Plugin tu choi khoi dong transport neu ID/key/endpoint khong hop le, nhung khong lam dung Paper server. Log phai neu ro truong cau hinh sai ma khong in API key.

### Thu thap va gui

- Doc Paper/Bukkit state tren server thread de tranh truy cap API khong an toan.
- Tao immutable snapshot, sau do serialize va gui bang Java `HttpClient` bat dong bo.
- Moi server chi co toi da mot request dang gui. Neu chu ky moi den khi request cu chua xong, bo qua chu ky moi thay vi xep hang vo han.
- Loi mang dung exponential backoff co jitter, toi da 60 giay.
- Log khi trang thai ket noi thay doi; loi lap lai bi gioi han de khong spam console.
- Khong ghi queue snapshot xuong dia. Snapshot cu khong co gia tri sau khi ket noi phuc hoi.
- Khi plugin disable, huy scheduler va request dang cho; khong chan shutdown de retry.

### Payload

Payload JSON co `schemaVersion: 1` va cac nhom:

- `server`: ID, group, display name, Minecraft/Paper version, started-at va uptime.
- `capacity`: online va max players.
- `performance`: TPS 1/5/15 phut, MSPT, RAM used/max.
- `worlds`: name, player count va loaded chunks; toi da 32 world.
- `players`: UUID, username, ping va world; toi da bang `max-players` va khong qua 1.000 ban ghi.
- `pluginHealth`: chi cac plugin trong allowlist, gom name, version va enabled.
- `reportedAt`: thoi gian UTC do plugin tao.

Gia tri so duoc clamp va payload phai nho hon 256 KiB. Snapshot vuot gioi han bi huy va ghi mot canh bao co gioi han.

## Giao thuc va bao mat API

### Request

Endpoint: `POST /api/minecraft/telemetry`

Header bat buoc:

- `Content-Type: application/json`
- `X-Edolas-Server-Id`
- `X-Edolas-Timestamp`: Unix time theo giay.
- `X-Edolas-Nonce`: chuoi ngau nhien duy nhat moi request.
- `X-Edolas-Signature`: `v1=<hex-hmac>`.

Chuoi chuan de ky:

```text
v1\n<server-id>\n<timestamp>\n<nonce>\n<sha256-hex(raw-body)>
```

Chu ky la HMAC-SHA-256 cua chuoi tren bang key rieng cua server. Website nap mapping key tu bien moi truong `MINECRAFT_TELEMETRY_KEYS`, dang JSON `server-id -> secret`; key khong duoc luu trong MySQL hay gui ve client.

### Thu tu xac minh

1. Chi chap nhan HTTPS trong production va `application/json`.
2. Tu choi body lon hon 256 KiB.
3. Kiem tra `server-id`, timestamp lech khong qua 60 giay va nonce hop le.
4. Tim key theo server ID; loi xac thuc chi tra thong bao chung.
5. So sanh HMAC bang phep so sanh constant-time.
6. Kiem tra nonce chua duoc dung.
7. Parse va validate schema cung tat ca gioi han.
8. Ghi snapshot, players va nonce trong mot transaction.

Moi server chi duoc chap nhan toi da mot snapshot trong 3 giay. Nonce het han sau 2 phut va duoc don dinh ky. Request sai khong ghi mot phan du lieu nao va khong log key/body/player list.

## Du lieu MySQL

Migration replay-safe tao ba bang:

### `minecraft_servers`

- `server_id` lam primary key.
- `group_key`, `display_name`, `minecraft_version`, `paper_version`.
- `online_players`, `max_players`.
- `tps_1m`, `tps_5m`, `tps_15m`, `mspt`.
- `memory_used_bytes`, `memory_max_bytes`, `uptime_seconds`.
- `worlds_json`, `plugin_health_json`.
- `reported_at`, `last_seen_at`, `created_at`, `updated_at`.

### `minecraft_online_players`

- Primary key ket hop `server_id` va `player_uuid`.
- `username`, `ping`, `world_name`, `observed_at`.
- Foreign key den `minecraft_servers`, cascade delete.
- Danh sach cua mot server duoc thay the trong cung transaction voi snapshot.

### `minecraft_telemetry_nonces`

- Primary key ket hop `server_id` va SHA-256 cua nonce.
- `expires_at` va index phuc vu don du lieu.
- Chi luu hash nonce, khong can luu chuoi goc.

Bang `server_stats` hien tai van quan ly cac thong ke noi dung. Khi doc noi dung trang chu, service se ghi de `online_today` trong ket qua in-memory bang network aggregate that; khong ghi nguoc vao `server_stats` va khong tao side effect trong luc render.

## Trang thai va tong hop

- Snapshot co `last_seen_at` khong qua 30 giay la online.
- Qua 30 giay server la offline va so online cua no duoc tinh bang 0.
- `max_players` dung gia tri hop le gan nhat cua cac server da dang ky, ke ca khi tam offline.
- Network `online` khi tat ca server da biet con moi.
- Network `degraded` khi it nhat mot server online va it nhat mot server offline.
- Network `offline` khi khong con snapshot nao moi.
- Group dung cung quy tac va chi tong hop cac server co cung `group_key`.
- Player rows cu co the con trong DB de chan transaction lon, nhung khong bao gio duoc tra ra neu snapshot server da stale.

Neu migration chua chay hoac DB loi, trang cong khai fallback ve noi dung hien tai thay vi lam hong render. Control Center hien trang thai khong the nap telemetry, khong gia lap du lieu thanh cong.

## API doc va quyen rieng tu

### Du lieu cong khai

Public service chi tra:

- Trang thai network.
- Tong online/toi da.
- `lastUpdatedAt` cua snapshot moi nhat.
- Tung group: key, display label, online/toi da va status.

Khong route cong khai nao tra username, UUID, ping, world list, plugin health, dia chi backend hay payload tho.

### Control Center

Trang `/control/minecraft` bat buoc Control session. Metrics van hanh chi tiet va danh sach nguoi choi chi mo cho vai tro Owner/Admin bang `canManageUsers`; Staff bi chuyen ve `/control` va API tra 403.

Man hinh gom:

- Tong quan network va muc do moi cua snapshot.
- Danh sach server/group voi online/max, TPS, MSPT, RAM, uptime va version.
- World summary va critical plugin health.
- Bang player co username, UUID rut gon, ping, world va server hien tai.
- Empty/error/offline states ro rang; polling 10 giay va dung polling khi tab bi an.

Tat ca Control response dung `no-store`; mutation/command khong nam trong pham vi.

## Tich hop giao dien cong khai

- Thay gia tri `online_today` tinh tren trang chu bang network aggregate that.
- Khu ket noi PC/PE co badge `ONLINE`, `DEGRADED` hoac `OFFLINE` va hien `online / max`.
- Co the hien cac chip group nho, nhung khong them player directory cong khai.
- SSR phai render duoc khi telemetry chua co; polling client chi cap nhat phan so lieu.
- Motion nhe, ton trong `prefers-reduced-motion`, khong them animation lam reflow lien tuc.

## Xu ly loi

- Plugin: loi collector bo snapshot do; loi transport backoff; khong retry payload stale.
- API: `400` cho schema sai, `401` cho xac thuc sai, `409` cho nonce da dung, `413` cho payload lon, `429` cho qua tan suat, `500` cho transaction loi.
- Log server-side chi gom request ID, server ID hop le, ma loi va latency; khong gom key/body/player list.
- Transaction rollback toan bo neu mot buoc ghi that bai.
- Website coi server offline theo thoi gian DB, khong tin field `status` do plugin gui.

## Kiem thu

### Website

- Unit test canonical signing, HMAC, constant-time verification, timestamp va nonce.
- Validation test cho schema version, ID, gioi han world/player/plugin va payload.
- HTTP test cho status code, replay, rate limit va transaction failure.
- Repository test cho upsert server va replace players trong transaction.
- Aggregation test cho nhieu server/group, stale snapshot va network status.
- Authorization test xac nhan public khong co PII va Staff khong doc duoc player list.
- UI test cho online/degraded/offline, loading/error va polling visibility.
- Chay `npm test`, lint, TypeScript va production build.

### Plugin

- JUnit 5 test signer va canonical request.
- Test serializer/clamp/payload limits bang model khong phu thuoc Paper.
- Test one-in-flight, retry/backoff va log state transition voi transport fake.
- Build Gradle va kiem tra JAR co `paper-plugin.yml`/`plugin.yml` va config mac dinh.
- Smoke test tren Paper 1.21 local: enable, gui snapshot, disable va timeout website.

## Trien khai va van hanh

1. Chay migration MySQL.
2. Tao key ngau nhien rieng cho tung `server-id` va dat mapping vao bien moi truong website.
3. Build/copy JAR vao moi Paper server, cau hinh ID/group/display name/endpoint/key.
4. Restart tung backend, xac nhan snapshot trong Control Center.
5. Sau khi tat ca server da gui du lieu, bat hien thi aggregate that tren trang chu.

Key bi lo phai duoc rotate rieng cho server do. Xoa key khoi website se thu hoi quyen gui ngay lap tuc. Backup MySQL khong chua telemetry secret.

## Tieu chi hoan tat

- Hai Paper server tro len co the gui snapshot va duoc tong hop dung theo network/group.
- Trang cong khai hien online/max that va khong lo bat ky du lieu dinh danh nao.
- Chi Owner/Admin voi Control session doc duoc danh sach player va health chi tiet.
- Request gia, qua han, replay, qua lon va qua tan suat deu bi tu choi.
- Plugin khong thuc hien network I/O tren server thread va khong xep queue vo han.
- Server stale tu dong ve offline sau 30 giay; website van render khi telemetry/DB loi.
- Test website, build Next.js, test plugin va build JAR deu qua.
