import test from "node:test";
import assert from "node:assert/strict";
import { createControlLogoutHandler, createControlPasswordHandler, createControlOtpHandler } from "../lib/control/http.ts";

const user={id:2,username:"admin",displayName:"Admin",roleName:"admin",avatarUrl:null};
const originHeaders={origin:"https://edolas.vn",host:"edolas.vn"};

test("password access endpoint requires the normal signed-in admin session",async()=>{
  const anonymous=createControlPasswordHandler({getRequestUser:async()=>null});
  assert.equal((await anonymous(new Request("https://edolas.vn/api/control/access/password",{method:"POST",headers:originHeaders,body:"{}"}))).status,401);
  const player=createControlPasswordHandler({getRequestUser:async()=>({...user,roleName:"player"})});
  assert.equal((await player(new Request("https://edolas.vn/api/control/access/password",{method:"POST",headers:originHeaders,body:JSON.stringify({password:"x"})}))).status,403);
});

test("password and OTP access endpoints reject cross-origin mutations",async()=>{
  const password=createControlPasswordHandler({getRequestUser:async()=>user,beginControlAccess:async()=>({ok:true,challengeToken:"challenge",emailHint:"a***@mail.test"})});
  const otp=createControlOtpHandler({verifyControlOtp:async()=>({ok:true,token:"control",csrfToken:"csrf",expiresAt:new Date("2026-08-12T20:00:00Z")})});
  const headers={origin:"https://evil.test",host:"edolas.vn"};
  assert.equal((await password(new Request("https://edolas.vn/api/control/access/password",{method:"POST",headers,body:JSON.stringify({password:"secret"})}))).status,403);
  assert.equal((await otp(new Request("https://edolas.vn/api/control/access/otp",{method:"POST",headers:{...headers,cookie:"edolas_control_challenge=challenge"},body:JSON.stringify({code:"123456"})}))).status,403);
});

test("OTP endpoint issues strict control and CSRF cookies",async()=>{
  const handler=createControlOtpHandler({verifyControlOtp:async()=>({ok:true,token:"control-token",csrfToken:"csrf-token",expiresAt:new Date("2026-08-12T20:00:00Z")})});
  const response=await handler(new Request("https://edolas.vn/api/control/access/otp",{method:"POST",headers:{...originHeaders,cookie:"edolas_control_challenge=challenge"},body:JSON.stringify({code:"123456"})}));
  assert.equal(response.status,200);
  const cookies=response.headers.getSetCookie().join(";");
  assert.match(cookies,/edolas_control_session=control-token/);
  assert.match(cookies,/HttpOnly/);
  assert.match(cookies,/SameSite=strict/i);
  assert.match(cookies,/edolas_control_csrf=csrf-token/);
});

test("logout requires a valid Control session and CSRF token",async()=>{
  let deleted=false;
  const handler=createControlLogoutHandler({
    resolveControlSession:async()=>({user,expiresAt:new Date("2026-08-12T20:00:00Z")}) as never,
    deleteControlSession:async()=>{deleted=true;}
  });
  const missing=await handler(new Request("https://edolas.vn/api/control/logout",{method:"POST",headers:originHeaders}));
  assert.equal(missing.status,403);
  assert.equal(deleted,false);
  const response=await handler(new Request("https://edolas.vn/api/control/logout",{method:"POST",headers:{...originHeaders,cookie:"edolas_control_session=control; edolas_control_csrf=csrf","x-control-csrf":"csrf"}}));
  assert.equal(response.status,200);
  assert.equal(deleted,true);
});
