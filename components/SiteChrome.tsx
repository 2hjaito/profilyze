import Link from "next/link";
import { FaDiscord, FaGithub, FaGlobe, FaTiktok, FaYoutube } from "react-icons/fa";
import { REPO_URL } from "@/lib/site";
import Logo from "./Logo";

const socials = [
  { href: REPO_URL, label: "GitHub", icon: FaGithub },
  { href: "https://dangth.dev", label: "Portfolio", icon: FaGlobe },
  { href: "https://discord.com/invite/MxmYrMrJA6", label: "Discord", icon: FaDiscord },
  { href: "https://www.youtube.com/@devlands", label: "YouTube", icon: FaYoutube },
  { href: "https://www.tiktok.com/@theanishtar", label: "TikTok", icon: FaTiktok },
];

type Page = "banner" | "widgets" | "about";

export function SiteHeader({ active }: { active: Page }) {
  const link = (href: string, label: string, on: boolean) => (
    <Link
      href={href}
      className={`rounded-md px-3 py-1.5 text-sm transition ${on ? "bg-surface-2 text-fg" : "text-muted hover:text-fg"}`}
    >
      {label}
    </Link>
  );
  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
          <Logo size={28} />
          Profilyze
        </Link>
        <nav className="flex gap-1">
          {link("/", "Banner", active === "banner")}
          {link("/widgets", "Widgets", active === "widgets")}
          {link("/about", "About", active === "about")}
        </nav>
        <a
          href={REPO_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto hidden items-center gap-2 rounded-lg border border-line bg-surface px-3 py-1.5 text-sm text-muted transition hover:border-zinc-500 hover:text-fg sm:flex"
        >
          <FaGithub /> Star on GitHub
        </a>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-6 text-sm text-muted sm:flex-row sm:px-6">
        <p>
          © {new Date().getFullYear()} Profilyze · Built by{" "}
          <a href="https://dangth.dev" className="text-fg hover:text-accent">
            Tran Huu Dang
          </a>
        </p>
        <nav className="flex items-center gap-4 text-lg">
          {socials.map(({ href, label, icon: Icon }) => (
            <a key={label} href={href} target="_blank" rel="noopener noreferrer" aria-label={label} title={label} className="transition hover:text-fg">
              <Icon />
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}

/** Tools pages get straight to work; the explanation lives on /about. */
export function PageShell({ active, children }: { active: Page; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-[radial-gradient(60rem_30rem_at_50%_-10rem,color-mix(in_oklab,var(--color-accent)_8%,transparent),transparent)]">
      <SiteHeader active={active} />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pb-12 pt-4 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
