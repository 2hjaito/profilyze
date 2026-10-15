import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // subset-font loads harfbuzz wasm at runtime and mongodb has optional native deps; keep them unbundled.
  serverExternalPackages: ["subset-font", "harfbuzzjs", "mongodb"],
  // Banner and card routes read these from disk to inline them into the SVG.
  outputFileTracingIncludes: {
    "/api/banner": ["./public/assets/**/*", "./public/fonts/*"],
    "/api/profile/banner": ["./public/assets/**/*", "./public/fonts/*"],
    "/api/github/[card]": ["./public/fonts/inter-*"],
  },
};

export default nextConfig;
