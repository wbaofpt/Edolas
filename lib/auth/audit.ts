import type { Pool } from "mysql2/promise";
import { getPool } from "../db.ts";
import { collectAuthSchemaSnapshot, type AuthSchemaSnapshot } from "./schema.ts";

export type AuthAuditReport = {
  schema: AuthSchemaSnapshot;
  users: {
    totalUsers: number;
    missingEmail: number;
    missingPasswordHash: number;
    unverifiedPasswordRows: number;
    duplicateEmailGroups: number;
    duplicateUsernameGroups: number;
    referralCodeRows: number;
    rememberLoginRows: number;
  };
  sessions: {
    totalSessions: number;
    orphanSessions: number;
    duplicateTokenGroups: number;
    expiredSessions: number;
    invalidExpiryOrder: number;
  };
  forum: {
    orphanTopicCategories: number;
    orphanTopicAuthors: number;
  };
  legacySeedUsers: Array<{
    id: number;
    username: string;
    displayName: string;
    roleName: string;
    email: string | null;
    hasPasswordHash: boolean;
    hasEmailVerifiedAt: boolean;
    rememberLogin: boolean | null;
  }>;
};

function toNumber(value: unknown) {
  return Number(value ?? 0);
}

export async function collectAuthAudit(pool: Pool = getPool()): Promise<AuthAuditReport> {
  const schema = await collectAuthSchemaSnapshot(pool);

  const [userRows] = (await pool.query(
    `
      SELECT
        COUNT(*) AS total_users,
        COALESCE(SUM(email IS NULL), 0) AS missing_email,
        COALESCE(SUM(password_hash IS NULL), 0) AS missing_password_hash,
        COALESCE(SUM(password_hash IS NOT NULL AND email_verified_at IS NULL), 0) AS unverified_password_rows,
        (
          SELECT COUNT(*)
          FROM (
            SELECT LOWER(email) AS normalized_email
            FROM users
            WHERE email IS NOT NULL
            GROUP BY LOWER(email)
            HAVING COUNT(*) > 1
          ) AS duplicate_emails
        ) AS duplicate_email_groups,
        (
          SELECT COUNT(*)
          FROM (
            SELECT LOWER(username) AS normalized_username
            FROM users
            GROUP BY LOWER(username)
            HAVING COUNT(*) > 1
          ) AS duplicate_usernames
        ) AS duplicate_username_groups,
        COALESCE(SUM(referral_code IS NOT NULL), 0) AS referral_code_rows,
        COALESCE(SUM(remember_login IS NOT NULL), 0) AS remember_login_rows
      FROM users
    `
  )) as [
    Array<{
      total_users: number;
      missing_email: number;
      missing_password_hash: number;
      unverified_password_rows: number;
      duplicate_email_groups: number;
      duplicate_username_groups: number;
      referral_code_rows: number;
      remember_login_rows: number;
    }>,
    unknown
  ];

  const [sessionRows] = (await pool.query(
    `
      SELECT
        COUNT(*) AS total_sessions,
        COALESCE(SUM(u.id IS NULL), 0) AS orphan_sessions,
        (
          SELECT COUNT(*)
          FROM (
            SELECT token_hash
            FROM auth_sessions
            GROUP BY token_hash
            HAVING COUNT(*) > 1
          ) AS duplicate_tokens
        ) AS duplicate_token_groups,
        COALESCE(SUM(auth_sessions.expires_at <= NOW()), 0) AS expired_sessions,
        COALESCE(SUM(auth_sessions.expires_at <= auth_sessions.created_at), 0) AS invalid_expiry_order
      FROM auth_sessions
      LEFT JOIN users u ON u.id = auth_sessions.user_id
    `
  )) as [
    Array<{
      total_sessions: number;
      orphan_sessions: number;
      duplicate_token_groups: number;
      expired_sessions: number;
      invalid_expiry_order: number;
    }>,
    unknown
  ];

  const [forumRows] = (await pool.query(
    `
      SELECT
        COALESCE(SUM(categories.id IS NULL), 0) AS orphan_topic_categories,
        COALESCE(SUM(authors.id IS NULL AND forum_topics.author_id IS NOT NULL), 0) AS orphan_topic_authors
      FROM forum_topics
      LEFT JOIN forum_categories categories ON categories.id = forum_topics.category_id
      LEFT JOIN users authors ON authors.id = forum_topics.author_id
    `
  )) as [Array<{ orphan_topic_categories: number; orphan_topic_authors: number }>, unknown];

  const [seedRows] = (await pool.query(
    `
      SELECT
        id,
        username,
        display_name,
        role_name,
        email,
        password_hash IS NOT NULL AS has_password_hash,
        email_verified_at IS NOT NULL AS has_email_verified_at,
        remember_login
      FROM users
      ORDER BY id
    `
  )) as [
    Array<{
      id: number;
      username: string;
      display_name: string;
      role_name: string;
      email: string | null;
      has_password_hash: number;
      has_email_verified_at: number;
      remember_login: number | null;
    }>,
    unknown
  ];

  return {
    schema,
    users: {
      totalUsers: toNumber(userRows[0]?.total_users),
      missingEmail: toNumber(userRows[0]?.missing_email),
      missingPasswordHash: toNumber(userRows[0]?.missing_password_hash),
      unverifiedPasswordRows: toNumber(userRows[0]?.unverified_password_rows),
      duplicateEmailGroups: toNumber(userRows[0]?.duplicate_email_groups),
      duplicateUsernameGroups: toNumber(userRows[0]?.duplicate_username_groups),
      referralCodeRows: toNumber(userRows[0]?.referral_code_rows),
      rememberLoginRows: toNumber(userRows[0]?.remember_login_rows)
    },
    sessions: {
      totalSessions: toNumber(sessionRows[0]?.total_sessions),
      orphanSessions: toNumber(sessionRows[0]?.orphan_sessions),
      duplicateTokenGroups: toNumber(sessionRows[0]?.duplicate_token_groups),
      expiredSessions: toNumber(sessionRows[0]?.expired_sessions),
      invalidExpiryOrder: toNumber(sessionRows[0]?.invalid_expiry_order)
    },
    forum: {
      orphanTopicCategories: toNumber(forumRows[0]?.orphan_topic_categories),
      orphanTopicAuthors: toNumber(forumRows[0]?.orphan_topic_authors)
    },
    legacySeedUsers: seedRows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      roleName: row.role_name,
      email: row.email,
      hasPasswordHash: Boolean(row.has_password_hash),
      hasEmailVerifiedAt: Boolean(row.has_email_verified_at),
      rememberLogin: row.remember_login === null ? null : Boolean(row.remember_login)
    }))
  };
}

function formatBoolean(value: boolean) {
  return value ? "yes" : "no";
}

export function formatAuthAuditReport(report: AuthAuditReport) {
  const lines = [
    "# EdolasSG Auth Data Audit",
    "",
    `- Database: \`${report.schema.database}\``,
    `- Users: ${report.users.totalUsers}`,
    `- Auth sessions: ${report.sessions.totalSessions}`,
    `- Auth columns present: ${formatBoolean(report.schema.usersColumns.includes("email") && report.schema.usersColumns.includes("password_hash") && report.schema.usersColumns.includes("referral_code") && report.schema.usersColumns.includes("email_verified_at") && report.schema.usersColumns.includes("remember_login"))}`,
    `- Auth session table present: ${formatBoolean(report.schema.authSessionsExists)}`,
    "",
    "## Users",
    `- Missing email values: ${report.users.missingEmail}`,
    `- Missing password hashes: ${report.users.missingPasswordHash}`,
    `- Password rows without email verification timestamp: ${report.users.unverifiedPasswordRows}`,
    `- Duplicate email groups: ${report.users.duplicateEmailGroups}`,
    `- Duplicate username groups: ${report.users.duplicateUsernameGroups}`,
    `- Referral-code rows: ${report.users.referralCodeRows}`,
    `- Remember-login rows written by app: ${report.users.rememberLoginRows}`,
    "",
    "## Sessions",
    `- Orphan sessions: ${report.sessions.orphanSessions}`,
    `- Duplicate token-hash groups: ${report.sessions.duplicateTokenGroups}`,
    `- Expired sessions: ${report.sessions.expiredSessions}`,
    `- Sessions whose expiry is not after creation: ${report.sessions.invalidExpiryOrder}`,
    "",
    "## Forum",
    `- Orphan topic categories: ${report.forum.orphanTopicCategories}`,
    `- Orphan topic authors: ${report.forum.orphanTopicAuthors}`,
    "",
    "## Seed Users",
    ...report.legacySeedUsers.map(
      (user) =>
        `- #${user.id} \`${user.username}\` / ${user.displayName} / ${user.roleName} / email=${user.email ?? "null"} / password=${formatBoolean(user.hasPasswordHash)} / verified=${formatBoolean(user.hasEmailVerifiedAt)} / remember_login=${user.rememberLogin === null ? "null" : formatBoolean(user.rememberLogin)}`
    )
  ];

  return `${lines.join("\n")}\n`;
}
