// Accès à Firestore depuis le PC de la maison, en ton nom : l'app (sur localhost) lui a confié
// un jeton de rafraîchissement Firebase. Les règles de sécurité s'appliquent comme dans l'app.
// API REST officielle — aucun compte de service, aucune dépendance.
import { readFileSync, existsSync, writeFileSync, unlinkSync } from "node:fs";
import { FIREBASE } from "../public/js/config.js";

const BASE = `https://firestore.googleapis.com/v1/projects/${FIREBASE.projectId}/databases/(default)/documents`;

export function loadSession(file) {
  if (!existsSync(file)) return null;
  try {
    const s = JSON.parse(readFileSync(file, "utf8"));
    return s.uid && s.refreshToken ? s : null;
  } catch {
    return null;
  }
}
export const saveSession = (file, session) => writeFileSync(file, JSON.stringify(session, null, 2));
export const clearSession = (file) => { try { unlinkSync(file); } catch {} };

// ——— Valeurs Firestore ⇄ JS ———
export function encode(v) {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === "string") return { stringValue: v };
  if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(encode) } : {} };
  return { mapValue: { fields: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => [k, encode(x)])) } };
}
export function decode(v = {}) {
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return v.doubleValue;
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return Date.parse(v.timestampValue);
  if ("arrayValue" in v) return (v.arrayValue.values || []).map(decode);
  if ("mapValue" in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, decode(x)]));
  return null;
}
const docToObject = (doc) => ({ id: doc.name.split("/").pop(), ...Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, decode(v)])) });

export class SessionError extends Error {}

/** Client Firestore pour une session (uid + refreshToken). */
export function firestoreClient(session, { onRefresh } = {}) {
  let idToken = null;
  let expires = 0;

  async function token() {
    if (idToken && Date.now() < expires - 60_000) return idToken;
    const res = await fetch(`https://securetoken.googleapis.com/v1/token?key=${FIREBASE.apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: session.refreshToken }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new SessionError(data.error?.message || `Jeton refusé (${res.status})`);
    idToken = data.id_token;
    expires = Date.now() + Number(data.expires_in || 3600) * 1000;
    if (data.refresh_token && data.refresh_token !== session.refreshToken) {
      session.refreshToken = data.refresh_token;
      onRefresh?.(session);
    }
    return idToken;
  }

  async function call(method, url, body) {
    const res = await fetch(url, {
      method,
      headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 404) return null;
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 || res.status === 403) throw new SessionError(data.error?.message || "Accès refusé");
    if (!res.ok) throw new Error(`Firestore ${res.status} : ${data.error?.message || ""}`);
    return data;
  }

  const userPath = (...parts) => ["users", session.uid, ...parts].join("/");

  return {
    uid: session.uid,
    async get(...parts) {
      const doc = await call("GET", `${BASE}/${userPath(...parts)}`);
      return doc ? docToObject(doc) : null;
    },
    /** Met à jour (ou crée) uniquement les champs donnés. */
    async patch(parts, data) {
      const mask = Object.keys(data).map((k) => `updateMask.fieldPaths=${encodeURIComponent(k)}`).join("&");
      return call("PATCH", `${BASE}/${userPath(...parts)}?${mask}`, { fields: encode(data).mapValue.fields });
    },
    async remove(...parts) {
      return call("DELETE", `${BASE}/${userPath(...parts)}`);
    },
    async list(collection) {
      const out = [];
      let pageToken = "";
      do {
        const data = await call("GET", `${BASE}/${userPath(collection)}?pageSize=300${pageToken ? `&pageToken=${pageToken}` : ""}`);
        out.push(...(data?.documents || []).map(docToObject));
        pageToken = data?.nextPageToken || "";
      } while (pageToken);
      return out;
    },
    /** Documents de la collection dont `field` vaut l'une des `values`. */
    async whereIn(collection, field, values) {
      const rows = await call("POST", `${BASE}/${userPath()}:runQuery`, {
        structuredQuery: {
          from: [{ collectionId: collection }],
          where: { fieldFilter: { field: { fieldPath: field }, op: "IN", value: encode(values) } },
        },
      });
      return (rows || []).filter((r) => r.document).map((r) => docToObject(r.document));
    },
  };
}
