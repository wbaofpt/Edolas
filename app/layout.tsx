import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Inter, Press_Start_2P, VT323 } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { AmbientWorld } from "@/components/motion/ambient-world";
import { CinematicLoader } from "@/components/motion/cinematic-loader";
import { CustomScrollbar } from "@/components/custom-scrollbar";
import { getUserBySession } from "@/lib/auth/service";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { readPublicSiteConfig } from "@/lib/admin/public-settings";

const inter = Inter({
  subsets: ["latin", "vietnamese"],
  display: "swap",
  variable: "--font-inter"
});

const pressStart = Press_Start_2P({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-pixel"
});

const vt323 = VT323({
  subsets: ["latin"],
  display: "swap",
  weight: "400",
  variable: "--font-mono-display"
});

export const metadata: Metadata = {
  title: "EdolasSG | Minecraft Community Portal",
  description: "Cổng thông tin server Minecraft EdolasSG: mode chơi, diễn đàn, wiki, kỉ luật, và dữ liệu MySQL.",
  metadataBase: new URL("https://edolassg.local")
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isControlRoute = headers().get("x-edolas-control-route") === "1";
  const websiteContext = isControlRoute
    ? null
    : await Promise.all([
        getUserBySession(cookies().get(SESSION_COOKIE_NAME)?.value).catch(() => null),
        readPublicSiteConfig()
      ]);

  return (
    <html lang="vi" className={`${inter.variable} ${pressStart.variable} ${vt323.variable}`}>
      <body className="min-h-dvh font-sans antialiased">
        {isControlRoute ? null : <CinematicLoader />}
        {isControlRoute ? null : <CustomScrollbar />}
        <div className={`relative min-h-dvh bg-[#080B18] ${isControlRoute ? "" : "overflow-hidden"}`}>
          {isControlRoute ? null : <AmbientWorld intensity="page" />}
          {isControlRoute ? null : <SiteHeader user={websiteContext![0]} discordUrl={websiteContext![1].discordUrl} maintenanceMode={websiteContext![1].maintenanceMode} />}
          <main className="relative z-10">{children}</main>
        </div>
      </body>
    </html>
  );
}
