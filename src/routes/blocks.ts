import type { Env } from "../types";
import { json } from "../lib/grid";
import { tableFor, type Kind } from "../lib/blockTable";

const SEALED_IMAGE_URL = "/shared/capsule-sealed.svg";

interface BlockRow {
  id?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  link_url: string;
  image_key: string;
  message: string | null;
  emoji: string | null;
  slogan: string | null;
  buyer_number: number | null;
  created_at: number;
  country: string | null;
  deliver_at: number | null;
  delivered_at: number | null;
}

/** True while a capsule's `deliver_at` is still in the future and it hasn't been delivered yet. */
function isSealed(row: BlockRow, now: number): boolean {
  return !!row.deliver_at && !row.delivered_at && row.deliver_at > now;
}

function toPublicBlock(row: BlockRow, now: number) {
  const sealed = isSealed(row, now);
  return {
    x: row.x,
    y: row.y,
    width: row.width,
    height: row.height,
    linkUrl: sealed ? null : row.link_url,
    imageUrl: sealed ? SEALED_IMAGE_URL : `/images/${row.image_key}`,
    message: sealed ? null : row.message,
    emoji: sealed ? null : row.emoji,
    slogan: sealed ? null : row.slogan,
    createdAt: row.created_at,
    buyerNumber: row.buyer_number,
    country: row.country,
    sealed,
    deliverAt: row.deliver_at,
  };
}

async function selectSold(env: Env, kind: Kind) {
  const now = Math.floor(Date.now() / 1000);
  const { results } = await env.DB.prepare(
    `SELECT x, y, width, height, link_url, image_key, message, emoji, slogan, buyer_number, created_at, country, deliver_at, delivered_at
     FROM ${tableFor(kind)} WHERE status = 'sold' ORDER BY created_at DESC`
  ).all<BlockRow>();
  return (results ?? []).map((row) => toPublicBlock(row, now));
}

export async function handleGetPixels(env: Env): Promise<Response> {
  return json(await selectSold(env, "pixel"));
}

export async function handleGetCapsules(env: Env): Promise<Response> {
  return json(await selectSold(env, "capsule"));
}

export async function handleGetBlock(id: string, env: Env): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);
  for (const kind of ["pixel", "capsule"] as const) {
    const table = tableFor(kind);
    const row = await env.DB.prepare(
      `SELECT x, y, width, height, link_url, image_key, message, emoji, slogan, buyer_number, created_at, country, deliver_at, delivered_at
       FROM ${table} WHERE id = ? AND status = 'sold'`
    )
      .bind(id)
      .first<BlockRow>();
    if (row) {
      let isFirstOfCountry = false;
      if (row.country) {
        const countRow = await env.DB.prepare(
          `SELECT COUNT(*) as n FROM ${table} WHERE country = ? AND status = 'sold'`
        )
          .bind(row.country)
          .first<{ n: number }>();
        isFirstOfCountry = countRow?.n === 1;
      }
      return json({ ...toPublicBlock(row, now), isFirstOfCountry });
    }
  }
  return new Response("Not found", { status: 404 });
}

export async function handleGetImage(key: string, env: Env): Promise<Response> {
  const object = await env.IMAGES.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=31536000, immutable");

  return new Response(object.body, { headers });
}
