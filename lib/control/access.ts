import { randomInt, timingSafeEqual } from "node:crypto";
import type { Pool, PoolConnection } from "mysql2/promise";
import { canAccessAdmin } from "../admin/authorization.ts";
import { verifyPassword } from "../auth/password.ts";
import { createGmailSenderFromEnv, type VerificationEmail } from "../auth/email-sender.ts";
import { getPool } from "../db.ts";
import { isUserAccessActive } from "../admin/deactivation.ts";
import { CONTROL_ABSOLUTE_TIMEOUT_MS, createControlChallengeSecret, createControlCredentials, hashControlSecret } from "./session.ts";

type AccessDb = Pick<Pool, "query" | "execute">;
type VerifyDb = Pick<Pool, "getConnection">;
type AccessUser = { id:number; username:string; display_name:string; role_name:string; email:string|null; password_hash:string|null; account_status:string; disabled_until:Date|string|null; disabled_forever:boolean|number };
type ChallengeRow = { id:number; user_id:number; code_hash:string; attempts:number; expires_at:Date|string; consumed_at:Date|string|null; role_name:string; account_status:string; disabled_until:Date|string|null; disabled_forever:boolean|number };
type AccessLimitRow = { failed_attempts:number; window_started_at:Date|string; blocked_until:Date|string|null };
type Failure = { ok:false; status:401|403|409|429|503; error:string };

const equalHash=(a:string,b:string)=>{const left=Buffer.from(a);const right=Buffer.from(b);return left.length===right.length&&timingSafeEqual(left,right);};

export async function beginControlAccess(userId:number,password:string,deps:{db?:AccessDb;sendEmail?:((message:VerificationEmail)=>Promise<void>)|null;makeCode?:()=>string;now?:Date}={}):Promise<{ok:true;challengeToken:string;emailHint:string}|Failure>{
  const db=deps.db??getPool(); const now=deps.now??new Date(); const sender=deps.sendEmail===undefined?createGmailSenderFromEnv():deps.sendEmail;
  const [rows]=await db.query("SELECT id,username,display_name,role_name,email,password_hash,account_status,disabled_until,disabled_forever FROM users WHERE id=? LIMIT 1",[userId]) as [AccessUser[],unknown];
  const user=rows[0];
  const [limits]=await db.query("SELECT failed_attempts,window_started_at,blocked_until FROM control_access_limits WHERE user_id=? LIMIT 1",[userId]) as [AccessLimitRow[],unknown];
  const limit=limits[0];
  if(limit?.blocked_until&&new Date(limit.blocked_until).getTime()>now.getTime())return {ok:false,status:429,error:"Quá nhiều lần thử. Vui lòng thử lại sau."};
  if(!user?.password_hash||!verifyPassword(password,user.password_hash)){
    await db.execute(`INSERT INTO control_access_limits (user_id,failed_attempts,window_started_at,blocked_until) VALUES (?,1,?,NULL)
      ON DUPLICATE KEY UPDATE
      blocked_until=IF(window_started_at<DATE_SUB(VALUES(window_started_at),INTERVAL 15 MINUTE),NULL,IF(failed_attempts+1>=5,DATE_ADD(VALUES(window_started_at),INTERVAL 15 MINUTE),blocked_until)),
      failed_attempts=IF(window_started_at<DATE_SUB(VALUES(window_started_at),INTERVAL 15 MINUTE),1,failed_attempts+1),
      window_started_at=IF(window_started_at<DATE_SUB(VALUES(window_started_at),INTERVAL 15 MINUTE),VALUES(window_started_at),window_started_at)`,[userId,now]);
    return {ok:false,status:401,error:"Mật khẩu không chính xác."};
  }
  if(!isUserAccessActive({accountStatus:user.account_status,disabledUntil:user.disabled_until,disabledForever:Boolean(user.disabled_forever)},now))return {ok:false,status:403,error:"Tài khoản không hoạt động."};
  if(!canAccessAdmin(user.role_name))return {ok:false,status:403,error:"Tài khoản không có quyền Control."};
  if(!user.email)return {ok:false,status:409,error:"Tài khoản quản trị chưa có email xác minh."};
  if(!sender&&process.env.NODE_ENV==="production")return {ok:false,status:503,error:"Gmail OTP chưa được cấu hình."};
  const [recent]=await db.query("SELECT id FROM control_auth_challenges WHERE user_id=? AND created_at>DATE_SUB(?,INTERVAL 60 SECOND) LIMIT 1",[userId,now]) as [Array<{id:number}>,unknown];
  if(recent.length)return {ok:false,status:429,error:"Vui lòng chờ 60 giây trước khi yêu cầu mã mới."};
  const code=deps.makeCode?.()??String(randomInt(100000,1000000)); const challenge=createControlChallengeSecret(); const expiresAt=new Date(now.getTime()+10*60*1000);
  try{
    await db.execute(`INSERT INTO control_auth_challenges (user_id,challenge_hash,code_hash,expires_at,created_at) VALUES (?,?,?,?,?)
      ON DUPLICATE KEY UPDATE
      challenge_hash=IF(created_at<=DATE_SUB(VALUES(created_at),INTERVAL 60 SECOND),VALUES(challenge_hash),challenge_hash),
      code_hash=IF(created_at<=DATE_SUB(VALUES(created_at),INTERVAL 60 SECOND),VALUES(code_hash),code_hash),
      attempts=IF(created_at<=DATE_SUB(VALUES(created_at),INTERVAL 60 SECOND),0,attempts),
      expires_at=IF(created_at<=DATE_SUB(VALUES(created_at),INTERVAL 60 SECOND),VALUES(expires_at),expires_at),
      consumed_at=IF(created_at<=DATE_SUB(VALUES(created_at),INTERVAL 60 SECOND),NULL,consumed_at),
      created_at=IF(created_at<=DATE_SUB(VALUES(created_at),INTERVAL 60 SECOND),VALUES(created_at),created_at)`,[userId,challenge.tokenHash,hashControlSecret(code),expiresAt,now]);
  }catch(error){if((error as {code?:string}).code==="ER_DUP_ENTRY")return {ok:false,status:429,error:"Vui lòng chờ 60 giây trước khi yêu cầu mã mới."};throw error;}
  const [stored]=await db.query("SELECT challenge_hash FROM control_auth_challenges WHERE user_id=? LIMIT 1",[userId]) as [Array<{challenge_hash:string}>,unknown];
  if(stored[0]?.challenge_hash!==challenge.tokenHash)return {ok:false,status:429,error:"Vui lòng chờ 60 giây trước khi yêu cầu mã mới."};
  await db.execute("DELETE FROM control_access_limits WHERE user_id=?",[userId]);
  if(sender){
    try{await sender({to:user.email,code});}
    catch{await db.execute("DELETE FROM control_auth_challenges WHERE challenge_hash=?",[challenge.tokenHash]);return {ok:false,status:503,error:"Không thể gửi mã OTP lúc này. Vui lòng thử lại sau."};}
  }
  return {ok:true,challengeToken:challenge.token,emailHint:user.email.replace(/^(.{1,2}).*(@.*)$/,"$1***$2")};
}

export async function verifyControlOtp(challengeToken:string,code:string,deps:{db?:VerifyDb;now?:Date}={}):Promise<{ok:true;token:string;csrfToken:string;expiresAt:Date}|Failure>{
  const db=deps.db??getPool();const now=deps.now??new Date();const connection=await db.getConnection() as Pick<PoolConnection,"beginTransaction"|"query"|"execute"|"commit"|"rollback"|"release">;await connection.beginTransaction();
  try{
    const [rows]=await connection.query("SELECT c.id,c.user_id,c.code_hash,c.attempts,c.expires_at,c.consumed_at,u.role_name,u.account_status,u.disabled_until,u.disabled_forever FROM control_auth_challenges c INNER JOIN users u ON u.id=c.user_id WHERE c.challenge_hash=? LIMIT 1 FOR UPDATE",[hashControlSecret(challengeToken)]) as [ChallengeRow[],unknown];const challenge=rows[0];
    if(!challenge||challenge.consumed_at||new Date(challenge.expires_at).getTime()<=now.getTime()){await connection.rollback();return {ok:false,status:401,error:"Phiên xác minh đã hết hạn."};}
    if(challenge.attempts>=5){await connection.rollback();return {ok:false,status:429,error:"Đã vượt quá số lần nhập mã."};}
    if(!isUserAccessActive({accountStatus:challenge.account_status,disabledUntil:challenge.disabled_until,disabledForever:Boolean(challenge.disabled_forever)},now)||!canAccessAdmin(challenge.role_name)){await connection.rollback();return {ok:false,status:403,error:"Tài khoản không còn quyền Control."};}
    if(!/^\d{6}$/.test(code)||!equalHash(challenge.code_hash,hashControlSecret(code))){await connection.execute("UPDATE control_auth_challenges SET attempts=attempts+1 WHERE id=?",[challenge.id]);await connection.commit();return {ok:false,status:401,error:"Mã OTP không chính xác."};}
    const credentials=createControlCredentials();const expiresAt=new Date(now.getTime()+CONTROL_ABSOLUTE_TIMEOUT_MS);
    await connection.execute("UPDATE control_auth_challenges SET consumed_at=? WHERE id=?",[now,challenge.id]);
    await connection.execute("INSERT INTO control_sessions (user_id,token_hash,csrf_hash,expires_at,last_used_at) VALUES (?,?,?,?,?)",[challenge.user_id,credentials.tokenHash,credentials.csrfHash,expiresAt,now]);
    await connection.commit();return {ok:true,token:credentials.token,csrfToken:credentials.csrfToken,expiresAt};
  }catch(error){await connection.rollback();throw error;}finally{connection.release();}
}
