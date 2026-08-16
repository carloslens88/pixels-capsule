import type { Env } from "../types";
import { isKind, tableFor, type Kind } from "../lib/blockTable";

interface ShareRow {
  x: number;
  y: number;
  width: number;
  height: number;
  image_key: string;
  message: string | null;
  emoji: string | null;
  slogan: string | null;
  buyer_number: number | null;
  deliver_at: number | null;
  delivered_at: number | null;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function handleSharePage(kindParam: string, id: string, env: Env): Promise<Response> {
  if (!isKind(kindParam)) return new Response("Not found", { status: 404 });
  const kind = kindParam as Kind;
  const table = tableFor(kind);

  const row = await env.DB.prepare(
    `SELECT x, y, width, height, image_key, message, emoji, slogan, buyer_number, deliver_at, delivered_at
     FROM ${table} WHERE id = ? AND status = 'sold'`
  )
    .bind(id)
    .first<ShareRow>();

  if (!row) return new Response("Not found", { status: 404 });

  const now = Math.floor(Date.now() / 1000);
  const sealed = !!row.deliver_at && !row.delivered_at && row.deliver_at > now;

  const appPath = kind === "pixel" ? "/pixels/" : "/capsules/";
  const appUrl = `${env.PUBLIC_SITE_URL}${appPath}?highlight=${row.x},${row.y}`;
  const imageUrl = sealed ? `${env.PUBLIC_SITE_URL}/shared/capsule-sealed.svg` : `${env.PUBLIC_SITE_URL}/images/${row.image_key}`;

  const title = sealed
    ? `🔒 Una cápsula sellada${row.buyer_number ? ` #${row.buyer_number}` : ""} te espera`
    : kind === "pixel"
      ? `${row.emoji ? row.emoji + " " : ""}Soy la marca${row.buyer_number ? ` #${row.buyer_number}` : ""} en El Muro // 2026`
      : `🛰️ Mi cápsula${row.buyer_number ? ` #${row.buyer_number}` : ""} está en órbita`;
  const description = sealed
    ? "Este mensaje está sellado hasta su fecha de entrega. Vuelve entonces para leerlo."
    : row.slogan || row.message || "Parte de One Million Pixels — un lienzo compartido de 1.000.000 de píxeles.";
  const ctaLabel = kind === "pixel" ? "Ver en el muro →" : "Ver en órbita →";

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<meta name="description" content="${escapeHtml(description)}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${escapeHtml(title)}" />
<meta property="og:description" content="${escapeHtml(description)}" />
<meta property="og:image" content="${imageUrl}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${escapeHtml(title)}" />
<meta name="twitter:description" content="${escapeHtml(description)}" />
<meta name="twitter:image" content="${imageUrl}" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<meta name="theme-color" content="#05070a" />
<link rel="stylesheet" href="/shared/cyber.css" />
<style>
  body { display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
  .card { max-width: 380px; text-align: center; background: var(--bg-panel); border: 1px solid rgba(0,255,242,0.35); border-radius: 8px; padding: 2rem; }
  .card img { max-width: 100%; border-radius: 4px; border: 1px solid rgba(0,255,242,0.3); margin-bottom: 1.25rem; }
  .card h1 { font-size: 1.1rem; color: var(--cyan); margin: 0 0 0.5rem; }
  .card p { color: var(--muted); font-size: 0.9rem; margin: 0 0 1.5rem; }
  .card a.cta { display: inline-block; padding: 0.6rem 1.4rem; background: linear-gradient(180deg, var(--magenta), #b3008f); color: #fff; text-decoration: none; border-radius: 4px; font-weight: 700; letter-spacing: 0.03em; }
</style>
</head>
<body>
  <div class="card">
    <img src="${imageUrl}" alt="" />
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <a class="cta" href="${appUrl}">${ctaLabel}</a>
  </div>
</body>
</html>`;

  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8" } });
}
