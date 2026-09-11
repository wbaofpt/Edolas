import { NextResponse } from "next/server.js";
import { SESSION_COOKIE_NAME, type SessionCookieOptions } from "./session.ts";
import type { AuthDependencies, AuthDbLike, LoginInput, RegisterInput } from "./service.ts";
import { loginUser, logoutUser, registerUser } from "./service.ts";
import { parseLoginBody, parseRegisterBody } from "./validation.ts";

type PublicUserResponse = {
  id: number;
  username: string;
  displayName: string;
  roleName: string;
  avatarUrl: string | null;
};

type LoginSuccessResponse = {
  ok: true;
  user: PublicUserResponse;
  session: AuthSessionCookie;
};

type RegisterSuccessResponse = {
  ok: true;
  user: PublicUserResponse;
};

type AuthSessionCookie = {
  name: typeof SESSION_COOKIE_NAME;
  value: string;
  options: SessionCookieOptions;
};

type AuthFailureResponse = {
  ok: false;
  error: string;
  fieldErrors?: Record<string, string>;
};

type AuthRouteDeps = {
  loginUser?: (input: LoginInput, deps?: AuthDependencies) => Promise<LoginSuccessResponse | AuthFailureResponse & { status: 401 | 503 }>;
  registerUser?: (input: RegisterInput, deps?: AuthDependencies) => Promise<RegisterSuccessResponse | AuthFailureResponse & { status: 400 | 409 | 503 }>;
  logoutUser?: (rawToken: string, deps?: { db?: AuthDbLike }) => Promise<void>;
  db?: AuthDbLike;
  now?: Date;
  verification?: AuthDependencies["verification"];
};

function attachSessionCookie(response: NextResponse, session: AuthSessionCookie) {
  response.cookies.set(session.name, session.value, session.options);
}

function buildFailureResponse(status: number, body: AuthFailureResponse) {
  return NextResponse.json(body, { status });
}

function getCookieValue(cookieHeader: string | null, name: string) {
  if (!cookieHeader) {
    return null;
  }

  const candidate = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  if (!candidate) {
    return null;
  }

  const value = candidate.slice(name.length + 1).trim();
  return value.startsWith("\"") && value.endsWith("\"") ? value.slice(1, -1) : value;
}

export function createLoginRouteHandler(deps: AuthRouteDeps = {}) {
  const resolveLoginUser = deps.loginUser ?? loginUser;

  return async function POST(request: Request) {
    const parsedBody = parseLoginBody(await request.json().catch(() => null));
    if (!parsedBody.ok) {
      return buildFailureResponse(parsedBody.status, {
        ok: false,
        error: parsedBody.error,
        fieldErrors: parsedBody.fieldErrors
      });
    }

    const result = await resolveLoginUser(parsedBody.value, {
      db: deps.db,
      now: deps.now,
      verification: deps.verification
    });

    if (!result.ok) {
      return buildFailureResponse(result.status, { ok: false, error: result.error });
    }

    const response = NextResponse.json({ ok: true, user: result.user }, { status: 200 });
    attachSessionCookie(response, result.session);
    return response;
  };
}

export function createRegisterRouteHandler(deps: AuthRouteDeps = {}) {
  const resolveRegisterUser = deps.registerUser ?? registerUser;

  return async function POST(request: Request) {
    const parsedBody = parseRegisterBody(await request.json().catch(() => null));
    if (!parsedBody.ok) {
      return buildFailureResponse(parsedBody.status, {
        ok: false,
        error: parsedBody.error,
        fieldErrors: parsedBody.fieldErrors
      });
    }

    const result = await resolveRegisterUser(parsedBody.value, {
      db: deps.db,
      now: deps.now,
      verification: deps.verification
    });

    if (!result.ok) {
      return buildFailureResponse(result.status, { ok: false, error: result.error });
    }

    return NextResponse.json({ ok: true, user: result.user }, { status: 201 });
  };
}

export function createLogoutRouteHandler(deps: AuthRouteDeps = {}) {
  const resolveLogoutUser = deps.logoutUser ?? logoutUser;

  return async function POST(request: Request) {
    const rawToken = getCookieValue(request.headers.get("cookie"), SESSION_COOKIE_NAME);
    if (rawToken) {
      await resolveLogoutUser(rawToken, { db: deps.db });
    }

    const response = NextResponse.json({ ok: true }, { status: 200 });
    response.cookies.set(SESSION_COOKIE_NAME, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: new Date(0),
      maxAge: 0
    });
    return response;
  };
}

export const loginRoute = createLoginRouteHandler();
export const registerRoute = createRegisterRouteHandler();
export const logoutRoute = createLogoutRouteHandler();
