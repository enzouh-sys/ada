// Connexion à Firebase : compte Google + base Firestore (cache hors ligne inclus).
// Le SDK est chargé à la demande depuis le CDN officiel.
import { FIREBASE, OWNER_EMAILS } from "./config.js";

const SDK = "https://www.gstatic.com/firebasejs/12.4.0";

let ready = null;
let user = null;
let fbUser = null;
let known = false; // vrai dès que Firebase a dit si on est connecté ou non
const userListeners = new Set();

export const currentUser = () => user;
export const authKnown = () => known;
export const isOwner = (u = user) => Boolean(u && u.emailVerified && OWNER_EMAILS.includes(u.email));
export function onUser(fn) {
  userListeners.add(fn);
  return () => userListeners.delete(fn);
}

/** Charge le SDK une seule fois et renvoie { auth, db, fs, authMod } (fs = fonctions Firestore). */
export function cloud() {
  ready ||= (async () => {
    const [{ initializeApp }, authMod, fs] = await Promise.all([
      import(`${SDK}/firebase-app.js`),
      import(`${SDK}/firebase-auth.js`),
      import(`${SDK}/firebase-firestore.js`),
    ]);
    const app = initializeApp(FIREBASE);
    const auth = authMod.initializeAuth(app, {
      persistence: [authMod.indexedDBLocalPersistence, authMod.browserLocalPersistence],
      popupRedirectResolver: authMod.browserPopupRedirectResolver,
    });
    let db;
    try {
      db = fs.initializeFirestore(app, { localCache: fs.persistentLocalCache({ tabManager: fs.persistentMultipleTabManager() }) });
    } catch {
      db = fs.getFirestore(app);
    }
    authMod.getRedirectResult(auth).catch((e) => console.warn("Connexion Google :", e.code || e));
    authMod.onAuthStateChanged(auth, (u) => {
      known = true;
      fbUser = u;
      user = u ? { uid: u.uid, name: u.displayName || "Moi", photo: u.photoURL || "", email: u.email || "", emailVerified: u.emailVerified } : null;
      try { localStorage.setItem("ada-signed-in", user ? "1" : "0"); } catch {}
      userListeners.forEach((fn) => fn(user));
    });
    return { auth, db, fs, authMod };
  })();
  return ready;
}

const standalone = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const mobile = () => /iphone|ipad|ipod|android/i.test(navigator.userAgent);

export async function signIn() {
  const { auth, authMod } = await cloud();
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  // App installée ou mobile sur le domaine de l'app : redirection (les pop-up y sont peu fiables).
  if ((standalone() || mobile()) && location.hostname === FIREBASE.authDomain) return authMod.signInWithRedirect(auth, provider);
  try {
    await authMod.signInWithPopup(auth, provider);
  } catch (e) {
    if (e.code === "auth/popup-blocked") return authMod.signInWithRedirect(auth, provider);
    if (e.code !== "auth/popup-closed-by-user" && e.code !== "auth/cancelled-popup-request") throw e;
  }
}

export async function signOut() {
  const { auth, authMod } = await cloud();
  await authMod.signOut(auth);
}

/** Jeton de longue durée, transmis au PC de la maison (uniquement sur localhost) pour qu'il agisse en ton nom. */
export const refreshToken = () => fbUser?.refreshToken || null;

export const wasSignedIn = () => {
  try { return localStorage.getItem("ada-signed-in") === "1"; } catch { return false; }
};
