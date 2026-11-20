// README generator state and the templates that preset it.

import { AUTHOR } from "../site";
import type { Lang, SectionId } from "./i18n";

export type Links = { website: string; github: string; linkedin: string; x: string; youtube: string; email: string };
export type Project = { name: string; repo: string; desc: string; url: string; palette: string; card: boolean };
export type CardMode = "auto" | "dark" | "light";
export type TemplateId = "classic" | "terminal" | "debugger" | "minimal";

export type ReadmeState = {
  template: TemplateId;
  sections: SectionId[];
  user: string;
  name: string;
  align: "left" | "center";
  palette: string;
  cardMode: CardMode;
  // header
  headerImage: string;
  banner: boolean;
  hexdump: boolean;
  hexText: string;
  // intro / bio
  greeting: string;
  tagline: string;
  bio: string;
  bioQuote: boolean;
  // lists
  aboutTitle: string;
  about: string;
  stack: string[];
  stackStyle: "logos" | "badges";
  terminalRows: string;
  projectsTitle: string;
  projects: Project[];
  // widgets
  streak: boolean;
  graph: boolean;
  stats: boolean;
  languages: boolean;
  activity: boolean;
  theme: string;
  // links / closing
  links: Links;
  badgeStyle: "for-the-badge" | "flat-square";
  quoteTitle: string;
  quote: string;
  quoteText: string;
};

export const ALL_SECTIONS: SectionId[] = ["header", "intro", "stack", "bio", "identity", "about", "projects", "widgets", "links", "philosophy"];

export const NEW_PROJECT: Project = { name: "", repo: "", desc: "", url: "", palette: "ember", card: true };

/** Content each template writes, in the UI language. */
type Sample = Pick<
  ReadmeState,
  "greeting" | "tagline" | "bio" | "aboutTitle" | "about" | "hexText" | "terminalRows" | "projectsTitle" | "quoteTitle" | "quote" | "quoteText"
>;

const BLANK: Sample = {
  greeting: "",
  tagline: "",
  bio: "",
  aboutTitle: "",
  about: "",
  hexText: "",
  terminalRows: "",
  projectsTitle: "",
  quoteTitle: "",
  quote: "",
  quoteText: "",
};

/** Skeleton blocks drawn in the template picker. */
export type Sketch = "image" | "title" | "line" | "pills" | "logos" | "card" | "list" | "grid" | "hex" | "quote";

export type Template = {
  id: TemplateId;
  name: Record<Lang, string>;
  desc: Record<Lang, string>;
  sketch: Sketch[];
  sections: SectionId[];
  settings: Partial<ReadmeState>;
  sample: Record<Lang, Sample>;
};

export const templates: Template[] = [
  {
    id: "classic",
    name: { en: "Classic", vi: "Cơ bản" },
    desc: {
      en: "Banner, a greeting, a few bullets, logos and GitHub stats.",
      vi: "Banner, lời chào, vài gạch đầu dòng, logo và thống kê GitHub.",
    },
    sketch: ["image", "title", "list", "logos", "grid"],
    sections: ["header", "intro", "about", "stack", "widgets", "links"],
    settings: {
      align: "center",
      banner: true,
      hexdump: false,
      headerImage: "",
      stackStyle: "logos",
      streak: true,
      graph: true,
      stats: true,
      languages: true,
      activity: false,
      badgeStyle: "for-the-badge",
    },
    sample: {
      en: {
        ...BLANK,
        greeting: "Hi there 👋, I'm {name}",
        about: "🔭 I'm currently working on …\n🌱 I'm learning …\n💬 Ask me about …\n⚡ Fun fact: …",
      },
      vi: {
        ...BLANK,
        greeting: "Xin chào 👋, mình là {name}",
        about: "🔭 Mình đang làm …\n🌱 Mình đang học …\n💬 Hỏi mình về …\n⚡ Điều thú vị: …",
      },
    },
  },
  {
    id: "terminal",
    name: { en: "Terminal", vi: "Terminal" },
    desc: {
      en: "For builders: a terminal card, your projects, how you work and a closing quote.",
      vi: "Cho người làm sản phẩm: card terminal, dự án, cách làm việc và câu châm ngôn.",
    },
    sketch: ["title", "pills", "line", "card", "card", "list", "quote"],
    sections: ["intro", "stack", "bio", "identity", "projects", "about", "links", "philosophy"],
    settings: {
      align: "left",
      palette: "aurora",
      stackStyle: "badges",
      badgeStyle: "flat-square",
    },
    sample: {
      en: {
        ...BLANK,
        greeting: "Hi, I'm {name} 👋",
        tagline: "🔥 Building [my project](https://example.com) · 📍 Somewhere on Earth",
        bio: "A couple of sentences about what you've done and what you're doing now. Keep it short and specific.",
        terminalRows: "Name: {name}\nRole: Fullstack developer\nLocation: Vietnam\nLanguages: {languages}\nCommits (last year): {commits}\nStars: {stars}\nPhilosophy: *Keep trying.*",
        projectsTitle: "What I'm building",
        aboutTitle: "How I actually work",
        about: "Ship small, ship often.\nTests before features.\nCoffee in the morning, deep work after.",
        quoteTitle: "Philosophy",
        quote: "Keep trying.",
        quoteText: "",
      },
      vi: {
        ...BLANK,
        greeting: "Xin chào, mình là {name} 👋",
        tagline: "🔥 Đang xây [dự án của mình](https://example.com) · 📍 Việt Nam",
        bio: "Vài câu về những gì bạn đã làm và đang làm. Ngắn gọn và cụ thể.",
        terminalRows: "Tên: {name}\nVai trò: Fullstack developer\nNơi ở: Việt Nam\nNgôn ngữ: {languages}\nCommit (1 năm): {commits}\nSao: {stars}\nChâm ngôn: *Cứ thử tiếp.*",
        projectsTitle: "Mình đang làm gì",
        aboutTitle: "Mình làm việc thế nào",
        about: "Làm nhỏ, ra mắt thường xuyên.\nViết test trước khi thêm tính năng.\nSáng cà phê, chiều tập trung code.",
        quoteTitle: "Châm ngôn",
        quote: "Cứ thử tiếp.",
        quoteText: "",
      },
    },
  },
  {
    id: "debugger",
    name: { en: "Debugger", vi: "Debugger" },
    desc: {
      en: "Hacker style: a hexdump header, your interests and activity as a memory map.",
      vi: "Phong cách hacker: header hexdump, sở thích và hoạt động dạng memory map.",
    },
    sketch: ["hex", "logos", "quote", "list", "grid"],
    sections: ["header", "stack", "bio", "about", "widgets", "links"],
    settings: {
      align: "left",
      palette: "mint",
      banner: false,
      hexdump: true,
      headerImage: "",
      stackStyle: "logos",
      bioQuote: true,
      streak: false,
      graph: false,
      stats: false,
      languages: true,
      activity: true,
      badgeStyle: "flat-square",
    },
    sample: {
      en: {
        ...BLANK,
        hexText: "",
        bio: "Developer from the backend side of things: APIs, databases and whatever lives in process memory.",
        aboutTitle: "🔭 What I'm into",
        about: "📈 **Side projects**: …\n🌐 **Networks**: …\n🤖 **AI**: building with Claude Code, local LLMs …\n🛠️ **Low level**: debugging and reverse engineering",
      },
      vi: {
        ...BLANK,
        hexText: "",
        bio: "Developer thiên về backend: API, database và những thứ nằm trong bộ nhớ tiến trình.",
        aboutTitle: "🔭 Mình đang quan tâm",
        about: "📈 **Dự án riêng**: …\n🌐 **Mạng**: …\n🤖 **AI**: code cùng Claude Code, LLM chạy local …\n🛠️ **Low level**: debug và dịch ngược",
      },
    },
  },
  {
    id: "minimal",
    name: { en: "Minimal", vi: "Tối giản" },
    desc: {
      en: "Just a greeting, one line about you, your stack and links.",
      vi: "Chỉ lời chào, một dòng về bạn, tech stack và liên kết.",
    },
    sketch: ["title", "line", "pills", "pills"],
    sections: ["intro", "stack", "links"],
    settings: { align: "center", stackStyle: "badges", badgeStyle: "flat-square" },
    sample: {
      en: { ...BLANK, greeting: "Hi, I'm {name} 👋", tagline: "Developer · Open source · Coffee" },
      vi: { ...BLANK, greeting: "Xin chào, mình là {name} 👋", tagline: "Developer · Open source · Cà phê" },
    },
  },
];

export const findTemplate = (id: string) => templates.find((t) => t.id === id) ?? templates[0];

/** A template applied to the current state: identity (username, name, links, stack, projects) is kept. */
export function applyTemplate(s: ReadmeState, id: TemplateId, lang: Lang): ReadmeState {
  const t = findTemplate(id);
  return { ...s, ...t.settings, ...t.sample[lang], template: t.id, sections: [...t.sections] };
}

export const INITIAL: ReadmeState = {
  template: "classic",
  sections: [...templates[0].sections],
  user: AUTHOR.github,
  name: AUTHOR.name,
  align: "center",
  palette: "aurora",
  cardMode: "auto",
  headerImage: "",
  banner: true,
  hexdump: false,
  hexText: "",
  greeting: "Hi there 👋, I'm {name}",
  tagline: "",
  bio: "",
  bioQuote: false,
  aboutTitle: "",
  about: "🔭 I'm currently working on …\n🌱 I'm learning …\n💬 Ask me about …\n⚡ Fun fact: …",
  stack: ["typescript", "react", "nodejs", "docker"],
  stackStyle: "logos",
  terminalRows: "",
  projectsTitle: "What I'm building",
  projects: [],
  streak: true,
  graph: true,
  stats: true,
  languages: true,
  activity: false,
  theme: "github-dark",
  links: { website: AUTHOR.site.replace(/^https?:\/\//, ""), github: "", linkedin: "", x: "", youtube: "", email: "" },
  badgeStyle: "for-the-badge",
  quoteTitle: "Philosophy",
  quote: "",
  quoteText: "",
};

/** Saved state from an older version (shallow-merged into INITIAL) made whole again. */
export function normalizeState(saved: ReadmeState): ReadmeState {
  const sections = Array.isArray(saved.sections) ? saved.sections.filter((x) => ALL_SECTIONS.includes(x)) : INITIAL.sections;
  return {
    ...saved,
    sections,
    template: templates.some((t) => t.id === saved.template) ? saved.template : "classic",
    links: { ...INITIAL.links, ...saved.links },
    projects: (Array.isArray(saved.projects) ? saved.projects : []).map((p) => ({ ...NEW_PROJECT, ...p })),
  };
}
