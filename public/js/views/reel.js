// Fiche d'un reel : l'essentiel, la mise en pratique, les snippets à copier, le prompt Claude Code.
import { getState, getReel, patchReel, removeReel, createReel, uuid, homeStatus, requestAnalysis } from "../store.js";
import { isWaiting } from "../fiche.js";
import {
  icon, esc, cover, platformBadge, categoryPill, codeBlock, copyButton, copyText, emptyState,
  openSheet, closeSheet, confirmSheet, toast, haptic, timeAgo, safeUrl,
} from "../ui.js";
import { STATUSES, resourceKindOf, PLATFORM_LABEL } from "../taxonomy.js";
import { reelToMarkdown } from "../markdown.js";
import { navigate } from "../router.js";
import { openImporter } from "./importer.js";
import { openShareToClaude } from "./share.js";

// Où en est l'analyse de l'import : en attente du PC, en cours, ou à compléter.
function analysisCard(r) {
  const a = r.analysis;
  const h = homeStatus();
  const input = r.input || {};
  const shots = input.shotIds?.length || 0;
  const recap = [
    input.url ? `<span>${icon("link", { size: 14 })}<span class="wait-url">${esc(input.url.replace(/^https?:\/\/(www\.)?/, "").replace(/\?.*$/, ""))}</span></span>` : "",
    input.text ? `<span>${icon("clipboard", { size: 14 })}légende ajoutée</span>` : "",
    shots ? `<span>${icon("image", { size: 14 })}${shots} capture${shots > 1 ? "s" : ""}</span>` : "",
    r.notes?.trim() ? `<span>${icon("edit", { size: 14 })}consignes lues</span>` : "",
  ].join("");
  if (a.state === "pending" || a.state === "running") {
    const running = a.state === "running";
    return `
    <div class="wait ${running ? "running" : ""}">
      <div class="wait-top">
        <span class="wait-ic">${running ? icon("terminal", { size: 22 }) : "🏠"}</span>
        <div>
          <strong>${running ? "Ton PC rédige la fiche…" : h.online ? "Ton PC va s'en occuper" : "Ada analysera ton tips une fois à la maison"}</strong>
          <small>${running ? (h.research ? "Claude lit le reel et vérifie tout sur le web (docs officielles, repos) — 1 à 3 minutes." : "Claude lit le reel, la légende et les captures — encore quelques secondes.") : h.online ? "Il est en ligne : la fiche arrive dans un instant." : h.known ? "Ton PC est éteint. Dès qu'il se rallume avec Ada, la fiche se remplit toute seule, partout." : "Aucun PC connecté pour l'instant : lance « npm run dev » sur ton PC et ouvre http://localhost:5174."}</small>
        </div>
      </div>
      ${recap ? `<div class="wait-input">${recap}</div>` : ""}
      ${running ? `<div class="wait-bar"><i></i></div>` : `<button class="link-btn" id="add-input">${icon("plus", { size: 15 })} Ajouter une légende ou une capture</button>`}
    </div>`;
  }
  if (a.state === "needs_input" || a.state === "error") {
    return `
    <div class="notice ${a.state === "error" ? "warn" : ""}">
      ${icon("alert", { size: 18 })}
      <div><strong>${a.state === "error" ? "L'analyse a échoué." : "Il manque la légende."}</strong> ${esc(a.error || "")}
        <div class="notice-actions">
          <button class="btn btn-primary btn-sm" id="add-input">${icon("plus", { size: 15 })} Ajouter la légende ou une capture</button>
          ${a.state === "error" ? `<button class="btn btn-ghost btn-sm" id="retry">${icon("refresh", { size: 15 })} Réessayer</button>` : ""}
        </div>
      </div>
    </div>`;
  }
  return "";
}

// Un même reel découpé en plusieurs fiches (« une fiche par skill ») : on montre les autres.
function groupStrip(r) {
  const gid = r.groupId;
  if (!gid) return "";
  const all = getState().reels.filter((x) => x.id === gid || x.groupId === gid).sort((x, y) => (x.groupIndex || 0) - (y.groupIndex || 0));
  if (all.length < 2) return "";
  return `
  <section class="group-strip">
    <span class="eyebrow">${icon("layers", { size: 14 })} Ce reel a donné ${all.length} fiches</span>
    <ol>${all.map((x, i) => `<li class="${x.id === r.id ? "current" : ""}">${x.id === r.id ? `<span class="gs-n">${i + 1}</span><strong>${esc(x.title)}</strong>` : `<a href="#/fiche/${x.id}"><span class="gs-n">${i + 1}</span><strong>${esc(x.title)}</strong></a>`}</li>`).join("")}</ol>
  </section>`;
}

export function render({ id }) {
  const r = getReel(id);
  if (!r) {
    return `<section class="page">${emptyState({ emoji: "🫥", title: "Fiche introuvable", text: "Elle a peut-être été supprimée, sur cet appareil ou un autre.", action: `<a class="btn btn-primary" href="#/biblio">Retour à la bibliothèque</a>` })}</section>`;
  }
  const done = r.steps.filter((s) => s.done).length;
  const pinnedFirst = [...r.snippets].sort((a, b) => Number(b.pinned) - Number(a.pinned));
  const waiting = isWaiting(r) || r.analysis.state === "needs_input" || (r.analysis.state === "error" && !r.summary);

  return `
  <article class="reel page">
    <div class="reel-hero">
      <div class="reel-hero-bg" style="${r.image ? `background-image:url('${esc(r.image)}')` : ""}"></div>
      ${cover(r, "reel-cover")}
      <div class="hero-bar">
        <button class="icon-btn glass" data-back="#/biblio" aria-label="Retour">${icon("back")}</button>
        <div class="hero-bar-right">
          <button class="icon-btn glass ${r.favorite ? "is-fav" : ""}" id="fav" aria-label="Favori">${icon("heart", { fill: r.favorite })}</button>
          <button class="icon-btn glass" id="more" aria-label="Plus d'actions">${icon("more")}</button>
        </div>
      </div>
    </div>

    <div class="reel-sheet">
      <div class="reel-cols">
        <div class="col-main">
          <div class="reel-intro">
            <div class="badges">${waiting ? "" : categoryPill(r.category, { link: true })}${platformBadge(r, { link: true })}</div>
            <h1 class="display sm">${esc(r.title)}</h1>
            ${r.summary ? `<p class="lead">${esc(r.summary)}</p>` : ""}
            ${waiting ? "" : `<div class="facts">
              <div class="fact">${icon("zap", { size: 18 })}<strong>${esc(r.level)}</strong><small>niveau</small></div>
              <div class="fact">${icon("clock", { size: 18 })}<strong>${r.minutesToTry ? `${r.minutesToTry} min` : "—"}</strong><small>pour tester</small></div>
              <div class="fact">${icon("code", { size: 18 })}<strong>${r.snippets.length}</strong><small>snippet${r.snippets.length > 1 ? "s" : ""}</small></div>
            </div>`}
            ${r.tags.length ? `<div class="tags">${r.tags.map((t) => `<a class="tag" href="#/biblio?tag=${encodeURIComponent(t)}">${esc(t)}</a>`).join("")}</div>` : ""}
          </div>

          ${analysisCard(r)}

          ${groupStrip(r)}

          ${waiting ? "" : `<div class="status-pick" role="radiogroup" aria-label="Statut">
            ${STATUSES.map((s) => `<button type="button" role="radio" aria-checked="${r.status === s.id}" class="s-${s.id} ${r.status === s.id ? "active" : ""}" data-status="${s.id}" title="${s.label}"><span>${s.emoji}</span>${s.short}</button>`).join("")}
          </div>`}

          ${r.partial && !waiting ? `
          <div class="notice">
            ${icon("alert", { size: 18 })}
            <div><strong>Fiche incomplète.</strong> ${esc(r.missing || "Le reel ne donnait pas tous les détails.")}
              <div class="notice-actions">
                <button class="btn btn-primary btn-sm" id="complete">${icon("image", { size: 15 })} Ajouter une capture</button>
                <button class="btn btn-ghost btn-sm" id="retry">${icon("search", { size: 15 })} Relancer la recherche</button>
              </div></div>
          </div>` : ""}

          ${r.tryIt ? `
          <div class="try">
            <span class="try-ic">${icon("target", { size: 22 })}</span>
            <div class="try-body">
              <span class="eyebrow">À essayer</span>
              <p>${esc(r.tryIt)}</p>
              ${r.status === "todo" ? `<button class="btn btn-primary btn-sm" data-status="doing">${icon("play", { size: 14 })} Je m'y mets</button>` : r.status === "doing" ? `<button class="btn btn-soft btn-sm" data-status="adopted">${icon("check", { size: 16 })} C'est adopté</button>` : ""}
            </div>
          </div>` : ""}

          ${r.keyPoints.length ? `
          <section class="block">
            <div class="block-head"><h2>L'essentiel</h2></div>
            <ul class="points">${r.keyPoints.map((p) => `<li>${icon("check", { size: 16 })}<span>${esc(p)}</span></li>`).join("")}</ul>
          </section>` : ""}

          ${r.steps.length ? `
          <section class="block">
            <div class="block-head"><h2>Mise en pratique</h2>${done ? `<span class="muted sm">${done}/${r.steps.length} fait${done > 1 ? "es" : "e"}</span>` : ""}</div>
            <ol class="steps">
              ${r.steps.map((s, i) => `
                <li class="step ${s.done ? "done" : ""}">
                  <button class="step-n" data-step="${i}" aria-label="Étape ${i + 1} faite">${s.done ? icon("check", { size: 16 }) : i + 1}</button>
                  <div class="step-body">
                    <p>${esc(s.text)}</p>
                    ${s.command ? `<div class="cmd"><code>${esc(s.command)}</code>${copyButton(s.command, { label: "Copier", cls: "sm" })}</div>` : ""}
                  </div>
                </li>`).join("")}
            </ol>
          </section>` : ""}

          ${pinnedFirst.length ? `
          <section class="block">
            <div class="block-head"><h2>Snippets</h2>${copyButton(pinnedFirst.map((s) => s.content).join("\n\n"), { label: "Tout copier", cls: "ghost" })}</div>
            <div class="code-list">
              ${pinnedFirst.map((s) => codeBlock(s.content, { lang: s.language, title: s.title, kind: s.kind, extra: `<button type="button" class="pin-btn ${s.pinned ? "on" : ""}" data-pin="${esc(s.id)}" aria-label="${s.pinned ? "Désépingler" : "Épingler"}">${icon("pin", { size: 15 })}</button>` })).join("")}
            </div>
          </section>` : ""}
        </div>

        <aside class="col-side">
          ${r.claudePrompt ? `
          <section class="cc-card">
            <div class="term-bar"><i></i><i></i><i></i><span>claude</span></div>
            <div class="cc-in">
              <h2>${icon("terminal", { size: 18 })} Appliquer avec Claude Code</h2>
              <pre class="cc-prompt"><span class="prompt-sign">&gt;</span> ${esc(r.claudePrompt)}</pre>
              ${copyButton(r.claudePrompt, { label: "Copier le prompt", cls: "btn-like", toastMsg: "Colle-le dans Claude Code, à la racine de ton projet" })}
            </div>
          </section>` : ""}

          ${r.caution ? `<div class="notice warn">${icon("alert", { size: 18 })}<div><strong>À savoir.</strong> ${esc(r.caution)}</div></div>` : ""}

          ${r.resources.length ? `
          <section class="block">
            <div class="block-head"><h2>Outils & liens</h2></div>
            <ul class="res-list">
              ${r.resources.map((x) => {
                const url = safeUrl(x.url);
                const inner = `<span class="res-ic">${icon(resourceKindOf(x.kind).icon, { size: 18 })}</span><span class="res-text"><strong>${esc(x.name)}</strong><small>${esc(resourceKindOf(x.kind).one)}${x.note ? ` · ${esc(x.note)}` : ""}</small></span>${url ? icon("external", { size: 16, cls: "res-go" }) : ""}`;
                return `<li>${url ? `<a class="res" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="res">${inner}</div>`}</li>`;
              }).join("")}
            </ul>
          </section>` : ""}

          ${r.research.summary || r.research.sources.length ? `
          <section class="block">
            <div class="block-head"><h2>Vérifié sur le web</h2></div>
            <div class="research">
              ${r.research.summary ? `<p>${icon("search", { size: 16 })}<span>${esc(r.research.summary)}</span></p>` : ""}
              ${r.research.sources.length ? `<ul>${r.research.sources.map((x) => `<li><a href="${esc(safeUrl(x.url))}" target="_blank" rel="noopener">${esc(x.title || x.url.replace(/^https?:\/\/(www\.)?/, ""))}<small>${esc(x.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])}</small></a></li>`).join("")}</ul>` : ""}
            </div>
          </section>` : ""}

          <section class="block">
            <div class="block-head"><h2>Mes notes</h2><span class="muted sm" id="notes-state"></span></div>
            <textarea id="notes" class="notes" rows="4" placeholder="Tes remarques, ou des consignes pour Ada (« fais une fiche par skill », « détaille l'install Windows »…) : elles sont lues à chaque analyse.">${esc(r.notes)}</textarea>
          </section>

          ${r.caption ? `
          <details class="caption">
            <summary>${icon("clipboard", { size: 16 })} Légende d'origine${r.author ? ` · ${esc(r.author)}` : ""}</summary>
            <p>${esc(r.caption)}</p>
          </details>` : ""}

          <div class="reel-actions">
            ${waiting ? "" : `<button class="btn btn-primary cc-send" id="cc">${icon("terminal", { size: 17 })} Envoyer à Claude Code</button>`}
            <button class="btn btn-ghost" id="md">${icon("copy", { size: 17 })} Copier en Markdown</button>
            <a class="btn btn-ghost" href="#/modifier/${r.id}">${icon("edit", { size: 17 })} Modifier</a>
          </div>
          <p class="reel-foot muted sm">Ajoutée ${timeAgo(r.createdAt)}${r.engine && r.engine !== "manuel" ? ` · ${r.engine === "cli" ? "Claude Code" : r.engine === "api" ? "Claude" : "analyse locale"}${r.model ? ` (${esc(r.model)})` : ""}` : ""}${r.example ? " · exemple" : ""}</p>
        </aside>
      </div>
    </div>
  </article>`;
}

function setStatus(r, id) {
  if (r.status === id) return;
  haptic(12);
  patchReel(r.id, { status: id });
  if (id === "adopted") toast("Adoptée ✅ — elle fait partie de ton workflow");
}

function moreSheet(r) {
  const url = safeUrl(r.sourceUrl);
  openSheet(
    `<div class="sheet-body">
      <h2 class="sheet-title">${esc(r.emoji)} ${esc(r.title)}</h2>
      <div class="menu">
        ${url ? `<a class="menu-item" href="${esc(url)}" target="_blank" rel="noopener">${icon("external")}<span>Ouvrir sur ${esc(PLATFORM_LABEL[r.platform] || "le site")}</span></a>` : ""}
        <button class="menu-item" data-act="cc">${icon("terminal")}<span>Envoyer à Claude Code</span></button>
        <button class="menu-item" data-act="md">${icon("copy")}<span>Copier en Markdown</span></button>
        ${navigator.share ? `<button class="menu-item" data-act="share">${icon("share")}<span>Partager</span></button>` : ""}
        ${r.sourceUrl || r.caption || r.input?.url ? `<button class="menu-item" data-act="redo">${icon("refresh")}<span>Refaire la fiche (légende ou captures en plus)</span></button>` : ""}
        <button class="menu-item" data-act="dup">${icon("layers")}<span>Dupliquer</span></button>
        <a class="menu-item" href="#/modifier/${r.id}" data-act="edit">${icon("edit")}<span>Modifier</span></a>
        <button class="menu-item danger" data-act="del">${icon("trash")}<span>Supprimer</span></button>
      </div>
    </div>`,
    {
      onMount: (s) => {
        s.addEventListener("click", async (e) => {
          const act = e.target.closest("[data-act]")?.dataset.act;
          if (!act) return;
          e.preventDefault();
          if (act === "md") { closeSheet(); copyMarkdown(r); }
          if (act === "cc") { closeSheet(true); openShareToClaude(r); }
          if (act === "share") { closeSheet(); navigator.share({ title: r.title, text: reelToMarkdown(r), url: url || undefined }).catch(() => {}); }
          if (act === "redo") { closeSheet(true); openImporter({ reanalyse: r.id }); }
          if (act === "edit") { closeSheet(true); navigate(`#/modifier/${r.id}`); }
          if (act === "dup") {
            closeSheet(true);
            const { id, createdAt, updatedAt, statusChangedAt, ...rest } = r;
            const copy = createReel({ ...rest, id: uuid(), title: `${r.title} (copie)`, example: false, status: "todo" });
            navigate(`#/fiche/${copy.id}`);
          }
          if (act === "del") {
            closeSheet(true);
            if (!(await confirmSheet({ title: "Supprimer la fiche ?", text: `« ${esc(r.title)} » disparaîtra de tous tes appareils.`, confirm: "Supprimer", danger: true }))) return;
            const removed = removeReel(r.id);
            navigate("#/biblio", { replace: true });
            toast("Fiche supprimée", { action: "Annuler", onAction: () => { createReel(removed); navigate(`#/fiche/${removed.id}`); }, timeout: 5000 });
          }
        });
      },
    }
  );
}

async function copyMarkdown(r) {
  const ok = await copyText(reelToMarkdown(r));
  toast(ok ? "Fiche copiée en Markdown 📋" : "Copie impossible sur ce navigateur.");
}

export function mount(root, { id }) {
  const r = getReel(id);
  if (!r) return;
  root.querySelector("#fav").addEventListener("click", () => { haptic(10); patchReel(id, { favorite: !r.favorite }); });
  root.querySelector("#more").addEventListener("click", () => moreSheet(r));
  root.querySelector("#md").addEventListener("click", () => copyMarkdown(r));
  root.querySelector("#cc")?.addEventListener("click", () => openShareToClaude(r));
  root.querySelector("#complete")?.addEventListener("click", () => openImporter({ reanalyse: id }));
  root.querySelector("#add-input")?.addEventListener("click", () => openImporter({ reanalyse: id }));
  root.querySelector("#retry")?.addEventListener("click", () => { requestAnalysis(id); toast(homeStatus().online ? "C'est reparti 🧠" : "Ada réessaiera une fois à la maison 🏠"); });
  root.querySelectorAll("[data-status]").forEach((b) => b.addEventListener("click", () => setStatus(r, b.dataset.status)));
  root.querySelectorAll("[data-step]").forEach((b) =>
    b.addEventListener("click", () => {
      haptic(8);
      const steps = r.steps.map((s, i) => (i === Number(b.dataset.step) ? { ...s, done: !s.done } : s));
      patchReel(id, { steps });
      if (steps.every((s) => s.done) && r.status === "todo") patchReel(id, { status: "doing" });
    })
  );
  root.querySelectorAll("[data-pin]").forEach((b) =>
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      const snippets = r.snippets.map((s) => (s.id === b.dataset.pin ? { ...s, pinned: !s.pinned } : s));
      patchReel(id, { snippets });
      toast(snippets.find((s) => s.id === b.dataset.pin).pinned ? "Épinglé en haut de tes snippets 📌" : "Désépinglé");
    })
  );

  // Notes : enregistrées en silence pendant la frappe (la vue n'est pas redessinée).
  const notes = root.querySelector("#notes");
  const state = root.querySelector("#notes-state");
  const grow = () => { notes.style.height = "auto"; notes.style.height = `${Math.max(110, notes.scrollHeight + 2)}px`; };
  grow();
  let t;
  notes.addEventListener("input", () => {
    grow();
    state.textContent = "…";
    clearTimeout(t);
    t = setTimeout(() => { patchReel(id, { notes: notes.value }, { silent: true }); state.textContent = "Enregistré"; }, 500);
  });
}
