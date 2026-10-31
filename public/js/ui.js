// Icônes SVG, petits composants et utilitaires d'interface partagés par les vues.
import { categoryOf, statusOf, snippetKindOf, PLATFORM_LABEL } from "./taxonomy.js";

const PATHS = {
  home: '<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9.5"/>',
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="2"/><rect x="13.5" y="3.5" width="7" height="7" rx="2"/><rect x="3.5" y="13.5" width="7" height="7" rx="2"/><rect x="13.5" y="13.5" width="7" height="7" rx="2"/>',
  board: '<rect x="3" y="3.5" width="5" height="17" rx="1.6"/><rect x="9.5" y="3.5" width="5" height="11" rx="1.6"/><rect x="16" y="3.5" width="5" height="14" rx="1.6"/>',
  code: '<path d="m8 7-5 5 5 5M16 7l5 5-5 5M13.5 4.5l-3 15"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0 5 5L21 13l-8 8-3.5-3.5 8-8-1.3-1.3a4 4 0 0 1-5-5L13 1.5"/><path d="M14.5 2.5a4 4 0 0 1 5 5l-2.2-.6-1.6-1.6-.6-2.2z"/><path d="m9.5 17.5-6 3 3-6"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  back: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
  more: '<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>',
  share: '<path d="M12 3v12M7.5 7.5 12 3l4.5 4.5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5A1.6 1.6 0 0 0 8.6 21h6.8a1.6 1.6 0 0 0 1.6-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  edit: '<path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-4-4L4 16z"/><path d="m14 6 4 4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  sparkles: '<path d="M10 3.5 11.6 8a2 2 0 0 0 1.4 1.4L17.5 11 13 12.6a2 2 0 0 0-1.4 1.4L10 18.5 8.4 14A2 2 0 0 0 7 12.6L2.5 11 7 9.4A2 2 0 0 0 8.4 8z"/><path d="M18.5 3v4M16.5 5h4M18 16.5v3M16.5 18h3"/>',
  link: '<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>',
  clipboard: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1M9.5 11h5M9.5 15h5"/>',
  copy: '<rect x="8.5" y="8.5" width="12" height="12" rx="2.5"/><path d="M15.5 8.5V6a2.5 2.5 0 0 0-2.5-2.5H6A2.5 2.5 0 0 0 3.5 6v7A2.5 2.5 0 0 0 6 15.5h2.5"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="3"/><circle cx="9" cy="9.5" r="1.8"/><path d="m21 16-5-5-9 9"/>',
  terminal: '<rect x="2.5" y="4" width="19" height="16" rx="3"/><path d="m7 9 3 3-3 3M12.5 15h4.5"/>',
  bulb: '<path d="M9 18h6M10 21h4"/><path d="M8.5 14.5C7 13.3 6 11.6 6 9.6 6 6.3 8.7 3.6 12 3.6s6 2.7 6 6c0 2-1 3.7-2.5 4.9-.6.5-1 1.2-1 2V17h-5v-.5c0-.8-.4-1.5-1-2z"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1.2"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9"/><path d="M18 14v5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 19V7.5A1.5 1.5 0 0 1 5.5 6H10"/>',
  download: '<path d="M12 4v11M7.5 10.5 12 15l4.5-4.5M5 20h14"/>',
  upload: '<path d="M12 15V4M7.5 8.5 12 4l4.5 4.5M5 20h14"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  refresh: '<path d="M20 11a8 8 0 0 0-14.3-4.5L4 8.5M4 4v4.5h4.5M4 13a8 8 0 0 0 14.3 4.5l1.7-2M20 20v-4.5h-4.5"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.5"/><path d="M10.5 18.5h3"/>',
  alert: '<path d="M12 3.5 2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.2v.1"/>',
  pin: '<path d="M9 3.5h6l-1 6 3.5 3.5h-11L10 9.5z"/><path d="M12 13v7.5"/>',
  dice: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/><circle cx="12" cy="12" r="1.1"/><circle cx="15.5" cy="8.5" r="1.1"/><circle cx="8.5" cy="15.5" r="1.1"/>',
  zap: '<path d="M13 2.5 4.5 13.5H12l-1 8 8.5-11H12z"/>',
  book: '<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/><path d="M9 7h7"/>',
  wifi: '<path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a9.5 9.5 0 0 1 13 0M8.6 16a5 5 0 0 1 6.8 0"/><circle cx="12" cy="19.3" r="1"/>',
  layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
  arrowRight: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  play: '<path d="M7 4.5v15l12-7.5z"/>',
};

export function icon(name, { size = 22, cls = "", fill = false } = {}) {
  return `<svg class="ic ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="${fill ? "currentColor" : "none"}" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name] || ""}</svg>`;
}

export const BRAND = {
  tiktok: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.6 3c.4 2.3 1.9 3.9 4.1 4.1v3.2c-1.5.1-2.9-.3-4.1-1.1v6.3c0 3.2-2.6 5.7-5.8 5.6-3-.1-5.4-2.6-5.4-5.6 0-3.3 2.8-5.9 6.2-5.5v3.3c-1.5-.4-2.9.7-2.9 2.2 0 1.3 1 2.3 2.3 2.3 1.3 0 2.3-1.1 2.3-2.4V3z"/></svg>',
  instagram: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="1" fill="currentColor" stroke="none"/></svg>',
  youtube: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M21.6 7.2a2.6 2.6 0 0 0-1.8-1.8C18.2 5 12 5 12 5s-6.2 0-7.8.4A2.6 2.6 0 0 0 2.4 7.2 27 27 0 0 0 2 12a27 27 0 0 0 .4 4.8 2.6 2.6 0 0 0 1.8 1.8C5.8 19 12 19 12 19s6.2 0 7.8-.4a2.6 2.6 0 0 0 1.8-1.8A27 27 0 0 0 22 12a27 27 0 0 0-.4-4.8zM10 15V9l5.2 3z"/></svg>',
  github: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 2.5a9.7 9.7 0 0 0-3.1 18.9c.5.1.7-.2.7-.5v-1.7c-2.7.6-3.3-1.3-3.3-1.3-.4-1.1-1.1-1.4-1.1-1.4-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.5 2.3 1.1 2.9.8.1-.6.3-1.1.6-1.3-2.2-.2-4.4-1.1-4.4-4.8 0-1.1.4-1.9 1-2.6-.1-.3-.4-1.3.1-2.6 0 0 .8-.3 2.7 1a9.3 9.3 0 0 1 4.9 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.6 0 3.7-2.3 4.6-4.4 4.8.3.3.7.9.7 1.8v2.7c0 .3.2.6.7.5A9.7 9.7 0 0 0 12 2.5z"/></svg>',
  facebook: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 21.5v-7.6h2.6l.4-3h-3V9c0-.9.3-1.5 1.6-1.5h1.6V4.8c-.3 0-1.2-.1-2.3-.1-2.3 0-3.9 1.4-3.9 4v2.2H8v3h2.5v7.6z"/></svg>',
  x: '<svg class="ic" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.8 3h3.1l-6.8 7.7L22 21h-6.2l-4.9-6.3L5.3 21H2.2l7.3-8.3L2 3h6.4l4.4 5.8zm-1.1 16.2h1.7L7.4 4.7H5.6z"/></svg>',
};

export function platformGlyph(p, size = 14) {
  const svg = BRAND[p] || (p === "web" ? icon("globe", { size }) : p === "texte" ? icon("clipboard", { size }) : icon("terminal", { size }));
  return size === 14 ? svg : svg.replace('width="14" height="14"', `width="${size}" height="${size}"`);
}

export function esc(str = "") {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}

/** Lien sûr : seulement http(s). */
export const safeUrl = (u) => (/^https?:\/\//i.test(u || "") ? u : "");

export function platformBadge(r, { link = false } = {}) {
  const p = r.platform;
  const label = r.author && !["manuel", "ada"].includes(p) ? r.author : PLATFORM_LABEL[p] || "Source";
  const url = safeUrl(r.sourceUrl);
  const inner = `${platformGlyph(p)}<span>${esc(label)}</span>${link && url ? icon("external", { size: 12 }) : ""}`;
  return link && url
    ? `<a class="badge badge-${esc(p)}" href="${esc(url)}" target="_blank" rel="noopener">${inner}</a>`
    : `<span class="badge badge-${esc(p)}">${inner}</span>`;
}

export function categoryPill(name, { link = false, cls = "" } = {}) {
  const c = categoryOf(name);
  const inner = `<span class="cat-dot"></span>${esc(c.name)}`;
  const style = `style="--h:${c.hue}"`;
  return link
    ? `<a class="cat-pill ${cls}" ${style} href="#/biblio?cat=${encodeURIComponent(c.name)}">${inner}</a>`
    : `<span class="cat-pill ${cls}" ${style}>${inner}</span>`;
}

export const statusDot = (id) => `<span class="status-dot s-${statusOf(id).id}" title="${statusOf(id).label}"></span>`;

export function coverStyle(r) {
  const h = categoryOf(r.category).hue;
  return `--h:${h}`;
}

export function cover(r, cls = "") {
  const img = r.image ? `<img src="${esc(r.image)}" alt="" loading="lazy" onerror="this.remove()">` : "";
  return `<div class="cover ${cls}" style="${coverStyle(r)}">${img}<span class="cover-emoji ${img ? "fallback" : ""}">${esc(r.emoji || "✨")}</span></div>`;
}

// Pastille d'une carte : l'analyse en cours prime sur le statut.
function cardChip(r) {
  const a = r.analysis?.state;
  if (a === "pending") return `<span class="rcard-status s-pending">⏳ En attente</span>`;
  if (a === "running") return `<span class="rcard-status s-running">🧠 Analyse…</span>`;
  if (a === "needs_input" || a === "error") return `<span class="rcard-status s-attention">⚠️ À compléter</span>`;
  const st = statusOf(r.status);
  return `<span class="rcard-status s-${st.id}">${st.emoji} ${st.short}</span>`;
}

export function reelCard(r, { size = "" } = {}) {
  return `
  <a class="rcard ${size}" href="#/fiche/${r.id}">
    ${cover(r, "rcard-cover")}
    ${cardChip(r)}
    ${r.favorite ? `<span class="rcard-fav">${icon("heart", { size: 14, fill: true })}</span>` : ""}
    <div class="rcard-body">
      ${categoryPill(r.category, { cls: "xs" })}
      <h3 class="rcard-title">${esc(r.title)}</h3>
      <div class="rcard-meta">
        ${r.snippets.length ? `<span>${icon("code", { size: 13 })}${r.snippets.length}</span>` : ""}
        ${r.minutesToTry ? `<span>${icon("clock", { size: 13 })}${r.minutesToTry} min</span>` : ""}
        ${r.groupTotal > 1 ? `<span>${icon("layers", { size: 13 })}${(r.groupIndex || 0) + 1}/${r.groupTotal}</span>` : ""}
        <span class="rcard-src">${platformGlyph(r.platform, 13)}</span>
      </div>
    </div>
  </a>`;
}

export function emptyState({ emoji, title, text, action = "" }) {
  return `<div class="empty"><div class="empty-emoji">${emoji}</div><h3>${title}</h3><p>${text}</p>${action}</div>`;
}

// ——— Code : petite coloration syntaxique (bash, json, js/ts, md) ———
const LANG_ALIAS = { bash: "bash", sh: "bash", shell: "bash", zsh: "bash", console: "bash", powershell: "bash", ps1: "bash", js: "js", javascript: "js", ts: "js", typescript: "js", tsx: "js", jsx: "js", py: "js", python: "js", json: "json", jsonc: "json", yaml: "json", yml: "json", toml: "json" };

export function highlight(content = "", lang = "") {
  const kind = LANG_ALIAS[(lang || "").toLowerCase()] || "";
  const src = esc(content);
  if (kind === "bash") {
    return src
      .split("\n")
      .map((line) => {
        if (/^\s*#/.test(line)) return `<span class="t-com">${line}</span>`;
        return line
          .replace(/(&quot;.*?&quot;|&#39;.*?&#39;)/g, '<span class="t-str">$1</span>')
          .replace(/(^|\s)(--?[\w-]+)/g, '$1<span class="t-flag">$2</span>')
          .replace(/^(\s*(?:\$\s*)?)([\w./-]+)/, '$1<span class="t-cmd">$2</span>');
      })
      .join("\n");
  }
  if (kind === "json") {
    return src
      .replace(/(&quot;(?:[^&]|&(?!quot;))*?&quot;)(\s*:)/g, '<span class="t-key">$1</span>$2')
      .replace(/(:\s*)(&quot;(?:[^&]|&(?!quot;))*?&quot;)/g, '$1<span class="t-str">$2</span>')
      .replace(/\b(true|false|null|-?\d+(?:\.\d+)?)\b(?![^<]*>)/g, '<span class="t-num">$1</span>');
  }
  if (kind === "js") {
    return src
      .replace(/(\/\/[^\n]*|#[^\n]*$)/gm, '<span class="t-com">$1</span>')
      .replace(/(&quot;.*?&quot;|&#39;.*?&#39;|`.*?`)(?![^<]*>)/g, '<span class="t-str">$1</span>')
      .replace(/\b(const|let|var|function|return|import|from|export|default|async|await|if|else|for|of|in|new|class|def|type|interface)\b(?![^<]*>)/g, '<span class="t-kw">$1</span>');
  }
  return src;
}

// Presse-papiers : l'API moderne n'existe qu'en HTTPS / localhost. Sur le Wi-Fi (http://192.168…),
// on repasse par l'ancienne méthode, qui marche aussi sur iPhone et Android.
export async function copyText(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {}
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none;font-size:16px";
  document.body.appendChild(ta);
  ta.select();
  ta.setSelectionRange(0, text.length);
  let ok = false;
  try { ok = document.execCommand("copy"); } catch {}
  ta.remove();
  return ok;
}

// Textes à copier, référencés par un numéro dans data-copy (évite de les dupliquer dans le HTML).
const copies = new Map();
let copySeq = 0;
export function copyKey(text) {
  const k = String(++copySeq);
  copies.set(k, text);
  return k;
}
export const copyValue = (k) => copies.get(k);
export function resetCopies() { copies.clear(); }

export function copyButton(text, { label = "Copier", cls = "", toastMsg = "" } = {}) {
  return `<button type="button" class="copy-btn ${cls}" data-copy="${copyKey(text)}" ${toastMsg ? `data-copy-toast="${esc(toastMsg)}"` : ""} aria-label="${esc(label)}">${icon("copy", { size: 15 })}<span>${esc(label)}</span></button>`;
}

export function codeBlock(content, { lang = "", title = "", kind = "", extra = "" } = {}) {
  const k = kind ? snippetKindOf(kind) : null;
  return `
  <figure class="code">
    <figcaption class="code-head">
      ${k ? `<span class="kind kind-${esc(k.id)}">${esc(k.one)}</span>` : ""}
      ${title ? `<span class="code-title">${esc(title)}</span>` : ""}
      ${lang ? `<span class="code-lang">${esc(lang)}</span>` : ""}
      <span class="code-actions">${extra}${copyButton(content, { label: "Copier" })}</span>
    </figcaption>
    <pre><code>${highlight(content, lang)}</code></pre>
  </figure>`;
}

// ——— Toasts ———
export function toast(message, { action, onAction, timeout = 3200 } = {}) {
  const host = document.getElementById("toasts");
  const el = document.createElement("div");
  el.className = "toast";
  el.innerHTML = `<span>${message}</span>${action ? `<button type="button">${esc(action)}</button>` : ""}`;
  if (action) el.querySelector("button").onclick = () => { onAction?.(); dismiss(); };
  host.appendChild(el);
  requestAnimationFrame(() => el.classList.add("show"));
  const dismiss = () => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); };
  setTimeout(dismiss, timeout);
}

// ——— Feuilles (bottom sheets) ———
// Chaque feuille ouverte ajoute une entrée d'historique : le geste / bouton « retour » du téléphone
// la ferme au lieu de quitter la page. On la ferme aussi en la glissant vers le bas.
let sheetCleanup = null;
let sheetToken = 0;
let sheetEntry = false; // une entrée d'historique « feuille » est en place
let pendingBack = null;

export function openSheet(html, { onMount, full = false, wide = false, onClose } = {}) {
  closeSheet(true, { keepHistory: true });
  const token = ++sheetToken;
  const root = document.getElementById("sheet-root");
  root.innerHTML = `
    <div class="sheet-backdrop" data-close-sheet></div>
    <div class="sheet ${full ? "sheet-full" : ""} ${wide ? "sheet-wide" : ""}" role="dialog" aria-modal="true">
      <div class="sheet-grip" data-close-sheet aria-label="Fermer"></div>
      ${html}
    </div>`;
  root.classList.add("open");
  document.body.classList.add("no-scroll");
  requestAnimationFrame(() => token === sheetToken && root.classList.add("visible"));
  root.querySelectorAll("[data-close-sheet]").forEach((el) => el.addEventListener("click", () => closeSheet()));
  const onKey = (e) => e.key === "Escape" && closeSheet();
  document.addEventListener("keydown", onKey);
  const sheet = root.querySelector(".sheet");
  enableSwipeDown(sheet);
  if (pendingBack) { clearTimeout(pendingBack); pendingBack = null; sheetEntry = true; } // on réutilise l'entrée existante
  if (!sheetEntry) {
    history.pushState({ idx: (history.state?.idx ?? 0) + 1, sheet: true }, "");
    sheetEntry = true;
  }
  sheetCleanup = () => { document.removeEventListener("keydown", onKey); onClose?.(); };
  onMount?.(sheet);
  return sheet;
}

export function closeSheet(immediate = false, { keepHistory = false, fromPop = false } = {}) {
  const root = document.getElementById("sheet-root");
  if (!root.classList.contains("open")) return;
  sheetCleanup?.();
  sheetCleanup = null;
  const sheet = root.querySelector(".sheet");
  if (sheet?.style.transform) sheet.style.transform = "translateY(110%)"; // fermée en la glissant : elle continue vers le bas
  root.classList.remove("visible");
  document.body.classList.remove("no-scroll");
  const token = sheetToken;
  const done = () => { if (token !== sheetToken) return; root.classList.remove("open"); root.innerHTML = ""; };
  immediate ? done() : setTimeout(done, 280);
  if (fromPop) sheetEntry = false;
  else if (sheetEntry && !keepHistory) {
    // Retire l'entrée « feuille » — sauf si une navigation suit aussitôt (elle la remplacera, voir takeSheetEntry).
    sheetEntry = false;
    pendingBack = setTimeout(() => { pendingBack = null; history.back(); }, 0);
  }
}

/** Utilisé par navigate() : récupère l'entrée d'une feuille qu'on vient de fermer pour aller ailleurs. */
export function takeSheetEntry() {
  if (!pendingBack) return false;
  clearTimeout(pendingBack);
  pendingBack = null;
  return true;
}

/** Changement de page : la feuille éventuellement ouverte disparaît, sans toucher à l'historique. */
export function dropSheet() {
  closeSheet(true, { keepHistory: true });
  sheetEntry = false;
}

window.addEventListener("popstate", () => {
  const root = document.getElementById("sheet-root");
  if (root?.classList.contains("open")) closeSheet(false, { fromPop: true });
  // Entrée « feuille » orpheline (la feuille a été quittée par un lien) : on la saute.
  else if (history.state?.sheet) history.back();
});

function enableSwipeDown(sheet) {
  let y0 = null, dy = 0, t0 = 0;
  sheet.addEventListener("touchstart", (e) => {
    // On ne tire la feuille que si son contenu est en haut (sinon on laisse défiler).
    if (sheet.scrollTop > 0 || e.target.closest("textarea, input, pre, .scroller")) { y0 = null; return; }
    y0 = e.touches[0].clientY; dy = 0; t0 = Date.now();
    sheet.style.transition = "none";
  }, { passive: true });
  sheet.addEventListener("touchmove", (e) => {
    if (y0 == null) return;
    dy = Math.max(0, e.touches[0].clientY - y0);
    if (dy > 0) sheet.style.transform = `translateY(${dy}px)`;
  }, { passive: true });
  sheet.addEventListener("touchend", () => {
    if (y0 == null) return;
    sheet.style.transition = "";
    const fast = dy > 40 && Date.now() - t0 < 250;
    if (dy > 120 || fast) closeSheet();
    else sheet.style.transform = "";
    y0 = null;
  });
}

export function confirmSheet({ title, text, confirm = "Confirmer", danger = false }) {
  return new Promise((resolve) => {
    let answered = false;
    openSheet(
      `<div class="sheet-body center">
        <h2 class="sheet-title">${title}</h2>
        <p class="muted">${text}</p>
        <div class="stack-actions">
          <button class="btn ${danger ? "btn-danger" : "btn-primary"} btn-block" data-yes>${confirm}</button>
          <button class="btn btn-ghost btn-block" data-no>Annuler</button>
        </div>
      </div>`,
      {
        onMount: (s) => {
          s.querySelector("[data-yes]").onclick = () => { answered = true; resolve(true); closeSheet(); };
          s.querySelector("[data-no]").onclick = () => closeSheet();
        },
        onClose: () => !answered && resolve(false),
      }
    );
  });
}

export function haptic(ms = 8) {
  try { navigator.vibrate?.(ms); } catch {}
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Session de nuit ?";
  if (h < 12) return "Bonjour";
  if (h < 18) return "Bon après-midi";
  return "Bonsoir";
}

export function timeAgo(ts) {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "à l'instant";
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.round(h / 24);
  if (d < 7) return d === 1 ? "hier" : `il y a ${d} jours`;
  return new Date(ts).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export const plural = (n, one, many = `${one}s`) => `${n} ${n > 1 ? many : one}`;

// Redimensionne une image (fichier ou data URL) avant envoi (≈150 Ko au lieu de plusieurs Mo).
export function resizeImage(file, max = 1400, quality = 0.84) {
  const isUrl = typeof file === "string";
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      if (!isUrl) URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = reject;
    img.src = isUrl ? file : URL.createObjectURL(file);
  });
}

// QR codes (« ouvre Ada sur ton téléphone ») : générés dans le navigateur, bibliothèque chargée à la demande.
let qrLib = null;
export function qrSlot(text, size = 112) {
  return `<span class="qr" data-qr="${esc(text)}" style="width:${size}px;height:${size}px"></span>`;
}
export async function fillQrCodes(root) {
  const slots = [...root.querySelectorAll("[data-qr]:empty")];
  if (!slots.length) return;
  try {
    qrLib ||= import("https://cdn.jsdelivr.net/npm/qrcode@1.5.4/+esm").then((m) => m.default || m);
    const QR = await qrLib;
    for (const el of slots) el.innerHTML = await QR.toString(el.dataset.qr, { type: "svg", margin: 1, errorCorrectionLevel: "M", color: { dark: "#1e1029", light: "#ffffff" } });
  } catch {
    slots.forEach((el) => el.remove());
  }
}
