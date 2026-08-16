import type { Env } from "../types";
import { json } from "../lib/grid";

const ACTIVE_WINDOW_SECONDS = 120;
const STALE_AFTER_SECONDS = 300;

export async function handleHeartbeat(request: Request, env: Env): Promise<Response> {
  const body = await request.json<{ sessionId?: string }>().catch(() => ({ sessionId: undefined }));
  const sessionId = typeof body.sessionId === "string" && body.sessionId.length <= 64 ? body.sessionId : null;
  if (!sessionId) return json({ error: "Missing sessionId" }, { status: 400 });

  const now = Math.floor(Date.now() / 1000);

  await env.DB.prepare(
    `INSERT INTO presence (session_id, last_seen) VALUES (?, ?)
     ON CONFLICT(session_id) DO UPDATE SET last_seen = excluded.last_seen`
  )
    .bind(sessionId, now)
    .run();

  // Opportunistic cleanup — no cron needed for a table this small. Only run it on a
  // fraction of heartbeats: it doesn't need to happen every single time, and it halves
  // the D1 writes per heartbeat.
  if (Math.random() < 0.1) {
    await env.DB.prepare(`DELETE FROM presence WHERE last_seen < ?`)
      .bind(now - STALE_AFTER_SECONDS)
      .run();
  }

  return json({ ok: true });
}

export async function handleGetPresence(env: Env): Promise<Response> {
  const now = Math.floor(Date.now() / 1000);
  const row = await env.DB.prepare(`SELECT COUNT(*) as n FROM presence WHERE last_seen > ?`)
    .bind(now - ACTIVE_WINDOW_SECONDS)
    .first<{ n: number }>();
  return json({ count: row?.n ?? 0 });
}
