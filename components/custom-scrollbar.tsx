"use client";

import { useEffect, useRef, useState } from "react";
import { getScrollIndicatorMetrics, type ScrollIndicatorMetrics } from "@/lib/scroll-indicator";

const TRACK_VERTICAL_INSET = 108;
const HIDE_DELAY_MS = 850;
const initialMetrics: ScrollIndicatorMetrics = {
  scrollable: false,
  thumbHeight: 0,
  thumbOffset: 0
};

export function CustomScrollbar() {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [isVisible, setIsVisible] = useState(false);
  const trackRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    let frameId = 0;
    let hideTimer = 0;

    function measure() {
      frameId = 0;
      setMetrics(getScrollIndicatorMetrics({
        scrollY: window.scrollY,
        scrollHeight: document.documentElement.scrollHeight,
        viewportHeight: window.innerHeight,
        // Measure the rendered track so CSS rem/zoom changes cannot desync the thumb.
        trackHeight: trackRef.current?.getBoundingClientRect().height ?? Math.max(window.innerHeight - TRACK_VERTICAL_INSET, 0)
      }));
    }

    function scheduleMeasure() {
      if (frameId === 0) {
        frameId = window.requestAnimationFrame(measure);
      }
    }

    function handleScroll() {
      setIsVisible(true);
      scheduleMeasure();
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setIsVisible(false), HIDE_DELAY_MS);
    }

    function handleResize() {
      scheduleMeasure();
    }

    measure();
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(hideTimer);
    };
  }, []);

  const visible = isVisible && metrics.scrollable;

  return (
    <div className={`custom-scrollbar${visible ? " is-visible" : ""}`} aria-hidden="true">
      <span ref={trackRef} className="custom-scrollbar-track">
        <span
          className="custom-scrollbar-thumb"
          style={{
            height: `${metrics.thumbHeight}px`,
            transform: `translate3d(0, ${metrics.thumbOffset}px, 0)`
          }}
        />
      </span>
    </div>
  );
}
