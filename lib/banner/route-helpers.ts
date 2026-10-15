import "server-only";
import { CACHE, errorSvg, svgResponse } from "../http";
import { hasViewsStat } from "./render";
import { needsGithub, renderBannerSvg } from "./server";
import type { BannerConfig } from "./schema";

export async function bannerResponse(config: BannerConfig) {
  try {
    const svg = await renderBannerSvg(config);
    // A view counter must reach the server on every view, so those banners are never cached.
    const cache =
      (config.vk ?? config.user) && hasViewsStat(config)
        ? CACHE.none
        : config.user && needsGithub(config)
          ? CACHE.live
          : config.bg.kind === "url"
            ? CACHE.remote
            : CACHE.static;
    return svgResponse(svg, cache);
  } catch (err) {
    console.error("Error generating banner:", err);
    return svgResponse(errorSvg("Error generating banner"), CACHE.none, 500);
  }
}
