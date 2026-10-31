// Connexion : Ada est privée, réservée à ton compte Google.
import { getState } from "../store.js";
import { signIn, signOut } from "../cloud.js";
import { icon, esc, toast } from "../ui.js";

export function render() {
  const { user } = getState();
  const refused = Boolean(user);
  return `
  <section class="login">
    <img src="/icons/icon-512.png" alt="" width="96" height="96">
    <h1 class="display">Ada<span class="cursor">_</span></h1>
    <p class="lead">Tes reels dev & Claude Code, transformés en fiches. Envoie-les de partout — ton PC les analyse à la maison.</p>
    ${refused ? `
      <div class="notice warn">${icon("alert", { size: 18 })}<div><strong>Ada est privée.</strong> Le compte ${esc(user.email)} n'y a pas accès.</div></div>
      <button class="btn btn-ghost btn-lg btn-block" id="out">Changer de compte</button>` : `
      <button class="btn btn-primary btn-lg btn-block" id="in">${icon("sparkles", { size: 18 })} Se connecter avec Google</button>
      <p class="muted sm">Réservé au propriétaire d'Ada.</p>`}
  </section>`;
}

export function mount(root) {
  const btn = root.querySelector("#in");
  btn?.addEventListener("click", async () => {
    btn.disabled = true;
    try { await signIn(); } catch (err) { toast(`Connexion impossible (${esc(err.code || err.message)})`); }
    btn.disabled = false;
  });
  root.querySelector("#out")?.addEventListener("click", async () => { await signOut(); });
}
