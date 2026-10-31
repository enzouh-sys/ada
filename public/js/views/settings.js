// Réglages : compte, PC de la maison, Ada sur le téléphone, exports.
import { getState, homeStatus, refreshLocal, deleteExamples, restoreBackup } from "../store.js";
import { signOut } from "../cloud.js";
import { icon, esc, openSheet, closeSheet, confirmSheet, toast, copyButton, plural, timeAgo, qrSlot, fillQrCodes } from "../ui.js";
import { isIos, isMobile } from "../install.js";
import { libraryToMarkdown } from "../markdown.js";
import { APP_URL } from "../config.js";

function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: name });
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
const day = () => new Date().toISOString().slice(0, 10);
const engineName = (e) => ({ cli: "Claude Code", api: "l'API Claude", command: "ton IA (ADA_COMMAND)" })[e] || "l'analyse sans IA";

function homeBlock() {
  const h = homeStatus();
  const { local, reels } = getState();
  const waiting = reels.filter((r) => r.analysis.state === "pending").length;
  const thisPc = local?.paired
    ? `<div class="engine-card"><span class="engine-dot big e-${local.engine}"></span><div><strong>Ce PC analyse tes imports</strong>
        <small>Avec ${engineName(local.engine)}${local.model ? ` (${esc(local.model)})` : ""} · compte ${esc(local.paired.email)}${local.worker?.lastError ? ` · ⚠️ ${esc(local.worker.lastError)}` : ""}</small></div></div>
       <button class="btn btn-ghost btn-sm danger-text" id="unpair">${icon("x", { size: 15 })} Ne plus analyser sur ce PC</button>`
    : local
      ? `<p class="set-hint">Ce PC fait tourner Ada : il va se connecter à ton compte pour analyser tes imports…</p>`
      : "";
  return `
    <section class="set-block">
      <h3>${icon("terminal", { size: 18 })} Le PC de la maison</h3>
      <div class="engine-card">
        <span class="engine-dot big e-${h.online ? h.engine || "cli" : "off"}"></span>
        <div><strong>${h.known ? `${esc(h.name || "Ton PC")} · ${h.online ? "en ligne" : "hors ligne"}` : "Aucun PC connecté"}</strong>
        <small>${h.known
          ? h.online ? `Analyse avec ${engineName(h.engine)}${h.model ? ` (${esc(h.model)})` : ""}${h.research ? " + recherche web" : ""} · ${plural(h.processed || 0, "fiche")} faite${(h.processed || 0) > 1 ? "s" : ""} depuis son démarrage` : `Vu ${timeAgo(h.lastSeen)}. ${waiting ? `${plural(waiting, "import")} attend${waiting > 1 ? "ent" : ""} son retour.` : "Rien en attente."}`
          : "Sur ton PC : <code>cd ada</code> puis <code>npm run dev</code>, ouvre http://localhost:5174 et connecte-toi. C'est tout."}</small></div>
      </div>
      ${thisPc}
      <p class="set-hint">Ton PC utilise ton Claude Code (ton abonnement, sans clé API). Pour une clé API ou un autre modèle : <code>ADA_ENGINE</code> et <code>ADA_MODEL</code> dans <code>ada/.env</code>.</p>
    </section>`;
}

export function openSettings() {
  const { reels, user } = getState();
  const examples = reels.filter((r) => r.example).length;
  const adopted = reels.filter((r) => r.status === "adopted" && r.analysis.state === "done").length;
  const shortcutUrl = `${APP_URL}/?url=`;
  const onPhone = isMobile();

  openSheet(
    `<div class="settings">
      <header class="sheet-header">
        <h2 class="sheet-title">Réglages</h2>
        <button class="icon-btn sm" data-close-sheet aria-label="Fermer">${icon("x", { size: 18 })}</button>
      </header>

      <section class="set-block">
        <div class="account">
          ${user?.photo ? `<img class="avatar" src="${esc(user.photo)}" alt="" width="44" height="44" referrerpolicy="no-referrer">` : `<span class="avatar">${esc((user?.name || "?")[0])}</span>`}
          <div><strong>${esc(user?.name || "")}</strong><small>${esc(user?.email || "")} · ${plural(reels.length, "fiche")}</small></div>
          <button class="btn btn-ghost btn-sm" id="signout">Se déconnecter</button>
        </div>
      </section>

      <div id="home-block">${homeBlock()}</div>

      <section class="set-block">
        <h3>${icon("phone", { size: 18 })} Ada sur ton téléphone</h3>
        <div class="phone-row">
          ${onPhone ? "" : qrSlot(APP_URL, 120)}
          <div>
            <div class="url-row"><code>${esc(APP_URL)}</code>${copyButton(APP_URL, { label: "Copier", cls: "sm" })}</div>
            <p class="set-hint">Ouvre-la, connecte-toi avec Google, puis installe-la sur l'écran d'accueil. Tes imports partent de partout ; ton PC les analyse à la maison.</p>
          </div>
        </div>
        <details class="howto" ${onPhone && isIos() ? "open" : ""}>
          <summary>iPhone — partager depuis Instagram, TikTok, YouTube…</summary>
          <ol>
            <li>Dans Safari, ouvre Ada → ${icon("share", { size: 14 })} → <b>« Sur l'écran d'accueil »</b>.</li>
            <li>Pour le menu Partager d'Instagram : app <b>Raccourcis</b> → <b>+</b> → ⓘ → active <b>« Afficher dans la feuille de partage »</b> (URL et texte).</li>
            <li>Action <b>« Ouvrir les URL »</b> avec cette adresse suivie de la variable <b>Entrée du raccourci</b> :
              <div class="url-row"><code>${esc(shortcutUrl)}</code>${copyButton(shortcutUrl, { label: "Copier", cls: "sm" })}</div></li>
            <li>Nomme-le « Ada ». Dans Instagram, TikTok, YouTube ou Facebook : <b>Partager → Ada</b>, c'est envoyé sans copier le lien.</li>
          </ol>
        </details>
        <details class="howto" ${onPhone && !isIos() ? "open" : ""}>
          <summary>Android — partager depuis Instagram, TikTok, YouTube…</summary>
          <ol>
            <li>Dans Chrome, ouvre Ada → menu ⋮ → <b>« Installer l'application »</b>.</li>
            <li>Dans Instagram, TikTok, YouTube ou Facebook : <b>Partager → Ada</b>. C'est envoyé tout de suite, sans copier le lien.</li>
          </ol>
        </details>
      </section>

      <section class="set-block">
        <h3>${icon("download", { size: 18 })} Exporter</h3>
        <div class="set-actions">
          <button class="btn btn-ghost" data-export="all">${icon("book", { size: 17 })} Toute la base en Markdown</button>
          <button class="btn btn-ghost" data-export="adopted" ${adopted ? "" : "disabled"}>${icon("check", { size: 17 })} Mes ${plural(adopted, "astuce adoptée", "astuces adoptées")}</button>
          <button class="btn btn-ghost" data-export="json">${icon("layers", { size: 17 })} Sauvegarde complète (.json)</button>
          <label class="btn btn-ghost">${icon("upload", { size: 17 })} Restaurer une sauvegarde<input type="file" accept="application/json,.json" hidden id="restore"></label>
        </div>
        <p class="set-hint">Le Markdown se lit très bien par Claude Code : sur ton PC, <code>npm run export</code> l'écrit dans <code>ada/export/</code>, à référencer avec <code>@</code> dans une session ou depuis ton <code>CLAUDE.md</code>.</p>
      </section>

      ${examples ? `
      <section class="set-block">
        <h3>${icon("sparkles", { size: 18 })} Fiches d'exemple</h3>
        <button class="btn btn-ghost danger-text" id="del-examples">${icon("trash", { size: 17 })} Supprimer les ${plural(examples, "exemple")}</button>
      </section>` : ""}

      <p class="set-foot muted sm">Ada · base privée, réservée à ton compte</p>
    </div>`,
    {
      full: true,
      onMount: (sheet) => {
        fillQrCodes(sheet);
        // L'état du PC de ce poste (s'il tourne) : rafraîchi à l'ouverture.
        refreshLocal().then(() => {
          const host = sheet.querySelector("#home-block");
          if (host) { host.innerHTML = homeBlock(); bindUnpair(); }
        });
        const bindUnpair = () => sheet.querySelector("#unpair")?.addEventListener("click", async () => {
          await fetch("/api/unpair", { method: "POST" }).catch(() => {});
          await refreshLocal();
          sheet.querySelector("#home-block").innerHTML = homeBlock();
          toast("Ce PC n'analyse plus tes imports.");
        });
        bindUnpair();
        sheet.querySelector("#signout").addEventListener("click", async () => {
          closeSheet(true);
          await signOut();
        });
        sheet.querySelectorAll("[data-export]").forEach((b) =>
          b.addEventListener("click", () => {
            const list = getState().reels;
            if (b.dataset.export === "all") download(`ada-tout-${day()}.md`, libraryToMarkdown(list), "text/markdown");
            if (b.dataset.export === "adopted") download(`ada-adoptees-${day()}.md`, libraryToMarkdown(list.filter((r) => r.status === "adopted"), { title: "Ada — mes astuces adoptées" }), "text/markdown");
            if (b.dataset.export === "json") download(`ada-sauvegarde-${day()}.json`, JSON.stringify({ app: "ada", version: 2, exportedAt: new Date().toISOString(), reels: list }), "application/json");
          })
        );
        sheet.querySelector("#del-examples")?.addEventListener("click", async () => {
          closeSheet(true);
          if (!(await confirmSheet({ title: "Supprimer les exemples ?", text: "Seules les fiches d'exemple d'Ada sont supprimées. Les tiennes restent.", confirm: "Supprimer", danger: true }))) return;
          toast(plural(deleteExamples(), "exemple supprimé", "exemples supprimés"));
        });
        sheet.querySelector("#restore").addEventListener("change", async (e) => {
          const file = e.target.files[0];
          if (!file) return;
          try {
            const { added, replaced } = restoreBackup(JSON.parse(await file.text()));
            closeSheet();
            toast(`Sauvegarde restaurée : ${added} ajoutée${added > 1 ? "s" : ""}, ${replaced} mise${replaced > 1 ? "s" : ""} à jour`);
          } catch {
            toast("Ce fichier n'est pas une sauvegarde Ada.");
          }
        });
      },
    }
  );
}
