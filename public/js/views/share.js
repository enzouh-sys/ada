// « Envoyer à Claude Code » : sortir une fiche (ou toutes les fiches d'un même reel) vers la conversation de ton choix.
// Trois façons : un message prêt à coller, un fichier .md, ou une référence courte lue par le serveur MCP d'Ada.
import { getState } from "../store.js";
import { icon, esc, openSheet, copyText, toast } from "../ui.js";
import { reelToMarkdown } from "../markdown.js";

const DEFAULT_TASK = "Applique cette astuce à ce projet. Commence par me proposer un plan, et ne modifie aucun fichier avant que je l'aie validé.";

const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "fiche";

/** Les fiches issues du même reel (« une fiche par skill »), dans l'ordre. */
export function siblingsOf(r) {
  if (!r.groupId) return [r];
  const all = getState().reels.filter((x) => x.id === r.groupId || x.groupId === r.groupId).sort((a, b) => (a.groupIndex || 0) - (b.groupIndex || 0));
  return all.length ? all : [r];
}

/** Le message à coller dans Claude Code : la ou les fiches, puis ce qu'on attend de lui. */
export function claudeCodeMessage(reels, task = DEFAULT_TASK) {
  const intro = reels.length > 1
    ? `Voici ${reels.length} fiches de ma base Ada, tirées d'un même reel dev et vérifiées sur le web. Sers-t'en comme référence pour ce projet.`
    : "Voici une fiche de ma base Ada, tirée d'un reel dev et vérifiée sur le web. Sers-t'en comme référence pour ce projet.";
  return [intro, reels.map((r) => reelToMarkdown(r, { level: 2 })).join("\n\n---\n\n"), "---", `**Ce que je veux :** ${task.trim() || DEFAULT_TASK}`].join("\n\n") + "\n";
}

export function openShareToClaude(r) {
  const group = siblingsOf(r);
  const many = group.length > 1;
  const task = r.claudePrompt || DEFAULT_TASK;

  openSheet(
    `<div class="share-cc">
      <header class="sheet-header">
        <h2 class="sheet-title">Envoyer à Claude Code</h2>
        <button class="icon-btn sm" data-close-sheet aria-label="Fermer">${icon("x", { size: 18 })}</button>
      </header>
      <p class="muted sm">Colle la fiche dans la conversation Claude Code de ton choix, avec ce que tu veux qu'il en fasse.</p>

      <label class="field">
        <span>Ce que Claude doit en faire</span>
        <textarea id="cc-task" rows="4">${esc(task)}</textarea>
      </label>
      ${many ? `<label class="check-row"><input type="checkbox" id="cc-all" checked><span>Inclure les ${group.length} fiches de ce reel</span></label>` : ""}

      <div class="share-actions">
        <button class="btn btn-primary btn-lg btn-block" id="cc-copy">${icon("terminal", { size: 18 })} Copier le message</button>
        <button class="btn btn-ghost btn-block" id="cc-file">${icon("download", { size: 17 })} Télécharger le fichier .md</button>
        <button class="btn btn-ghost btn-block" id="cc-ref">${icon("link", { size: 17 })} Copier une référence courte (MCP)</button>
      </div>
      <p class="set-hint">La référence courte est plus légère : Claude Code va chercher la fiche lui-même avec le serveur MCP d'Ada (Réglages → Claude Code). Le fichier .md se glisse dans la conversation, ou se range dans ton projet pour le citer avec <code>@</code>.</p>

      <details class="caption">
        <summary>${icon("book", { size: 16 })} Aperçu du message</summary>
        <pre class="cc-preview" id="cc-preview"></pre>
      </details>
    </div>`,
    {
      full: true,
      onMount: (sheet) => {
        const $ = (s) => sheet.querySelector(s);
        const chosen = () => (many && $("#cc-all")?.checked ? group : [r]);
        const message = () => claudeCodeMessage(chosen(), $("#cc-task").value);
        const preview = () => ($("#cc-preview").textContent = message());
        preview();
        $("#cc-task").addEventListener("input", preview);
        $("#cc-all")?.addEventListener("change", preview);

        $("#cc-copy").addEventListener("click", async () => {
          const ok = await copyText(message());
          toast(ok ? "Copié ✓ Colle-le dans ta conversation Claude Code (Ctrl+V)" : "Copie impossible : télécharge plutôt le fichier .md", { timeout: 4000 });
        });
        $("#cc-file").addEventListener("click", () => {
          const list = chosen();
          const url = URL.createObjectURL(new Blob([message()], { type: "text/markdown" }));
          const a = Object.assign(document.createElement("a"), { href: url, download: `ada-${slug(list.length > 1 ? `${list.length}-fiches-${r.title}` : r.title)}.md` });
          document.body.appendChild(a);
          a.click();
          a.remove();
          setTimeout(() => URL.revokeObjectURL(url), 2000);
        });
        $("#cc-ref").addEventListener("click", async () => {
          const list = chosen();
          const names = list.map((x) => `« ${x.title} » (id ${x.id})`).join(", ");
          const ref = `Avec l'outil MCP « ada », récupère ${list.length > 1 ? "les fiches Ada" : "la fiche Ada"} ${names}, puis : ${$("#cc-task").value.trim() || DEFAULT_TASK}`;
          const ok = await copyText(ref);
          toast(ok ? "Référence copiée ✓ Colle-la dans Claude Code" : "Copie impossible sur ce navigateur.", { timeout: 4000 });
        });
      },
    }
  );
}
