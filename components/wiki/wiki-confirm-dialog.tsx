"use client";

import { AlertTriangle, X } from "lucide-react";
import { useEffect, useRef } from "react";

type Props = {
  open: boolean;
  title: string;
  description: string;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function WikiConfirmDialog({ open, title, description, busy = false, onCancel, onConfirm }: Props) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onCancel(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onCancel, open]);
  if (!open) return null;
  return <div className="wiki-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}><div role="alertdialog" aria-modal="true" aria-labelledby="wiki-dialog-title" aria-describedby="wiki-dialog-description" className="wiki-dialog"><div className="wiki-dialog-icon"><AlertTriangle className="h-5 w-5" /></div><div><h2 id="wiki-dialog-title" className="font-pixel text-base text-[#F8FAFC]">{title}</h2><p id="wiki-dialog-description" className="mt-3 text-sm leading-6 text-[#94A3B8]">{description}</p></div><button type="button" aria-label="Đóng" disabled={busy} onClick={onCancel} className="wiki-dialog-close focus-ring"><X className="h-4 w-4" /></button><div className="wiki-dialog-actions"><button ref={cancelRef} type="button" disabled={busy} onClick={onCancel} className="server-button server-button-dark px-4 py-3 focus-ring">Hủy</button><button type="button" disabled={busy} onClick={onConfirm} className="wiki-danger-button focus-ring">{busy ? "Đang xóa..." : "Xóa vĩnh viễn"}</button></div></div></div>;
}

