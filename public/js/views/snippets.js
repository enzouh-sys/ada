// Tous les snippets de toutes les fiches au même endroit : commandes, prompts, code, configs, raccourcis.
import { getState, patchReel } from "../store.js";
import { icon, esc, codeBlock, emptyState, plural, toast } from "../ui.js";
import { SNIPPET_KINDS, normalize } from "../taxonomy.js";

let query = "";

export function render(params) {
  const { reels } = getState();
  const kind = params.query.get("type") || "";
  const all = reels.flatMap((r) => r.snippets.map((s) => ({ ...s, reel: r })));
  const counts = Object.fromEntries(SNIPPET_KINDS.map((k) => [k.id, all.filter((s) => s.kind === k.id).length]));
  const q = normalize(query);
  const list = all
    .filter((s) => (!kind || s.kind === kind) && (!q || q.split(" ").every((w) => normalize(`${s.title} ${s.content} ${s.reel.title} ${s.language}`).includes(w))))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.reel.createdAt - a.reel.createdAt);

  return `
  <section class="page snippets">
    <header class="page-head">
      <div>
        <p class="eyebrow">${plural(all.length, "snippet")} · prêts à copier</p>
        <h1 class="display sm">Snippets</h1>
      </div>
      <a class="icon-btn" href="#/outils" aria-label="Outils">${icon("tool")}</a>
    </header>

    <label class="search">
      ${icon("search", { size: 19 })}
      <input id="sn-search" type="search" placeholder="git, mcp, prompt de review…" value="${esc(query)}" autocomplete="off" enterkeyhint="search">
      <kbd class="kbd">/</kbd>
    </label>

    <div class="chips scroller">
      <a class="chip ${!kind ? "active" : ""}" href="#/snippets">Tout <small>${all.length}</small></a>
      ${SNIPPET_KINDS.filter((k) => counts[k.id]).map((k) => `<a class="chip ${kind === k.id ? "active" : ""}" href="#/snippets${kind === k.id ? "" : `?type=${k.id}`}">${k.label} <small>${counts[k.id]}</small></a>`).join("")}
    </div>

    <div class="code-list wide" id="sn-list">
      ${list.length ? list.map((s) => `
        <div class="snip ${s.pinned ? "pinned" : ""}">
          ${codeBlock(s.content, { lang: s.language, title: s.title, kind: s.kind, extra: `<button type="button" class="pin-btn ${s.pinned ? "on" : ""}" data-pin="${esc(s.reel.id)}:${esc(s.id)}" aria-label="${s.pinned ? "Désépingler" : "Épingler"}">${icon("pin", { size: 15 })}</button>` })}
          <a class="snip-src" href="#/fiche/${s.reel.id}">${esc(s.reel.emoji)} ${esc(s.reel.title)} ${icon("next", { size: 13 })}</a>
        </div>`).join("") : emptyState({
          emoji: query ? "🔎" : "⌨️",
          title: query ? "Aucun snippet trouvé" : "Pas encore de snippet",
          text: query ? "Essaie un autre mot." : "Les commandes et prompts des reels que tu importes arriveront ici.",
        })}
    </div>
  </section>`;
}

export function mount(root, params) {
  const input = root.querySelector("#sn-search");
  input.addEventListener("input", () => {
    query = input.value;
    const tmp = document.createElement("div");
    tmp.innerHTML = render(params);
    root.querySelector("#sn-list").replaceWith(tmp.querySelector("#sn-list"));
    bindPins(root);
  });
  bindPins(root);
}

function bindPins(root) {
  root.querySelectorAll("[data-pin]").forEach((b) =>
    b.addEventListener("click", () => {
      const [rid, sid] = b.dataset.pin.split(":");
      const r = getState().reels.find((x) => x.id === rid);
      if (!r) return;
      const snippets = r.snippets.map((s) => (s.id === sid ? { ...s, pinned: !s.pinned } : s));
      patchReel(rid, { snippets });
      toast(snippets.find((s) => s.id === sid)?.pinned ? "Épinglé 📌" : "Désépinglé");
    })
  );
}
