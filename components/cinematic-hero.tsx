"use client";

import Image from "next/image";
import Link from "next/link";
import { Gamepad2, MessageCircleMore } from "lucide-react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform, type Variants } from "framer-motion";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import { AmbientWorld } from "@/components/motion/ambient-world";
import { BrandWordmark } from "@/components/brand-wordmark";
import { ServerConnectionDock } from "@/components/server-connection-dock";
import { shouldEnablePointerMotion } from "@/lib/motion";
import type { PublicMinecraftStatus } from "@/lib/minecraft/public-status";

const cinematicEase = [0.22, 1, 0.36, 1] as const;

export function CinematicHero({ discordUrl = "https://discord.gg/edolassg", serverIp = "play.edolassg.vn", bedrockIp, bedrockPort = "19132", maintenanceMode = false, networkStatus = null }: { discordUrl?: string; serverIp?: string; bedrockIp?: string; bedrockPort?: string; maintenanceMode?: boolean; networkStatus?: PublicMinecraftStatus | null }) {
  const reducedMotion = useReducedMotion();
  const [precisePointer, setPrecisePointer] = useState(false);
  const bounds = useRef<DOMRect | null>(null);
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const smoothX = useSpring(pointerX, { stiffness: 70, damping: 20, mass: 0.8 });
  const smoothY = useSpring(pointerY, { stiffness: 70, damping: 20, mass: 0.8 });
  const imageX = useTransform(smoothX, [-1, 1], [-14, 14]);
  const imageY = useTransform(smoothY, [-1, 1], [-9, 9]);
  const worldX = useTransform(smoothX, [-1, 1], [10, -10]);
  const worldY = useTransform(smoothY, [-1, 1], [6, -6]);
  const contentX = useTransform(smoothX, [-1, 1], [-4, 4]);
  const contentY = useTransform(smoothY, [-1, 1], [-3, 3]);
  const pointerMotion = shouldEnablePointerMotion(Boolean(reducedMotion), precisePointer);

  useEffect(() => {
    const query = window.matchMedia("(pointer: fine)");
    const update = () => setPrecisePointer(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const group: Variants = {
    hidden: {},
    shown: { transition: { staggerChildren: reducedMotion ? 0 : 0.11, delayChildren: reducedMotion ? 0 : 0.18 } }
  };
  const item: Variants = {
    hidden: { opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 },
    shown: { opacity: 1, y: 0, transition: { duration: reducedMotion ? 0 : 0.72, ease: cinematicEase } }
  };

  function handlePointerEnter(event: PointerEvent<HTMLElement>) {
    if (pointerMotion) bounds.current = event.currentTarget.getBoundingClientRect();
  }

  function handlePointerMove(event: PointerEvent<HTMLElement>) {
    if (!pointerMotion || !bounds.current) return;
    pointerX.set(((event.clientX - bounds.current.left) / bounds.current.width - 0.5) * 2);
    pointerY.set(((event.clientY - bounds.current.top) / bounds.current.height - 0.5) * 2);
  }

  function resetPointer() {
    bounds.current = null;
    pointerX.set(0);
    pointerY.set(0);
  }

  return (
    <section id="home" className="mystic-hero" onPointerEnter={handlePointerEnter} onPointerMove={handlePointerMove} onPointerLeave={resetPointer}>
      <motion.div className="hero-image" style={{ x: imageX, y: imageY, scale: 1.04 }}>
        <Image src="/banner-edolas-night.png" alt="Thành trì Minecraft huyền bí của EdolasSG" fill priority sizes="100vw" className="hero-banner-image" />
      </motion.div>
      <motion.div className="absolute inset-0 z-[1]" style={{ x: worldX, y: worldY }}><AmbientWorld intensity="hero" /></motion.div>
      <div className="hero-vignette" />
      <div className="hero-scanline" aria-hidden="true" />
      <div className="relative z-10 mx-auto flex min-h-[780px] w-full max-w-7xl items-end px-4 pb-16 pt-32 sm:px-6 lg:px-8 lg:pb-24">
        <motion.div className="max-w-3xl" variants={group} initial="hidden" animate="shown" style={{ x: contentX, y: contentY }}>
          <motion.div variants={item} className={`mb-6 inline-flex items-center gap-2 border bg-[#080B18]/65 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] backdrop-blur-md ${maintenanceMode ? "border-amber-300/35 text-amber-200" : "border-[#67E8F9]/30 text-[#67E8F9]"}`}><span className="status-dot" /> {maintenanceMode ? "Server đang bảo trì" : "Server đang hoạt động"}</motion.div>
          <motion.h1 variants={item} className="home-wordmark" aria-label="EDOLAS SG">
            <BrandWordmark variant="hero" />
          </motion.h1>
          <motion.p variants={item} className="mt-7 max-w-xl text-lg leading-8 text-[#E0F2FE]/75 sm:text-xl">Một thế giới Minecraft mở ra mỗi ngày. Sinh tồn, xây dựng, cạnh tranh và viết nên huyền thoại của riêng bạn.</motion.p>
          <motion.div variants={item} className="mt-9 flex flex-col gap-3 sm:flex-row">
            <Link href="/game-modes" className="server-button px-6 py-3.5 text-sm focus-ring"><Gamepad2 className="h-5 w-5" /> Khám phá thế giới</Link>
            <a href={discordUrl} target="_blank" rel="noreferrer" className="server-button server-button-dark border-[#38BDF8]/25 px-6 py-3.5 text-sm focus-ring"><MessageCircleMore className="h-5 w-5" /> Tham gia Discord</a>
          </motion.div>
          <motion.div variants={item}><ServerConnectionDock javaIp={serverIp} bedrockIp={bedrockIp || serverIp} bedrockPort={bedrockPort} initialStatus={networkStatus} /></motion.div>
        </motion.div>
      </div>
      <motion.a href="#about" className="scroll-cue focus-ring" aria-label="Cuộn xuống phần giới thiệu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reducedMotion ? 0 : 1.15 }}><span /> Khám phá thêm</motion.a>
    </section>
  );
}
