import type { Metadata } from "next";
import ReadmeBuilder from "@/components/ReadmeBuilder";
import { PageShell } from "@/components/SiteChrome";

export const metadata: Metadata = {
  title: "README generator — Profilyze",
  description: "Build a complete GitHub profile README: banner, intro, tech stack, live widgets and links.",
};

export default function ReadmePage() {
  return (
    <PageShell active="readme">
      <h1 className="sr-only">GitHub profile README generator</h1>
      <ReadmeBuilder />
    </PageShell>
  );
}
