import type { Pool } from "mysql2/promise";
import type { PublicUser } from "../auth/service.ts";
import { canAccessAdmin } from "../admin/authorization.ts";
import { getPool } from "../db.ts";
import { hashControlSecret, isControlSessionActive } from "./session.ts";
import { isUserAccessActive } from "../admin/deactivation.ts";

type SessionDb=Pick<Pool,"query"|"execute">;
type SessionRow={id:number;user_id:number;csrf_hash:string;expires_at:Date|string;last_used_at:Date|string;username:string;display_name:string;role_name:string;avatar_url:string|null;account_status:string;disabled_until:Date|string|null;disabled_forever:boolean|number};

export type ResolvedControlSession={id:number;user:PublicUser;csrfHash:string;expiresAt:Date};

export async function resolveControlSession(rawToken:string|undefined,deps:{db?:SessionDb;csrfToken?:string;now?:Date;touch?:boolean}={}):Promise<ResolvedControlSession|null>{
  if(!rawToken)return null;const db=deps.db??getPool();const now=deps.now??new Date();
  const [rows]=await db.query("SELECT s.id,s.user_id,s.csrf_hash,s.expires_at,s.last_used_at,u.username,u.display_name,u.role_name,u.avatar_url,u.account_status,u.disabled_until,u.disabled_forever FROM control_sessions s INNER JOIN users u ON u.id=s.user_id WHERE s.token_hash=? LIMIT 1",[hashControlSecret(rawToken)]) as [SessionRow[],unknown];const row=rows[0];if(!row)return null;
  const active=isControlSessionActive({lastUsedAt:new Date(row.last_used_at),expiresAt:new Date(row.expires_at)},now)&&isUserAccessActive({accountStatus:row.account_status,disabledUntil:row.disabled_until,disabledForever:Boolean(row.disabled_forever)},now)&&canAccessAdmin(row.role_name);
  if(!active){await db.execute("DELETE FROM control_sessions WHERE id=?",[row.id]);return null;}
  if(deps.csrfToken&&row.csrf_hash!==hashControlSecret(deps.csrfToken))return null;
  if(deps.touch!==false)await db.execute("UPDATE control_sessions SET last_used_at=? WHERE id=?",[now,row.id]);
  return {id:row.id,user:{id:row.user_id,username:row.username,displayName:row.display_name,roleName:row.role_name,avatarUrl:row.avatar_url},csrfHash:row.csrf_hash,expiresAt:new Date(row.expires_at)};
}

export async function deleteControlSession(rawToken:string|undefined,db:Pick<Pool,"execute">=getPool()){
  if(rawToken)await db.execute("DELETE FROM control_sessions WHERE token_hash=?",[hashControlSecret(rawToken)]);
}
