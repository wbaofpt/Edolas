import { normalizeAdminRole, type AdminRole } from "./authorization.ts";

type Failure = { ok: false; error: string };
type Success<T> = { ok: true; value: T };

export type UserMutation =
  | { action: "role"; role: AdminRole }
  | { action: "lock"; locked: boolean; reason: string }
  | { action: "deactivate"; duration: "days"; days: number; reason: string }
  | { action: "deactivate"; duration: "forever"; reason: string }
  | { action: "reactivate" }
  | { action: "request-password-reset" }
  | { action: "revoke-sessions" };

export type ContentMutation = { action: "trash" | "restore" | "delete-permanently" };
export type BulkContentItem = { kind: "forum" | "wiki" | "media"; id: number };
export type BulkContentMutation = { action: "trash" | "restore"; items: BulkContentItem[] };
export type ContentOperation =
  | { action: "pin"; pinned: boolean }
  | { action: "move"; categoryId: number }
  | { action: "publish"; published: boolean }
  | { action: "move-cluster"; clusterId: number };

export const EDITABLE_SETTINGS = ["server_name", "server_ip", "bedrock_ip", "bedrock_port", "discord_url", "maintenance_mode"] as const;
export type EditableSetting = (typeof EDITABLE_SETTINGS)[number];

const object = (value: unknown): Record<string, unknown> | null => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function parseUserMutation(input: unknown): Success<UserMutation> | Failure {
  const value = object(input);
  if (!value) return { ok: false, error: "Dữ liệu không hợp lệ." };
  if (value.action === "revoke-sessions") return { ok: true, value: { action: "revoke-sessions" } };
  if (value.action === "reactivate") return { ok: true, value: { action: "reactivate" } };
  if (value.action === "request-password-reset") return { ok: true, value: { action: "request-password-reset" } };
  if (value.action === "deactivate") {
    const reason = typeof value.reason === "string" ? value.reason.trim().slice(0, 300) : "";
    if (reason.length < 3) return { ok: false, error: "Vui lòng nhập lý do vô hiệu hóa." };
    if (value.duration === "forever") return { ok: true, value: { action: "deactivate", duration: "forever", reason } };
    if (value.duration === "days" && Number.isInteger(value.days) && Number(value.days) >= 1 && Number(value.days) <= 365) return { ok: true, value: { action: "deactivate", duration: "days", days: Number(value.days), reason } };
    return { ok: false, error: "Thời hạn phải từ 1 đến 365 ngày." };
  }
  if (value.action === "role" && typeof value.role === "string") {
    const role = normalizeAdminRole(value.role);
    if (role === value.role.toLowerCase()) return { ok: true, value: { action: "role", role } };
  }
  if (value.action === "lock" && typeof value.locked === "boolean") {
    const reason = typeof value.reason === "string" ? value.reason.trim().slice(0, 300) : "";
    if (value.locked && reason.length < 3) return { ok: false, error: "Vui lòng nhập lý do khóa tài khoản." };
    return { ok: true, value: { action: "lock", locked: value.locked, reason } };
  }
  return { ok: false, error: "Thao tác tài khoản không hợp lệ." };
}

export function parseContentMutation(input: unknown): Success<ContentMutation> | Failure {
  const value = object(input);
  if (value?.action === "trash" || value?.action === "restore") return { ok: true, value: { action: value.action } };
  if (value?.action === "delete-permanently" && value.confirmation === "XOA VINH VIEN") {
    return { ok: true, value: { action: "delete-permanently" } };
  }
  return { ok: false, error: "Thao tác nội dung hoặc xác nhận không hợp lệ." };
}

export function parseBulkContentMutation(input: unknown): Success<BulkContentMutation> | Failure {
  const value = object(input);
  if (!value || (value.action !== "trash" && value.action !== "restore") || !Array.isArray(value.items) || value.items.length < 1 || value.items.length > 100) {
    return { ok: false, error: "Thao tác hàng loạt không hợp lệ hoặc vượt quá 100 mục." };
  }
  const seen = new Set<string>();
  const items: BulkContentItem[] = [];
  for (const raw of value.items) {
    const item = object(raw);
    const kind = item?.kind;
    const id = Number(item?.id);
    if ((kind !== "forum" && kind !== "wiki" && kind !== "media") || !Number.isInteger(id) || id < 1) return { ok: false, error: "Danh sách nội dung không hợp lệ." };
    const key = `${kind}:${id}`;
    if (!seen.has(key)) { seen.add(key); items.push({ kind, id }); }
  }
  return { ok: true, value: { action: value.action, items } };
}

export function parseContentOperation(kind: unknown, input: unknown): Success<ContentOperation> | Failure {
  const value = object(input);
  if (kind === "forum" && value?.action === "pin" && typeof value.pinned === "boolean") return { ok: true, value: { action: "pin", pinned: value.pinned } };
  if (kind === "forum" && value?.action === "move" && Number.isInteger(value.categoryId) && Number(value.categoryId) > 0) return { ok: true, value: { action: "move", categoryId: Number(value.categoryId) } };
  if (kind === "wiki" && value?.action === "publish" && typeof value.published === "boolean") return { ok: true, value: { action: "publish", published: value.published } };
  if (kind === "wiki" && value?.action === "move-cluster" && Number.isInteger(value.clusterId) && Number(value.clusterId) > 0) return { ok: true, value: { action: "move-cluster", clusterId: Number(value.clusterId) } };
  return { ok: false, error: "Thao tác chuyên sâu không hợp lệ." };
}

export function parseSettingsMutation(input: unknown): Success<Partial<Record<EditableSetting, string>>> | Failure {
  const root = object(input);
  const settings = object(root?.settings);
  if (!settings || Object.keys(settings).length === 0) return { ok: false, error: "Không có cài đặt để lưu." };
  const result: Partial<Record<EditableSetting, string>> = {};
  for (const [key, raw] of Object.entries(settings)) {
    if (!EDITABLE_SETTINGS.includes(key as EditableSetting) || typeof raw !== "string") return { ok: false, error: "Cài đặt không được hỗ trợ." };
    const value = raw.trim();
    if (!value || value.length > 300) return { ok: false, error: "Giá trị cài đặt không hợp lệ." };
    if (key === "maintenance_mode" && value !== "true" && value !== "false") return { ok: false, error: "Trạng thái bảo trì không hợp lệ." };
    if (key === "bedrock_port" && (!/^\d{1,5}$/.test(value) || Number(value) < 1 || Number(value) > 65535)) return { ok: false, error: "Cổng Bedrock phải từ 1 đến 65535." };
    result[key as EditableSetting] = value;
  }
  return { ok: true, value: result };
}
