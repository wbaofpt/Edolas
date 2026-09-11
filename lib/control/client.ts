import { CONTROL_CSRF_COOKIE } from "./constants";

function readBrowserCookie(name: string) {
  const prefix = `${name}=`;
  const entry = document.cookie
    .split(";")
    .map((value) => value.trim())
    .find((value) => value.startsWith(prefix));
  return entry ? decodeURIComponent(entry.slice(prefix.length)) : "";
}

export function readControlCsrfToken() {
  return readBrowserCookie(CONTROL_CSRF_COOKIE);
}

export function controlFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("x-control-csrf", readControlCsrfToken());
  return fetch(input, { ...init, headers });
}
