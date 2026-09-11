export type WikiContentBlock = { type: "text"; value: string } | { type: "image" | "gif" | "video"; path: string; caption: string };

const TOKEN = /^\[\[(image|gif|video):(\/uploads\/(?:wiki|forum)\/[a-zA-Z0-9._-]+)\|([^\]\r\n]{0,300})\]\]$/;

export function parseWikiContent(content: string): WikiContentBlock[] {
  return content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean).map((part) => {
    const match = TOKEN.exec(part);
    if (!match) return { type: "text" as const, value: part };
    return { type: match[1] as "image" | "gif" | "video", path: match[2], caption: match[3].trim() };
  });
}

export function buildWikiMediaToken(kind: "image" | "gif" | "video", path: string, caption: string) {
  const safeCaption = caption.replace(/[\]\r\n]/g, " ").trim().slice(0, 300);
  if (!/^\/uploads\/wiki\/[a-zA-Z0-9._-]+$/.test(path)) throw new Error("Đường dẫn media Wiki không hợp lệ.");
  return `[[${kind}:${path}|${safeCaption}]]`;
}

export function buildForumMediaToken(kind: "image" | "gif" | "video", path: string, caption: string) {
  const safeCaption = caption.replace(/[\]\r\n]/g, " ").trim().slice(0, 300);
  if (!/^\/uploads\/forum\/[a-zA-Z0-9._-]+$/.test(path)) throw new Error("Forum media path is invalid.");
  return `[[${kind}:${path}|${safeCaption}]]`;
}

export function buildWikiMediaGroupToken(media: Array<{ kind: "image" | "gif" | "video"; path: string; caption: string }>) {
  return media.map((item) => buildWikiMediaToken(item.kind, item.path, item.caption)).join("\n\n");
}

export function extractWikiMediaPaths(content: string) {
  return parseWikiContent(content)
    .filter((block): block is Extract<WikiContentBlock, { path: string }> => block.type !== "text")
    .map((block) => block.path);
}

export function insertWikiMediaAtSelection(content: string, start: number, end: number, token: string) {
  const safeStart = Math.max(0, Math.min(start, content.length));
  const safeEnd = Math.max(safeStart, Math.min(end, content.length));
  const before = content.slice(0, safeStart);
  const after = content.slice(safeEnd);
  const prefix = before && !before.endsWith("\n\n") ? (before.endsWith("\n") ? "\n" : "\n\n") : "";
  const suffix = after && !after.startsWith("\n\n") ? (after.startsWith("\n") ? "\n" : "\n\n") : "";
  const insertion = `${prefix}${token}${suffix}`;
  return { content: `${before}${insertion}${after}`, cursor: safeStart + insertion.length };
}
