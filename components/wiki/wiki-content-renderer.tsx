/* eslint-disable @next/next/no-img-element */
import { parseWikiContent } from "@/lib/wiki/content";

export function WikiContentRenderer({ content, preview = false }: { content: string; preview?: boolean }) {
  const blocks = parseWikiContent(content);
  if (!blocks.length) return preview ? <p className="wiki-preview-empty">Nội dung xem trước sẽ xuất hiện tại đây.</p> : null;

  return <div className={preview ? "wiki-rich-content is-preview" : "wiki-rich-content"}>{blocks.map((block, index) => {
    if (block.type === "text") return <p key={`${index}-${block.value.slice(0, 20)}`} className="whitespace-pre-wrap">{block.value}</p>;
    if (block.type === "video") return <figure key={`${index}-${block.path}`} className="wiki-media-block"><video src={block.path} controls preload="metadata" playsInline />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
    return <figure key={`${index}-${block.path}`} className="wiki-media-block"><img src={block.path} alt={block.caption || "Minh họa Wiki"} loading="lazy" decoding="async" />{block.caption ? <figcaption>{block.caption}</figcaption> : null}</figure>;
  })}</div>;
}
