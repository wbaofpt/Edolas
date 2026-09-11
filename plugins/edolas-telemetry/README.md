# Edolas Telemetry for Paper 1.21

Plugin gui snapshot hien tai cua Paper server ve website EdolasSG bang HTTPS va HMAC-SHA-256. Moi server backend dung mot `server-id` va key rieng.

Voi BungeeCord/Waterfall/Velocity, cai plugin nay tren tung Paper backend. Khong cai plugin tren proxy. Website tu cong nguoi choi cua moi backend con gui snapshot trong 30 giay.

## Yeu cau

- Paper 1.21/1.21.1.
- Java 21.
- Website EdolasSG da chay migration `08_minecraft_telemetry`.
- Website da chay migration `09_store` neu su dung giao goi tu cua hang.
- Endpoint website co HTTPS khi trien khai production.

## Build

```powershell
$env:JAVA_HOME='C:\Program Files\Java\jdk-21.0.10'
Set-Location D:\Edolas\plugins\edolas-telemetry
.\gradlew.bat clean test shadowJar
```

JAR deploy nam tai `build/libs/edolas-telemetry-1.0.0.jar`.

## Tao key rieng cho server

Cach khuyen dung la dung CLI tai website root:

```powershell
npm run minecraft:add-server -- --id survival-02 --group survival --name "Survival 02" --endpoint "https://edolas.example/api/minecraft/telemetry"
```

CLI tao key 32 byte, cap nhat `MINECRAFT_TELEMETRY_KEYS` va anh xa bao mat `MINECRAFT_TELEMETRY_GROUPS` trong `.env`, sau do in mot khoi `config.yml` cho backend moi. Them `--dry-run` de kiem tra ma khong sua `.env`. Output CLI chua key bi mat, khong gui output do vao kenh cong khai.

Neu can tao key thu cong:

```powershell
$rng = [Security.Cryptography.RandomNumberGenerator]::Create()
try {
  $bytes = New-Object byte[] 32
  $rng.GetBytes($bytes)
  [Convert]::ToBase64String($bytes)
} finally {
  $rng.Dispose()
}
```

Dat key vua tao vao hai noi:

1. Bien moi truong website `MINECRAFT_TELEMETRY_KEYS`.
2. `plugins/EdolasTelemetry/config.yml` tren dung Paper server.

Vi du website co ba backend:

```dotenv
MINECRAFT_TELEMETRY_KEYS='{"survival-01":"KEY_RIENG_1","survival-02":"KEY_RIENG_2","skyblock-01":"KEY_RIENG_3"}'
MINECRAFT_TELEMETRY_GROUPS='{"survival-01":"survival","survival-02":"survival","skyblock-01":"op-skyblock"}'
```

Khong dung key cua Control Center, Gmail, MySQL hay tai khoan website cho telemetry.

## Cau hinh plugin

```yaml
server-id: "survival-01"
group: "survival"
display-name: "Survival 01"
endpoint: "https://edolas.example/api/minecraft/telemetry"
delivery-endpoint: "https://edolas.example/api/minecraft/deliveries"
api-key: "KEY_RIENG_1"
interval-seconds: 10
delivery-interval-seconds: 5
connect-timeout-seconds: 5
request-timeout-seconds: 8
critical-plugins:
  - "LuckPerms"
  - "Vault"
```

- `server-id` phai duy nhat tren toan network.
- Cac server cung `group` se duoc cong chung tren website. `group` phai khop voi `game_modes.slug`, vi du `survival`.
- `critical-plugins` chi gui health cua plugin duoc liet ke.
- HTTP chi duoc chap nhan voi localhost. Production phai dung HTTPS.
- Placeholder key mac dinh bi tu choi va plugin se tu vo hieu hoa an toan.
- Neu config cu khong co `delivery-endpoint`, plugin tu suy ra endpoint `/api/minecraft/deliveries` tu endpoint telemetry.
- Delivery duoc claim toi da mot lan. Neu mat ket qua sau khi console da chay, Control Center yeu cau admin kiem tra thay vi tu dong chay lai.

## Cai dat

1. Tai website root, chay `npm run db:migrate:minecraft` mot lan.
2. Chay `npm run db:migrate:store` de tao catalog, don hang va delivery queue.
3. Chay `npm run minecraft:add-server` cho tung Paper backend.
4. Restart website sau khi `.env` thay doi.
5. Copy JAR vao thu muc `plugins` cua tung Paper backend.
6. Khoi dong backend mot lan de tao `plugins/EdolasTelemetry/config.yml`.
7. Dan config CLI da tao vao dung backend va restart backend do.
8. Mo `/control/minecraft` hoac `/control/store` bang Owner/Admin.

Trang chu chi hien tong online cua toan network. The che do choi hien ONLINE/OFFLINE va tong online cua group, khong hien max player. Username, UUID, ping, world, max backend va plugin health chi co trong Control Center cua Owner/Admin.

## Vi du BungeeCord

Hai backend Survival dung cung group nhung ID/key rieng:

```yaml
# survival-01
server-id: "survival-01"
group: "survival"
display-name: "Survival 01"
```

```yaml
# survival-02
server-id: "survival-02"
group: "survival"
display-name: "Survival 02"
```

Skyblock dung group khac:

```yaml
server-id: "skyblock-01"
group: "op-skyblock"
display-name: "OP Skyblock 01"
```

Trong database, `game_modes.slug` can la `survival` va `op-skyblock` de hai the che do nhan dung telemetry. Lobby van duoc cong vao tong network; neu khong co game mode slug `lobby`, lobby chi hien trong Control voi nhan chua gan che do.

Quick Tunnel `trycloudflare.com` doi URL moi lan chay lai. Khi URL doi, cap nhat `endpoint` tren moi backend va restart cac backend. Production nen dung mot hostname HTTPS co dinh.

## Van hanh

- Snapshot gui mac dinh moi 10 giay.
- Website danh dau server offline neu khong co snapshot moi trong 30 giay.
- Moi plugin instance chi cho mot request dang gui va bo qua chu ky moi neu request cu chua xong.
- Loi mang/5xx dung backoff co jitter toi da 60 giay.
- Plugin khong luu queue snapshot xuong dia va khong retry payload cu.
- Console chi log khi trang thai ket noi thay doi; key va player list khong duoc log.

## Rotate key

1. Tao key moi.
2. Cap nhat key trong bien moi truong website va restart website.
3. Cap nhat `config.yml` cua dung Paper server va restart server/plugin.
4. Xoa key cu khoi moi truong deploy.

Xoa entry `server-id` khoi ca `MINECRAFT_TELEMETRY_KEYS` va `MINECRAFT_TELEMETRY_GROUPS` se thu hoi quyen gui cua server do ngay lap tuc. Web tu choi neu plugin tu khai bao mot `group` khac anh xa nay.
