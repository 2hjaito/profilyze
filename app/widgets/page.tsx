import type { Metadata } from "next";
import { PageShell } from "@/components/SiteChrome";
import WidgetsBuilder from "@/components/WidgetsBuilder";

export const metadata: Metadata = {
  title: "GitHub profile widgets — Profilyze",
  description: "Streak, contribution graph, stats and language cards for your GitHub profile README.",
};

export default function WidgetsPage() {
  return (
    <PageShell active="widgets">
      <h1 className="sr-only">GitHub profile widgets</h1>
      <WidgetsBuilder />
    </PageShell>
  );
}
