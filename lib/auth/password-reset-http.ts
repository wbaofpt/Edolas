import { NextResponse } from "next/server.js";
import { consumePasswordReset } from "./password-reset.ts";

export function createPasswordResetHandler(deps: { consumePasswordReset?: typeof consumePasswordReset } = {}) {
  return async (request: Request) => {
    const body = await request.json().catch(() => null) as { token?: string; password?: string } | null;
    if (!body || typeof body.token !== "string" || typeof body.password !== "string") return NextResponse.json({ ok: false, error: "Dữ liệu đặt lại mật khẩu không hợp lệ." }, { status: 400 });
    const result = await (deps.consumePasswordReset ?? consumePasswordReset)(body.token, body.password);
    return result.ok ? NextResponse.json(result) : NextResponse.json(result, { status: result.status });
  };
}
