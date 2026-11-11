import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // subset-font loads harfbuzz wasm at runtime and mongodb has optional native deps; keep them unbundled.
  serverExternalPackages: ["subset-font", "harfbuzzjs", "mongodb"],
  // Banner and card routes read these from disk to inline them into the SVG.
  outputFileTracingIncludes: {
    "/api/banner": ["./public/assets/**/*", "./public/fonts/*"],
    "/api/profile/banner": ["./public/assets/**/*", "./public/fonts/*"],
    "/api/github/[card]": ["./public/fonts/inter-*"],
    "/api/stats/users": ["./public/fonts/inter-*"],
    "/api/badge": ["./public/fonts/inter-*"],
    "/api/badge/social": ["./public/fonts/inter-*"],
  },
  // Backgrounds, icons and fonts keep their names when re-encoded, so browsers revalidate daily
  // but keep showing the copy they have meanwhile (Vercel's default is to revalidate every load).
  async headers() {
    return ["/assets/:path*", "/fonts/:path*"].map((source) => ({
      source,
      headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=2592000" }],
    }));
  },
};

export default nextConfig;
