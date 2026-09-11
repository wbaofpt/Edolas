import { canManageUsers } from "../admin/authorization.ts";
import { readRequestCookie } from "../control/guard.ts";
import { CONTROL_SESSION_COOKIE } from "../control/session.ts";
import { resolveControlSession } from "../control/session-service.ts";
import { readControlMinecraftStatus, type ControlMinecraftStatus } from "./control-status.ts";

type Session = { user: { roleName: string } };
type Deps = { resolveSession?: (rawToken: string | undefined) => Promise<Session | null>; readStatus?: () => Promise<ControlMinecraftStatus> };

function response(status: number, body: Record<string, unknown>) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

export function createControlMinecraftRouteHandler(deps: Deps = {}) {
  const resolveSession = deps.resolveSession ?? ((rawToken) => resolveControlSession(rawToken));
  const readStatus = deps.readStatus ?? (() => readControlMinecraftStatus());
  return async function handleControlMinecraft(request: Request) {
    const session = await resolveSession(readRequestCookie(request, CONTROL_SESSION_COOKIE));
    if (!session) return response(401, { ok: false, error: "Control session has expired." });
    if (!canManageUsers(session.user.roleName)) return response(403, { ok: false, error: "You cannot view Minecraft player telemetry." });
    try {
      return response(200, { ok: true, status: await readStatus() });
    } catch {
      return response(503, { ok: false, error: "Minecraft telemetry is unavailable." });
    }
  };
}
