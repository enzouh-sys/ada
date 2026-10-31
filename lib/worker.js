// Le PC de la maison : il surveille les imports « en attente » (envoyés de n'importe où),
// les analyse avec Claude (Code ou API), et renvoie la fiche complète dans Firestore.
import { hostname } from "node:os";
import { analyze, engineInfo } from "./analyze.js";
import { firestoreClient, saveSession, SessionError } from "./firestore-rest.js";
import { ficheToFields, normalizeReel, uuid } from "../public/js/fiche.js";

const POLL_MS = 15_000;
const HEARTBEAT_MS = 60_000;
const STALE_RUN_MS = 40 * 60_000; // une analyse « en cours » depuis plus longtemps a été interrompue

let sharp = null;
try { sharp = (await import("sharp")).default; } catch {}

// Miniature légère, gardée dans la fiche elle-même (une fiche Firestore ne dépasse pas 1 Mo).
async function thumbnail(dataUrl) {
  const m = String(dataUrl || "").match(/^data:image\/[\w+]+;base64,(.+)$/);
  if (!m) return "";
  if (!sharp) return dataUrl.length < 150_000 ? dataUrl : "";
  try {
    const buf = await sharp(Buffer.from(m[1], "base64")).rotate().resize({ width: 540, height: 720, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 72, mozjpeg: true }).toBuffer();
    return `data:image/jpeg;base64,${buf.toString("base64")}`;
  } catch {
    return "";
  }
}

export function createWorker({ session, sessionFile, log = console.log, client = null }) {
  const fs = client || firestoreClient(session, { onRefresh: (s) => saveSession(sessionFile, s) });
  const deviceId = session.deviceId;
  const status = { running: true, busy: false, lastPoll: 0, lastError: "", processed: 0, current: null };
  let timer = null;
  let lastBeat = 0;
  let again = false; // un import est arrivé pendant une analyse : on refait un tour juste après

  async function heartbeat(force = false) {
    if (!force && Date.now() - lastBeat < HEARTBEAT_MS) return;
    lastBeat = Date.now();
    const { engine, model, research } = engineInfo();
    await fs.patch(["devices", deviceId], { name: hostname(), lastSeen: Date.now(), engine, model: model || "", research: Boolean(research), processed: status.processed });
  }

  async function processOne(r) {
    const a = r.analysis || {};
    const input = r.input || {};
    status.current = r.title;
    log(`  ⏳ Analyse : ${input.url || (input.text || "").slice(0, 60) || r.id}`);
    await fs.patch(["reels", r.id], { analysis: { ...a, state: "running", startedAt: Date.now(), by: deviceId, error: "" } });
    try {
      const shots = [];
      for (const id of input.shotIds || []) {
        const m = await fs.get("media", id).catch(() => null);
        if (m?.data) shots.push(m.data);
      }
      // Les notes de la fiche sont les consignes du propriétaire (« une fiche par skill »…) : Claude les lit en premier.
      const instructions = r.notes || "";
      if (instructions.trim()) log(`  📝 Consignes : ${instructions.trim().slice(0, 80)}`);
      const result = await analyze({ url: input.url || "", text: input.text || "", images: shots, instructions });
      const image = await thumbnail(result.source.image);
      const all = result.fiches.map((fiche) => ficheToFields({ fiche, source: result.source, engine: result.engine, model: result.model }));
      const total = all.length;
      const done = { ...a, state: "done", startedAt: Date.now(), doneAt: Date.now(), by: deviceId, error: "" };
      await fs.patch(["reels", r.id], {
        ...all[0],
        ...(image ? { image } : {}),
        groupId: total > 1 ? r.id : "",
        groupIndex: 0,
        groupTotal: total > 1 ? total : 0,
        updatedAt: Date.now(),
        analysis: done,
      });
      if (total > 1 || r.groupTotal > 1) await syncSiblings(r, all.slice(1), { image, done, input });
      for (const id of input.shotIds || []) await fs.remove("media", id).catch(() => {});
      await fs.patch(["reels", r.id], { input: { ...input, shotIds: [] } });
      status.processed++;
      log(total > 1 ? `  ✓ ${total} fiches prêtes : ${all.map((f) => f.title).join(" · ")}` : `  ✓ Fiche prête : ${all[0].title}`);
    } catch (e) {
      if (e instanceof SessionError) throw e;
      const state = e.code === "caption_needed" ? "needs_input" : "error";
      await fs.patch(["reels", r.id], { analysis: { ...a, state, doneAt: Date.now(), by: deviceId, error: String(e.message || e).slice(0, 400) } });
      log(`  ✗ ${e.message || e}`);
    } finally {
      status.current = null;
    }
  }

  // Fiches « sœurs » d'un même reel : celles d'une analyse précédente sont mises à jour (statut, notes et
  // favori gardés), les manquantes créées, celles en trop retirées.
  async function syncSiblings(head, extra, { image, done, input }) {
    const total = extra.length + 1;
    const old = (await fs.list("reels")).filter((x) => x.groupId === head.id && x.id !== head.id).sort((x, y) => (x.groupIndex || 0) - (y.groupIndex || 0));
    for (const [i, fields] of extra.entries()) {
      const prev = old[i];
      const group = { groupId: head.id, groupIndex: i + 1, groupTotal: total };
      if (prev) {
        await fs.patch(["reels", prev.id], { ...fields, ...(image ? { image } : {}), ...group, updatedAt: Date.now(), analysis: done });
      } else {
        const reel = normalizeReel({
          ...fields,
          ...group,
          id: uuid(),
          image: image || "",
          status: "todo",
          // Juste après la fiche principale dans la bibliothèque.
          createdAt: (head.createdAt || Date.now()) - (i + 1),
          input: { url: input.url || "", text: input.text || "", shotIds: [] },
          analysis: done,
        });
        await fs.patch(["reels", reel.id], reel);
      }
    }
    for (const gone of old.slice(extra.length)) await fs.remove("reels", gone.id).catch(() => {});
  }

  async function tick() {
    if (status.busy || !status.running) return;
    status.busy = true;
    try {
      await heartbeat();
      const rows = await fs.whereIn("reels", "analysis.state", ["pending", "running"]);
      const todo = rows
        .filter((r) => r.analysis.state === "pending" || Date.now() - (r.analysis.startedAt || 0) > STALE_RUN_MS)
        .sort((x, y) => (x.analysis.requestedAt || 0) - (y.analysis.requestedAt || 0));
      for (const r of todo) {
        await processOne(r);
        await heartbeat(true);
      }
      status.lastPoll = Date.now();
      status.lastError = "";
    } catch (e) {
      status.lastError = e.message || String(e);
      if (e instanceof SessionError) {
        log(`  ⚠️  Session Ada expirée (${e.message}) — rouvre http://localhost:${process.env.PORT || 5174} et reconnecte-toi.`);
        status.running = false;
      } else log(`  ⚠️  ${status.lastError}`);
    } finally {
      status.busy = false;
      if (again) { again = false; setTimeout(() => tick().then(loop), 0); }
    }
  }

  function loop() {
    clearTimeout(timer);
    if (!status.running) return;
    timer = setTimeout(async () => { await tick(); loop(); }, POLL_MS);
  }

  tick().then(loop);
  return {
    status,
    email: session.email,
    uid: session.uid,
    /** Un import vient d'arriver : on regarde tout de suite. */
    kick() { if (status.busy) again = true; else tick().then(loop); },
    stop() { status.running = false; clearTimeout(timer); },
  };
}
