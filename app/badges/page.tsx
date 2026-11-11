import type { Metadata } from "next";
import BadgesBuilder from "@/components/BadgesBuilder";
import { PageShell } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "README badges — Profilyze",
  description: "Social badges for Discord, GitHub, YouTube and more, plus framed award badges, for your README.",
};

export default function BadgesPage() {
  return (
    <PageShell active="badges">
      <h1 className="sr-only">README badges</h1>
      <BadgesBuilder />
    </PageShell>
  );
}
