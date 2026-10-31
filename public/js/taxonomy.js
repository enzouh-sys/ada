// Vocabulaire commun au serveur (schéma de l'IA) et à l'interface : catégories, statuts, types.

export const CATEGORIES = [
  { name: "Claude Code", emoji: "⌨️", hue: 18 },
  { name: "Prompting", emoji: "💬", hue: 280 },
  { name: "MCP", emoji: "🔌", hue: 200 },
  { name: "Agents & SDK", emoji: "🤖", hue: 160 },
  { name: "Skills & hooks", emoji: "🪝", hue: 330 },
  { name: "Workflow", emoji: "🔁", hue: 40 },
  { name: "Outils & extensions", emoji: "🧰", hue: 220 },
  { name: "Frontend", emoji: "🎨", hue: 300 },
  { name: "Backend", emoji: "🗄️", hue: 130 },
  { name: "DevOps & déploiement", emoji: "🚀", hue: 250 },
  { name: "IA & modèles", emoji: "🧠", hue: 350 },
  { name: "Carrière & productivité", emoji: "📈", hue: 90 },
  { name: "Autre", emoji: "✨", hue: 280 },
];
export const CATEGORY_NAMES = CATEGORIES.map((c) => c.name);
export const categoryOf = (name) => CATEGORIES.find((c) => c.name === name) || CATEGORIES[CATEGORIES.length - 1];

export const LEVELS = ["Débutant", "Intermédiaire", "Avancé"];

// Le parcours d'une astuce : on la garde, on l'essaie, on l'adopte (ou pas).
export const STATUSES = [
  { id: "todo", label: "À tester", short: "À tester", emoji: "📌" },
  { id: "doing", label: "En test", short: "En test", emoji: "🧪" },
  { id: "adopted", label: "Adoptée", short: "Adoptée", emoji: "✅" },
  { id: "skipped", label: "Pas pour moi", short: "Écartée", emoji: "💤" },
];
export const statusOf = (id) => STATUSES.find((s) => s.id === id) || STATUSES[0];

export const SNIPPET_KINDS = [
  { id: "commande", label: "Commandes", one: "Commande" },
  { id: "prompt", label: "Prompts", one: "Prompt" },
  { id: "code", label: "Code", one: "Code" },
  { id: "config", label: "Config", one: "Config" },
  { id: "raccourci", label: "Raccourcis", one: "Raccourci" },
];
export const SNIPPET_KIND_IDS = SNIPPET_KINDS.map((k) => k.id);
export const snippetKindOf = (id) => SNIPPET_KINDS.find((k) => k.id === id) || SNIPPET_KINDS[2];

export const RESOURCE_KINDS = [
  { id: "outil", label: "Outils", one: "Outil", icon: "tool" },
  { id: "mcp", label: "Serveurs MCP", one: "Serveur MCP", icon: "layers" },
  { id: "repo", label: "Repos GitHub", one: "Repo", icon: "code" },
  { id: "extension", label: "Extensions", one: "Extension", icon: "grid" },
  { id: "librairie", label: "Librairies", one: "Librairie", icon: "book" },
  { id: "modèle", label: "Modèles", one: "Modèle", icon: "sparkles" },
  { id: "doc", label: "Docs", one: "Doc", icon: "book" },
  { id: "site", label: "Sites", one: "Site", icon: "globe" },
];
export const resourceKindOf = (id) => RESOURCE_KINDS.find((k) => k.id === id) || RESOURCE_KINDS[0];
export const RESOURCE_KIND_IDS = RESOURCE_KINDS.map((k) => k.id);

export const PLATFORM_LABEL = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
  github: "GitHub",
  x: "X",
  web: "Web",
  texte: "Texte collé",
  manuel: "Ma fiche",
  ada: "Exemple Ada",
};

export function detectPlatform(url) {
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (/(^|\.)instagram\.com$/.test(host) || host === "instagr.am") return "instagram";
    if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
    if (/(^|\.)facebook\.com$/.test(host) || host === "fb.watch" || host === "fb.com") return "facebook";
    if (/(^|\.)youtube\.com$/.test(host) || host === "youtu.be") return "youtube";
    if (host === "github.com") return "github";
    if (host === "x.com" || host === "twitter.com") return "x";
    return "web";
  } catch {
    return null;
  }
}

/** Clé de comparaison : minuscules, sans accents ni ponctuation. */
export function normalize(str = "") {
  return String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9@./+#-]+/g, " ")
    .trim();
}

/** Même post, même lien (paramètres de suivi d'Instagram & co. ignorés). */
export function canonicalUrl(url = "") {
  try {
    const u = new URL(url.trim());
    u.hash = "";
    for (const k of [...u.searchParams.keys()]) if (/^(utm_|igsh|igshid|si|is_from_webapp|sender_device|_r|_t|share|mibextid|rdid|fbclid)/i.test(k)) u.searchParams.delete(k);
    return `${u.hostname.replace(/^www\./, "")}${u.pathname.replace(/\/+$/, "")}${u.search}`.toLowerCase();
  } catch {
    return "";
  }
}
