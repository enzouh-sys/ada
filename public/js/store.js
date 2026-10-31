// État de l'app. Les fiches vivent dans Firestore (users/{uid}/reels) : ordinateur, téléphone, et
// le PC de la maison qui analyse les imports voient la même base, en direct. Firestore garde aussi
// une copie hors ligne et renvoie tout seul les modifications faites sans réseau.
import { cloud, onUser, isOwner, refreshToken } from "./cloud.js";
import { normalizeReel, pendingReel, uuid } from "./fiche.js";
import { SEED_REELS } from "./seed.js";
import { HOME_ONLINE_MS } from "./config.js";

export { uuid };
const SETTINGS_KEY = "ada-settings-v1";

const listeners = new Set();
let state = {
  user: null,
  authKnown: false,
  reels: [],
  loaded: false,
  online: true,
  devices: [],
  local: null, // serveur Ada de ce PC (npm run dev), s'il répond
  settings: { installDismissed: false, phoneDismissed: false },
};

function readJson(key, fallback) {
  try { return JSON.parse(localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; }
}

// ——— Abonnements ———
export const getState = () => state;
export const subscribe = (fn) => (listeners.add(fn), () => listeners.delete(fn));
const emit = () => listeners.forEach((l) => l(state));
export const getReel = (id) => state.reels.find((r) => r.id === id);
export const ownReels = () => state.reels.filter((r) => !r.example);

export function setSettings(changes) {
  state.settings = { ...state.settings, ...changes };
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(state.settings)); } catch {}
  emit();
}

// ——— Le PC de la maison ———
/** Le PC qui a donné signe de vie le plus récemment, et s'il est en ligne. */
export function homeStatus() {
  const d = [...state.devices].sort((a, b) => (b.lastSeen || 0) - (a.lastSeen || 0))[0];
  if (!d) return { known: false, online: false };
  return { known: true, online: Date.now() - (d.lastSeen || 0) < HOME_ONLINE_MS, ...d };
}

export async function refreshLocal() {
  try {
    const res = await fetch("/api/health", { cache: "no-store" });
    const data = res.ok ? await res.json() : null;
    state.local = data?.local ? data : null;
  } catch {
    state.local = null;
  }
  emit();
  pairIfLocal();
  return state.local;
}

// Ouverte depuis le serveur local et connectée : ce PC devient « le PC de la maison ».
async function pairIfLocal() {
  const u = state.user;
  if (!state.local || !u || !isOwner(u) || state.local.paired?.uid === u.uid) return;
  const token = refreshToken();
  if (!token) return;
  try {
    const res = await fetch("/api/pair", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ uid: u.uid, email: u.email, refreshToken: token }) });
    if (res.ok) state.local = { ...state.local, paired: { uid: u.uid, email: u.email } };
    emit();
  } catch {}
}

/** Prévient le PC (s'il est celui-ci) qu'un import attend : analyse immédiate plutôt qu'au prochain tour. */
function kickLocal() {
  if (state.local) fetch("/api/kick", { method: "POST" }).catch(() => {});
}

// ——— Firestore ———
let unsubs = [];
let ctx = null; // { db, fs, uid }
let offlineTimer;

const reelRef = (id) => ctx.fs.doc(ctx.db, "users", ctx.uid, "reels", id);
const mediaRef = (id) => ctx.fs.doc(ctx.db, "users", ctx.uid, "media", id);

async function start(uid) {
  stop();
  const { db, fs } = await cloud();
  ctx = { db, fs, uid };
  unsubs.push(
    fs.onSnapshot(fs.collection(db, "users", uid, "reels"), { includeMetadataChanges: true }, (snap) => {
      state.reels = snap.docs.map((d) => normalizeReel({ ...d.data(), id: d.id })).sort((a, b) => b.createdAt - a.createdAt);
      state.loaded = true;
      // Hors ligne seulement si la base reste en cache plusieurs secondes (le premier affichage vient toujours du cache).
      clearTimeout(offlineTimer);
      if (snap.metadata.fromCache) offlineTimer = setTimeout(() => { state.online = false; emit(); }, 6000);
      else { state.online = true; seedOnce(snap); }
      emit();
    }, (e) => console.warn("Firestore :", e.code || e)),
    fs.onSnapshot(fs.collection(db, "users", uid, "devices"), (snap) => {
      state.devices = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      emit();
    }, () => {})
  );
}

function stop() {
  unsubs.forEach((u) => u());
  unsubs = [];
  ctx = null;
  state.reels = [];
  state.devices = [];
  state.loaded = false;
}

// Premier lancement : quelques fiches d'exemple, une seule fois par compte.
let seeding = false;
async function seedOnce(snap) {
  if (seeding || !snap.empty || !ctx) return;
  seeding = true;
  const { fs, db, uid } = ctx;
  const meta = fs.doc(db, "users", uid, "meta", "app");
  if ((await fs.getDoc(meta).catch(() => null))?.data()?.seeded) return;
  const batch = fs.writeBatch(db);
  const now = Date.now();
  SEED_REELS.forEach((r, i) => {
    const reel = normalizeReel({ ...r, createdAt: now - (SEED_REELS.length - i) * 3600_000 });
    batch.set(fs.doc(db, "users", uid, "reels", reel.id), reel);
  });
  batch.set(meta, { seeded: true, at: now });
  await batch.commit().catch((e) => console.warn("Exemples :", e));
}

const failed = (e) => {
  console.warn("Écriture refusée :", e);
  import("./ui.js").then(({ toast }) => toast(e?.code === "permission-denied" ? "Accès refusé : connecte-toi avec ton compte." : "Enregistrement impossible, réessaie."));
};

// ——— Modifications ———
export function createReel(reel) {
  const full = normalizeReel({ status: "todo", ...reel });
  state.reels = [full, ...state.reels.filter((r) => r.id !== full.id)];
  emit();
  if (ctx) ctx.fs.setDoc(reelRef(full.id), full).catch(failed);
  return full;
}

/** `silent` évite de redessiner la vue (saisie en cours). */
export function patchReel(id, changes, { silent = false } = {}) {
  const reel = getReel(id);
  if (!reel) return;
  const extra = { updatedAt: Date.now(), ...(changes.status && changes.status !== reel.status ? { statusChangedAt: Date.now() } : {}) };
  state.reels = state.reels.map((r) => (r.id === id ? { ...r, ...changes, ...extra } : r));
  if (!silent) emit();
  if (ctx) ctx.fs.updateDoc(reelRef(id), { ...changes, ...extra }).catch(failed);
}

export function removeReel(id) {
  const reel = getReel(id);
  state.reels = state.reels.filter((r) => r.id !== id);
  emit();
  if (ctx) {
    ctx.fs.deleteDoc(reelRef(id)).catch(failed);
    for (const m of reel?.input?.shotIds || []) ctx.fs.deleteDoc(mediaRef(m)).catch(() => {});
  }
  return reel;
}

function saveShots(shots) {
  return shots.slice(0, 5).map((data) => {
    const id = uuid();
    ctx.fs.setDoc(mediaRef(id), { data, createdAt: Date.now() }).catch(failed);
    return id;
  });
}

/** Nouvel import : fiche provisoire « en attente », que le PC de la maison complétera. */
export function queueImport({ url = "", text = "", shots = [], notes = "" }) {
  const shotIds = ctx ? saveShots(shots) : [];
  const reel = createReel(pendingReel({ url, text, shotIds, notes }));
  kickLocal();
  return reel;
}

/** Refaire l'analyse d'une fiche (avec une légende ou des captures en plus). Statut, notes et favori sont gardés. */
export function requestAnalysis(id, { url, text, shots = [], notes } = {}) {
  const r = getReel(id);
  if (!r) return;
  const shotIds = shots.length && ctx ? saveShots(shots) : r.input.shotIds;
  const input = { url: url ?? (r.input.url || r.sourceUrl), text: text ?? (r.input.text || r.caption), shotIds };
  patchReel(id, { input, ...(notes !== undefined ? { notes } : {}), analysis: { ...r.analysis, state: "pending", requestedAt: Date.now(), error: "" } });
  kickLocal();
}

export function deleteExamples() {
  const ex = state.reels.filter((r) => r.example);
  ex.forEach((r) => removeReel(r.id));
  return ex.length;
}

/** Restauration : les fiches de la sauvegarde remplacent celles qui ont le même id, les autres sont gardées. */
export function restoreBackup(backup) {
  const incoming = (Array.isArray(backup?.reels) ? backup.reels : []).filter((r) => r?.id && r.title);
  let added = 0, replaced = 0;
  for (const raw of incoming) {
    const reel = normalizeReel(raw);
    if (getReel(reel.id)) replaced++; else added++;
    createReel(reel);
  }
  return { added, replaced };
}

export function loadState() {
  state.settings = { ...state.settings, ...readJson(SETTINGS_KEY, {}) };
  onUser((u) => {
    const changed = state.user?.uid !== u?.uid;
    state.user = u;
    state.authKnown = true;
    if (changed) {
      if (u && isOwner(u)) start(u.uid);
      else stop();
    }
    emit();
    pairIfLocal();
  });
  cloud().catch((e) => {
    console.warn("Firebase :", e);
    state.authKnown = true;
    emit();
  });
  refreshLocal();
  // L'état « PC en ligne » dépend du temps qui passe : on le réévalue chaque minute.
  setInterval(() => { if (state.devices.length) emit(); }, 60_000);
  window.addEventListener("online", () => emit());
  try { navigator.storage?.persist?.(); } catch {}
}
