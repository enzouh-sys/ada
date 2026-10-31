// Fiches → Markdown. Partagé par l'interface (copier une fiche) et le serveur (export complet,
// pensé pour être lu par Claude Code : `@export/ada.md` dans une session, ou collé dans un CLAUDE.md).
import { PLATFORM_LABEL, statusOf, snippetKindOf, CATEGORY_NAMES } from "./taxonomy.js";

const fence = (content = "", lang = "") => {
  const ticks = content.includes("```") ? "````" : "```";
  return `${ticks}${lang}\n${content.trimEnd()}\n${ticks}`;
};

export function reelToMarkdown(r, { level = 2 } = {}) {
  const h = "#".repeat(level);
  const out = [`${h} ${r.emoji || "✨"} ${r.title}`];
  const meta = [
    r.category,
    r.level,
    statusOf(r.status).label,
    r.minutesToTry ? `~${r.minutesToTry} min` : "",
    r.sourceUrl ? `[${r.author || PLATFORM_LABEL[r.platform] || "source"}](${r.sourceUrl})` : r.author,
  ].filter(Boolean);
  out.push(`*${meta.join(" · ")}*`);
  if (r.summary) out.push(r.summary);
  if (r.keyPoints?.length) out.push(`**L'essentiel**\n${r.keyPoints.map((p) => `- ${p}`).join("\n")}`);
  if (r.steps?.length) {
    out.push(`**Mise en pratique**\n${r.steps.map((s, i) => `${i + 1}. ${s.text}${s.command ? ` — \`${s.command}\`` : ""}`).join("\n")}`);
  }
  for (const s of r.snippets || []) {
    out.push(`**${snippetKindOf(s.kind).one}${s.title ? ` — ${s.title}` : ""}**\n${fence(s.content, s.language || "")}`);
  }
  if (r.resources?.length) {
    out.push(`**Ressources**\n${r.resources.map((x) => `- ${x.url ? `[${x.name}](${x.url})` : x.name}${x.note ? ` — ${x.note}` : ""}`).join("\n")}`);
  }
  if (r.research?.sources?.length) {
    out.push(`**Vérifié sur le web**${r.research.summary ? ` — ${r.research.summary}` : ""}\n${r.research.sources.map((x) => `- [${x.title || x.url}](${x.url})`).join("\n")}`);
  }
  if (r.tryIt) out.push(`**À essayer** : ${r.tryIt}`);
  if (r.caution) out.push(`> ⚠️ ${r.caution}`);
  if (r.notes) out.push(`**Mes notes**\n${r.notes}`);
  if (r.tags?.length) out.push(r.tags.map((t) => `#${t.replace(/\s+/g, "-")}`).join(" "));
  return out.join("\n\n");
}

export function libraryToMarkdown(all, { title = "Ada — ma base d'astuces dev", date = new Date() } = {}) {
  const reels = all.filter((r) => !r.analysis || r.analysis.state === "done"); // les imports pas encore analysés n'ont rien à dire
  const byCat = new Map(CATEGORY_NAMES.map((c) => [c, []]));
  for (const r of reels) (byCat.get(r.category) || byCat.get("Autre")).push(r);
  const head = [
    `# ${title}`,
    `*${reels.length} fiche${reels.length > 1 ? "s" : ""} · exporté le ${date.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}*`,
    "Astuces tirées de reels et vidéos dev, classées par thème. Les fiches « Adoptée » sont celles qui font désormais partie de mon workflow.",
  ];
  const sections = [...byCat]
    .filter(([, list]) => list.length)
    .map(([cat, list]) => `## ${cat}\n\n${list.map((r) => reelToMarkdown(r, { level: 3 })).join("\n\n---\n\n")}`);
  return [...head, ...sections].join("\n\n") + "\n";
}
