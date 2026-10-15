import type { Metadata } from "next";
import Gallery from "@/components/Gallery";
import { PageShell } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "Community banners — Profilyze",
  description: "Profile banners other GitHub users made with Profilyze.",
};

export default function CommunityPage() {
  return (
    <PageShell active="community">
      <Gallery />
    </PageShell>
  );
}
