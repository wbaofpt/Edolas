import {
  createVerification,
  getVerificationRetryAfter,
  removeVerification
} from "../email-verification.ts";
import { createGmailSenderFromEnv, type VerificationEmail } from "./email-sender.ts";

type Dependencies = {
  nodeEnv?: string;
  now?: () => number;
  getRetryAfter?: (email: string, now: number) => number;
  createVerification?: (email: string, now: number) => string;
  removeVerification?: (email: string) => void;
  sendEmail?: ((message: VerificationEmail) => Promise<void>) | null;
  logDeliveryFailure?: () => void;
};

export function createRequestEmailCodeHandler(dependencies: Dependencies = {}) {
  const now = dependencies.now ?? Date.now;
  const getRetryAfter = dependencies.getRetryAfter ?? getVerificationRetryAfter;
  const makeVerification = dependencies.createVerification ?? createVerification;
  const clearVerification = dependencies.removeVerification ?? removeVerification;
  const nodeEnv = dependencies.nodeEnv ?? process.env.NODE_ENV;
  const sendEmail = dependencies.sendEmail === undefined ? createGmailSenderFromEnv() : dependencies.sendEmail;
  const logDeliveryFailure = dependencies.logDeliveryFailure ?? (() => console.error("Gmail verification delivery failed."));

  return async function requestEmailCode(request: Request) {
    const body = await request.json().catch(() => null) as { email?: string } | null;
    const email = body?.email?.trim().toLowerCase();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      return Response.json({ error: "Email không hợp lệ." }, { status: 400 });
    }

    if (!sendEmail && nodeEnv === "production") {
      return Response.json({ error: "Máy chủ chưa cấu hình Gmail gửi mã xác nhận." }, { status: 503 });
    }

    const currentTime = now();
    const retryAfter = getRetryAfter(email, currentTime);
    if (retryAfter > 0) {
      return Response.json(
        { error: `Vui lòng chờ ${retryAfter} giây trước khi gửi mã mới.`, retryAfter },
        { status: 429 }
      );
    }

    const code = makeVerification(email, currentTime);

    if (!sendEmail) {
      return Response.json({
        ok: true,
        message: "Chế độ dev: dùng mã hiển thị trên màn hình.",
        retryAfter: 60,
        devCode: code
      });
    }

    try {
      await sendEmail({ to: email, code });
      return Response.json({
        ok: true,
        message: "Mã xác nhận đã được gửi đến email của bạn.",
        retryAfter: 60
      });
    } catch {
      clearVerification(email);
      logDeliveryFailure();
      return Response.json({ error: "Không thể gửi email lúc này. Vui lòng thử lại sau." }, { status: 502 });
    }
  };
}
