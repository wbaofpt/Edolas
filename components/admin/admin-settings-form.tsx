"use client";

import { useState } from "react";
import type { SiteSetting } from "@/lib/admin/service";
import { controlFetch } from "@/lib/control/client";

export function AdminSettingsForm({ settings }: { settings: SiteSetting[] }) {
  const initial = Object.fromEntries(settings.map((setting) => [setting.key, setting.value]));
  const [values, setValues] = useState(initial);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const response = await controlFetch("/api/control/settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ settings: values })
    });
    const data = await response.json();
    setMessage(response.ok ? "Đã lưu cài đặt website." : data.error);
  }

  const field = (key: string, label: string, help: string, inputMode?: "text" | "numeric") => (
    <label className="block text-sm font-bold text-[#E0F2FE]">{label}
      <input inputMode={inputMode} value={values[key] ?? ""} onChange={(event) => setValues({ ...values, [key]: event.target.value })} className="mt-2 h-12 w-full border border-[#38BDF8]/20 bg-[#080B18] px-4 font-normal text-[#F8FAFC] focus:border-[#67E8F9] focus:outline-none" />
      <span className="mt-2 block text-xs font-normal text-[#94A3B8]">{help}</span>
    </label>
  );

  return (
    <form onSubmit={save} className="grid gap-6">
      <section className="grid gap-5 border border-[#38BDF8]/15 bg-[#0D1225] p-5 sm:p-6">
        <h2 className="font-pixel text-sm text-[#F8FAFC]">Nhận diện và kết nối</h2>
        {field("server_name", "Tên máy chủ", "Hiển thị trong các khu vực dùng cấu hình động.")}
        {field("server_ip", "IP kết nối Java / PC", "Hostname dành cho Minecraft Java Edition trên máy tính.")}
        {field("bedrock_ip", "IP Bedrock / PE", "Hostname dành cho Bedrock Edition trên điện thoại và console.")}
        {field("bedrock_port", "Cổng Bedrock", "Cổng kết nối Bedrock, mặc định là 19132.", "numeric")}
        {field("discord_url", "Discord", "Liên kết cộng đồng công khai.")}
      </section>
      <section className="border border-amber-300/20 bg-amber-300/5 p-5">
        <label className="flex min-h-11 items-center justify-between gap-4 font-bold text-[#F8FAFC]">Chế độ bảo trì<input type="checkbox" checked={values.maintenance_mode === "true"} onChange={(event) => setValues({ ...values, maintenance_mode: String(event.target.checked) })} className="size-5 accent-[#8B5CF6]" /></label>
        <p className="mt-2 text-sm text-[#94A3B8]">Dùng để phát tín hiệu trạng thái bảo trì cho website.</p>
      </section>
      {message ? <p role="status" className="text-sm text-[#67E8F9]">{message}</p> : null}
      <button className="server-button min-h-12 justify-self-start px-6">Lưu cài đặt</button>
    </form>
  );
}
