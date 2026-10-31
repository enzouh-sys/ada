// Génère les fichiers propres à ton installation à partir de ada.config.json :
//   public/js/config.js  (projet Firebase + comptes autorisés, lu par l'app et par le PC)
//   firestore.rules      (base réservée à tes comptes)
//   firebase.json        (hébergement, base, connexion Google)
//   .firebaserc          (projet par défaut de la CLI Firebase)
// `npm run configure` — lancé aussi par `npm run setup` et `npm run deploy`.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_FILE = path.join(root, "ada.config.json");

export function readConfig() {
  if (!existsSync(CONFIG_FILE)) return null;
  return JSON.parse(readFileSync(CONFIG_FILE, "utf8"));
}

export function writeConfig(cfg) {
  writeFileSync(CONFIG_FILE, `${JSON.stringify(cfg, null, 2)}\n`);
}

function check(cfg) {
  const missing = ["projectId", "apiKey", "appId", "messagingSenderId"].filter((k) => !cfg.firebase?.[k]);
  if (missing.length) throw new Error(`ada.config.json : il manque firebase.${missing.join(", firebase.")}`);
  if (!cfg.ownerEmails?.length) throw new Error("ada.config.json : ownerEmails est vide (au moins ton adresse Google).");
}

export function configure(cfg = readConfig()) {
  if (!cfg) throw new Error("Pas encore de ada.config.json : lance `npm run setup`.");
  check(cfg);
  const { projectId } = cfg.firebase;
  const authDomain = `${projectId}.firebaseapp.com`;
  const appUrl = cfg.appUrl || `https://${authDomain}`;
  const emails = cfg.ownerEmails.map((e) => String(e).trim().toLowerCase()).filter(Boolean);

  writeFileSync(
    path.join(root, "public", "js", "config.js"),
    `// Généré par \`npm run configure\` depuis ada.config.json — ne pas modifier à la main.
// Configuration Firebase d'Ada, partagée par l'app et par le PC de la maison.
// La clé est publique par nature : la sécurité vient de firestore.rules (comptes autorisés uniquement).
export const FIREBASE = ${JSON.stringify({ apiKey: cfg.firebase.apiKey, authDomain, projectId, appId: cfg.firebase.appId, messagingSenderId: cfg.firebase.messagingSenderId }, null, 2)};

/** Adresse publique de l'app (Firebase Hosting). */
export const APP_URL = ${JSON.stringify(appUrl)};

/** Seuls ces comptes Google peuvent ouvrir Ada (les mêmes que dans firestore.rules). */
export const OWNER_EMAILS = ${JSON.stringify(emails)};

/** Le PC de la maison est considéré « en ligne » s'il a donné signe de vie depuis moins de ça. */
export const HOME_ONLINE_MS = 3 * 60_000;
`
  );

  const rules = readFileSync(path.join(root, "firestore.rules.template"), "utf8").replace("{{OWNER_EMAILS}}", `[${emails.map((e) => `'${e.replace(/'/g, "")}'`).join(", ")}]`);
  writeFileSync(path.join(root, "firestore.rules"), rules);

  const firebaseJson = {
    hosting: {
      public: "public",
      ignore: ["**/.*"],
      rewrites: [{ source: "**", destination: "/index.html" }],
      headers: [
        { source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache" }] },
        { source: "**/*.@(js|css|html|webmanifest)", headers: [{ key: "Cache-Control", value: "no-cache" }] },
      ],
    },
    firestore: { database: "(default)", location: cfg.firestoreLocation || "eur3", rules: "firestore.rules", indexes: "firestore.indexes.json" },
    auth: { providers: { googleSignIn: { oAuthBrandDisplayName: "Ada", supportEmail: emails[0] } } },
  };
  writeFileSync(path.join(root, "firebase.json"), `${JSON.stringify(firebaseJson, null, 2)}\n`);
  writeFileSync(path.join(root, ".firebaserc"), `${JSON.stringify({ projects: { default: projectId } }, null, 2)}\n`);
  return { projectId, appUrl, emails };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try {
    const { projectId, appUrl, emails } = configure();
    console.log(`✓ Configuration générée pour ${projectId} (${appUrl}) — comptes autorisés : ${emails.join(", ")}`);
  } catch (e) {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  }
}
