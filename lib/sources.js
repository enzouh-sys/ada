// Récupère le contenu public d'un lien (Instagram, TikTok, YouTube, GitHub, article)
// par les voies officielles (oEmbed, API publique, balises de partage). Aucun contournement.
import { detectPlatform } from "../public/js/taxonomy.js";

const FETCH_TIMEOUT_MS = 12000;
const MAX_IMAGE_BYTES = 3_500_000;
const UA = "Mozilla/5.0 (compatible; Ada/0.1; +http://localhost)";

export class AdaError extends Error {
  constructor(message, { status = 400, code = "import_failed" } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function fetchWithTimeout(url, init = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, headers: { "User-Agent": UA, ...init.headers }, signal: ctrl.signal, redirect: "follow" });
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(str = "") {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&quot;/g, '"')
    .replace(/&apos;|&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(html = "") {
  return decodeEntities(
    html
      .replace(/<br\s*\/?>/gi, "\n")
      .replace(/<\/(p|div|li|h\d|pre|tr)>/gi, "\n")
      .replace(/<script[\s\S]*?<\/script>/gi, "")
      .replace(/<style[\s\S]*?<\/style>/gi, "")
      .replace(/<(nav|footer|header|aside)[\s\S]*?<\/\1>/gi, "")
      .replace(/<[^>]+>/g, "")
  )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function metaContent(html, prop) {
  const re = new RegExp(
    `<meta[^>]+(?:property|name)=["']${prop}["'][^>]*content=["']([^"']*)["']|<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${prop}["']`,
    "i"
  );
  const m = html.match(re);
  return m ? decodeEntities(m[1] ?? m[2] ?? "") : "";
}

// Le serveur ne va chercher que des pages publiques (pas d'adresses internes).
function assertPublicUrl(url) {
  const { protocol, hostname } = new URL(url);
  const privateHost =
    /^(localhost|.*\.local|.*\.internal)$/i.test(hostname) ||
    /^(127\.|10\.|192\.168\.|169\.254\.|0\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname) ||
    hostname.startsWith("[");
  if (!/^https?:$/.test(protocol) || privateHost) throw new AdaError("Ce lien n'est pas accessible.");
}

const captionNeeded = (msg) => new AdaError(msg, { code: "caption_needed" });

// « 1 234 likes, 12 comments - dev on 3 mars 2026: "La légende…". » → « La légende… »
function captionFromInstagramMeta(desc = "") {
  const m = desc.match(/:\s*["“]([\s\S]*)["”]\s*\.?\s*$/);
  return (m ? m[1] : desc).trim();
}

// Instagram : l'oEmbed officiel de Meta (token d'app) donne légende et miniature.
// Sans token, on lit les balises de partage (og:) de la page publique, quand Instagram les sert.
async function fromInstagram(url) {
  const token = process.env.META_OEMBED_TOKEN || process.env.INSTAGRAM_OEMBED_TOKEN;
  if (token) {
    const endpoint = `https://graph.facebook.com/v21.0/instagram_oembed?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(token)}`;
    const res = await fetchWithTimeout(endpoint).catch(() => null);
    const data = res && (await res.json().catch(() => null));
    if (res?.ok && data) {
      const caption = stripTags(data.html || "").replace(/A post shared by[\s\S]*$/i, "").trim() || data.title || "";
      return { platform: "instagram", title: "", text: caption, caption, image: data.thumbnail_url || "", author: data.author_name ? `@${data.author_name}` : "" };
    }
  }
  let html = "";
  try {
    const res = await fetchWithTimeout(url, { headers: { Accept: "text/html" } });
    if (res.ok) html = (await res.text()).slice(0, 1_000_000);
  } catch {}
  const caption = captionFromInstagramMeta(metaContent(html, "og:description") || metaContent(html, "description"));
  const image = metaContent(html, "og:image");
  const author = (metaContent(html, "og:title").match(/^(.*?)\s+(?:on|sur)\s+Instagram/i)?.[1] || "").trim();
  if (!caption && !image) throw captionNeeded("Instagram ne partage pas ce reel sans connexion. Copie sa légende (ou fais une capture) et ajoute-la juste en dessous.");
  return { platform: "instagram", title: "", text: caption, caption, image, author: author && !author.startsWith("@") ? `@${author}` : author };
}

// Facebook (vidéos, reels, fb.watch) : oEmbed officiel de Meta avec un token d'app, sinon balises de partage publiques.
async function fromFacebook(url) {
  const token = process.env.META_OEMBED_TOKEN || process.env.INSTAGRAM_OEMBED_TOKEN;
  if (token) {
    const endpoint = `https://graph.facebook.com/v21.0/oembed_video?url=${encodeURIComponent(url)}&access_token=${encodeURIComponent(token)}`;
    const res = await fetchWithTimeout(endpoint).catch(() => null);
    const data = res && (await res.json().catch(() => null));
    if (res?.ok && data) {
      const caption = stripTags(data.html || "").trim() || data.title || "";
      return { platform: "facebook", title: data.title || "", text: caption, caption, image: data.thumbnail_url || "", author: data.author_name || "" };
    }
  }
  let html = "";
  try {
    const res = await fetchWithTimeout(url, { headers: { Accept: "text/html", "Accept-Language": "fr,en;q=0.8" } });
    if (res.ok) html = (await res.text()).slice(0, 1_500_000);
  } catch {}
  const caption = metaContent(html, "og:description") || metaContent(html, "description");
  const image = metaContent(html, "og:image");
  const title = metaContent(html, "og:title");
  if (!caption && !image) throw captionNeeded("Facebook ne partage pas cette vidéo sans connexion. Copie sa description (ou fais une capture) et ajoute-la juste en dessous.");
  return { platform: "facebook", title, text: [title, caption].filter(Boolean).join("\n\n"), caption, image, author: "" };
}

async function fromTikTok(url) {
  const res = await fetchWithTimeout(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`).catch(() => null);
  if (!res?.ok) throw captionNeeded("TikTok ne répond pas pour le moment. Colle la description de la vidéo juste en dessous.");
  const data = await res.json().catch(() => null);
  if (!data?.title && !data?.thumbnail_url) throw captionNeeded("Cette vidéo TikTok n'est pas accessible (privée ou supprimée ?). Colle sa description juste en dessous.");
  return {
    platform: "tiktok",
    title: "",
    text: data.title || "",
    caption: data.title || "",
    image: data.thumbnail_url || "",
    author: data.author_name ? `@${data.author_unique_id || data.author_name}` : "",
  };
}

// YouTube (Shorts compris) : oEmbed public pour le titre et la miniature, balises de la page pour la description.
async function fromYouTube(url) {
  const res = await fetchWithTimeout(`https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url)}`).catch(() => null);
  const data = res?.ok ? await res.json().catch(() => null) : null;
  let description = "";
  try {
    const page = await fetchWithTimeout(url, { headers: { Accept: "text/html", "Accept-Language": "fr,en;q=0.8" } });
    if (page.ok) description = metaContent((await page.text()).slice(0, 1_500_000), "og:description");
  } catch {}
  if (!data && !description) throw captionNeeded("YouTube ne répond pas pour cette vidéo. Colle sa description juste en dessous.");
  return {
    platform: "youtube",
    title: data?.title || "",
    text: [data?.title, description].filter(Boolean).join("\n\n"),
    caption: description || data?.title || "",
    image: data?.thumbnail_url || "",
    author: data?.author_name || "",
  };
}

// GitHub : l'API publique donne la description et le README — de quoi faire une vraie fiche outil.
async function fromGitHub(url) {
  const [, owner, repo] = new URL(url).pathname.split("/");
  if (!owner || !repo) return fromWeb(url);
  const api = `https://api.github.com/repos/${owner}/${repo.replace(/\.git$/, "")}`;
  const headers = { Accept: "application/vnd.github+json" };
  const res = await fetchWithTimeout(api, { headers }).catch(() => null);
  if (!res?.ok) return fromWeb(url);
  const info = await res.json();
  let readme = "";
  try {
    const r = await fetchWithTimeout(`${api}/readme`, { headers: { Accept: "application/vnd.github.raw+json" } });
    if (r.ok) readme = (await r.text()).slice(0, 14000);
  } catch {}
  return {
    platform: "github",
    title: info.full_name,
    text: [
      `Repo : ${info.full_name}`,
      info.description,
      info.topics?.length ? `Topics : ${info.topics.join(", ")}` : "",
      `★ ${info.stargazers_count} · langage : ${info.language || "?"}`,
      info.homepage ? `Site : ${info.homepage}` : "",
      readme ? `README :\n${readme}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
    caption: info.description || "",
    image: `https://opengraph.githubassets.com/1/${info.full_name}`,
    author: info.owner?.login ? `@${info.owner.login}` : "",
  };
}

async function fromWeb(url) {
  assertPublicUrl(url);
  const res = await fetchWithTimeout(url, { headers: { Accept: "text/html,application/xhtml+xml" } }).catch(() => null);
  if (!res?.ok) throw captionNeeded(`Le site ne répond pas${res ? ` (${res.status})` : ""}. Colle le texte qui t'intéresse juste en dessous.`);
  const html = (await res.text()).slice(0, 2_000_000);
  const main = html.match(/<(article|main)[\s\S]*<\/\1>/i)?.[0] || html.match(/<body[\s\S]*<\/body>/i)?.[0] || "";
  const description = metaContent(html, "og:description") || metaContent(html, "description");
  return {
    platform: detectPlatform(url) === "x" ? "x" : "web",
    title: metaContent(html, "og:title") || stripTags(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || ""),
    text: [description, stripTags(main).slice(0, 16000)].filter(Boolean).join("\n\n"),
    caption: description,
    image: metaContent(html, "og:image"),
    author: metaContent(html, "og:site_name") || new URL(url).hostname.replace(/^www\./, ""),
  };
}

export async function imageToBase64(src) {
  if (!src) return null;
  if (src.startsWith("data:")) {
    const m = src.match(/^data:(image\/(?:jpeg|png|webp|gif));base64,(.+)$/);
    return m && m[2].length * 0.75 <= MAX_IMAGE_BYTES ? { mediaType: m[1], data: m[2] } : null;
  }
  try {
    const res = await fetchWithTimeout(src);
    if (!res.ok) return null;
    const type = (res.headers.get("content-type") || "").split(";")[0];
    if (!/^image\/(jpeg|png|webp|gif)$/.test(type)) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > MAX_IMAGE_BYTES) return null;
    return { mediaType: type, data: buf.toString("base64") };
  } catch {
    return null;
  }
}

/**
 * Lien et/ou texte collé → { platform, url, title, text, caption, image, author }.
 * Si le lien ne donne rien mais que la légende a été collée, elle prend le relais.
 */
export async function readSource({ url = "", text = "", hasImages = false }) {
  url = url.trim();
  text = text.trim();
  if (!url && !text && !hasImages) throw new AdaError("Colle un lien, une légende ou ajoute une capture.");
  let source = { platform: "texte", title: "", text, caption: text, image: "", author: "" };
  if (!url) return source;

  const platform = detectPlatform(url);
  if (!platform) throw new AdaError("Ce lien n'a pas l'air valide.");
  try {
    if (platform === "instagram") source = await fromInstagram(url);
    else if (platform === "tiktok") source = await fromTikTok(url);
    else if (platform === "youtube") source = await fromYouTube(url);
    else if (platform === "facebook") source = await fromFacebook(url);
    else if (platform === "github") source = await fromGitHub(url);
    else source = await fromWeb(url);
  } catch (error) {
    if (!text && !hasImages) throw error instanceof AdaError ? error : captionNeeded("Impossible d'ouvrir ce lien. Colle la légende juste en dessous.");
    source = { platform, title: "", text, caption: text, image: "", author: "" };
  }
  if (text && source.text !== text) source.text = `${text}\n\n${source.text || ""}`.trim();
  if (!source.caption) source.caption = text;
  source.url = url;
  return source;
}
