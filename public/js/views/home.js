import { getState, setSettings, homeStatus } from "../store.js";
import { icon, platformGlyph, esc, reelCard, greeting, codeBlock, plural, qrSlot, timeAgo } from "../ui.js";
import { CATEGORIES, statusOf } from "../taxonomy.js";
import { isWaiting, needsAttention } from "../fiche.js";
import { APP_URL } from "../config.js";
import { openImporter, homeHint } from "./importer.js";
import { installState, promptInstall, isMobile } from "../install.js";

let luckyKey = null;

function allSnippets(reels) {
  return reels.flatMap((r) => r.snippets.map((s) => ({ ...s, reel: r, key: `${r.id}:${s.id}` })));
}

function pickLucky(list) {
  const pool = list.filter((s) => s.key !== luckyKey && ["prompt", "commande", "raccourci"].includes(s.kind));
  luckyKey = (pool[Math.floor(Math.random() * pool.length)] || list[0])?.key || null;
}

export function render() {
  const { reels: all, settings } = getState();
  const reels = all.filter((r) => r.analysis.state === "done");
  const waiting = all.filter((r) => isWaiting(r) || needsAttention(r));
  const hint = homeHint();
  const snippets = allSnippets(reels);
  if (!luckyKey || !snippets.some((s) => s.key === luckyKey)) pickLucky(snippets);
  const lucky = snippets.find((s) => s.key === luckyKey);
  const count = (st) => reels.filter((r) => r.status === st).length;
  const recent = [...reels].sort((a, b) => b.createdAt - a.createdAt).slice(0, 10);
  // Quick wins : à tester, du plus rapide au plus long.
  const quick = reels
    .filter((r) => r.status === "todo" || r.status === "doing")
    .sort((a, b) => (a.status === "doing" ? -1 : 0) - (b.status === "doing" ? -1 : 0) || (a.minutesToTry ?? 99) - (b.minutesToTry ?? 99))
    .slice(0, 4);
  const cats = CATEGORIES.map((c) => ({ ...c, n: reels.filter((r) => r.category === c.name).length })).filter((c) => c.n);
  const toolsCount = new Set(reels.flatMap((r) => r.resources.map((x) => x.name.toLowerCase()))).size;
  const install = installState();
  const showPhone = !isMobile() && !settings.phoneDismissed;

  return `
  <section class="page home">
    <header class="home-head">
      <div class="home-brand">
        <img src="/icons/icon-192.png" alt="" width="40" height="40"><span>Ada</span>
        <button class="icon-btn" data-settings aria-label="Réglages">${icon("settings", { size: 20 })}</button>
      </div>
      <p class="eyebrow">${greeting()} 👋</p>
      <h1 class="display">Qu'est-ce qu'on<br>dev <em>aujourd'hui</em> ?</h1>
    </header>

    <div class="import-hero">
      <div class="term-bar"><i></i><i></i><i></i><span>~/reels — ada import</span></div>
      <div class="import-hero-in">
        <div class="import-hero-top">
          <span class="pill-brands">${platformGlyph("instagram")}${platformGlyph("tiktok")}${platformGlyph("youtube")}${platformGlyph("facebook")}${platformGlyph("github")}</span>
          <span class="import-hero-kicker"><span class="engine-dot e-${hint.dot}"></span>${homeStatus().online ? "PC en ligne" : "Analyse à la maison"}</span>
        </div>
        <h2>Un reel dev ?<br><span class="prompt-sign">&gt;</span> Ada en fait une fiche.</h2>
        <form class="import-hero-form" id="hero-form">
          <div class="field-inline">
            ${icon("link", { size: 18 })}
            <input id="hero-url" type="url" inputmode="url" placeholder="Colle un lien Instagram, TikTok…" autocomplete="off" enterkeyhint="go">
            <button type="button" class="chip-btn" id="hero-paste" aria-label="Coller">${icon("clipboard", { size: 16 })}<span>Coller</span></button>
          </div>
          <button class="btn btn-primary btn-block" type="submit">${icon("sparkles", { size: 18 })} Analyser le reel</button>
        </form>
        <p class="import-hero-foot">${esc(hint.text)}</p>
      </div>
    </div>

    ${install.show && !settings.installDismissed ? `
    <div class="install-card">
      <img src="/icons/icon-192.png" alt="" width="44" height="44">
      <div class="install-text">
        <strong>Installe Ada</strong>
        <span>${install.ios ? `Touche ${icon("share", { size: 14 })} puis <b>« Sur l'écran d'accueil »</b>` : "Elle apparaîtra dans le menu Partager d'Instagram."}</span>
      </div>
      ${install.canPrompt ? `<button class="btn btn-primary btn-sm" id="install-btn">Installer</button>` : ""}
      <button class="icon-btn sm ghost" id="install-dismiss" aria-label="Masquer">${icon("x", { size: 16 })}</button>
    </div>` : ""}

    <div class="stats">
      <a class="stat" href="#/biblio"><strong>${reels.length}</strong><span>fiche${reels.length > 1 ? "s" : ""}</span></a>
      <a class="stat s-todo" href="#/labo"><strong>${count("todo")}</strong><span>à tester</span></a>
      <a class="stat s-doing" href="#/labo"><strong>${count("doing")}</strong><span>en test</span></a>
      <a class="stat s-adopted" href="#/biblio?statut=adopted"><strong>${count("adopted")}</strong><span>adoptée${count("adopted") > 1 ? "s" : ""}</span></a>
    </div>

    ${showPhone ? `
    <div class="phone-card">
      ${qrSlot(APP_URL, 96)}
      <div class="phone-text">
        <strong>${icon("phone", { size: 16 })} Ada sur ton téléphone</strong>
        <span>Scanne avec l'appareil photo, connecte-toi, installe-la : <code>${esc(APP_URL.replace("https://", ""))}</code></span>
        <button class="link-btn" data-settings>Envoyer un reel depuis Instagram ${icon("next", { size: 14 })}</button>
      </div>
      <button class="icon-btn sm ghost" id="phone-dismiss" aria-label="Masquer">${icon("x", { size: 16 })}</button>
    </div>` : ""}

    ${waiting.length ? `
    <div class="section-head"><h2>En attente d'analyse</h2><span class="muted sm">${plural(waiting.length, "import")}</span></div>
    <div class="quick-list">
      ${waiting.map((r) => `
        <a class="qrow wait-row" href="#/fiche/${r.id}">
          <span class="qrow-emoji">${r.analysis.state === "running" ? "🧠" : needsAttention(r) ? "⚠️" : "⏳"}</span>
          <span class="qrow-text"><strong>${esc(r.title)}</strong><small>${r.analysis.state === "running" ? "Ton PC rédige la fiche…" : needsAttention(r) ? esc(r.analysis.error || "À compléter") : `Envoyé ${timeAgo(r.createdAt)} · ${homeStatus().online ? "ton PC s'en occupe" : "analysé à ton retour 🏠"}`}</small></span>
          <span class="qrow-side">${platformGlyph(r.platform, 16)}</span>
        </a>`).join("")}
    </div>` : ""}

    ${quick.length ? `
    <div class="section-head"><h2>À tester en priorité</h2><a class="link-btn" href="#/labo">Le labo ${icon("next", { size: 14 })}</a></div>
    <div class="quick-list">
      ${quick.map((r) => `
        <a class="qrow" href="#/fiche/${r.id}">
          <span class="qrow-emoji">${esc(r.emoji)}</span>
          <span class="qrow-text"><strong>${esc(r.title)}</strong><small>${esc(r.tryIt || r.summary)}</small></span>
          <span class="qrow-side">${r.status === "doing" ? `<span class="tagline s-doing">${statusOf("doing").emoji} en test</span>` : r.minutesToTry ? `<span class="tagline">${icon("clock", { size: 13 })}${r.minutesToTry} min</span>` : ""}</span>
        </a>`).join("")}
    </div>` : ""}

    ${cats.length ? `
    <div class="section-head"><h2>Thèmes</h2></div>
    <div class="scroller cats">
      ${cats.map((c) => `<a class="cat-tile" style="--h:${c.hue}" href="#/biblio?cat=${encodeURIComponent(c.name)}"><span class="cat-tile-emoji">${c.emoji}</span><strong>${esc(c.name)}</strong><small>${plural(c.n, "fiche")}</small></a>`).join("")}
    </div>` : ""}

    ${lucky ? `
    <div class="section-head"><h2>Snippet au hasard</h2><button class="link-btn" id="reroll">${icon("dice", { size: 16 })} Relancer</button></div>
    <div class="lucky">
      ${codeBlock(lucky.content, { lang: lucky.language, title: lucky.title, kind: lucky.kind })}
      <a class="lucky-src" href="#/fiche/${lucky.reel.id}">${esc(lucky.reel.emoji)} ${esc(lucky.reel.title)} ${icon("next", { size: 14 })}</a>
    </div>` : ""}

    ${recent.length ? `
    <div class="section-head"><h2>Ajoutées récemment</h2><a class="link-btn" href="#/biblio">Tout voir ${icon("next", { size: 14 })}</a></div>
    <div class="scroller cards-row">
      ${recent.map((r) => reelCard(r, { size: "rcard-sm" })).join("")}
    </div>` : ""}

    <div class="quick-grid">
      <a class="quick" href="#/snippets"><span class="quick-ic">${icon("code")}</span><strong>Snippets</strong><small>${snippets.length ? `${plural(snippets.length, "commande")}, prompts et configs` : "Rien pour l'instant"}</small></a>
      <a class="quick" href="#/outils"><span class="quick-ic alt">${icon("tool")}</span><strong>Outils</strong><small>${toolsCount ? `${plural(toolsCount, "outil")} repéré${toolsCount > 1 ? "s" : ""}` : "Rien pour l'instant"}</small></a>
    </div>
  </section>`;
}

export function mount(root) {
  const form = root.querySelector("#hero-form");
  const input = root.querySelector("#hero-url");
  // Le texte partagé par TikTok/Facebook entoure souvent le lien (« Regarde cette vidéo… https://… ») :
  // le lien va dans le champ, le reste est gardé comme légende.
  let extraText = "";
  const fill = (raw) => {
    const text = String(raw || "").trim();
    const url = text.match(/https?:\/\/\S+/)?.[0];
    if (!url) return false;
    input.value = url;
    extraText = text.replace(url, "").trim();
    input.classList.add("pasted");
    setTimeout(() => input.classList.remove("pasted"), 900);
    return true;
  };
  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const url = input.value.trim();
    openImporter({ url, text: extraText, auto: Boolean(url) });
  });
  input.addEventListener("input", () => { if (!input.value.includes(" ")) extraText = ""; });
  input.addEventListener("paste", (e) => {
    if (fill(e.clipboardData?.getData("text"))) e.preventDefault();
  });
  // « Coller » met le lien directement dans le champ. Sur iPhone, iOS demande toujours de confirmer
  // avec sa propre bulle « Coller » : c'est une protection du système, qu'aucune app web ne peut éviter.
  root.querySelector("#hero-paste").addEventListener("click", async () => {
    try {
      if (!navigator.clipboard?.readText || !window.isSecureContext) throw new Error("indisponible");
      const text = (await navigator.clipboard.readText()).trim();
      if (fill(text)) return;
      if (text) return openImporter({ text, mode: "texte" });
      input.focus();
    } catch {
      input.focus();
      input.placeholder = "Appui long ici → Coller";
    }
  });
  root.querySelector("#reroll")?.addEventListener("click", () => {
    pickLucky(allSnippets(getState().reels));
    const tmp = document.createElement("div");
    tmp.innerHTML = render();
    root.querySelector(".lucky").replaceWith(tmp.querySelector(".lucky"));
  });
  root.querySelector("#install-btn")?.addEventListener("click", promptInstall);
  root.querySelector("#install-dismiss")?.addEventListener("click", () => setSettings({ installDismissed: true }));
  root.querySelector("#phone-dismiss")?.addEventListener("click", () => setSettings({ phoneDismissed: true }));
}
