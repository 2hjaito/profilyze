import manifest from "./assets.json";

// Single source of truth for every asset a banner can use.
// Files live in /public so the editor can load them by URL and the API can inline them.

/** `w`/`h` are the stored image's size, used to pan and zoom it inside the banner. */
export type Background = { name: string; label: string; file: string; animated?: boolean; w?: number; h?: number; pixel?: boolean };

// Raster backgrounds and animated icons come from lib/assets.json, maintained by `npm run sync:assets`.
export const backgrounds: Background[] = manifest.backgrounds.map((b) => ({
  name: b.name,
  label: b.label,
  animated: b.animated,
  w: "w" in b ? (b.w as number) : undefined,
  h: "h" in b ? (b.h as number) : undefined,
  pixel: "pixel" in b ? Boolean(b.pixel) : undefined,
  file: `assets/backgrounds/${b.name}.webp`,
}));

export const findBackground = (name?: string | null) => backgrounds.find((b) => b.name === name);

// Icons. Vector icons (devicon) stay sharp at any size; `a:` icons are the original animated rasters.
export type Icon = { id: string; label: string; file: string; vector: boolean; dark?: boolean };

const dv = (id: string, label: string, dark = false): Icon => ({
  id,
  label,
  dark,
  vector: true,
  file: `assets/devicon/${id}.svg`,
});

export const vectorIcons: Icon[] = [
  dv("javascript", "JavaScript"),
  dv("typescript", "TypeScript"),
  dv("react", "React"),
  dv("nextjs", "Next.js"),
  dv("vuejs", "Vue"),
  dv("nuxtjs", "Nuxt"),
  dv("angular", "Angular"),
  dv("svelte", "Svelte"),
  dv("html5", "HTML"),
  dv("css3", "CSS"),
  dv("sass", "Sass"),
  dv("tailwindcss", "Tailwind"),
  dv("bootstrap", "Bootstrap"),
  dv("redux", "Redux"),
  dv("vitejs", "Vite"),
  dv("webpack", "Webpack"),
  dv("nodejs", "Node.js"),
  dv("express", "Express", true),
  dv("nestjs", "NestJS"),
  dv("graphql", "GraphQL"),
  dv("prisma", "Prisma", true),
  dv("java", "Java"),
  dv("spring", "Spring"),
  dv("kotlin", "Kotlin"),
  dv("python", "Python"),
  dv("django", "Django", true),
  dv("flask", "Flask", true),
  dv("fastapi", "FastAPI"),
  dv("go", "Go"),
  dv("rust", "Rust", true),
  dv("c", "C"),
  dv("cplusplus", "C++"),
  dv("csharp", "C#"),
  dv("dotnetcore", ".NET"),
  dv("php", "PHP"),
  dv("laravel", "Laravel"),
  dv("ruby", "Ruby"),
  dv("rails", "Rails"),
  dv("swift", "Swift"),
  dv("dart", "Dart"),
  dv("flutter", "Flutter"),
  dv("electron", "Electron"),
  dv("threejs", "Three.js", true),
  dv("unity", "Unity", true),
  dv("mongodb", "MongoDB"),
  dv("mysql", "MySQL"),
  dv("postgresql", "PostgreSQL"),
  dv("redis", "Redis"),
  dv("firebase", "Firebase"),
  dv("supabase", "Supabase"),
  dv("docker", "Docker"),
  dv("kubernetes", "Kubernetes"),
  dv("amazonwebservices", "AWS"),
  dv("googlecloud", "Google Cloud"),
  dv("azure", "Azure"),
  dv("vercel", "Vercel", true),
  dv("nginx", "Nginx"),
  dv("linux", "Linux", true),
  dv("ubuntu", "Ubuntu"),
  dv("bash", "Bash"),
  dv("git", "Git"),
  dv("github", "GitHub", true),
  dv("gitlab", "GitLab"),
  dv("vscode", "VS Code"),
  dv("figma", "Figma"),
  dv("jest", "Jest"),
];

export const animatedIcons: Icon[] = manifest.icons.map((i) => ({
  id: `a:${i.name}`,
  label: i.label,
  vector: false,
  file: `assets/${i.file}`,
}));

const iconIndex = new Map([...vectorIcons, ...animatedIcons].map((i) => [i.id, i]));
export const findIcon = (id?: string | null) => (id ? iconIndex.get(id) : undefined);

// Line glyphs (Lucide, ISC) drawn inline as paths, used next to stats.
export const glyphs: Record<string, { label: string; body: string }> = {
  flame: {
    label: "Flame",
    body: '<path d="M12 3q1 4 4 6.5t3 5.5a1 1 0 0 1-14 0 5 5 0 0 1 1-3 1 1 0 0 0 5 0c0-2-1.5-3-1.5-5q0-2 2.5-4"/>',
  },
  star: {
    label: "Star",
    body: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  },
  commit: {
    label: "Commit",
    body: '<circle cx="12" cy="12" r="3"/><line x1="3" x2="9" y1="12" y2="12"/><line x1="15" x2="21" y1="12" y2="12"/>',
  },
  users: {
    label: "Users",
    body: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><path d="M16 3.128a4 4 0 0 1 0 7.744"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  },
  calendar: {
    label: "Calendar",
    body: '<path d="M8 2v3"/><path d="M16 2v3"/><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18"/><path d="M8 13h.01"/><path d="M12 13h.01"/><path d="M16 13h.01"/><path d="M8 17h.01"/><path d="M12 17h.01"/><path d="M16 17h.01"/>',
  },
  trophy: {
    label: "Trophy",
    body: '<path d="M10 14.66V17a1 1 0 0 1-1 1 2 2 0 0 0-2 2v2"/><path d="M14 14.66V17a1 1 0 0 0 1 1 2 2 0 0 1 2 2v2"/><path d="M17.916 10H19.5A2.5 2.5 0 0 0 22 7.5V5a1 1 0 0 0-1-1h-3"/><path d="M4 22h16"/><path d="M6 9a6 6 0 0 0 12 0V3a1 1 0 0 0-1-1H7a1 1 0 0 0-1 1z"/><path d="M6.084 10H4.5A2.5 2.5 0 0 1 2 7.5V5a1 1 0 0 1 1-1h3"/>',
  },
  pr: {
    label: "Pull request",
    body: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><line x1="6" x2="6" y1="9" y2="21"/>',
  },
  issue: {
    label: "Issue",
    body: '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="12" r="10"/>',
  },
  repo: {
    label: "Repository",
    body: '<path d="M10 2v7.751a.25.25 0 00.407.195l2.28-1.834a.5.5 0 01.627 0l2.28 1.834A.25.25 0 0016 9.751V2"/><path d="M4 19.5v-15A2.5 2.5 0 016.5 2H19a1 1 0 011 1v18a1 1 0 01-1 1H6.5a1 1 0 010-5H20"/>',
  },
  eye: {
    label: "Eye",
    body: '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  },
  zap: {
    label: "Zap",
    body: '<path d="M15.914 4a1.5 1.5 0 00-2.474-1.561l-9 9A1.5 1.5 0 005.5 14h4.002a.5.5 0 01.471.666L8.086 20a1.5 1.5 0 002.475 1.56l9-9A1.5 1.5 0 0018.5 10h-3.997a.5.5 0 01-.472-.667z"/>',
  },
  activity: {
    label: "Activity",
    body: '<path d="M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2"/>',
  },
  code: {
    label: "Code",
    body: '<path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/>',
  },
};

// Fonts. Each weight is a full-charset TTF in /public/fonts; the API subsets it to the
// glyphs actually used, so Vietnamese and other scripts work at a few KB per font.
export type FontDef = { id: string; family: string; weights: number[] };

export const fonts: FontDef[] = [
  { id: "inter", family: "Inter", weights: [400, 600, 700, 800] },
  { id: "space-grotesk", family: "Space Grotesk", weights: [500, 700] },
  { id: "jetbrains-mono", family: "JetBrains Mono", weights: [400, 700] },
  { id: "bebas-neue", family: "Bebas Neue", weights: [400] },
  { id: "allerta", family: "Allerta", weights: [400] },
  { id: "ar-one-sans", family: "AR One Sans", weights: [400, 700] },
];

export const findFont = (id?: string | null) => fonts.find((f) => f.id === id) ?? fonts[0];

export const nearestWeight = (font: FontDef, weight: number) =>
  font.weights.reduce((best, w) => (Math.abs(w - weight) < Math.abs(best - weight) ? w : best));

export const fontFile = (font: FontDef, weight: number) => `fonts/${font.id}-${nearestWeight(font, weight)}.ttf`;
