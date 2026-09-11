import type { PoolConnection, Pool } from "mysql2/promise";
import { getPool } from "../db.ts";
import { consumeVerification, isEmailVerified } from "../email-verification.ts";
import { getSessionCookieOptions, issueSession, hashSessionToken, type SessionCookieOptions, SESSION_COOKIE_NAME } from "./session.ts";
import { hashPassword, verifyPassword } from "./password.ts";
import { isValidNewUsername, normalizeIdentifier } from "./validation.ts";
import { isUserAccessActive } from "../admin/deactivation.ts";

export type AuthDbLike = Pick<Pool, "getConnection">;

export type PublicUser = {
  id: number;
  username: string;
  displayName: string;
  roleName: string;
  avatarUrl: string | null;
};

export type AuthSessionCookie = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  options: SessionCookieOptions;
};

type StoredUserRow = {
  id: number;
  username: string;
  display_name: string;
  role_name: string;
  avatar_url: string | null;
  password_hash: string | null;
  account_status?: "active" | "locked" | "disabled";
  disabled_until?: Date | string | null;
  disabled_forever?: boolean | number;
};

type AuthConnection = Pick<PoolConnection, "beginTransaction" | "commit" | "rollback" | "release" | "execute" | "query">;

type AuthError = {
  ok: false;
  status: 400 | 401 | 403 | 409 | 503;
  error: string;
};

type LoginSuccess = {
  ok: true;
  user: PublicUser;
  session: AuthSessionCookie;
};

type RegisterSuccess = {
  ok: true;
  user: PublicUser;
};

export type LoginInput = {
  identifier: string;
  password: string;
  remember: boolean;
};

export type RegisterInput = {
  displayName: string;
  username: string;
  email: string;
  password: string;
  referralCode: string | null;
};

export type AuthDependencies = {
  db?: AuthDbLike;
  now?: Date;
  verification?: {
    isEmailVerified(email: string): boolean;
    consumeVerification(email: string): void;
  };
};

function isDuplicateKeyError(error: unknown) {
  return error instanceof Error && ("code" in error ? (error as { code?: string }).code === "ER_DUP_ENTRY" : false);
}

function isPoolConnection(value: AuthConnection | PoolConnection): value is AuthConnection {
  return typeof value.beginTransaction === "function";
}

function buildPublicUser(row: StoredUserRow): PublicUser {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    roleName: row.role_name,
    avatarUrl: row.avatar_url
  };
}

function buildSession(now: Date, remember: boolean) {
  const session = issueSession(now, remember);
  return {
    rawToken: session.rawToken,
    tokenHash: session.tokenHash,
    expiresAt: session.expiresAt,
    cookie: {
      name: SESSION_COOKIE_NAME,
      value: session.rawToken,
      options: getSessionCookieOptions(session.expiresAt, now)
    } satisfies AuthSessionCookie
  };
}

async function releaseConnection(connection: AuthConnection | PoolConnection) {
  if (typeof connection.release === "function") {
    connection.release();
  }
}

export async function registerUser(input: RegisterInput, deps: AuthDependencies = {}): Promise<RegisterSuccess | AuthError> {
  const db = deps.db ?? getPool();
  const now = deps.now ?? new Date();
  const verification = deps.verification ?? { isEmailVerified, consumeVerification };
  const displayName = input.displayName.trim();
  const username = input.username.trim();
  const email = input.email.trim().toLowerCase();
  const password = input.password;

  if (!displayName || !username || !email || password.length < 6) {
    return { ok: false, status: 400, error: "Thông tin đăng ký chưa đầy đủ hoặc không hợp lệ." };
  }

  if (!isValidNewUsername(username)) {
    return { ok: false, status: 400, error: "Tên đăng nhập chỉ được dùng chữ cái không dấu và số (3-50 ký tự)." };
  }

  if (!verification.isEmailVerified(email)) {
    return { ok: false, status: 400, error: "Email chưa được xác nhận hoặc mã đã hết hạn." };
  }

  const connection = await db.getConnection();

  try {
    if (isPoolConnection(connection)) {
      await connection.beginTransaction();
    }

    const passwordHash = hashPassword(password);
    const [insertResult] = await connection.execute(
      `
        INSERT INTO users (
          username,
          display_name,
          role_name,
          avatar_url,
          email,
          password_hash,
          referral_code,
          email_verified_at
        ) VALUES (?, ?, 'player', NULL, ?, ?, ?, ?)
      `,
      [username, displayName, email, passwordHash, input.referralCode?.trim() || null, now]
    );

    const userId = Number((insertResult as { insertId?: number }).insertId ?? 0);

    if (isPoolConnection(connection)) {
      await connection.commit();
    }

    verification.consumeVerification(email);

    return {
      ok: true,
      user: {
        id: userId,
        username,
        displayName,
        roleName: "player",
        avatarUrl: null
      }
    };
  } catch (error) {
    if (isPoolConnection(connection)) {
      await connection.rollback().catch(() => undefined);
    }

    if (isDuplicateKeyError(error)) {
      return { ok: false, status: 409, error: "Tên đăng nhập hoặc email đã được sử dụng." };
    }

    return { ok: false, status: 503, error: "Không thể kết nối cơ sở dữ liệu. Hãy thử lại sau." };
  } finally {
    await releaseConnection(connection);
  }
}

export async function loginUser(input: LoginInput, deps: AuthDependencies = {}): Promise<LoginSuccess | AuthError> {
  const db = deps.db ?? getPool();
  const now = deps.now ?? new Date();
  const identifier = normalizeIdentifier(input.identifier);
  const password = input.password;

  if (!identifier || password.length < 1) {
    return { ok: false, status: 401, error: "Thông tin đăng nhập không hợp lệ." };
  }

  const connection = await db.getConnection();
  const session = buildSession(now, input.remember);

  try {
    const [rows] = (await connection.query(
      `
        SELECT id, username, display_name, role_name, avatar_url, password_hash, account_status, disabled_until, disabled_forever
        FROM users
        WHERE LOWER(username) = ? OR LOWER(email) = ?
        LIMIT 1
      `,
      [identifier, identifier]
    )) as [StoredUserRow[], unknown];

    const user = rows[0];
    if (user && !isUserAccessActive({ accountStatus: user.account_status ?? "active", disabledUntil: user.disabled_until ?? null, disabledForever: Boolean(user.disabled_forever) }, now)) {
      return { ok: false, status: 403, error: user.account_status === "disabled" ? "Tài khoản đang bị vô hiệu hóa. Vui lòng liên hệ ban quản trị." : "Tài khoản đã bị khóa. Vui lòng liên hệ ban quản trị." };
    }

    if (!user?.password_hash || !verifyPassword(password, user.password_hash)) {
      return { ok: false, status: 401, error: "Thông tin đăng nhập không hợp lệ." };
    }

    const [insertResult] = await connection.execute(
      `
        INSERT INTO auth_sessions (user_id, token_hash, expires_at)
        VALUES (?, ?, ?)
      `,
      [user.id, hashSessionToken(session.rawToken), session.expiresAt]
    );

    if (!insertResult) {
      throw new Error("Failed to create auth session.");
    }

    return {
      ok: true,
      user: buildPublicUser(user),
      session: session.cookie
    };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      return { ok: false, status: 401, error: "Thông tin đăng nhập không hợp lệ." };
    }

    return { ok: false, status: 503, error: "Không thể kết nối cơ sở dữ liệu. Hãy thử lại sau." };
  } finally {
    await releaseConnection(connection);
  }
}

export async function getUserBySession(
  rawToken: string | undefined,
  deps: { db?: AuthDbLike; now?: Date } = {}
): Promise<PublicUser | null> {
  if (!rawToken) {
    return null;
  }

  const db = deps.db ?? getPool();
  const now = deps.now ?? new Date();
  const connection = await db.getConnection();

  try {
    const [rows] = (await connection.query(
      `
        SELECT u.id, u.username, u.display_name, u.role_name, u.avatar_url
        FROM auth_sessions s
        INNER JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?
          AND (u.account_status = 'active' OR (u.account_status = 'disabled' AND u.disabled_forever = FALSE AND u.disabled_until <= ?))
        LIMIT 1
      `,
      [hashSessionToken(rawToken), now, now]
    )) as [StoredUserRow[], unknown];

    return rows[0] ? buildPublicUser(rows[0]) : null;
  } finally {
    await releaseConnection(connection);
  }
}

export async function logoutUser(rawToken: string, deps: { db?: AuthDbLike } = {}) {
  const db = deps.db ?? getPool();
  const connection = await db.getConnection();

  try {
    await connection.execute(
      `
        DELETE FROM auth_sessions
        WHERE token_hash = ?
      `,
      [hashSessionToken(rawToken)]
    );
  } finally {
    await releaseConnection(connection);
  }
}
