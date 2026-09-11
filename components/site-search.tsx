"use client";
/* Avatar sources can be local uploads or external skin URLs. */
/* eslint-disable @next/next/no-img-element */
import { CalendarDays, LoaderCircle, MessageSquareText, Search, UserRound, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { SiteSearchResults } from "@/lib/search/service";

type SearchItem = { kind: "user" | "event" | "forum"; label: string; detail: string; href: string; avatarUrl?: string | null };
function flatten(results: SiteSearchResults): SearchItem[] {
  return [
    ...results.users.map((item) => ({ kind: "user" as const, label: item.displayName, detail: `@${item.username} · ID ${item.id}`, href: `/profile/${item.username}`, avatarUrl: item.avatarUrl })),
    ...results.events.map((item) => ({ kind: "event" as const, label: item.title, detail: `${item.date} · ${item.summary}`, href: `/game-modes#events` })),
    ...results.forum.map((item) => ({ kind: "forum" as const, label: item.title, detail: `${item.category} · ${item.replies} phản hồi · ${item.likes} thích`, href: `/forum/${item.id}` })),
  ];
}
const icons = { user: UserRound, event: CalendarDays, forum: MessageSquareText };
const headings = { user: "Người dùng", event: "Sự kiện", forum: "Diễn đàn" };

export function SiteSearch() {
  const rootRef = useRef<HTMLDivElement>(null); const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState(""); const [results, setResults] = useState<SiteSearchResults>({ users: [], events: [], forum: [] });
  const [loading, setLoading] = useState(false); const [focused, setFocused] = useState(false); const [activeIndex, setActiveIndex] = useState(-1);
  const items = flatten(results); const showPanel = focused && query.trim().length >= 2;
  useEffect(() => { const close = (event: PointerEvent) => { if (!rootRef.current?.contains(event.target as Node)) setFocused(false); }; document.addEventListener("pointerdown", close); return () => document.removeEventListener("pointerdown", close); }, []);
  useEffect(() => {
    const term = query.trim(); if (term.length < 2) { setResults({ users: [], events: [], forum: [] }); setLoading(false); return; }
    const controller = new AbortController(); const timer = window.setTimeout(async () => { setLoading(true); try { const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: controller.signal, cache: "no-store" }); const body = await response.json(); if (response.ok && body.ok) { setResults(body.results); setActiveIndex(-1); } } catch (error) { if (!(error instanceof DOMException && error.name === "AbortError")) setResults({ users: [], events: [], forum: [] }); } finally { if (!controller.signal.aborted) setLoading(false); } }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [query]);
  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) { if (event.key === "Escape") { setFocused(false); setActiveIndex(-1); inputRef.current?.blur(); } else if (event.key === "ArrowDown" && items.length) { event.preventDefault(); setActiveIndex((index) => Math.min(index + 1, items.length - 1)); } else if (event.key === "ArrowUp" && items.length) { event.preventDefault(); setActiveIndex((index) => Math.max(index - 1, 0)); } else if (event.key === "Enter" && activeIndex >= 0 && items[activeIndex]) window.location.assign(items[activeIndex].href); }
  return <div ref={rootRef} className="site-search"><div className={`site-search-control ${focused ? "is-focused" : ""}`}><Search aria-hidden="true" /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onFocus={() => setFocused(true)} onKeyDown={onKeyDown} placeholder="Tìm người dùng, sự kiện, diễn đàn..." aria-label="Tìm kiếm toàn website" aria-expanded={showPanel} aria-controls="site-search-results" aria-activedescendant={activeIndex >= 0 ? `site-search-item-${activeIndex}` : undefined} role="combobox" autoComplete="off" />{loading ? <LoaderCircle className="site-search-loading" aria-label="Đang tìm" /> : query ? <button type="button" onClick={() => { setQuery(""); inputRef.current?.focus(); }} aria-label="Xóa tìm kiếm"><X aria-hidden="true" /></button> : null}</div>
    {showPanel ? <div id="site-search-results" className="site-search-panel" role="listbox" aria-label="Kết quả tìm kiếm">{items.map((item, index) => { const Icon = icons[item.kind]; return <Link key={`${item.kind}-${item.href}-${item.label}`} id={`site-search-item-${index}`} href={item.href} role="option" aria-selected={index === activeIndex} className={`site-search-result ${index === activeIndex ? "is-active" : ""}`} onMouseEnter={() => setActiveIndex(index)}>{item.kind === "user" && item.avatarUrl ? <img src={item.avatarUrl} alt="" /> : <span className={`site-search-result-icon is-${item.kind}`}><Icon aria-hidden="true" /></span>}<span><strong>{item.label}</strong><small>{item.detail}</small></span><em>{headings[item.kind]}</em></Link>; })}{!loading && !items.length ? <p className="site-search-empty">Không tìm thấy kết quả phù hợp.</p> : null}</div> : null}</div>;
}
