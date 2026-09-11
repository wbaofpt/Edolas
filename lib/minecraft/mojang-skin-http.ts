import { canManageUsers } from "../admin/authorization.ts";
import { readRequestCookie } from "../control/guard.ts";
import { CONTROL_SESSION_COOKIE } from "../control/session.ts";
import { resolveControlSession } from "../control/session-service.ts";
import { resolveMojangSkinUrl } from "./mojang-skin.ts";

type Session = { user: { roleName: string } };
type Resolver = (rawToken: string | undefined) => Promise<Session | null>;
type SkinResolver = (username: string) => Promise<string | null>;

function errorResponse(status: 401 | 403 | 404, error: string) {
  return Response.json({ ok: false, error }, {
    status,
    headers: { "Cache-Control": "private, no-store, max-age=0" }
  });
}

export function createMinecraftSkinHandler(deps: { resolveSession?: Resolver; resolveSkin?: SkinResolver } = {}) {
  const resolveSession = deps.resolveSession ?? ((rawToken) => resolveControlSession(rawToken, { touch: false }));
  const resolveSkin = deps.resolveSkin ?? resolveMojangSkinUrl;
  return async function handleMinecraftSkin(request: Request, context: { params: { username: string } }) {
    const session = await resolveSession(readRequestCookie(request, CONTROL_SESSION_COOKIE));
    if (!session) return errorResponse(401, "Control session has expired.");
    if (!canManageUsers(session.user.roleName)) return errorResponse(403, "You cannot view Minecraft player skins.");

    const texture = await resolveSkin(context.params.username).catch(() => null);
    if (!texture) return errorResponse(404, "Minecraft skin is unavailable.");
    return new Response(null, {
      status: 307,
      headers: {
        Location: texture,
        "Cache-Control": "private, max-age=300, stale-while-revalidate=60"
      }
    });
  };
}
