// Gestion de l'installation PWA (« Ajouter à l'écran d'accueil »).
let deferredPrompt = null;
const changeListeners = new Set();

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  changeListeners.forEach((fn) => fn());
});
window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  changeListeners.forEach((fn) => fn());
});

export const isStandalone = () =>
  window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;

export const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
export const isMobile = () => isIos() || /android|mobile/i.test(navigator.userAgent);

export function installState() {
  const ios = isIos();
  return {
    show: !isStandalone() && (ios || Boolean(deferredPrompt)),
    ios,
    canPrompt: Boolean(deferredPrompt),
  };
}

export async function promptInstall() {
  if (!deferredPrompt) return;
  deferredPrompt.prompt();
  await deferredPrompt.userChoice.catch(() => null);
  deferredPrompt = null;
  changeListeners.forEach((fn) => fn());
}

export const onInstallChange = (fn) => changeListeners.add(fn);
