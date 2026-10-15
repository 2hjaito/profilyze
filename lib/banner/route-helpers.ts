import "server-only";
import { after } from "next/server";
import { CACHE, errorSvg, svgResponse } from "../http";
import { registerBanner } from "../registry";
import { encodeConfig } from "./codec";
import { hasViewsStat } from "./render";
import { needsGithub, renderBannerSvg } from "./server";
import type { BannerConfig } from "./schema";

type Options = {
  /** The encoded config, if the request carried one (legacy links are encoded here). */
  c?: string;
  /** Gallery/preview render: no view counted, not recorded as usage. */
  preview?: boolean;
};

export async function bannerResponse(config: BannerConfig, { c, preview = false }: Options = {}) {
  try {
    const svg = await renderBannerSvg(config, { preview });

    // Record who uses Profilyze. Demo banners with their own counter key (vk) aren't someone's profile.
    if (!preview && config.user && !config.vk) {
      const user = config.user;
      after(async () => registerBanner(user, c ?? (await encodeConfig(config))));
    }

    // A view counter must reach the server on every view, so those banners are never cached.
    const cache =
      !preview && (config.vk ?? config.user) && hasViewsStat(config)
        ? CACHE.none
        : config.user && (needsGithub(config) || hasViewsStat(config))
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
