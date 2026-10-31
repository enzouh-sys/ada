// Écrit toute la base en Markdown dans export/ : un fichier que Claude Code lit très bien.
// `npm run export`            → export/ada.md (tout) + export/ada-adoptees.md
// Dans Claude Code : « @ada/export/ada-adoptees.md applique ces habitudes à ce projet ».
// Utilise la connexion du PC de la maison (ouvre http://localhost:5174 et connecte-toi une fois).
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { libraryToMarkdown } from "../public/js/markdown.js";
import { normalizeReel } from "../public/js/fiche.js";
import { loadSession, saveSession, firestoreClient } from "../lib/firestore-rest.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const sessionFile = path.join(root, ".ada-session.json");
const session = loadSession(sessionFile);
if (!session) {
  console.error("Ce PC n'est pas encore connecté : lance `npm run dev`, ouvre http://localhost:5174 et connecte-toi.");
  process.exit(1);
}

const fs = firestoreClient(session, { onRefresh: (s) => saveSession(sessionFile, s) });
const reels = (await fs.list("reels")).map(normalizeReel).sort((a, b) => b.createdAt - a.createdAt);
const mine = reels.filter((r) => !r.example);
const all = mine.length ? mine : reels;
const adopted = all.filter((r) => r.status === "adopted");

const out = path.join(root, "export");
mkdirSync(out, { recursive: true });
writeFileSync(path.join(out, "ada.md"), libraryToMarkdown(all));
writeFileSync(path.join(out, "ada-adoptees.md"), libraryToMarkdown(adopted, { title: "Ada — mes astuces adoptées" }));
console.log(`✓ ${all.length} fiche(s) → export/ada.md\n✓ ${adopted.length} adoptée(s) → export/ada-adoptees.md`);
