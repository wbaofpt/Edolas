const LOGIN_REDIRECT_BASE = "https://edolas.local";

export function normalizeLoginRedirect(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) {
    return "/";
  }

  try {
    const destination = new URL(value, LOGIN_REDIRECT_BASE);
    if (destination.origin !== LOGIN_REDIRECT_BASE) return "/";
    return `${destination.pathname}${destination.search}${destination.hash}`;
  } catch {
    return "/";
  }
}
