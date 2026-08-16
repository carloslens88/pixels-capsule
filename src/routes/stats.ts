import type { Env } from "../types";

export async function handleGetStats(env: Env): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);

  const [pixels, capsules, countries, presence] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(price_cents), 0) as cents FROM pixel_blocks WHERE status = 'sold'`).first<{
      n: number;
      cents: number;
    }>(),
    env.DB.prepare(`SELECT COUNT(*) as n, COALESCE(SUM(price_cents), 0) as cents FROM capsule_blocks WHERE status = 'sold'`).first<{
      n: number;
      cents: number;
    }>(),
    env.DB.prepare(
      `SELECT COUNT(DISTINCT country) as n FROM (
         SELECT country FROM pixel_blocks WHERE status = 'sold' AND country IS NOT NULL
         UNION
         SELECT country FROM capsule_blocks WHERE status = 'sold' AND country IS NOT NULL
       )`
    ).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) as n FROM presence WHERE last_seen > ?`)
      .bind(now - 90)
      .first<{ n: number }>(),
  ]);

  const totalRaisedCents = (pixels?.cents ?? 0) + (capsules?.cents ?? 0);

  return new Response(
    JSON.stringify({
      pixelsSold: pixels?.n ?? 0,
      capsulesLaunched: capsules?.n ?? 0,
      totalRaisedCents,
      countriesRepresented: countries?.n ?? 0,
      liveViewers: presence?.n ?? 0,
    }),
    {
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "public, max-age=10",
      },
    }
  );
}
