export type FieldErrors = Record<string, string>;

export type LoginBody = {
  identifier: string;
  password: string;
  remember: boolean;
};

export type RegisterBody = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  referralCode: string | null;
};

export type ParsedBody<T> =
  | { ok: true; value: T }
  | { ok: false; status: 400; error: string; fieldErrors: FieldErrors };

export const NEW_USERNAME_PATTERN = /^[A-Za-z0-9]{3,50}$/;

export function isValidNewUsername(value: string) {
  return NEW_USERNAME_PATTERN.test(value);
}

export function normalizeIdentifier(value: string) {
  return value.trim().toLowerCase();
}

function isNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export function parseLoginBody(body: unknown): ParsedBody<LoginBody> {
  const payload = body as Record<string, unknown> | null;
  const fieldErrors: FieldErrors = {};

  if (!isNonEmptyString(payload?.identifier)) {
    fieldErrors.identifier = "Vui lòng nhập tên đăng nhập hoặc email.";
  }

  if (!isNonEmptyString(payload?.password)) {
    fieldErrors.password = "Vui lòng nhập mật khẩu.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Thông tin đăng nhập chưa đầy đủ.",
      fieldErrors
    };
  }

  return {
    ok: true,
    value: {
      identifier: normalizeIdentifier(String(payload?.identifier)),
      password: String(payload?.password),
      remember: Boolean(payload?.remember)
    }
  };
}

export function parseRegisterBody(body: unknown): ParsedBody<RegisterBody> {
  const payload = body as Record<string, unknown> | null;
  const fieldErrors: FieldErrors = {};

  const displayName = typeof payload?.displayName === "string" ? payload.displayName.trim() : "";
  const username = typeof payload?.username === "string" ? payload.username.trim() : "";
  const email = typeof payload?.email === "string" ? payload.email.trim().toLowerCase() : "";
  const password = typeof payload?.password === "string" ? payload.password : "";

  if (!displayName) {
    fieldErrors.displayName = "Vui lòng nhập tên hiển thị.";
  }

  if (!username) {
    fieldErrors.username = "Vui lòng nhập tên đăng nhập.";
  } else if (!isValidNewUsername(username)) {
    fieldErrors.username = "Tên đăng nhập chỉ được dùng chữ cái không dấu và số (3-50 ký tự).";
  }

  if (!email) {
    fieldErrors.email = "Vui lòng nhập email.";
  } else if (!/^\S+@\S+\.\S+$/.test(email)) {
    fieldErrors.email = "Email không hợp lệ.";
  }

  if (!password) {
    fieldErrors.password = "Vui lòng nhập mật khẩu.";
  } else if (password.length < 6) {
    fieldErrors.password = "Mật khẩu phải có ít nhất 6 ký tự.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      status: 400,
      error: "Thông tin đăng ký chưa đầy đủ hoặc không hợp lệ.",
      fieldErrors
    };
  }

  return {
    ok: true,
    value: {
      displayName,
      username,
      email,
      password,
      referralCode: typeof payload?.referralCode === "string" ? payload.referralCode.trim() || null : null
    }
  };
}
