// README generator state and the templates that preset it.

import type { KitTheme } from "../cards/kit-meta";
import { AUTHOR } from "../site";
import type { Lang, SectionId } from "./i18n";

export type Links = { website: string; github: string; linkedin: string; x: string; youtube: string; email: string };
export type Project = {
  name: string;
  repo: string;
  desc: string;
  url: string;
  palette: string;
  card: boolean;
  // Profile kit cards only
  tagline: string;
  tags: string;
  meta: string;
  status: string;
  /** Screenshot URL, or "og" for GitHub's preview image of the repository. */
  image: string;
  small: boolean;
};
export type CardMode = "auto" | "dark" | "light";
/** "off" writes plain Markdown and shields; otherwise headings, links and projects become profile kit cards. */
export type KitStyle = "off" | KitTheme;
export type TemplateId = "classic" | "terminal" | "debugger" | "minimal" | "editorial" | "native" | "studio";

export type ReadmeState = {
  template: TemplateId;
  sections: SectionId[];
  user: string;
  name: string;
  align: "left" | "center";
  palette: string;
  cardMode: CardMode;
  kit: KitStyle;
  kitAccent: string;
  // header
  headerImage: string;
  banner: boolean;
  hexdump: boolean;
  hexText: string;
  kitHeader: boolean;
  role: string;
  eyebrow: string;
  blurb: string;
  headerLink: string;
  avatar: boolean;
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
  /** Profile kit stack groups, one per line: Title | Description | ids */
  stackGroups: string;
  alsoLabel: string;
  terminalRows: string;
  projectsTitle: string;
  projects: Project[];
  /** value | label, one per line */
  numbers: string;
  interestsTitle: string;
  /** Label: value, one per line */
  interests: string;
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

export const ALL_SECTIONS: SectionId[] = [
  "header",
  "intro",
  "stack",
  "bio",
  "identity",
  "about",
  "numbers",
  "interests",
  "projects",
  "widgets",
  "links",
  "philosophy",
];

export const NEW_PROJECT: Project = {
  name: "",
  repo: "",
  desc: "",
  url: "",
  palette: "ember",
  card: true,
  tagline: "",
  tags: "",
  meta: "",
  status: "",
  image: "",
  small: false,
};

/** Content each template writes, in the UI language. */
type Sample = Pick<
  ReadmeState,
  | "greeting"
  | "tagline"
  | "bio"
  | "aboutTitle"
  | "about"
  | "hexText"
  | "terminalRows"
  | "projectsTitle"
  | "quoteTitle"
  | "quote"
  | "quoteText"
  | "role"
  | "eyebrow"
  | "blurb"
  | "numbers"
  | "interestsTitle"
  | "interests"
  | "stackGroups"
  | "alsoLabel"
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
  role: "",
  eyebrow: "",
  blurb: "",
  numbers: "",
  interestsTitle: "",
  interests: "",
  stackGroups: "",
  alsoLabel: "",
};

/** Skeleton blocks drawn in the template picker. */
export type Sketch = "image" | "title" | "line" | "pills" | "logos" | "card" | "list" | "grid" | "hex" | "quote" | "tiles" | "stats" | "radar";

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
      kit: "off",
      kitHeader: false,
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
      kit: "off",
      kitHeader: false,
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
      kit: "off",
      kitHeader: false,
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
    settings: { align: "center", stackStyle: "badges", badgeStyle: "flat-square", kit: "off", kitHeader: false },
    sample: {
      en: { ...BLANK, greeting: "Hi, I'm {name} 👋", tagline: "Developer · Open source · Coffee" },
      vi: { ...BLANK, greeting: "Xin chào, mình là {name} 👋", tagline: "Developer · Open source · Cà phê" },
    },
  },
  {
    id: "editorial",
    name: { en: "Editorial", vi: "Tạp chí" },
    desc: {
      en: "Warm paper and a serif headline: a framed header, project cards with screenshots, your numbers and stack.",
      vi: "Tông giấy ấm, tiêu đề chữ có chân: header đóng khung, card dự án có ảnh chụp, số liệu và tech stack.",
    },
    sketch: ["image", "tiles", "stats", "pills"],
    sections: ["header", "projects", "numbers", "stack", "widgets", "links"],
    settings: {
      kit: "clay",
      kitHeader: true,
      avatar: false,
      align: "left",
      banner: false,
      hexdump: false,
      headerImage: "",
      streak: false,
      graph: true,
      stats: false,
      languages: false,
      activity: false,
    },
    sample: {
      en: {
        ...BLANK,
        eyebrow: "Somewhere on Earth · Building in public",
        role: "I build websites, apps and the occasional thing nobody asked for.",
        blurb: "Home is where the laptop is.",
        projectsTitle: "Things I’ve launched",
        alsoLabel: "Also in the toolbox",
      },
      vi: {
        ...BLANK,
        eyebrow: "Việt Nam · Build in public",
        role: "Mình làm website, app và thỉnh thoảng vài thứ chẳng ai nhờ.",
        blurb: "Laptop ở đâu thì nhà ở đó.",
        projectsTitle: "Những thứ mình đã ra mắt",
        alsoLabel: "Còn dùng thêm",
      },
    },
  },
  {
    id: "native",
    name: { en: "Native", vi: "Native" },
    desc: {
      en: "Looks like part of GitHub, with one amber accent: header, numbers, what you're doing now, activity, projects and a grouped stack.",
      vi: "Như một phần của GitHub, thêm một màu nhấn hổ phách: header, số liệu, việc đang làm, hoạt động, dự án và tech stack theo nhóm.",
    },
    sketch: ["title", "stats", "list", "grid", "tiles"],
    sections: ["header", "bio", "numbers", "about", "widgets", "projects", "stack", "links"],
    settings: {
      kit: "native",
      kitHeader: true,
      avatar: true,
      align: "left",
      banner: false,
      hexdump: false,
      headerImage: "",
      streak: false,
      graph: true,
      stats: false,
      languages: false,
      activity: false,
    },
    sample: {
      en: {
        ...BLANK,
        role: "Software Engineer · Technical Lead",
        blurb: "Distributed systems at work, my own products the rest of the time.",
        bio: "A couple of sentences about what you do at work and what you build in your own time.",
        numbers: "5 yrs | building and running production systems\n{repos} | public repositories\n{stars} | stars on GitHub",
        aboutTitle: "Now",
        about: "**Building:** …\n**Shipping:** …\n**At work:** …\n**Learning:** …",
        projectsTitle: "Projects",
        stackGroups: "Backend | APIs and services that stay up under load. | java,spring,postgresql,redis\nFrontend | Interfaces people enjoy using. | typescript,react,nextjs,tailwindcss",
        alsoLabel: "Also in the toolbox",
      },
      vi: {
        ...BLANK,
        role: "Kỹ sư phần mềm · Technical Lead",
        blurb: "Hệ thống phân tán ở công ty, sản phẩm riêng lúc rảnh.",
        bio: "Vài câu về công việc chính và những gì bạn tự làm trong thời gian riêng.",
        numbers: "5 năm | xây và vận hành hệ thống thực tế\n{repos} | repo công khai\n{stars} | sao trên GitHub",
        aboutTitle: "Hiện tại",
        about: "**Đang làm:** …\n**Sắp ra mắt:** …\n**Ở công ty:** …\n**Đang học:** …",
        projectsTitle: "Dự án",
        stackGroups: "Backend | API và dịch vụ chạy ổn định khi tải cao. | java,spring,postgresql,redis\nFrontend | Giao diện dùng thích tay. | typescript,react,nextjs,tailwindcss",
        alsoLabel: "Còn dùng thêm",
      },
    },
  },
  {
    id: "studio",
    name: { en: "Studio", vi: "Studio" },
    desc: {
      en: "Quiet greys in double frames: link buttons up top, a few lines about you, a grid of projects and an interests radar.",
      vi: "Tông xám nhẹ, khung đôi: nút liên kết trên cùng, vài dòng về bạn, lưới dự án và biểu đồ radar sở thích.",
    },
    sketch: ["image", "pills", "list", "tiles", "radar"],
    sections: ["header", "links", "about", "projects", "interests", "widgets"],
    settings: {
      kit: "mono",
      kitHeader: true,
      avatar: false,
      align: "left",
      banner: false,
      hexdump: false,
      headerImage: "",
      streak: false,
      graph: false,
      stats: true,
      languages: false,
      activity: false,
    },
    sample: {
      en: {
        ...BLANK,
        role: "Interaction and visual designer",
        aboutTitle: "About me",
        about: "Designer and developer from …\nI run a small studio, …\nI daily drive … and love customising everything",
        projectsTitle: "Projects",
        interestsTitle: "My Interests",
        interests: "Design: 9\nFrontend: 8\nMotion: 6\nOpen source: 7\nBackend: 5\nHardware: 3",
      },
      vi: {
        ...BLANK,
        role: "Designer giao diện và tương tác",
        aboutTitle: "Về mình",
        about: "Designer kiêm developer đến từ …\nMình có một studio nhỏ, …\nMình dùng … hằng ngày và thích tuỳ biến mọi thứ",
        projectsTitle: "Dự án",
        interestsTitle: "Mình quan tâm",
        interests: "Thiết kế: 9\nFrontend: 8\nChuyển động: 6\nOpen source: 7\nBackend: 5\nPhần cứng: 3",
      },
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
  kit: "off",
  kitAccent: "",
  headerImage: "",
  banner: true,
  hexdump: false,
  hexText: "",
  kitHeader: false,
  role: "",
  eyebrow: "",
  blurb: "",
  headerLink: "",
  avatar: false,
  greeting: "Hi there 👋, I'm {name}",
  tagline: "",
  bio: "",
  bioQuote: false,
  aboutTitle: "",
  about: "🔭 I'm currently working on …\n🌱 I'm learning …\n💬 Ask me about …\n⚡ Fun fact: …",
  stack: ["typescript", "react", "nodejs", "docker"],
  stackStyle: "logos",
  stackGroups: "",
  alsoLabel: "Also in the toolbox",
  terminalRows: "",
  projectsTitle: "What I'm building",
  projects: [],
  numbers: "",
  interestsTitle: "My Interests",
  interests: "",
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
    kit: (["off", "native", "clay", "mono"] as const).includes(saved.kit) ? saved.kit : "off",
    links: { ...INITIAL.links, ...saved.links },
    projects: (Array.isArray(saved.projects) ? saved.projects : []).map((p) => ({ ...NEW_PROJECT, ...p })),
  };
}
