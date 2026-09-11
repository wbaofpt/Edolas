"use client";

import { useEffect, useRef, useState } from "react";

export function useTypingPulse<T extends string>() {
  const [typingField, setTypingField] = useState<T | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const frameRef = useRef<number | null>(null);

  function markTyping(field: T) {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }

    setTypingField(null);
    frameRef.current = requestAnimationFrame(() => setTypingField(field));
    timeoutRef.current = setTimeout(() => setTypingField(null), 360);
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return { typingField, markTyping };
}
