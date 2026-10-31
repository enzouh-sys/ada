import { getState } from "../store.js";
import { icon, esc, reelCard, emptyState, plural } from "../ui.js";
import { CATEGORIES, STATUSES, normalize, categoryOf } from "../taxonomy.js";

let query = "";

// On cherche partout : titre, résumé, points clés, snippets, outils, notes, auteur.
function haystack(r) {
  return normalize([
    r.title, r.summary, r.author, r.category, r.notes, r.tryIt,
    ...r.tags, ...r.keyPoints,
    ...r.snippets.map((s) => `${s.title} ${s.content}`),
    ...r.resources.map((x) => `${x.name} ${x.note}`),
  ].join(" "));
}
const matches = (r, q) => !q || normalize(q).split(" ").every((w) => haystack(r).includes(w));

const SORTS = {
  recent: (a, b) => b.createdAt - a.createdAt,
  rapide: (a, b) => (a.minutesToTry ?? 999) - (b.minutesToTry ?? 999),
  az: (a, b) => a.title.localeCompare(b.title, "fr"),
};

export function render(params) {
  const { reels } = getState();
  const q = params.query;
  const cat = q.get("cat") || "";
  const status = q.get("statut") || "";
  const tag = q.get("tag") || "";
  const fav = q.get("fav") === "1";
  const sort = q.get("tri") || "recent";

  const list = reels
    .filter((r) => (!cat || r.category === cat) && (!status || r.status === status) && (!tag || r.tags.includes(tag)) && (!fav || r.favorite) && matches(r, query))
    .sort(SORTS[sort] || SORTS.recent);
  const cats = CATEGORIES.filter((c) => reels.some((r) => r.category === c.name));

  const href = (next) => {
    const p = new URLSearchParams({ ...(cat && { cat }), ...(status && { statut: status }), ...(tag && { tag }), ...(fav && { fav: "1" }), ...(sort !== "recent" && { tri: sort }), ...next });
    for (const [k, v] of [...p]) if (!v) p.delete(k);
    const s = p.toString();
    return `#/biblio${s ? `?${s}` : ""}`;
  };

  return `
  <section class="page library">
    <header class="page-head">
      <div>
        <p class="eyebrow">${plural(reels.length, "fiche")}</p>
        <h1 class="display sm">Bibliothèque</h1>
      </div>
      <a class="icon-btn" href="#/nouvelle" aria-label="Écrire une fiche">${icon("edit")}</a>
    </header>

    <label class="search">
      ${icon("search", { size: 19 })}
      <input id="lib-search" type="search" placeholder="Un outil, une commande, un mot…" value="${esc(query)}" autocomplete="off" enterkeyhint="search">
      <kbd class="kbd">/</kbd>
    </label>

    <div class="chips scroller">
      <a class="chip ${!cat && !fav && !tag ? "active" : ""}" href="${href({ cat: "", fav: "", tag: "" })}">Toutes</a>
      <a class="chip ${fav ? "active" : ""}" href="${href({ fav: fav ? "" : "1" })}">${icon("heart", { size: 14, fill: fav })} Favoris</a>
      ${tag ? `<a class="chip active" href="${href({ tag: "" })}">#${esc(tag)} ${icon("x", { size: 12 })}</a>` : ""}
      ${cats.map((c) => `<a class="chip ${c.name === cat ? "active" : ""}" style="--h:${c.hue}" href="${href({ cat: c.name === cat ? "" : c.name })}"><span>${c.emoji}</span>${esc(c.name)}</a>`).join("")}
    </div>

    <div class="list-toolbar">
      <div class="seg sm status-seg">
        <a class="${!status ? "active" : ""}" href="${href({ statut: "" })}">Tous</a>
        ${STATUSES.map((s) => `<a class="${status === s.id ? "active" : ""}" href="${href({ statut: status === s.id ? "" : s.id })}">${s.emoji} <span class="hide-xs">${s.short}</span></a>`).join("")}
      </div>
      <div class="seg sm">
        ${[["recent", "Récentes"], ["rapide", "Rapides"], ["az", "A→Z"]].map(([k, l]) => `<a class="${sort === k ? "active" : ""}" href="${href({ tri: k === "recent" ? "" : k })}">${l}</a>`).join("")}
      </div>
    </div>
    <p class="muted sm result-count" id="lib-count">${plural(list.length, "résultat")}${cat ? ` · ${esc(categoryOf(cat).name)}` : ""}</p>

    <div class="grid" id="lib-grid">
      ${list.length ? list.map((r) => reelCard(r)).join("") : emptyState({
        emoji: query ? "🔎" : "📭",
        title: query ? "Rien trouvé" : "Aucune fiche ici",
        text: query ? "Essaie un autre mot : un outil, une commande, un thème." : "Importe un reel ou écris ta première fiche.",
        action: query ? "" : `<button class="btn btn-primary" data-import>${icon("plus", { size: 18 })} Importer un reel</button>`,
      })}
    </div>
  </section>`;
}

export function mount(root, params) {
  const input = root.querySelector("#lib-search");
  input.addEventListener("input", () => {
    query = input.value;
    const tmp = document.createElement("div");
    tmp.innerHTML = render(params);
    root.querySelector("#lib-grid").replaceWith(tmp.querySelector("#lib-grid"));
    root.querySelector("#lib-count").replaceWith(tmp.querySelector("#lib-count"));
  });
  if (params.query.get("focus") === "1") requestAnimationFrame(() => input.focus());
}
