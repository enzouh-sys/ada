// Routage par hash (#/fiche/abc) : fonctionne partout, y compris en PWA hors ligne.
import { takeSheetEntry } from "./ui.js";

const ROUTES = [
  [/^\/?$|^\/accueil$/, "home"],
  [/^\/biblio$/, "library"],
  [/^\/fiche\/([\w-]+)$/, "reel", ["id"]],
  [/^\/labo$/, "board"],
  [/^\/snippets$/, "snippets"],
  [/^\/outils$/, "tools"],
  [/^\/nouvelle$/, "editor"],
  [/^\/modifier\/([\w-]+)$/, "editor", ["id"]],
];

export function parseHash(hash = location.hash) {
  const [path, qs = ""] = hash.replace(/^#/, "").split("?");
  for (const [re, name, keys = []] of ROUTES) {
    const m = path.match(re);
    if (m) {
      const params = { query: new URLSearchParams(qs) };
      keys.forEach((k, i) => (params[k] = m[i + 1]));
      return { name, params, path };
    }
  }
  return { name: "home", params: { query: new URLSearchParams() }, path: "/" };
}

// Chaque page visitée dans l'app reçoit un numéro (history.state.idx).
// Le bouton retour sait ainsi s'il existe une page précédente *dans l'app* — sinon il va à une page sûre.
let lastIdx = 0;
const idx = () => history.state?.idx ?? 0;

export function initHistory() {
  if (history.state?.idx == null) history.replaceState({ ...history.state, idx: 0 }, "");
  lastIdx = idx();
}

/** À appeler à chaque changement de page : numérote les nouvelles entrées. */
export function trackHistory() {
  if (history.state?.idx == null) history.replaceState({ idx: lastIdx + 1 }, "");
  lastIdx = idx();
}

export function navigate(hash, { replace = false } = {}) {
  // Si un panneau vient d'être fermé pour aller ailleurs, on remplace son entrée d'historique
  // (sinon « retour » rouvrirait une page fantôme).
  const fromSheet = takeSheetEntry();
  if (replace || fromSheet) {
    history.replaceState({ idx: idx() }, "", hash);
    window.dispatchEvent(new HashChangeEvent("hashchange"));
    return;
  }
  if (location.hash === hash) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = hash;
}

/** Retour : page précédente de l'app si elle existe, sinon `fallback`. */
export function goBack(fallback = "#/") {
  if (idx() > 0) history.back();
  else navigate(fallback, { replace: true });
}
