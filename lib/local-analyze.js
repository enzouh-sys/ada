// Analyse sans IA : on tire d'une légende ce qui est objectivement là — commandes, liens,
// hashtags, listes — et on devine la catégorie. Moins malin que Claude, mais jamais inventé.
import { normalize } from "../public/js/taxonomy.js";

const CATEGORY_HINTS = [
  ["MCP", /\bmcp\b|model context protocol|mcp server|serveur mcp/],
  ["Skills & hooks", /\bskills?\b|\bhooks?\b|pretooluse|posttooluse|slash command|commande slash/],
  ["Agents & SDK", /\bagents?\b|sub-?agents?|agent sdk|\bsdk\b|multi-agent|orchestrat/],
  ["Claude Code", /claude code|claude\.md|\bclaude\b|\/init\b|\/compact\b|plan mode|mode plan|anthropic/],
  ["Prompting", /\bprompts?\b|prompting|system prompt|few-shot|chain of thought/],
  ["Outils & extensions", /cursor|vs ?code|extension|raycast|warp|terminal|cli\b|wispr|obsidian|notion/],
  ["Frontend", /react|next\.?js|tailwind|\bcss\b|svelte|vue\b|ui\b|figma|shadcn|animation/],
  ["Backend", /\bapi\b|node|python|django|fastapi|supabase|postgres|sql|database|base de donn/],
  ["DevOps & déploiement", /docker|vercel|deploy|déploi|kubernetes|\bci\b|github actions|netlify|serveur/],
  ["IA & modèles", /\bllm\b|gpt|gemini|mistral|modèle|model|\bia\b|\bai\b|openai/],
  ["Carrière & productivité", /freelance|carri|job|productiv|client|business|side project/],
  ["Workflow", /workflow|git\b|commit|branche|review|test|debug/],
];

const COMMAND_RE = /^\s*(?:\$\s*|>\s*)?((?:npx|npm|pnpm|yarn|bun|pip|pipx|uv|brew|git|claude|curl|docker|cd|code|winget|choco|cargo|go|deno|gh|vercel|firebase)\s+[^\n]{2,160})$/i;
const SLASH_RE = /(?:^|\s)(\/[a-z][a-z0-9-]{1,30})(?=\s|$|[.,;:!?)])/g;
const INLINE_CODE_RE = /`([^`\n]{2,200})`/g;
const URL_RE = /https?:\/\/[^\s)<>"']+/g;
const HASHTAG_RE = /#([\p{L}0-9_]{2,30})/gu;
const BULLET_RE = /^\s*(?:[-•*▪︎►→✅✔️☑️👉🔥⚡️💡📌🚀]|\d+[.)/]|[①-⑨])\s*(.+)$/u;

const clean = (s) => s.replace(/[#@][\p{L}0-9_.]+/gu, "").replace(/\s{2,}/g, " ").trim();

function resourceFromUrl(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "github.com") {
      const [owner, repo] = u.pathname.split("/").filter(Boolean);
      if (owner && repo) return { name: `${owner}/${repo}`, kind: "repo", url, note: "" };
    }
    if (/marketplace\.visualstudio\.com/.test(host)) return { name: u.searchParams.get("itemName") || host, kind: "extension", url, note: "" };
    if (/npmjs\.com$/.test(host)) return { name: u.pathname.replace(/^\/package\//, ""), kind: "librairie", url, note: "" };
    if (/docs\.|\/docs/.test(host + u.pathname)) return { name: host, kind: "doc", url, note: "" };
    return { name: host, kind: "site", url, note: "" };
  } catch {
    return null;
  }
}

export function localAnalyze(source) {
  const text = (source.text || "").replace(/\r/g, "");
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  const hay = normalize(text);

  const category = CATEGORY_HINTS.find(([, re]) => re.test(hay))?.[0] || "Autre";
  const tags = [...new Set([...text.matchAll(HASHTAG_RE)].map((m) => m[1].toLowerCase()))].slice(0, 6);

  const snippets = [];
  const seen = new Set();
  const push = (kind, content, title = "") => {
    const key = content.trim().toLowerCase();
    if (!key || seen.has(key)) return;
    seen.add(key);
    snippets.push({ kind, title, language: kind === "commande" ? "bash" : "", content: content.trim() });
  };
  for (const l of lines) {
    const m = l.match(COMMAND_RE);
    if (m) push("commande", m[1]);
  }
  for (const m of text.matchAll(INLINE_CODE_RE)) push(/^(npx|npm|git|claude|pip|brew|curl)\b/.test(m[1]) ? "commande" : "code", m[1]);
  for (const m of text.matchAll(SLASH_RE)) if (!/^\/(\/|https?)/.test(m[1])) push("raccourci", m[1], "Commande slash");

  const resources = [];
  for (const url of new Set(text.match(URL_RE) || [])) {
    const r = resourceFromUrl(url.replace(/[.,;:!?]+$/, ""));
    if (r && !resources.some((x) => x.name === r.name)) resources.push(r);
  }

  const bullets = lines.map((l) => l.match(BULLET_RE)?.[1]).filter(Boolean).map(clean).filter((l) => l.length > 6);
  const sentences = clean(lines.filter((l) => !BULLET_RE.test(l) && !COMMAND_RE.test(l)).join(" ")).split(/(?<=[.!?])\s+/).filter((s) => s.length > 12);

  const firstLine = clean(lines.find((l) => clean(l).length > 8 && !URL_RE.test(l)) || "");
  URL_RE.lastIndex = 0;
  const title = (source.title && clean(source.title)) || firstLine.slice(0, 72) || (source.author ? `Reel de ${source.author}` : "Astuce dev");
  const summary = sentences.slice(0, 2).join(" ").slice(0, 220) || bullets[0] || "";

  return {
    is_dev: true,
    title: title.replace(/[.:…]+$/, ""),
    summary,
    emoji: "✨",
    category,
    level: "Intermédiaire",
    tags,
    key_points: (bullets.length ? bullets : sentences).slice(0, 6),
    steps: [],
    snippets,
    resources,
    try_it: snippets[0] ? `Lance \`${snippets[0].content.slice(0, 80)}\` dans un projet de test.` : "",
    claude_code_prompt: `J'ai vu cette astuce dev : « ${title} ».${summary ? ` ${summary}` : ""}\n\nExplique-moi en deux phrases à quoi elle sert, puis aide-moi à l'appliquer dans ce projet, étape par étape, en me demandant avant toute modification importante.`,
    minutes_to_try: null,
    caution: "",
    partial: true,
    missing: "Fiche générée sans IA, à partir de la légende seulement : vérifie et complète-la.",
    research_summary: "",
    research_sources: [],
  };
}
