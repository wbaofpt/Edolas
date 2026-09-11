"use client";

import { Eye, Radio, Users } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { WikiReaderMetrics } from "@/lib/wiki/readers";

export function WikiReaderTracker({ pageId, initialMetrics }: { pageId: number; initialMetrics: WikiReaderMetrics }) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const sentOpen = useRef(false);

  useEffect(() => {
    let active = true;
    async function send(event: "open" | "heartbeat") {
      try {
        const response = await fetch(`/api/wiki/pages/${pageId}/read`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event }) });
        const result = await response.json();
        if (active && response.ok && result.metrics) setMetrics(result.metrics);
      } catch { /* Metrics are informative and must never block article reading. */ }
    }
    if (!sentOpen.current) { sentOpen.current = true; void send("open"); }
    const heartbeat = () => { if (document.visibilityState === "visible") void send("heartbeat"); };
    const interval = window.setInterval(heartbeat, 30_000);
    document.addEventListener("visibilitychange", heartbeat);
    return () => { active = false; window.clearInterval(interval); document.removeEventListener("visibilitychange", heartbeat); };
  }, [pageId]);

  return <dl className="wiki-reader-stats" aria-label="Thống kê người đọc" aria-live="polite"><div><Eye className="h-4 w-4" /><dt>Lượt mở</dt><dd>{metrics.totalOpens.toLocaleString("vi-VN")}</dd></div><div><Users className="h-4 w-4" /><dt>Độc giả</dt><dd>{metrics.uniqueReaders.toLocaleString("vi-VN")}</dd></div><div className="is-live"><Radio className="h-4 w-4" /><dt>Đang đọc</dt><dd>{metrics.activeReaders.toLocaleString("vi-VN")}</dd></div></dl>;
}
