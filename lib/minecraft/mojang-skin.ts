const MINECRAFT_USERNAME = /^[A-Za-z0-9_]{1,16}$/;
const MOJANG_PROFILE_ID = /^[0-9a-f]{32}$/i;
const MOJANG_TEXTURE_PATH = /^\/texture\/[0-9a-f]{32,64}$/i;

function object(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function safeTextureUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || url.hostname !== "textures.minecraft.net") return null;
    if (url.username || url.password || url.port || url.search || url.hash || !MOJANG_TEXTURE_PATH.test(url.pathname)) return null;
    url.protocol = "https:";
    return url.toString();
  } catch {
    return null;
  }
}

async function cachedJson(fetcher: typeof fetch, url: string) {
  const response = await fetcher(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 300 },
    signal: AbortSignal.timeout(4_000)
  });
  if (!response.ok) return null;
  return object(await response.json());
}

export async function resolveMojangSkinUrl(username: string, fetcher: typeof fetch = fetch): Promise<string | null> {
  if (!MINECRAFT_USERNAME.test(username)) return null;
  try {
    const profile = await cachedJson(fetcher, `https://api.mojang.com/users/profiles/minecraft/${encodeURIComponent(username)}`);
    const profileId = profile?.id;
    if (typeof profileId !== "string" || !MOJANG_PROFILE_ID.test(profileId)) return null;

    const session = await cachedJson(fetcher, `https://sessionserver.mojang.com/session/minecraft/profile/${profileId.toLowerCase()}`);
    if (!Array.isArray(session?.properties)) return null;
    const textureProperty = session.properties.map(object).find((property) => property?.name === "textures");
    if (typeof textureProperty?.value !== "string") return null;

    const decoded = object(JSON.parse(Buffer.from(textureProperty.value, "base64").toString("utf8")));
    const textures = object(decoded?.textures);
    const skin = object(textures?.SKIN);
    return safeTextureUrl(skin?.url);
  } catch {
    return null;
  }
}
