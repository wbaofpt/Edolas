import { canManageUsers } from "../admin/authorization.ts";
import type { PublicUser } from "../auth/service.ts";
import { readRequestCookie, validateControlMutation } from "../control/guard.ts";
import { CONTROL_SESSION_COOKIE } from "../control/session.ts";
import { resolveControlSession, type ResolvedControlSession } from "../control/session-service.ts";
import { MINECRAFT_SERVER_ID_PATTERN } from "./config.ts";
import { deleteOfflineMinecraftGroup, type DeleteMinecraftGroupResult } from "./group-admin.ts";

type Resolver = (rawToken: string | undefined, deps: { csrfToken: string }) => Promise<ResolvedControlSession | null>;
type DeleteGroup = (actor: PublicUser, group: string) => Promise<DeleteMinecraftGroupResult>;
type GroupContext = { params: { group: string } };

function response(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function createMinecraftGroupDeleteHandler(deps: { resolveSession?: Resolver; deleteGroup?: DeleteGroup } = {}) {
  const resolveSession = deps.resolveSession ?? ((rawToken, input) => resolveControlSession(rawToken, input));
  const deleteGroup = deps.deleteGroup ?? ((actor, group) => deleteOfflineMinecraftGroup(actor, group));

  return async function handleMinecraftGroupDelete(request: Request, context: GroupContext) {
    const mutation = validateControlMutation(request);
    if (!mutation.ok) return response(mutation.status, { ok: false, error: mutation.error });

    const session = await resolveSession(readRequestCookie(request, CONTROL_SESSION_COOKIE), { csrfToken: mutation.csrfToken });
    if (!session) return response(401, { ok: false, error: "Phiên Control đã hết hạn. Vui lòng xác thực lại." });
    if (!canManageUsers(session.user.roleName)) return response(403, { ok: false, error: "Bạn không có quyền xóa dữ liệu cụm máy chủ." });

    const group = context.params.group.trim();
    if (!MINECRAFT_SERVER_ID_PATTERN.test(group)) return response(400, { ok: false, error: "Mã cụm máy chủ không hợp lệ." });

    try {
      const result = await deleteGroup(session.user, group);
      return result.ok ? response(200, result) : response(result.status, result);
    } catch {
      return response(503, { ok: false, error: "Không thể xóa dữ liệu cụm lúc này." });
    }
  };
}
