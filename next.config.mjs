/** @type {import('next').NextConfig} */
const nextConfig = {
  // Keep production artifacts separate so an active dev server cannot corrupt a build.
  distDir: process.env.NODE_ENV === "production" ? ".next-build" : ".next",
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "textures.minecraft.net",
        pathname: "/texture/**"
      }
    ]
  }
};

export default nextConfig;
