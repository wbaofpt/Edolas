import { verifyCode } from "@/lib/email-verification";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string; code?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  const code = body?.code?.trim();
  if (!email || !code || !verifyCode(email, code)) return Response.json({ error: "Mã xác nhận không đúng hoặc đã hết hạn." }, { status: 400 });
  return Response.json({ ok: true, message: "Email đã được xác nhận." });
}
