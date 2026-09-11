import test from "node:test";
import assert from "node:assert/strict";
import { createLoginRouteHandler, createRegisterRouteHandler } from "../lib/auth/http.ts";

test("register route returns field errors for incomplete payloads", async () => {
  const handler = createRegisterRouteHandler({
    registerUser: async () => {
      throw new Error("registerUser should not be called for invalid payloads");
    }
  });

  const response = await handler(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "stormarchitect" })
    })
  );

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("set-cookie"), null);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.deepEqual(body.fieldErrors, {
    displayName: "Vui lòng nhập tên hiển thị.",
    email: "Vui lòng nhập email.",
    password: "Vui lòng nhập mật khẩu."
  });
});

test("register route forwards duplicate errors without setting a cookie", async () => {
  const handler = createRegisterRouteHandler({
    registerUser: async () => ({
      ok: false,
      status: 409 as const,
      error: "Tên đăng nhập hoặc email đã được sử dụng."
    })
  });

  const response = await handler(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Storm Architect",
        username: "stormarchitect",
        email: "storm@example.com",
        password: "Seismic#123",
        referralCode: null
      })
    })
  );

  assert.equal(response.status, 409);
  assert.equal(response.headers.get("set-cookie"), null);

  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(body.error, "Tên đăng nhập hoặc email đã được sử dụng.");
});

test("register route creates an account without setting a session cookie", async () => {
  const handler = createRegisterRouteHandler({
    registerUser: async () => ({
      ok: true,
      user: {
        id: 42,
        username: "stormarchitect",
        displayName: "Storm Architect",
        roleName: "player",
        avatarUrl: null
      }
    })
  });

  const response = await handler(
    new Request("http://localhost/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        displayName: "Storm Architect",
        username: "stormarchitect",
        email: "storm@example.com",
        password: "Seismic#123",
        referralCode: null
      })
    })
  );

  assert.equal(response.status, 201);
  assert.equal(response.headers.get("set-cookie"), null);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.user.username, "stormarchitect");
});

test("login route sets the session cookie and hides the token", async () => {
  const handler = createLoginRouteHandler({
    loginUser: async () => ({
      ok: true,
      user: {
        id: 42,
        username: "storm_architect",
        displayName: "Storm Architect",
        roleName: "player",
        avatarUrl: null
      },
      session: {
        name: "edolas_session",
        value: "raw-session-token",
        options: {
          httpOnly: true,
          sameSite: "lax",
          secure: false,
          path: "/",
          expires: new Date("2026-08-12T00:00:00Z"),
          maxAge: 86400
        }
      }
    })
  });

  const response = await handler(
    new Request("http://localhost/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "storm_architect", password: "Seismic#123", remember: false })
    })
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie") ?? "", /edolas_session=/);

  const body = await response.json();
  assert.equal(body.ok, true);
  assert.equal(body.session, undefined);
  assert.equal(body.user.username, "storm_architect");
});
