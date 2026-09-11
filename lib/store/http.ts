import type { PublicUser } from "../auth/service.ts";
import { getRequestUser as resolveRequestUser } from "../community/session-user.ts";
import { validateSameOrigin } from "../control/guard.ts";
import { listStoreCatalog, listUserStoreOrders } from "./service.ts";
import { createStoreCheckout } from "./payments/service.ts";

type UserResolver = (request: Request) => Promise<PublicUser | null>;
const json = (status:number, body:Record<string,unknown>) => Response.json(body, { status, headers:{ "Cache-Control":"no-store" } });

export function createStoreCatalogHandler(deps:{ listCatalog?:typeof listStoreCatalog }={}) {
  return async function GET() {
    try { const catalog=await (deps.listCatalog ?? listStoreCatalog)(); return json(200, { ok:true, groups:catalog.groups, packages:catalog.packages }); }
    catch { return json(503, { ok:false, error:"Cửa hàng tạm thời không khả dụng." }); }
  };
}

export function createStoreOrdersGetHandler(deps:{ getUser?:UserResolver; listOrders?:typeof listUserStoreOrders }={}) {
  return async function GET(request:Request) {
    const user = await (deps.getUser ?? resolveRequestUser)(request);
    if (!user) return json(401, { ok:false, error:"Bạn cần đăng nhập để xem đơn hàng." });
    try { return json(200, { ok:true, orders:await (deps.listOrders ?? listUserStoreOrders)(user.id) }); }
    catch { return json(503, { ok:false, error:"Không thể tải đơn hàng lúc này." }); }
  };
}

export function createStoreOrdersPostHandler(deps:{ getUser?:UserResolver; createOrder?:typeof createStoreCheckout }={}) {
  return async function POST(request:Request) {
    const origin = validateSameOrigin(request);
    if (!origin.ok) return json(origin.status, { ok:false, error:origin.error });
    const user = await (deps.getUser ?? resolveRequestUser)(request);
    if (!user) return json(401, { ok:false, error:"Bạn cần đăng nhập để tạo đơn hàng." });
    const result = await (deps.createOrder ?? createStoreCheckout)(user, await request.json().catch(() => null));
    return result.ok ? json(201, { ok:true, order:result.order, ...("payment" in result ? { payment: result.payment } : {}) }) : json(result.status, { ok:false, error:result.error });
  };
}
