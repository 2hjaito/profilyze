import type { Metadata } from "next";
import Link from "next/link";
import { PageShell } from "@/components/SiteChrome";
import { REPO_URL, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "About — Profilyze",
  description: "How Profilyze works: a visual editor for GitHub README banners and live profile widgets.",
};

const steps = [
  {
    title: "Design",
    body: "Pick a template or background, then drag, resize and restyle every element on the canvas. Arrow keys nudge, ⌘Z undoes.",
  },
  {
    title: "Connect GitHub",
    body: "Enter your username to fill streaks, contributions, the activity graph and your avatar with live data.",
  },
  {
    title: "Embed",
    body: "Copy the Markdown into your profile README.md. Clicking the banner on GitHub reopens it here for editing.",
  },
];

const features = [
  ["Sharp at any size", "Text, glyphs, graphs and tech logos are real vector SVG. Fonts are subset and embedded, so they render identically everywhere."],
  ["Fast on GitHub", "Banners are usually 20–100 KB and are served from Vercel's edge cache. Live stats refresh every few hours."],
  ["Animated or vector", "Use the original animated icons and backgrounds, or 66 vector tech logos."],
  ["README generator", "Build a whole profile README with your banner, intro, tech stack, widgets and links, then copy or download it."],
  ["Community gallery", "Browse banners other developers use and start from any of them."],
  ["Profile views", "Add a views counter, such as the Sharingan, that goes up each time someone opens your profile."],
  ["Any language", "Vietnamese and other scripts work in every font that supports them."],
  ["No account", "The whole layout lives in the URL. Nothing is stored on a server."],
  ["Old links keep working", "Banners made with the previous query-string API still render."],
];

const api = [
  ["/api/banner?c=…", "Banner made in the editor"],
  ["/api/profile/banner?name=&role=&background=&tech=&skills=&user=", "Original query-string banner"],
  ["/api/github/streak?user=&theme=", "Streak card"],
  ["/api/github/graph?user=&theme=", "Contribution graph"],
  ["/api/github/stats?user=&theme=", "Stats card"],
  ["/api/github/languages?user=&theme=", "Top languages"],
  ["/api/stats/users", "Profilyze users badge"],
];

export default function AboutPage() {
  return (
    <PageShell active="about">
      <div className="mx-auto max-w-3xl space-y-12 py-6">
        <section>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
            Profile banners and widgets for your <span className="text-accent">GitHub README</span>
          </h1>
          <p className="mt-4 text-muted">
            Profilyze is a visual editor for the banner at the top of your GitHub profile, plus a set of live cards
            for streaks, activity and languages. Everything is rendered as SVG, so it stays crisp on any screen and loads
            fast through GitHub&apos;s image proxy.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-zinc-900 hover:brightness-110">
              Open the editor
            </Link>
            <Link href="/widgets" className="rounded-lg border border-line bg-surface px-4 py-2 text-sm hover:border-zinc-500">
              Browse widgets
            </Link>
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">How it works</h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="rounded-xl border border-line bg-surface p-4">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                  {i + 1}
                </span>
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Features</h2>
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {features.map(([title, body]) => (
              <div key={title}>
                <dt className="text-sm font-semibold">{title}</dt>
                <dd className="mt-1 text-sm text-muted">{body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">API</h2>
          <div className="overflow-hidden rounded-xl border border-line">
            <table className="w-full text-left text-sm">
              <tbody>
                {api.map(([path, desc]) => (
                  <tr key={path} className="border-b border-line last:border-0">
                    <td className="break-all bg-surface px-4 py-2.5 font-mono text-xs text-zinc-300">{path}</td>
                    <td className="px-4 py-2.5 text-muted">{desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-muted">
            Card themes: <code className="font-mono text-xs text-zinc-300">github-dark</code>,{" "}
            <code className="font-mono text-xs text-zinc-300">github-light</code>,{" "}
            <code className="font-mono text-xs text-zinc-300">midnight</code>,{" "}
            <code className="font-mono text-xs text-zinc-300">tokyonight</code>,{" "}
            <code className="font-mono text-xs text-zinc-300">dracula</code>,{" "}
            <code className="font-mono text-xs text-zinc-300">sunset</code>. Add{" "}
            <code className="font-mono text-xs text-zinc-300">hide_border=true</code> or{" "}
            <code className="font-mono text-xs text-zinc-300">transparent=true</code> as needed. All endpoints are relative
            to <code className="font-mono text-xs text-zinc-300">{SITE_URL}</code>.
          </p>
        </section>

        <section>
          <h2 className="mb-4 text-lg font-semibold">Open source</h2>
          <p className="text-sm text-muted">
            Profilyze is built with Next.js and deployed on Vercel. Source code, issues and contributions are welcome on{" "}
            <a href={REPO_URL} target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              GitHub
            </a>
            . Tech logos from Devicon (MIT), line icons from Lucide (ISC), fonts from Google Fonts (OFL).
          </p>
        </section>
      </div>
    </PageShell>
  );
}
