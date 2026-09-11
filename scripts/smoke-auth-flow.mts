import { getPool } from "../lib/db.ts";

type AuthResponse = {
  ok?: boolean;
  error?: string;
  message?: string;
  devCode?: string;
  user?: {
    id: number;
    username: string;
    displayName: string;
    roleName: string;
    avatarUrl: string | null;
  };
};

function ensureLocalBaseUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  if (!["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(`Smoke test only runs against local hosts, got ${baseUrl}`);
  }
}

function cookieHeaderFromSetCookie(setCookie: string | null) {
  if (!setCookie) {
    return "";
  }

  return setCookie.split(";")[0] ?? "";
}

async function readJson(response: Response) {
  return (await response.json().catch(() => null)) as AuthResponse | null;
}

const baseUrl = process.env.AUTH_SMOKE_BASE_URL ?? "http://127.0.0.1:3000";
ensureLocalBaseUrl(baseUrl);

const now = Date.now();
const username = `smoke_user_${now}`;
const email = `smoke_user_${now}@example.com`;
const password = "Smoke#1234";
const displayName = "Smoke User";
const pool = getPool();

let createdUserId: number | null = null;
let latestCookie = "";

try {
  const requestCodeResponse = await fetch(`${baseUrl}/api/auth/request-email-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email })
  });
  const requestCodeData = await readJson(requestCodeResponse);
  if (!requestCodeResponse.ok || !requestCodeData?.devCode) {
    throw new Error(requestCodeData?.error ?? "Failed to request verification code.");
  }

  const verifyResponse = await fetch(`${baseUrl}/api/auth/verify-email-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, code: requestCodeData.devCode })
  });
  const verifyData = await readJson(verifyResponse);
  if (!verifyResponse.ok || !verifyData?.ok) {
    throw new Error(verifyData?.error ?? "Failed to verify email code.");
  }

  const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      displayName,
      username,
      email,
      password,
      referralCode: null,
      remember: false
    })
  });
  const registerData = await readJson(registerResponse);
  if (!registerResponse.ok || !registerData?.ok || !registerData.user) {
    throw new Error(registerData?.error ?? "Failed to register user.");
  }
  createdUserId = registerData.user.id;
  latestCookie = cookieHeaderFromSetCookie(registerResponse.headers.get("set-cookie"));

  const loginUsernameResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: username, password, remember: false })
  });
  const loginUsernameData = await readJson(loginUsernameResponse);
  if (!loginUsernameResponse.ok || !loginUsernameData?.ok) {
    throw new Error(loginUsernameData?.error ?? "Failed to log in with username.");
  }
  latestCookie = cookieHeaderFromSetCookie(loginUsernameResponse.headers.get("set-cookie"));

  const loginEmailResponse = await fetch(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ identifier: email, password, remember: true })
  });
  const loginEmailData = await readJson(loginEmailResponse);
  if (!loginEmailResponse.ok || !loginEmailData?.ok) {
    throw new Error(loginEmailData?.error ?? "Failed to log in with email.");
  }
  latestCookie = cookieHeaderFromSetCookie(loginEmailResponse.headers.get("set-cookie"));

  const logoutResponse = await fetch(`${baseUrl}/api/auth/logout`, {
    method: "POST",
    headers: latestCookie ? { Cookie: latestCookie } : undefined
  });
  const logoutData = await readJson(logoutResponse);
  if (!logoutResponse.ok || !logoutData?.ok) {
    throw new Error(logoutData?.error ?? "Failed to log out.");
  }

  console.log(JSON.stringify({
    ok: true,
    username,
    email,
    createdUserId
  }, null, 2));
} finally {
  if (createdUserId !== null) {
    await pool.execute("DELETE FROM auth_sessions WHERE user_id = ?", [createdUserId]);
    await pool.execute("DELETE FROM users WHERE id = ?", [createdUserId]);
  } else {
    await pool.execute("DELETE FROM users WHERE username = ? OR email = ?", [username, email]);
    await pool.execute(
      `
        DELETE FROM auth_sessions
        WHERE user_id IN (
          SELECT id
          FROM users
          WHERE username = ? OR email = ?
        )
      `,
      [username, email]
    );
  }

  await pool.end();
}
