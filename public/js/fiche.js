// Forme d'une fiche, partagée par l'app et par le PC de la maison (lib/worker.js) : pas de DOM ici.
import { detectPlatform, PLATFORM_LABEL } from "./taxonomy.js";

// crypto.randomUUID n'existe qu'en contexte sécurisé : sur le Wi-Fi (http://192.168…), on le refait.
export function uuid() {
  if (crypto.randomUUID && (typeof window === "undefined" || window.isSecureContext)) return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
const shortId = () => uuid().slice(0, 8);

const str = (v, max = 20000) => (typeof v === "string" ? v.slice(0, max) : v == null ? "" : String(v).slice(0, max));
const arr = (v) => (Array.isArray(v) ? v : []);

/**
 * analysis : où en est l'analyse d'un import.
 *   pending     → en attente du PC de la maison
 *   running     → le PC l'analyse
 *   done        → fiche complète
 *   needs_input → il faut la légende ou une capture (Instagram privé…)
 *   error       → échec, on peut réessayer
 */
export const ANALYSIS_STATES = ["pending", "running", "done", "needs_input", "error"];
export const isWaiting = (r) => r?.analysis?.state === "pending" || r?.analysis?.state === "running";
export const needsAttention = (r) => r?.analysis?.state === "needs_input" || r?.analysis?.state === "error";

/** Forme canonique d'une fiche : tout champ manquant reçoit une valeur sûre. */
export function normalizeReel(r = {}) {
  const now = Date.now();
  const a = r.analysis && typeof r.analysis === "object" ? r.analysis : { state: "done" };
  return {
    id: str(r.id, 80) || uuid(),
    title: str(r.title, 200) || "Astuce sans titre",
    summary: str(r.summary, 2000),
    emoji: str(r.emoji, 16) || "✨",
    category: str(r.category, 60) || "Autre",
    level: str(r.level, 30) || "Intermédiaire",
    tags: arr(r.tags).map((t) => str(t, 40).toLowerCase().trim()).filter(Boolean).slice(0, 12),
    keyPoints: arr(r.keyPoints).map((p) => str(p, 600)).filter(Boolean),
    steps: arr(r.steps).map((s) => ({ text: str(s?.text, 1000), command: s?.command ? str(s.command, 1000) : null, done: Boolean(s?.done) })).filter((s) => s.text),
    snippets: arr(r.snippets)
      .map((s) => ({ id: str(s?.id, 40) || shortId(), kind: str(s?.kind, 20) || "code", title: str(s?.title, 120), language: str(s?.language, 20), content: str(s?.content, 20000), pinned: Boolean(s?.pinned) }))
      .filter((s) => s.content),
    resources: arr(r.resources).map((x) => ({ name: str(x?.name, 120), kind: str(x?.kind, 20) || "outil", url: x?.url ? str(x.url, 600) : null, note: str(x?.note, 300) })).filter((x) => x.name),
    tryIt: str(r.tryIt, 1000),
    claudePrompt: str(r.claudePrompt, 6000),
    minutesToTry: Number.isFinite(r.minutesToTry) ? Math.max(1, Math.round(r.minutesToTry)) : null,
    caution: str(r.caution, 1000),
    partial: Boolean(r.partial),
    missing: str(r.missing, 600),
    status: ["todo", "doing", "adopted", "skipped"].includes(r.status) ? r.status : "todo",
    favorite: Boolean(r.favorite),
    notes: str(r.notes, 20000),
    sourceUrl: str(r.sourceUrl, 1000),
    platform: str(r.platform, 20) || "manuel",
    author: str(r.author, 120),
    image: str(r.image, 200_000),
    caption: str(r.caption, 6000),
    engine: str(r.engine, 20),
    model: str(r.model, 60),
    example: Boolean(r.example),
    input: { url: str(r.input?.url, 1000), text: str(r.input?.text, 8000), shotIds: arr(r.input?.shotIds).map((s) => str(s, 60)).slice(0, 5) },
    // Un même reel peut donner plusieurs fiches (ex. « une fiche par skill ») : elles partagent groupId (l'id de la première).
    groupId: str(r.groupId, 80),
    groupIndex: Number.isFinite(r.groupIndex) ? r.groupIndex : 0,
    groupTotal: Number.isFinite(r.groupTotal) ? r.groupTotal : 0,
    // Ce que la recherche web du PC a ajouté ou vérifié, et les pages consultées.
    research: {
      summary: str(r.research?.summary, 1000),
      sources: arr(r.research?.sources).map((x) => ({ title: str(x?.title, 200), url: str(x?.url, 600) })).filter((x) => /^https?:\/\//.test(x.url)).slice(0, 15),
      at: Number(r.research?.at) || 0,
    },
    analysis: {
      state: ANALYSIS_STATES.includes(a.state) ? a.state : "done",
      requestedAt: Number(a.requestedAt) || 0,
      startedAt: Number(a.startedAt) || 0,
      doneAt: Number(a.doneAt) || 0,
      error: str(a.error, 500),
      by: str(a.by, 80),
    },
    createdAt: Number(r.createdAt) || now,
    updatedAt: Number(r.updatedAt) || now,
    statusChangedAt: Number(r.statusChangedAt) || Number(r.createdAt) || now,
  };
}

/** Réponse de l'analyse ({ fiche, source, engine, model }) → champs de la fiche (sans toucher au statut, aux notes…). */
export function ficheToFields({ fiche, source, engine, model }) {
  return {
    title: fiche.title,
    summary: fiche.summary,
    emoji: fiche.emoji || "✨",
    category: fiche.category,
    level: fiche.level,
    tags: (fiche.tags || []).map((t) => t.toLowerCase().replace(/^#/, "")),
    keyPoints: fiche.key_points || [],
    steps: (fiche.steps || []).map((s) => ({ text: s.text, command: s.command || null, done: false })),
    snippets: (fiche.snippets || []).map((s) => ({ ...s, id: shortId(), pinned: false })),
    resources: fiche.resources || [],
    tryIt: fiche.try_it || "",
    claudePrompt: fiche.claude_code_prompt || "",
    minutesToTry: fiche.minutes_to_try ?? null,
    caution: fiche.caution || "",
    partial: Boolean(fiche.partial),
    missing: fiche.missing || "",
    sourceUrl: source.url || "",
    platform: source.platform || "texte",
    author: source.author || "",
    caption: source.caption || "",
    engine,
    model: model || "",
    research: { summary: fiche.research_summary || "", sources: fiche.research_sources || [], at: fiche.research_sources?.length ? Date.now() : 0 },
  };
}

/** Fiche provisoire, le temps que le PC de la maison analyse l'import. */
export function pendingReel({ url = "", text = "", shotIds = [], notes = "" }) {
  const platform = url ? detectPlatform(url) || "web" : "texte";
  let title = "";
  try {
    const u = new URL(url);
    if (platform === "github") title = `Repo ${u.pathname.split("/").filter(Boolean).slice(0, 2).join("/")}`;
    else if (platform === "web") title = u.hostname.replace(/^www\./, "");
  } catch {}
  const firstLine = text.split("\n").map((l) => l.trim()).find((l) => l.length > 6) || "";
  title ||= firstLine.replace(/[#@][\p{L}0-9_.]+/gu, "").trim().slice(0, 70) || `Reel ${PLATFORM_LABEL[platform] || ""}`.trim();
  const now = Date.now();
  return normalizeReel({
    id: uuid(),
    title,
    emoji: "⏳",
    platform,
    sourceUrl: url,
    caption: text,
    input: { url, text, shotIds },
    notes,
    analysis: { state: "pending", requestedAt: now },
    createdAt: now,
  });
}
