import { loadState, subscribe, getState, homeStatus, refreshLocal } from "./store.js";
import { isOwner, currentUser } from "./cloud.js";
import { parseHash, goBack, initHistory, trackHistory } from "./router.js";
import { icon, esc, dropSheet, copyText, copyValue, resetCopies, toast, haptic, fillQrCodes } from "./ui.js";
import { onInstallChange } from "./install.js";
import { openImporter } from "./views/importer.js";
import { openSettings } from "./views/settings.js";
import * as login from "./views/login.js";
import * as home from "./views/home.js";
import * as library from "./views/library.js";
import * as reel from "./views/reel.js";
import * as board from "./views/board.js";
import * as snippets from "./views/snippets.js";
import * as tools from "./views/tools.js";
import * as editor from "./views/editor.js";

const VIEWS = { login, home, library, reel, board, snippets, tools, editor };
const NAV = [
  { name: "home", href: "#/", label: "Accueil", icon: "home" },
  { name: "library", href: "#/biblio", label: "Biblio", icon: "grid", also: ["reel"] },
  { name: "import", label: "Importer", icon: "plus" },
  { name: "board", href: "#/labo", label: "Labo", icon: "board" },
  { name: "snippets", href: "#/snippets", label: "Snippets", icon: "code", also: ["tools"] },
];
// Sur ordinateur, la barre latérale a la place d'afficher les outils à part.
const SIDE_NAV = [...NAV.filter((n) => n.name !== "import"), { name: "tools", href: "#/outils", label: "Outils", icon: "tool" }];
const IMMERSIVE = new Set(["reel", "editor"]);

const viewEl = document.getElementById("view");
let current = null;
let staleWhileTyping = false;
viewEl.addEventListener("focusout", () => setTimeout(() => {
  if (staleWhileTyping && !viewEl.contains(document.activeElement)) { staleWhileTyping = false; render({ fromStore: true }); }
}, 0));

/** Ada est privée : tant qu'on ne sait pas qui est connecté, on attend ; sinon écran de connexion. */
function gate() {
  const { authKnown, user } = getState();
  if (!authKnown) return "loading";
  if (!user || !isOwner(user)) return "login";
  return null;
}

export function homeLine() {
  const h = homeStatus();
  if (!h.known) return { dot: "off", title: "Aucun PC connecté", sub: "npm run dev sur ton PC" };
  const engine = { cli: "Claude Code", api: "API Claude", command: "ton IA" }[h.engine] || "sans IA";
  return h.online ? { dot: h.engine || "cli", title: "PC de la maison", sub: `en ligne · ${engine}` } : { dot: "off", title: "PC de la maison", sub: "hors ligne" };
}

function renderNav() {
  const { reels, online } = getState();
  const todo = reels.filter((r) => r.status === "todo" && r.analysis.state === "done").length;
  const active = (n, sidebar) => current?.name === n.name || (!sidebar && n.also?.includes(current?.name)) || (sidebar && n.name === "library" && current?.name === "reel");
  const item = (n, cls, sidebar = false) =>
    n.name === "import"
      ? `<button class="${cls} nav-import" data-import aria-label="Importer un reel"><span class="nav-fab">${icon("plus", { size: 24 })}</span><span class="nav-label">${n.label}</span></button>`
      : `<a class="${cls} ${active(n, sidebar) ? "active" : ""}" href="${n.href}">${icon(n.icon)}<span class="nav-label">${n.label}</span>${n.name === "board" && todo ? `<span class="nav-badge">${todo > 99 ? "99+" : todo}</span>` : ""}</a>`;
  document.getElementById("tabbar").innerHTML = NAV.map((n) => item(n, "tab")).join("");
  const hl = homeLine();
  const u = currentUser();
  document.getElementById("sidenav").innerHTML = `
    <a class="brand" href="#/"><img src="/icons/icon-192.png" alt="" width="34" height="34"><span>Ada</span></a>
    <button class="btn btn-primary btn-block side-import" data-import>${icon("sparkles", { size: 18 })} Importer un reel</button>
    <nav>${SIDE_NAV.map((n) => item(n, "side-link", true)).join("")}</nav>
    <button class="side-status" data-settings>
      ${u?.photo ? `<img class="avatar" src="${esc(u.photo)}" alt="" width="32" height="32" referrerpolicy="no-referrer">` : ""}
      <span><strong>${esc(hl.title)}</strong><small><span class="engine-dot e-${hl.dot}"></span> ${esc(hl.sub)}</small></span>
      ${icon("settings", { size: 18 })}
    </button>`;
  document.getElementById("offline").hidden = online;
}

function render({ fromStore = false } = {}) {
  const g = gate();
  if (g === "loading") return;
  hideSplash();
  const route = g === "login" ? { name: "login", params: { query: new URLSearchParams() }, path: "/connexion" } : parseHash();
  const changed = !current || current.path !== route.path || current.name !== route.name;
  const view = VIEWS[route.name];
  // Jamais de rendu sous les doigts : formulaire, ou saisie en cours (notes, recherche).
  const typing = viewEl.contains(document.activeElement) && document.activeElement.matches("input, textarea, select");
  if (fromStore && !changed && (view.live || typing)) {
    staleWhileTyping = typing && !view.live;
    return renderNav();
  }
  if (current && (changed || !fromStore)) VIEWS[current.name].unmount?.();
  if (changed && !fromStore) dropSheet(); // une feuille ne survit jamais à un changement de page
  current = route;
  const scrollY = window.scrollY;

  document.body.className = document.body.className.replace(/\broute-\S+/g, "").trim();
  document.body.classList.add(`route-${route.name}`);
  document.body.classList.toggle("immersive", IMMERSIVE.has(route.name));
  document.body.classList.toggle("gated", route.name === "login");

  // Chaque rendu repart d'un conteneur neuf : les écouteurs de l'ancienne vue disparaissent avec lui.
  resetCopies();
  const inner = document.createElement("div");
  inner.className = `view-inner ${changed ? "enter" : ""}`;
  inner.innerHTML = view.render(route.params);
  viewEl.replaceChildren(inner);
  view.mount?.(inner, route.params);
  fillQrCodes(inner);
  renderNav();

  if (changed && !fromStore) window.scrollTo(0, 0);
  else window.scrollTo(0, scrollY);
  runLaunch();
}

let splashHidden = false;
function hideSplash() {
  if (splashHidden) return;
  splashHidden = true;
  document.getElementById("splash")?.classList.add("hide");
  setTimeout(() => document.getElementById("splash")?.remove(), 500);
}

function routeChange() {
  trackHistory();
  const go = () => render();
  if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(go);
  else go();
}

document.addEventListener("click", async (e) => {
  if (e.target.closest("[data-import]")) {
    e.preventDefault();
    openImporter();
  }
  const back = e.target.closest("[data-back]");
  if (back) {
    e.preventDefault();
    goBack(back.dataset.back || "#/");
  }
  if (e.target.closest("[data-settings]")) {
    e.preventDefault();
    openSettings();
  }
  const copy = e.target.closest("[data-copy]");
  if (copy) {
    e.preventDefault();
    const text = copyValue(copy.dataset.copy);
    if (text == null) return;
    const ok = await copyText(text);
    haptic(10);
    if (ok) {
      copy.classList.add("copied");
      const label = copy.querySelector("span");
      const before = label?.textContent;
      if (label) label.textContent = "Copié";
      setTimeout(() => { copy.classList.remove("copied"); if (label) label.textContent = before; }, 1400);
      if (copy.dataset.copyToast) toast(copy.dataset.copyToast);
    } else toast("Copie impossible sur ce navigateur — sélectionne le texte à la main.");
  }
});

// Pas de zoom sur téléphone. Safari (iPhone) ignore user-scalable=no : on bloque le geste à deux doigts.
for (const type of ["gesturestart", "gesturechange", "gestureend"]) document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
document.addEventListener("touchmove", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });

// Raccourcis clavier (ordinateur) : « / » cherche, « n » importe.
document.addEventListener("keydown", (e) => {
  if (gate() || e.target.closest("input, textarea, select, [contenteditable]") || e.metaKey || e.ctrlKey || e.altKey) return;
  if (document.getElementById("sheet-root").classList.contains("open")) return;
  if (e.key === "n") { e.preventDefault(); openImporter(); }
  if (e.key === "/") {
    e.preventDefault();
    const search = document.querySelector(".search input");
    if (search) search.focus();
    else location.hash = "#/biblio?focus=1";
  }
});

// Cible de partage (« Partager » depuis Instagram → Ada), raccourci iPhone et icônes de l'app :
// /?url=…  /?text=…  /?action=import
// Gardé de côté le temps de se connecter si besoin (la connexion Google peut recharger la page).
const LAUNCH_KEY = "ada-launch";
function captureLaunchParams() {
  const params = new URLSearchParams(location.search);
  const shared = [params.get("url"), params.get("text"), params.get("title")].filter(Boolean).join(" ");
  const action = params.get("action");
  if (!shared && !action) return;
  history.replaceState(history.state, "", `/${location.hash || "#/"}`);
  const url = shared.match(/https?:\/\/\S+/)?.[0] || "";
  try { sessionStorage.setItem(LAUNCH_KEY, JSON.stringify({ url, text: shared.replace(url, "").trim(), action })); } catch {}
}
function runLaunch() {
  if (gate() || !getState().loaded) return;
  let launch = null;
  try { launch = JSON.parse(sessionStorage.getItem(LAUNCH_KEY) || "null"); sessionStorage.removeItem(LAUNCH_KEY); } catch {}
  if (!launch) return;
  if (launch.url || launch.text) openImporter({ url: launch.url, text: launch.text, mode: launch.url ? "lien" : "texte", auto: Boolean(launch.url) });
  else if (launch.action === "import") openImporter();
}

function boot() {
  initHistory();
  captureLaunchParams();
  subscribe(() => render({ fromStore: true }));
  loadState();
  window.addEventListener("hashchange", routeChange);
  onInstallChange(() => current?.name === "home" && render({ fromStore: true }));
  // Le serveur de ce PC (s'il y en a un) : son état change quand on le lance ou l'arrête.
  setInterval(() => getState().local && refreshLocal(), 30_000);
  // Si Firebase ne répond pas du tout (CDN bloqué…), on n'attend pas indéfiniment.
  setTimeout(hideSplash, 8000);

  // Le service worker ne s'installe qu'en contexte sécurisé (localhost ou HTTPS) — pas sur 127.0.0.1,
  // gardé pour l'aperçu de développement sans cache.
  if ("serviceWorker" in navigator && window.isSecureContext && location.hostname !== "127.0.0.1") {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }
}

boot();
