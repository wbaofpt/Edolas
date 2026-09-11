import nodemailer from "nodemailer";

export type VerificationEmail = {
  to: string;
  code: string;
};

export type PasswordResetEmail = { to: string; url: string };

type GmailConfig = {
  user: string;
  appPassword: string;
  fromName?: string;
};

type GmailTransportOptions = {
  service: "gmail";
  auth: { user: string; pass: string };
};

type MailMessage = {
  from: { name: string; address: string };
  to: string;
  subject: string;
  text: string;
  html: string;
};

type MailTransport = {
  sendMail(message: MailMessage): Promise<unknown>;
};

type TransportFactory = (options: GmailTransportOptions) => MailTransport;

const defaultTransportFactory: TransportFactory = (options) => {
  const transporter = nodemailer.createTransport(options);
  return { sendMail: (message) => transporter.sendMail(message) };
};

function cleanHeader(value: string) {
  return value.replace(/[\r\n]+/g, " ").trim();
}

export function createGmailSender(config: GmailConfig, transportFactory: TransportFactory = defaultTransportFactory) {
  const user = cleanHeader(config.user);
  const password = config.appPassword.replace(/\s+/g, "");
  const fromName = cleanHeader(config.fromName || "EdolasSG");

  if (!user || !password) throw new Error("Gmail SMTP credentials are incomplete.");

  const transport = transportFactory({
    service: "gmail",
    auth: { user, pass: password }
  });

  return async ({ to, code }: VerificationEmail) => {
    const subject = `Mã xác nhận EdolasSG: ${code}`;
    const text = `Mã xác nhận EdolasSG của bạn là ${code}. Mã có hiệu lực trong 10 phút. Nếu bạn không yêu cầu mã này, hãy bỏ qua email.`;
    const html = `
      <!doctype html>
      <html lang="vi">
        <body style="margin:0;background:#080B18;color:#F8FAFC;font-family:Arial,sans-serif">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#080B18;padding:32px 16px">
            <tr>
              <td align="center">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border:1px solid #38BDF8;background:#080B18">
                  <tr><td style="height:4px;background:#8B5CF6"></td></tr>
                  <tr>
                    <td style="padding:32px">
                      <p style="margin:0 0 24px;color:#38BDF8;font-size:12px;font-weight:700;letter-spacing:2px">EDOLASSG / EMAIL VERIFY</p>
                      <h1 style="margin:0 0 12px;color:#F8FAFC;font-size:28px;line-height:1.2">Xác nhận tài khoản</h1>
                      <p style="margin:0 0 28px;color:#94A3B8;font-size:15px;line-height:1.7">Nhập mã bên dưới để tiếp tục đăng ký. Mã có hiệu lực trong 10 phút.</p>
                      <div style="border:1px solid #67E8F9;background:#080B18;padding:22px 16px;text-align:center;color:#67E8F9;font-family:monospace;font-size:36px;font-weight:700;letter-spacing:10px">${code}</div>
                      <p style="margin:28px 0 0;color:#94A3B8;font-size:13px;line-height:1.6">Nếu bạn không yêu cầu mã này, hãy bỏ qua email. Không chia sẻ mã với bất kỳ ai.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    await transport.sendMail({
      from: { name: fromName, address: user },
      to: cleanHeader(to),
      subject,
      text,
      html
    });
  };
}

export function createGmailSenderFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const user = env.GMAIL_USER?.trim();
  const appPassword = env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !appPassword) return null;

  return createGmailSender({
    user,
    appPassword,
    fromName: env.EMAIL_FROM_NAME?.trim() || "EdolasSG"
  });
}

export function createGmailPasswordResetSender(config: GmailConfig, transportFactory: TransportFactory = defaultTransportFactory) {
  const user = cleanHeader(config.user);
  const password = config.appPassword.replace(/\s+/g, "");
  const fromName = cleanHeader(config.fromName || "EdolasSG");
  if (!user || !password) throw new Error("Gmail SMTP credentials are incomplete.");
  const transport = transportFactory({ service: "gmail", auth: { user, pass: password } });

  return async ({ to, url }: PasswordResetEmail) => {
    const safeUrl = url.replace(/["<>]/g, "");
    await transport.sendMail({
      from: { name: fromName, address: user },
      to: cleanHeader(to),
      subject: "Đặt lại mật khẩu EdolasSG",
      text: `Ban quản trị đã yêu cầu đặt lại mật khẩu cho tài khoản của bạn. Mở liên kết trong 30 phút: ${safeUrl}. Nếu bạn không mong đợi email này, hãy liên hệ ban quản trị.`,
      html: `<!doctype html><html lang="vi"><body style="margin:0;background:#080B18;color:#F8FAFC;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="padding:32px 16px"><tr><td align="center"><table role="presentation" width="100%" style="max-width:560px;border:1px solid #38BDF8;background:#0D1225"><tr><td style="height:4px;background:linear-gradient(90deg,#8B5CF6,#67E8F9)"></td></tr><tr><td style="padding:32px"><p style="color:#67E8F9;font-size:12px;font-weight:700;letter-spacing:2px">EDOLASSG / PASSWORD RESET</p><h1 style="margin:20px 0 12px;font-size:26px">Tạo mật khẩu mới</h1><p style="color:#94A3B8;line-height:1.7">Ban quản trị đã gửi yêu cầu đặt lại mật khẩu. Liên kết chỉ dùng một lần và hết hạn sau 30 phút.</p><a href="${safeUrl}" style="display:inline-block;margin-top:18px;background:#8B5CF6;color:#fff;padding:14px 22px;text-decoration:none;font-weight:700">Đặt lại mật khẩu</a><p style="margin-top:26px;color:#94A3B8;font-size:13px;line-height:1.6">Không chia sẻ liên kết này. Nếu bạn không mong đợi email, hãy liên hệ ban quản trị.</p></td></tr></table></td></tr></table></body></html>`
    });
  };
}

export function createGmailPasswordResetSenderFromEnv(env: NodeJS.ProcessEnv = process.env) {
  const user = env.GMAIL_USER?.trim();
  const appPassword = env.GMAIL_APP_PASSWORD?.trim();
  if (!user || !appPassword) return null;
  return createGmailPasswordResetSender({ user, appPassword, fromName: env.EMAIL_FROM_NAME?.trim() || "EdolasSG" });
}
