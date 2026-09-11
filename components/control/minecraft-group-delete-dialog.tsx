"use client";

import { AlertTriangle, Loader2, Trash2, X } from "lucide-react";
import { useEffect, useRef } from "react";
import type { ControlMinecraftGroup } from "@/lib/minecraft/control-status";

type MinecraftGroupDeleteDialogProps = {
  group: ControlMinecraftGroup | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function MinecraftGroupDeleteDialog({ group, busy, onCancel, onConfirm }: MinecraftGroupDeleteDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const open = group !== null;

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    cancelRef.current?.focus();
    return () => {
      const focusTarget = previousFocus.current;
      if (focusTarget?.isConnected) focusTarget.focus();
      else document.getElementById("minecraft-cluster-inventory-title")?.focus();
      previousFocus.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (open && busy) dialogRef.current?.focus();
  }, [busy, open]);

  useEffect(() => {
    if (!open) return;
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !busy) {
        event.preventDefault();
        onCancel();
        return;
      }
      if (event.key !== "Tab") return;
      const controls = [...(dialogRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled)") ?? [])];
      if (controls.length === 0) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [busy, onCancel, open]);

  if (!group) return null;

  return (
    <div className="minecraft-delete-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}>
      <div ref={dialogRef} role="alertdialog" aria-modal="true" aria-labelledby="minecraft-delete-title" aria-describedby="minecraft-delete-description" aria-busy={busy} tabIndex={-1} className="minecraft-delete-dialog">
        <div className="minecraft-delete-dialog-icon"><AlertTriangle aria-hidden="true" /></div>
        <div className="minecraft-delete-dialog-copy">
          <span>DANGER ZONE // TELEMETRY CLEANUP</span>
          <h2 id="minecraft-delete-title">Xóa dữ liệu cụm {group.label}?</h2>
          <p id="minecraft-delete-description">Thao tác này xóa dữ liệu của {group.totalServers} backend thuộc cụm <code>{group.key}</code>, bao gồm player và nonce đã lưu. Chế độ chơi, banner và API key không bị xóa.</p>
          <p>Nếu plugin vẫn chạy, cụm sẽ tự xuất hiện lại khi gửi telemetry mới.</p>
        </div>
        <button type="button" className="minecraft-delete-dialog-close" aria-label="Đóng hộp xác nhận" disabled={busy} onClick={onCancel}><X aria-hidden="true" /></button>
        <div className="minecraft-delete-dialog-actions">
          <button ref={cancelRef} type="button" className="control-secondary-button" disabled={busy} onClick={onCancel}>Giữ lại cụm</button>
          <button type="button" className="minecraft-delete-confirm" disabled={busy} onClick={onConfirm}>
            {busy ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Trash2 aria-hidden="true" />}
            {busy ? "Đang xóa dữ liệu..." : "Xóa dữ liệu cụm"}
          </button>
        </div>
      </div>
    </div>
  );
}
