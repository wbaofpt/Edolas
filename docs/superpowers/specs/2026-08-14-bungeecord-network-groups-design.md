# BungeeCord Network Groups Design

## Muc tieu

Mo rong telemetry hien tai cho network BungeeCord gom nhieu Paper backend. Website phai hien tong nguoi choi online tren toan network, hien trang thai va so nguoi choi cua tung che do, va cho Owner/Admin xem telemetry theo cum tai `/control/minecraft`.

Thiet ke giu nguyen nguyen tac bao mat hien tai: moi Paper backend co mot key HMAC rieng, key chi nam trong bien moi truong website va `config.yml` cua backend, khong luu key trong MySQL.

## Pham vi

### Bao gom

- Cong tong online cua moi Paper backend con gui snapshot hop le.
- Tu dong map `minecraft_servers.group_key` voi `game_modes.slug`.
- Hien ONLINE/OFFLINE va tong online tren tung the che do choi.
- Bo max player khoi moi giao dien cong khai.
- Chia Control Minecraft theo cum, sau do moi den tung backend.
- Them CLI tao cau hinh cho nhieu backend va cap nhat `MINECRAFT_TELEMETRY_KEYS`.
- Cap nhat tai lieu cai dat cho BungeeCord/Pterodactyl.

### Khong bao gom

- Plugin chay truc tiep tren BungeeCord/Waterfall/Velocity.
- Sua `.env` tu giao dien web dang chay.
- Luu API key trong MySQL.
- Tu dong sao chep JAR/config vao Pterodactyl qua API.
- Thay doi giao thuc snapshot schema v1 hoac chu ky HMAC hien tai.

## Mo hinh van hanh

Plugin EdolasTelemetry duoc cai tren moi Paper backend. Proxy BungeeCord khong can plugin.

Moi backend co:

- `server-id`: dinh danh duy nhat tren network, vi du `survival-01`.
- `group`: slug che do choi, vi du `survival`.
- `display-name`: ten de admin nhan biet, vi du `Survival 01`.
- `api-key`: key rieng khop voi entry cung `server-id` trong `MINECRAFT_TELEMETRY_KEYS`.

Vi du:

```text
survival-01  -> group survival
survival-02  -> group survival
skyblock-01  -> group op-skyblock
lobby-01     -> group lobby
```

Nguoi choi tren BungeeCord chi o mot backend tai mot thoi diem. Website cong `online_players` cua moi backend co `last_seen_at` khong qua 30 giay. Sai so ngan trong luc chuyen server co the ton tai toi mot chu ky snapshot (mac dinh 10 giay), sau do snapshot moi tu hai backend tu hieu chinh.

## Trang thai va phep tong

### Toan network

- `online`: tong `online_players` cua tat ca backend fresh.
- `status = online`: co it nhat mot backend fresh.
- `status = offline`: khong co backend fresh.
- Backend stale khong dong gop nguoi choi.
- Khong cong `max_players` vao du lieu cong khai.

Header/connection dock hien:

```text
ONLINE 125
```

Khong hien dang `125 / 2026`.

### Tung cum

Cum duoc tao tu cac row co cung `group_key`.

- `online`: tong nguoi choi cua backend fresh trong cum.
- `status = online`: cum co it nhat mot backend fresh.
- `status = offline`: cum khong co backend fresh.
- `activeServers`: so backend fresh.
- `totalServers`: tong so backend da tung dang ky trong cum.
- Control co the suy ra `degraded` khi `activeServers > 0` va `activeServers < totalServers`; giao dien cong khai van chi hien ONLINE/OFFLINE.

Backend cu da ngung hoat dong khong lam cum cong khai bi OFFLINE neu van con backend khac fresh.

## Mapping voi che do choi

`game_modes.slug` la khoa mapping duy nhat. Khi doc noi dung cong khai, truy van phai lay ca `slug`, sau do gan telemetry group co `key === slug` vao game mode.

Vi du:

```text
game_modes.slug = survival
minecraft_servers.group_key = survival
```

The Survival nhan trang thai va tong online cua toan bo `survival-01`, `survival-02`, ...

Neu chua co group khop slug:

- The che do hien OFFLINE va `0 nguoi choi`.
- Noi dung, banner va tag van hien binh thuong.

Group khong map voi game mode:

- Van duoc cong vao tong network.
- Van hien trong Control duoi nhan `Chua gan che do`.
- Khong tu tao game mode cong khai.

## Giao dien cong khai

### Header va cong ket noi

- Badge co cham trang thai, nhan ONLINE/OFFLINE va mot con so online.
- Bo max player tren desktop va mobile.
- `aria-live="polite"` tiep tuc thong bao khi trang thai doi.
- Mau online dung cyan, offline dung do hong hien tai; khong chi dua vao mau ma phai co text.

### The che do choi

Them mot status rail trong anh banner, tach khoi tags noi dung:

- Cham trang thai va ONLINE/OFFLINE.
- `N nguoi choi`.
- Khong hien max slot.
- Khong thay the tags PE/PC, Survival, phien ban.
- Banner van la tam diem; status rail dung nen toi ban trong va vien cyan/de do de doc ro tren anh.
- Motion chi dung opacity/transform, ton trong `prefers-reduced-motion`.

Trang chu va `/game-modes` dung cung component va cung du lieu group.

## Control Minecraft theo cum

Trang `/control/minecraft` co ba tang thong tin:

1. Network summary: tong online, backend fresh/tong backend, so cum, lan nhan tin hieu cuoi.
2. Group sections: ten/slug cum, ONLINE/DEGRADED/OFFLINE, tong online, backend fresh/tong backend.
3. Server details trong tung group: online, TPS, MSPT, RAM, uptime, world, plugin health va nguoi choi.

Moi group la mot section co the thu gon/mo rong. Mac dinh:

- Group degraded/offline duoc mo de admin thay loi.
- Group online duoc mo dau tien, cac group con lai co the thu gon.
- Tim kiem nguoi choi van tim tren toan network va ket qua ghi ro group/server/world.

Control van hien max player trong chi tiet backend neu can cho van hanh; yeu cau bo max chi ap dung giao dien cong khai. Tuy nhien metric tong quan Control uu tien tong online va so backend, khong cong max cua cac backend thanh mot `network capacity` gay hieu nham.

## CLI them backend

Them script:

```powershell
npm run minecraft:add-server -- --id survival-02 --group survival --name "Survival 02" --endpoint "https://domain.example/api/minecraft/telemetry"
```

CLI:

1. Nap `.env` va parse `MINECRAFT_TELEMETRY_KEYS`.
2. Validate `id`, `group`, ten va endpoint theo cung quy tac plugin.
3. Tu tao key ngau nhien 32 byte, encode Base64.
4. Tu choi ghi de `server-id` da ton tai; rotate key phai la mot thao tac rieng trong tuong lai.
5. Cap nhat duy nhat dong `MINECRAFT_TELEMETRY_KEYS` trong `.env`, giu cac bien khac nguyen ven.
6. In ra stdout mot khoi `config.yml` day du de operator dan vao Pterodactyl.
7. Khong ghi key vao log thuong, audit DB hoac README.

CLI khong tao row `minecraft_servers`. Row chi duoc tao khi website chap nhan snapshot dau tien, nho vay DB phan anh dung backend da ket noi.

Mot lenh `--dry-run` cho phep validate va xem config ma khong sua `.env`. Output co key tam thoi va can duoc xem nhu secret.

## API va kieu du lieu

`GET /api/minecraft/status` tiep tuc la API public, nhung response cong khai bo `max` o network va groups:

```json
{
  "status": "online",
  "online": 125,
  "lastUpdatedAt": "2026-08-14T00:00:00.000Z",
  "groups": [
    {
      "key": "survival",
      "label": "Survival",
      "status": "online",
      "online": 73,
      "activeServers": 2,
      "totalServers": 2
    }
  ]
}
```

`GET /api/control/minecraft` giu chi tiet server hien tai va them du lieu group da cau truc de component khong phai tu lap logic aggregate.

Thay doi public response la thay doi co chu dich cho client noi bo hien tai. Khong co consumer ben ngoai duoc ghi nhan trong repo.

## Database

Khong can migration schema moi:

- `minecraft_servers.group_key` da co.
- `game_modes.slug` da unique.
- `minecraft_servers.online_players` da luu tong cua tung backend.
- `minecraft_online_players` da tach theo `(server_id, player_uuid)`.

Query game mode phai lay `slug`. Query telemetry public van khong doc username, UUID, world hay plugin health.

## Bao mat

- Moi backend dung key rieng; khong tai su dung key giua cac `server-id`.
- Key co toi thieu 32 byte va chi nam trong `.env`/Paper config.
- Endpoint production phai HTTPS.
- Giu HMAC SHA-256, timestamp window 60 giay, nonce replay protection va rate limit hien tai.
- Admin UI khong doc, hien thi hoac sua API key.
- CLI khong in toan bo map key hien co.
- Khi key da bi chia se ngoai kenh bao mat, operator tao server-id/key moi hoac rotate thu cong va restart website/backend.

## Xu ly loi

- DB/telemetry unavailable: public hien OFFLINE/0 nhung noi dung game mode van tai duoc.
- Mot backend stale: khong cong online; Control danh dau backend offline.
- Mot phan group stale: public group van ONLINE; Control danh dau DEGRADED.
- Group khong map: chi hien trong Control va van dong gop network total.
- Key trong `.env` sai JSON: ingest tra loi service not configured nhu hien tai; CLI tu choi chay va khong sua file.
- CLI gap `.env` khong co bien telemetry: tao map moi, khong sua bien khac.

## Kiem thu

### Website

- Aggregate tong online tren nhieu server va nhieu group.
- Backend stale khong dong gop online.
- Group co mot backend fresh va mot stale van public ONLINE, Control DEGRADED.
- Public types/API khong con `max`.
- `game_modes.slug` map dung group va fallback OFFLINE/0.
- Header va game-mode card hien online count khong hien `/ max`.
- Control response/group layout giu server, player va plugin dung cum.
- Unknown group hien trong Control va khong tao public game mode.

### CLI

- Tao key 32 byte va config hop le.
- Them server moi ma giu nguyen cac entry va bien `.env` khac.
- Tu choi duplicate ID, ID/group sai va endpoint HTTP remote.
- `--dry-run` khong ghi file.
- JSON `.env` sai khong lam mat du lieu.

### Plugin

Plugin khong doi giao thuc. Test hien tai tiep tuc xac nhan moi backend lay toan bo `Bukkit.getOnlinePlayers()` tren server do va gui `group` da cau hinh.

## Tieu chi hoan thanh

- Hai Paper backend cung group duoc cong dung tren the che do.
- Backend khac group hien dung tren the tuong ung.
- Header chi hien trang thai va tong online, khong co max.
- Control chia group ro rang va van xem duoc chi tiet tung backend.
- CLI tao duoc cau hinh backend moi ma khong luu key vao DB.
- Test, typecheck, lint, production build website va Gradle test plugin deu dat.
