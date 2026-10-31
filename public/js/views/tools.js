// Boîte à outils : tous les outils, repos, serveurs MCP et docs cités dans tes reels, dédoublonnés.
import { getState } from "../store.js";
import { icon, esc, emptyState, plural, safeUrl } from "../ui.js";
import { RESOURCE_KINDS, resourceKindOf, normalize } from "../taxonomy.js";

let query = "";

function aggregate(reels) {
  const map = new Map();
  for (const r of reels) {
    for (const x of r.resources) {
      const key = normalize(x.name);
      if (!key) continue;
      const t = map.get(key) || { name: x.name, kind: x.kind, url: null, note: "", reels: [] };
      t.url ||= safeUrl(x.url) || null;
      t.note ||= x.note;
      if (!t.reels.some((y) => y.id === r.id)) t.reels.push(r);
      map.set(key, t);
    }
  }
  return [...map.values()].sort((a, b) => b.reels.length - a.reels.length || a.name.localeCompare(b.name, "fr"));
}

export function render(params) {
  const kind = params.query.get("type") || "";
  const all = aggregate(getState().reels);
  const q = normalize(query);
  const list = all.filter((t) => (!kind || t.kind === kind) && (!q || normalize(`${t.name} ${t.note}`).includes(q)));
  const kinds = RESOURCE_KINDS.filter((k) => all.some((t) => t.kind === k.id));

  return `
  <section class="page tools">
    <header class="page-head">
      <div>
        <p class="eyebrow">${plural(all.length, "ressource")} repérée${all.length > 1 ? "s" : ""}</p>
        <h1 class="display sm">Boîte à outils</h1>
      </div>
      <a class="icon-btn" href="#/snippets" aria-label="Snippets">${icon("code")}</a>
    </header>

    <label class="search">
      ${icon("search", { size: 19 })}
      <input id="tl-search" type="search" placeholder="Un outil, un repo, un MCP…" value="${esc(query)}" autocomplete="off" enterkeyhint="search">
    </label>

    <div class="chips scroller">
      <a class="chip ${!kind ? "active" : ""}" href="#/outils">Tout <small>${all.length}</small></a>
      ${kinds.map((k) => `<a class="chip ${kind === k.id ? "active" : ""}" href="#/outils${kind === k.id ? "" : `?type=${encodeURIComponent(k.id)}`}">${k.label} <small>${all.filter((t) => t.kind === k.id).length}</small></a>`).join("")}
    </div>

    <ul class="tool-list" id="tl-list">
      ${list.length ? list.map((t) => `
        <li class="tool">
          <span class="res-ic">${icon(resourceKindOf(t.kind).icon, { size: 20 })}</span>
          <div class="tool-text">
            <strong>${esc(t.name)}</strong>
            <small>${esc(resourceKindOf(t.kind).one)}${t.note ? ` · ${esc(t.note)}` : ""}</small>
            <div class="tool-reels">${t.reels.slice(0, 4).map((r) => `<a href="#/fiche/${r.id}" title="${esc(r.title)}">${esc(r.emoji)} <span>${esc(r.title)}</span></a>`).join("")}${t.reels.length > 4 ? `<span class="muted">+${t.reels.length - 4}</span>` : ""}</div>
          </div>
          ${t.reels.length > 1 ? `<span class="tool-count" title="Cité dans ${t.reels.length} fiches">×${t.reels.length}</span>` : ""}
          ${t.url ? `<a class="icon-btn sm" href="${esc(t.url)}" target="_blank" rel="noopener" aria-label="Ouvrir ${esc(t.name)}">${icon("external", { size: 16 })}</a>` : ""}
        </li>`).join("") : `<li>${emptyState({ emoji: "🧰", title: query ? "Rien trouvé" : "Boîte vide", text: query ? "Essaie un autre nom." : "Les outils cités dans tes reels apparaîtront ici." })}</li>`}
    </ul>
  </section>`;
}

export function mount(root, params) {
  const input = root.querySelector("#tl-search");
  input.addEventListener("input", () => {
    query = input.value;
    const tmp = document.createElement("div");
    tmp.innerHTML = render(params);
    root.querySelector("#tl-list").replaceWith(tmp.querySelector("#tl-list"));
  });
}
