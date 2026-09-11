"use client";

import { Camera, Save, UserCheck, UserPlus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState, type FormEvent } from "react";

type Props = {
  username: string;
  displayName: string;
  bio: string;
  isOwner: boolean;
  isFollowing: boolean;
  canFollow: boolean;
};

async function readResponse(response: Response) {
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error ?? "Không thể hoàn tất thao tác.");
  return body;
}

export function ProfileActions({ username, displayName, bio, isOwner, isFollowing: initialFollowing, canFollow }: Props) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [following, setFollowing] = useState(initialFollowing);
  const [message, setMessage] = useState("");

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage("");
    const data = new FormData(event.currentTarget);
    try {
      await readResponse(await fetch("/api/profile/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ displayName: data.get("displayName"), bio: data.get("bio") }) }));
      setMessage("Đã cập nhật hồ sơ."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể cập nhật hồ sơ."); }
    finally { setBusy(false); }
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file) return;
    setBusy(true); setMessage("");
    const data = new FormData(); data.set("avatar", file);
    try {
      await readResponse(await fetch("/api/profile/avatar", { method: "POST", body: data }));
      setMessage("Ảnh đại diện đã được thay đổi."); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể tải ảnh lên."); }
    finally { setBusy(false); if (fileRef.current) fileRef.current.value = ""; }
  }

  async function toggleFollow() {
    setBusy(true); setMessage("");
    try {
      const result = await readResponse(await fetch(`/api/profile/${encodeURIComponent(username)}/follow`, { method: "POST" }));
      setFollowing(result.following); router.refresh();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Không thể thay đổi theo dõi."); }
    finally { setBusy(false); }
  }

  return (
    <div className={`profile-actions ${isOwner ? "is-owner" : "is-social"}`}>
      {isOwner ? (
        <>
          <button type="button" className="profile-avatar-button focus-ring" disabled={busy} onClick={() => fileRef.current?.click()}><span><Camera aria-hidden="true" /></span><span><strong>Đổi ảnh đại diện</strong><small>PNG, JPG hoặc WebP</small></span></button>
          <input ref={fileRef} className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => uploadAvatar(event.target.files?.[0])} />
          <form onSubmit={updateProfile} className="profile-editor">
            <label>Tên hiển thị<input name="displayName" defaultValue={displayName} maxLength={80} required className="focus-ring" /></label>
            <label>Giới thiệu<textarea name="bio" defaultValue={bio} maxLength={500} rows={5} className="focus-ring" /></label>
            <button className="profile-save-button focus-ring" disabled={busy}><Save aria-hidden="true" />{busy ? "Đang lưu..." : "Lưu thay đổi"}</button>
          </form>
        </>
      ) : canFollow ? (
        <button type="button" className={`profile-follow-button focus-ring ${following ? "is-following" : ""}`} disabled={busy} onClick={toggleFollow}>{following ? <UserCheck aria-hidden="true" /> : <UserPlus aria-hidden="true" />}{following ? "Đang theo dõi" : "Theo dõi thành viên"}</button>
      ) : null}
      <p className="profile-action-message" aria-live="polite">{message}</p>
    </div>
  );
}
