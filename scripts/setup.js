// Installation guidée d'Ada sur ton propre compte Google / Firebase. `npm run setup`
// 1. vérifie la CLI Firebase et ta connexion
// 2. crée (ou réutilise) ton projet Firebase et son app web
// 3. écrit ada.config.json puis les fichiers de config (scripts/configure.js)
// 4. déploie la base (règles), la connexion Google et l'app en ligne
// 5. autorise http://localhost pour la connexion Google (le PC de la maison s'y connecte)
// Rien n'est envoyé ailleurs que chez Google/Firebase, sur ton propre compte.
import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { readConfig, writeConfig, configure } from "./configure.js";

const rl = createInterface({ input: stdin, output: stdout });
const ask = async (q, def = "") => (await rl.question(def ? `${q} [${def}] : ` : `${q} : `)).trim() || def;
const say = (m = "") => console.log(m);
const fail = (m) => { say(`\n✗ ${m}`); rl.close(); process.exit(1); };

// La CLI Firebase (firebase-tools). Sous Windows, « firebase » est un script .cmd : on passe par le shell.
function firebase(args, { json = true, inherit = false } = {}) {
  const quoted = args.map((a) => (/[\s"]/.test(a) ? `"${a.replace(/"/g, '\\"')}"` : a));
  const line = ["firebase", ...quoted, ...(json ? ["--json"] : [])].join(" ");
  const r = spawnSync(line, { shell: true, encoding: "utf8", stdio: inherit ? "inherit" : "pipe" });
  if (inherit) return { ok: r.status === 0 };
  let data = null;
  try { data = JSON.parse(r.stdout); } catch {}
  return { ok: r.status === 0 && data?.status !== "error", data, out: r.stdout + r.stderr };
}

async function main() {
  say("\n  ⌨️  Installation d'Ada\n");

  // 1. CLI Firebase et connexion
  if (spawnSync("firebase --version", { shell: true, encoding: "utf8" }).status !== 0) {
    fail("La CLI Firebase est introuvable. Installe-la : npm install -g firebase-tools, puis relance npm run setup.");
  }
  let login = firebase(["login:list"]);
  let account = login.data?.result?.[0]?.user?.email;
  if (!account) {
    say("Connecte-toi à Firebase avec ton compte Google (une fenêtre de navigateur va s'ouvrir).");
    firebase(["login"], { json: false, inherit: true });
    login = firebase(["login:list"]);
    account = login.data?.result?.[0]?.user?.email;
    if (!account) fail("Connexion Firebase impossible.");
  }
  say(`Compte Firebase : ${account}\n`);

  // 2. Projet et app web
  const previous = readConfig();
  const emails = (await ask("Comptes Google autorisés à ouvrir Ada (séparés par des virgules)", previous?.ownerEmails?.join(", ") || account))
    .split(",").map((e) => e.trim().toLowerCase()).filter(Boolean);
  const suggested = previous?.firebase?.projectId || `ada-${Math.random().toString(36).slice(2, 8)}`;
  const projectId = (await ask("ID du projet Firebase (existant ou à créer, lettres minuscules, chiffres, tirets)", suggested)).toLowerCase();
  const location = await ask("Région de la base (eur3 = Europe, nam5 = Amérique du Nord)", previous?.firestoreLocation || "eur3");

  const projects = firebase(["projects:list"]).data?.result || [];
  if (!projects.some((p) => p.projectId === projectId)) {
    say(`\nCréation du projet ${projectId}…`);
    const created = firebase(["projects:create", projectId, "--display-name", "Ada"]);
    if (!created.ok) fail(`Création du projet impossible :\n${created.out.slice(-600)}`);
  }

  let app = (firebase(["apps:list", "WEB", "--project", projectId]).data?.result || [])[0];
  if (!app) {
    say("Création de l'app web…");
    const created = firebase(["apps:create", "WEB", "Ada web", "--project", projectId]);
    if (!created.ok) fail(`Création de l'app web impossible :\n${created.out.slice(-600)}`);
    app = created.data.result;
  }
  const sdk = firebase(["apps:sdkconfig", "WEB", app.appId, "--project", projectId]);
  const sdkConfig = sdk.data?.result?.sdkConfig || sdk.data?.result;
  if (!sdkConfig?.apiKey) fail(`Configuration de l'app introuvable :\n${sdk.out.slice(-600)}`);

  // 3. Fichiers de config
  writeConfig({
    firebase: { projectId, apiKey: sdkConfig.apiKey, appId: sdkConfig.appId, messagingSenderId: sdkConfig.messagingSenderId },
    ownerEmails: emails,
    firestoreLocation: location,
  });
  const { appUrl } = configure();
  say("✓ ada.config.json et fichiers de config écrits");

  // 4. Déploiement : base + règles, connexion Google, app en ligne
  say("\nDéploiement (base, connexion Google, app en ligne)…");
  if (!firebase(["deploy", "--only", "firestore,auth,hosting", "--project", projectId, "--non-interactive"], { json: false, inherit: true }).ok) {
    fail("Le déploiement a échoué (voir ci-dessus). Corrige puis relance npm run setup : c'est sans risque.");
  }

  // 5. localhost autorisé pour la connexion Google
  const domains = await authorizeLocalhost(projectId).catch((e) => ({ error: e.message }));
  if (domains.error) {
    say(`\n⚠️  Impossible d'autoriser localhost automatiquement (${domains.error}).`);
    say(`   Console Firebase → Authentication → Settings → Authorized domains → Add domain → localhost`);
    say(`   https://console.firebase.google.com/project/${projectId}/authentication/settings`);
  } else say("✓ localhost autorisé pour la connexion Google");

  say(`\n✓ Ada est installée : ${appUrl}`);
  say("\nÉtapes suivantes :");
  say("  1. npm run dev                       ← ce PC devient « le PC de la maison » (il analyse tes imports)");
  say("  2. http://localhost:5174             ← ouvre et connecte-toi une fois avec Google");
  say(`  3. ${appUrl}  ← sur ton téléphone : connecte-toi, installe l'app, importe tes reels\n`);
  rl.close();
}

// Ajoute « localhost » aux domaines autorisés de Firebase Auth, avec ta connexion de la CLI Firebase.
// (Identifiants OAuth publics de firebase-tools, comme la CLI elle-même ; aucun jeton n'est affiché.)
async function authorizeLocalhost(projectId) {
  const store = JSON.parse(readFileSync(path.join(homedir(), ".config", "configstore", "firebase-tools.json"), "utf8"));
  const refresh = store.tokens?.refresh_token;
  if (!refresh) throw new Error("connexion CLI introuvable");
  const tok = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refresh,
      client_id: "563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com",
      client_secret: "j9iVZfS8kkCEFUPaAeJV0sAi",
    }),
  }).then((r) => r.json());
  if (!tok.access_token) throw new Error(tok.error || "jeton refusé");
  const url = `https://identitytoolkit.googleapis.com/admin/v2/projects/${projectId}/config`;
  const headers = { Authorization: `Bearer ${tok.access_token}`, "Content-Type": "application/json", "x-goog-user-project": projectId };
  const cfg = await fetch(url, { headers }).then((r) => r.json());
  if (cfg.error) throw new Error(cfg.error.message);
  const wanted = [...new Set([...(cfg.authorizedDomains || []), "localhost", `${projectId}.firebaseapp.com`, `${projectId}.web.app`])];
  if (wanted.length === (cfg.authorizedDomains || []).length) return wanted;
  const res = await fetch(`${url}?updateMask=authorizedDomains`, { method: "PATCH", headers, body: JSON.stringify({ authorizedDomains: wanted }) }).then((r) => r.json());
  if (res.error) throw new Error(res.error.message);
  return res.authorizedDomains;
}

if (!existsSync(path.join(process.cwd(), "firestore.rules.template"))) fail("Lance npm run setup depuis le dossier d'Ada.");
main().catch((e) => fail(e.message || String(e)));
