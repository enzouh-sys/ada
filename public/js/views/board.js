// Le labo : chaque astuce avance de « À tester » à « Adoptée ». Glisser-déposer sur ordinateur,
// bouton de déplacement sur téléphone.
import { getState, getReel, patchReel } from "../store.js";
import { icon, esc, openSheet, closeSheet, haptic, toast, categoryPill, coverStyle, plural } from "../ui.js";
import { STATUSES, statusOf } from "../taxonomy.js";

const WEEK = 7 * 86400_000;

function card(r) {
  const done = r.steps.filter((s) => s.done).length;
  return `
  <div class="bcard" draggable="true" data-id="${r.id}">
    <a class="bcard-main" href="#/fiche/${r.id}">
      <span class="bcard-thumb" style="${coverStyle(r)}">${r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" onerror="this.remove()">` : ""}<span>${esc(r.emoji)}</span></span>
      <span class="bcard-text">
        <strong>${esc(r.title)}</strong>
        <small>${categoryPill(r.category, { cls: "xs" })}${r.minutesToTry ? `<span class="bcard-min">${icon("clock", { size: 12 })}${r.minutesToTry} min</span>` : ""}${r.steps.length ? `<span class="bcard-min">${icon("check", { size: 12 })}${done}/${r.steps.length}</span>` : ""}</small>
      </span>
    </a>
    <button class="bcard-move" data-move="${r.id}" aria-label="Déplacer">${icon("arrowRight", { size: 16 })}</button>
  </div>`;
}

export function render() {
  const { reels } = getState();
  const adopted = reels.filter((r) => r.status === "adopted").length;
  const decided = reels.filter((r) => r.status === "adopted" || r.status === "skipped").length;
  const pct = reels.length ? Math.round((decided / reels.length) * 100) : 0;
  const thisWeek = reels.filter((r) => r.status === "adopted" && Date.now() - r.statusChangedAt < WEEK).length;

  return `
  <section class="page board">
    <header class="page-head">
      <div>
        <p class="eyebrow">${thisWeek ? `${plural(thisWeek, "astuce")} adoptée${thisWeek > 1 ? "s" : ""} cette semaine 🎉` : "Teste, garde, oublie"}</p>
        <h1 class="display sm">Le labo</h1>
      </div>
      <div class="ring big" style="--p:${pct}" title="${pct} % des fiches triées"><span>${adopted}<small>adoptée${adopted > 1 ? "s" : ""}</small></span></div>
    </header>

    <div class="columns scroller" id="columns">
      ${STATUSES.map((s) => {
        const list = reels.filter((r) => r.status === s.id).sort((a, b) => b.statusChangedAt - a.statusChangedAt);
        return `
        <div class="column s-${s.id}" data-col="${s.id}">
          <div class="column-head"><span>${s.emoji} ${s.label}</span><b>${list.length}</b></div>
          <div class="column-body">
            ${list.map(card).join("") || `<p class="column-empty">${s.id === "todo" ? "Importe un reel pour commencer." : "Glisse une fiche ici."}</p>`}
          </div>
        </div>`;
      }).join("")}
    </div>
  </section>`;
}

function moveSheet(r) {
  openSheet(
    `<div class="sheet-body">
      <h2 class="sheet-title">Déplacer</h2>
      <p class="muted sm">${esc(r.emoji)} ${esc(r.title)}</p>
      <div class="menu">
        ${STATUSES.map((s) => `<button class="menu-item ${s.id === r.status ? "current" : ""}" data-to="${s.id}"><span class="menu-emoji">${s.emoji}</span><span>${s.label}</span>${s.id === r.status ? icon("check", { size: 18 }) : ""}</button>`).join("")}
      </div>
    </div>`,
    {
      onMount: (sheet) =>
        sheet.querySelectorAll("[data-to]").forEach((b) =>
          b.addEventListener("click", () => {
            closeSheet();
            move(r.id, b.dataset.to);
          })
        ),
    }
  );
}

function move(id, to) {
  const r = getReel(id);
  if (!r || r.status === to) return;
  haptic(12);
  patchReel(id, { status: to });
  toast(`${statusOf(to).emoji} ${esc(r.title)} → ${statusOf(to).label}`);
}

export function mount(root) {
  root.querySelectorAll("[data-move]").forEach((b) => b.addEventListener("click", () => moveSheet(getReel(b.dataset.move))));

  // Glisser-déposer (souris).
  let dragId = null;
  root.querySelectorAll(".bcard").forEach((el) => {
    el.addEventListener("dragstart", (e) => {
      dragId = el.dataset.id;
      el.classList.add("dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", dragId);
    });
    el.addEventListener("dragend", () => { el.classList.remove("dragging"); root.querySelectorAll(".column").forEach((c) => c.classList.remove("over")); });
  });
  root.querySelectorAll(".column").forEach((col) => {
    col.addEventListener("dragover", (e) => { if (!dragId) return; e.preventDefault(); col.classList.add("over"); });
    col.addEventListener("dragleave", (e) => { if (!col.contains(e.relatedTarget)) col.classList.remove("over"); });
    col.addEventListener("drop", (e) => {
      e.preventDefault();
      col.classList.remove("over");
      if (dragId) move(dragId, col.dataset.col);
      dragId = null;
    });
  });
}
