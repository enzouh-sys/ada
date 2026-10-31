// Import : lien de reel (Instagram, TikTok, YouTube, GitHub, article) + légende + captures.
// L'import est enregistré tout de suite, de n'importe où ; le PC de la maison en fait la fiche.
import { getState, getReel, queueImport, requestAnalysis, homeStatus } from "../store.js";
import { icon, platformGlyph, esc, openSheet, closeSheet, toast, haptic, resizeImage } from "../ui.js";
import { navigate } from "../router.js";
import { detectPlatform, canonicalUrl } from "../taxonomy.js";

const MAX_SHOTS = 5;
// Une capture voyage dans un document Firestore (1 Mo max) : on la garde sous ~700 Ko.
const MAX_SHOT_CHARS = 900_000;

/** Ce qui va se passer après l'import, selon l'état du PC de la maison. */
export function homeHint() {
  const h = homeStatus();
  if (h.online) return { dot: h.engine || "cli", text: h.research ? "Ton PC est en ligne : il analyse et vérifie tout sur le web, fiche prête dans 1 à 3 min." : `Ton PC est en ligne : fiche prête dans ~30 s (${{ api: "API Claude", command: "ton IA" }[h.engine] || "Claude Code"}).` };
  if (h.known) return { dot: "off", text: "Ton PC est éteint : Ada analysera ton tips une fois à la maison 🏠" };
  return { dot: "off", text: "Aucun PC connecté : lance « npm run dev » sur ton PC et ouvre http://localhost:5174 une fois." };
}

const findDuplicate = (url) => {
  const key = canonicalUrl(url);
  return key ? getState().reels.find((r) => r.sourceUrl && canonicalUrl(r.sourceUrl) === key) : null;
};

async function shrink(file) {
  let out = await resizeImage(file, 1400, 0.82);
  if (out.length > MAX_SHOT_CHARS) out = await resizeImage(out, 1100, 0.7);
  return out.length <= MAX_SHOT_CHARS ? out : null;
}

/**
 * @param {{ url?, text?, mode?: "lien"|"texte", auto?, reanalyse?: string }} opts
 * reanalyse : id d'une fiche existante à refaire (avec une légende ou des captures en plus).
 */
export function openImporter({ url = "", text = "", mode = "lien", auto = false, reanalyse = null } = {}) {
  const target = reanalyse ? getReel(reanalyse) : null;
  if (target) {
    url = url || target.input.url || target.sourceUrl;
    text = text || target.input.text || target.caption;
    mode = url ? "lien" : "texte";
  }
  const hint = homeHint();
  const shots = [];

  const sheet = openSheet(
    `<div class="importer">
      <header class="sheet-header">
        <h2 class="sheet-title">${target ? "Refaire la fiche" : "Importer un reel"}</h2>
        <button class="icon-btn sm" data-close-sheet aria-label="Fermer">${icon("x", { size: 18 })}</button>
      </header>

      <div class="seg" role="tablist">
        <button type="button" data-mode="lien" class="${mode === "lien" ? "active" : ""}">${icon("link", { size: 16 })} Lien</button>
        <button type="button" data-mode="texte" class="${mode === "texte" ? "active" : ""}">${icon("clipboard", { size: 16 })} Texte</button>
        ${target ? "" : `<button type="button" data-mode="ecrire">${icon("edit", { size: 16 })} Écrire</button>`}
      </div>

      <form class="imp-form" id="imp-form">
        <div class="imp-panel" data-panel="lien" ${mode === "lien" ? "" : "hidden"}>
          <label class="big-field">
            <span class="big-field-ic" id="imp-platform">${icon("link", { size: 20 })}</span>
            <input id="imp-url" type="url" inputmode="url" placeholder="https://www.instagram.com/reel/…" value="${esc(url)}" autocomplete="off" enterkeyhint="go">
          </label>
          <div class="sources">
            <span>${platformGlyph("instagram")} Instagram</span><span>${platformGlyph("tiktok")} TikTok</span><span>${platformGlyph("youtube")} YouTube</span><span>${platformGlyph("facebook")} Facebook</span><span>${platformGlyph("github")} GitHub</span><span>${icon("globe", { size: 14 })} Articles</span>
          </div>
          <div class="imp-dup" id="imp-dup" hidden></div>
          <details class="caption-box" id="imp-caption-box" ${text || target?.analysis.state === "needs_input" ? "open" : ""}>
            <summary>${icon("plus", { size: 15 })}<span class="caption-label">Ajouter la légende du reel<small>Conseillé pour Instagram · « … plus » puis copier</small></span></summary>
            <textarea id="imp-caption" rows="5" placeholder="Colle ici la légende ou la description…">${esc(mode === "lien" ? text : "")}</textarea>
          </details>
        </div>

        <div class="imp-panel" data-panel="texte" ${mode === "texte" ? "" : "hidden"}>
          <textarea id="imp-text" class="big-textarea" rows="8" placeholder="Colle une légende, un thread, une note, un prompt…">${esc(mode === "texte" ? text : "")}</textarea>
        </div>

        <details class="caption-box" id="imp-notes-box" ${target?.notes ? "open" : ""}>
          <summary>${icon("edit", { size: 15 })}<span class="caption-label">Consignes pour Ada<small>Lues avant l'analyse · ex. « fais une fiche par skill »</small></span></summary>
          <textarea id="imp-notes" rows="3" placeholder="Ce que tu veux qu'Ada fasse de ce reel…">${esc(target?.notes || "")}</textarea>
        </details>

        <div class="shots">
          <div class="shots-head">
            <span>${icon("image", { size: 16 })} Captures du reel <small>le code ou les commandes affichés à l'écran</small></span>
          </div>
          <div class="shots-row" id="imp-shots">
            <label class="shot-add" id="imp-shot-add">
              <input type="file" accept="image/*" multiple hidden id="imp-file">
              ${icon("plus", { size: 20 })}<span>Ajouter</span>
            </label>
          </div>
          <p class="shots-hint">Astuce : mets la vidéo en pause sur l'écran qui montre le code, fais une capture, ajoute-la ici${matchMedia("(pointer: fine)").matches ? " (ou colle-la avec Ctrl+V)" : ""}.</p>
        </div>

        <div class="imp-alert" id="imp-alert" hidden></div>

        <button class="btn btn-primary btn-lg btn-block" type="submit" id="imp-go">${icon("sparkles", { size: 18 })} <span>${target ? "Refaire la fiche" : "Envoyer à Ada"}</span></button>
        <p class="imp-foot"><span class="engine-dot e-${hint.dot}"></span>${esc(hint.text)}</p>
      </form>
    </div>`,
    { full: true }
  );

  const $ = (s) => sheet.querySelector(s);
  let currentMode = mode;

  // ——— Lien : plateforme et doublons ———
  const showPlatform = () => {
    const u = $("#imp-url").value.trim();
    const p = detectPlatform(u);
    $("#imp-platform").innerHTML = p ? platformGlyph(p, 20) : icon("link", { size: 20 });
    $("#imp-platform").dataset.p = p || "";
    const dup = !target && u && findDuplicate(u);
    $("#imp-dup").hidden = !dup;
    if (dup) $("#imp-dup").innerHTML = `${icon("layers", { size: 16 })}<span>Déjà dans ta base : <a href="#/fiche/${dup.id}">${esc(dup.title)}</a></span>`;
  };
  $("#imp-url").addEventListener("input", showPlatform);
  // Texte partagé autour du lien (« Regarde cette vidéo… https://… ») : le lien dans le champ, le reste en légende.
  $("#imp-url").addEventListener("paste", (e) => {
    const text = (e.clipboardData?.getData("text") || "").trim();
    const link = text.match(/https?:\/\/\S+/)?.[0];
    if (!link || link === text) return;
    e.preventDefault();
    $("#imp-url").value = link;
    const rest = text.replace(link, "").trim();
    if (rest && !$("#imp-caption").value.trim()) { $("#imp-caption").value = rest; $("#imp-caption-box").open = true; }
    showPlatform();
  });
  showPlatform();
  // Un lien vers une fiche ferme la feuille puis navigue (sans laisser d'entrée d'historique fantôme).
  sheet.addEventListener("click", (e) => {
    const a = e.target.closest('a[href^="#/fiche/"]');
    if (!a) return;
    e.preventDefault();
    closeSheet(true);
    navigate(a.getAttribute("href"));
  });

  sheet.querySelectorAll("[data-mode]").forEach((b) =>
    b.addEventListener("click", () => {
      if (b.dataset.mode === "ecrire") { closeSheet(true); return navigate("#/nouvelle"); }
      currentMode = b.dataset.mode;
      sheet.querySelectorAll("[data-mode]").forEach((x) => x.classList.toggle("active", x === b));
      sheet.querySelectorAll("[data-panel]").forEach((p) => (p.hidden = p.dataset.panel !== currentMode));
      hideAlert();
      (currentMode === "lien" ? $("#imp-url") : $("#imp-text")).focus();
    })
  );

  // ——— Captures ———
  function paintShots() {
    $("#imp-shots").querySelectorAll(".shot").forEach((el) => el.remove());
    shots.forEach((src, i) => {
      const el = document.createElement("div");
      el.className = "shot";
      el.innerHTML = `<img src="${src}" alt=""><button type="button" aria-label="Retirer">${icon("x", { size: 14 })}</button>`;
      el.querySelector("button").onclick = () => { shots.splice(i, 1); paintShots(); };
      $("#imp-shot-add").before(el);
    });
    $("#imp-shot-add").hidden = shots.length >= MAX_SHOTS;
  }
  async function addFiles(files) {
    for (const f of [...files].filter((f) => f.type.startsWith("image/")).slice(0, MAX_SHOTS - shots.length)) {
      const small = await shrink(f).catch(() => null);
      if (small) shots.push(small);
      else toast("Cette image est trop lourde, essaie une capture plus petite.");
    }
    paintShots();
  }
  $("#imp-file").addEventListener("change", (e) => addFiles(e.target.files));
  sheet.addEventListener("paste", (e) => {
    const files = [...(e.clipboardData?.files || [])];
    if (files.length) { e.preventDefault(); addFiles(files); }
  });

  function alert(msg, kind = "error") {
    const el = $("#imp-alert");
    el.className = `imp-alert ${kind}`;
    el.innerHTML = `${icon(kind === "error" ? "alert" : "bulb", { size: 16 })}<span>${msg}</span>`;
    el.hidden = false;
  }
  function hideAlert() { $("#imp-alert").hidden = true; }

  function run({ force = false } = {}) {
    hideAlert();
    const linkMode = currentMode === "lien";
    const u = linkMode ? $("#imp-url").value.trim() : "";
    const t = linkMode ? $("#imp-caption").value.trim() : $("#imp-text").value.trim();
    if (linkMode && !u && !shots.length) return alert("Colle le lien d'un reel, ou ajoute au moins une capture.");
    if (linkMode && u && !detectPlatform(u)) return alert("Ce lien n'a pas l'air valide.");
    if (!linkMode && t.length < 15 && !shots.length) return alert("Colle un peu plus de texte (ou ajoute une capture).");
    const dup = !target && u && findDuplicate(u);
    if (dup && !force) {
      alert(`Ce reel est déjà dans ta base. <a href="#/fiche/${dup.id}">Ouvrir la fiche</a> · <button type="button" class="link-btn" data-dup-force>L'importer quand même</button>`, "info");
      $("[data-dup-force]").onclick = () => run({ force: true });
      return;
    }

    closeSheet(true);
    haptic(20);
    const online = homeStatus().online;
    if (target) {
      requestAnalysis(target.id, { url: u, text: t, shots: [...shots], notes: $("#imp-notes").value });
      navigate(`#/fiche/${target.id}`, { replace: true });
    } else {
      const reel = queueImport({ url: u, text: t, shots: [...shots], notes: $("#imp-notes").value.trim() });
      navigate(`#/fiche/${reel.id}`);
    }
    toast(online ? "Envoyé ! Ton PC prépare la fiche 🧠" : "Envoyé ! Ada analysera ton tips une fois à la maison 🏠", { timeout: 4200 });
  }

  $("#imp-form").addEventListener("submit", (e) => { e.preventDefault(); run(); });
  if (auto && (url || text)) run();
  else requestAnimationFrame(() => (currentMode === "lien" ? $("#imp-url") : $("#imp-text"))?.focus({ preventScroll: true }));
}
