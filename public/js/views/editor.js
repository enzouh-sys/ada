// Écrire ou modifier une fiche à la main.
import { getReel, createReel, patchReel, uuid } from "../store.js";
import { icon, esc, toast, emptyState } from "../ui.js";
import { CATEGORIES, LEVELS, STATUSES, SNIPPET_KINDS, RESOURCE_KINDS } from "../taxonomy.js";
import { navigate } from "../router.js";

const blankSnippet = () => ({ id: Math.random().toString(36).slice(2, 10), kind: "commande", title: "", language: "bash", content: "", pinned: false });

// Étapes : une par ligne, la commande éventuelle entre `accents graves`.
const stepsToText = (steps) => steps.map((s) => `${s.text}${s.command ? ` \`${s.command}\`` : ""}`).join("\n");
function textToSteps(text, previous = []) {
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((line, i) => {
    const m = line.match(/^(.*?)\s*`([^`]+)`\s*$/);
    const step = m ? { text: m[1] || m[2], command: m[2] } : { text: line, command: null };
    return { ...step, done: previous[i]?.text === step.text ? previous[i].done : false };
  });
}
// Ressources : « Nom | url | note », une par ligne.
const resourcesToText = (list) => list.map((x) => [x.name, x.url || "", x.note].join(" | ").replace(/( \| )+$/, "")).join("\n");
const textToResources = (text, kinds = {}) =>
  text.split("\n").map((l) => l.split("|").map((p) => p.trim())).filter(([n]) => n)
    .map(([name, url = "", note = ""]) => ({ name, url: /^https?:\/\//.test(url) ? url : null, note, kind: kinds[name] || (/github\.com/.test(url) ? "repo" : "outil") }));

let draft = null;

export function render({ id }) {
  const existing = id ? getReel(id) : null;
  if (id && !existing) { draft = null; return `<section class="page">${emptyState({ emoji: "🫥", title: "Fiche introuvable", text: "Elle a peut-être été supprimée." })}</section>`; }
  draft = structuredClone(existing || { title: "", summary: "", emoji: "✨", category: "Claude Code", level: "Intermédiaire", status: "todo", tags: [], keyPoints: [], steps: [], snippets: [], resources: [], tryIt: "", claudePrompt: "", caution: "", sourceUrl: "", notes: "", minutesToTry: null });
  if (!draft.snippets.length) draft.snippets.push(blankSnippet());

  const opt = (list, value) => list.map((o) => `<option value="${esc(o.value)}" ${o.value === value ? "selected" : ""}>${esc(o.label)}</option>`).join("");

  return `
  <section class="page editor">
    <header class="editor-bar">
      <button class="icon-btn" data-back="${existing ? `#/fiche/${existing.id}` : "#/"}" aria-label="Annuler">${icon("x")}</button>
      <h1>${existing ? "Modifier la fiche" : "Nouvelle fiche"}</h1>
      <button class="btn btn-primary btn-sm" id="save">${icon("check", { size: 16 })} Enregistrer</button>
    </header>

    <form id="ed" class="form" autocomplete="off">
      <div class="row-2">
        <label class="field emoji-field"><span>Emoji</span><input name="emoji" value="${esc(draft.emoji)}" maxlength="4"></label>
        <label class="field"><span>Titre</span><input name="title" value="${esc(draft.title)}" placeholder="Faire planifier Claude Code avant qu'il code" required></label>
      </div>
      <label class="field"><span>Résumé</span><textarea name="summary" rows="2" placeholder="Ce que c'est, et pourquoi c'est utile.">${esc(draft.summary)}</textarea></label>
      <div class="row-3">
        <label class="field"><span>Thème</span><select name="category">${opt(CATEGORIES.map((c) => ({ value: c.name, label: `${c.emoji} ${c.name}` })), draft.category)}</select></label>
        <label class="field"><span>Niveau</span><select name="level">${opt(LEVELS.map((l) => ({ value: l, label: l })), draft.level)}</select></label>
        <label class="field"><span>Statut</span><select name="status">${opt(STATUSES.map((s) => ({ value: s.id, label: `${s.emoji} ${s.label}` })), draft.status)}</select></label>
      </div>
      <div class="row-2">
        <label class="field"><span>Tags <small>séparés par des virgules</small></span><input name="tags" value="${esc(draft.tags.join(", "))}" placeholder="claude-code, workflow"></label>
        <label class="field narrow"><span>Minutes pour tester</span><input name="minutesToTry" type="number" min="1" max="600" value="${draft.minutesToTry ?? ""}"></label>
      </div>
      <label class="field"><span>Lien du reel</span><input name="sourceUrl" type="url" value="${esc(draft.sourceUrl)}" placeholder="https://www.instagram.com/reel/…"></label>

      <label class="field"><span>L'essentiel <small>un point par ligne</small></span><textarea name="keyPoints" rows="4">${esc(draft.keyPoints.join("\n"))}</textarea></label>
      <label class="field"><span>Mise en pratique <small>une étape par ligne, commande entre \`accents graves\`</small></span><textarea name="steps" rows="4" class="mono" placeholder="Ajoute le serveur \`claude mcp add …\`">${esc(stepsToText(draft.steps))}</textarea></label>

      <div class="field">
        <span>Snippets</span>
        <div class="snip-edit" id="snip-edit"></div>
        <button type="button" class="btn btn-ghost btn-sm" id="add-snip">${icon("plus", { size: 16 })} Ajouter un snippet</button>
      </div>

      <label class="field"><span>À essayer</span><input name="tryIt" value="${esc(draft.tryIt)}" placeholder="Une action concrète, en moins de 15 minutes"></label>
      <label class="field"><span>Prompt pour Claude Code</span><textarea name="claudePrompt" rows="4" class="mono">${esc(draft.claudePrompt)}</textarea></label>
      <label class="field"><span>Outils & liens <small>« Nom | url | note », un par ligne</small></span><textarea name="resources" rows="3" class="mono" placeholder="jq | https://jqlang.org | lire du JSON">${esc(resourcesToText(draft.resources))}</textarea></label>
      <label class="field"><span>À savoir <small>limite, risque, coût</small></span><input name="caution" value="${esc(draft.caution)}"></label>
      <label class="field"><span>Mes notes</span><textarea name="notes" rows="3">${esc(draft.notes)}</textarea></label>

      <button class="btn btn-primary btn-lg btn-block" type="submit">${icon("check", { size: 18 })} Enregistrer la fiche</button>
    </form>
  </section>`;
}

function paintSnippets(root) {
  const host = root.querySelector("#snip-edit");
  host.innerHTML = draft.snippets.map((s, i) => `
    <div class="snip-row" data-i="${i}">
      <div class="snip-row-top">
        <select data-k="kind">${SNIPPET_KINDS.map((k) => `<option value="${k.id}" ${k.id === s.kind ? "selected" : ""}>${k.one}</option>`).join("")}</select>
        <input data-k="title" value="${esc(s.title)}" placeholder="Titre">
        <input data-k="language" value="${esc(s.language)}" placeholder="bash" class="lang">
        <button type="button" class="icon-btn sm ghost" data-del="${i}" aria-label="Supprimer">${icon("trash", { size: 16 })}</button>
      </div>
      <textarea data-k="content" rows="3" class="mono" placeholder="Colle la commande, le prompt ou le code…">${esc(s.content)}</textarea>
    </div>`).join("");
  host.querySelectorAll(".snip-row").forEach((row) => {
    const s = draft.snippets[Number(row.dataset.i)];
    row.querySelectorAll("[data-k]").forEach((el) => el.addEventListener("input", () => (s[el.dataset.k] = el.value)));
  });
  host.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { draft.snippets.splice(Number(b.dataset.del), 1); paintSnippets(root); }));
}

export function mount(root, { id }) {
  if (!draft) return;
  const existing = id ? getReel(id) : null;
  paintSnippets(root);
  root.querySelector("#add-snip").addEventListener("click", () => { draft.snippets.push(blankSnippet()); paintSnippets(root); root.querySelector(".snip-row:last-child textarea")?.focus(); });

  const form = root.querySelector("#ed");
  const save = (e) => {
    e?.preventDefault();
    const f = new FormData(form);
    const title = String(f.get("title")).trim();
    if (!title) { form.title.focus(); return toast("Donne un titre à ta fiche."); }
    const kinds = Object.fromEntries(draft.resources.map((x) => [x.name, x.kind]));
    const minutes = parseInt(f.get("minutesToTry"), 10);
    const fields = {
      title,
      emoji: String(f.get("emoji")).trim() || "✨",
      summary: String(f.get("summary")).trim(),
      category: f.get("category"),
      level: f.get("level"),
      status: f.get("status"),
      tags: String(f.get("tags")).split(",").map((t) => t.trim().toLowerCase().replace(/^#/, "")).filter(Boolean),
      minutesToTry: Number.isFinite(minutes) ? minutes : null,
      sourceUrl: String(f.get("sourceUrl")).trim(),
      keyPoints: String(f.get("keyPoints")).split("\n").map((l) => l.trim().replace(/^[-•]\s*/, "")).filter(Boolean),
      steps: textToSteps(String(f.get("steps")), draft.steps),
      snippets: draft.snippets.filter((s) => s.content.trim()),
      tryIt: String(f.get("tryIt")).trim(),
      claudePrompt: String(f.get("claudePrompt")).trim(),
      resources: textToResources(String(f.get("resources")), kinds),
      caution: String(f.get("caution")).trim(),
      notes: String(f.get("notes")),
    };
    if (existing) {
      patchReel(existing.id, fields);
      navigate(`#/fiche/${existing.id}`, { replace: true });
      toast("Fiche enregistrée");
    } else {
      const r = createReel({ id: uuid(), ...fields, platform: fields.sourceUrl ? "web" : "manuel", engine: "manuel" });
      navigate(`#/fiche/${r.id}`, { replace: true });
      toast("Fiche créée ✨");
    }
  };
  form.addEventListener("submit", save);
  root.querySelector("#save").addEventListener("click", save);
}

export function unmount() { draft = null; }
// Un formulaire en cours de saisie n'est jamais redessiné par une mise à jour de la base.
export const live = true;
