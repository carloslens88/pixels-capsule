import type { Env } from "../types";

const SENDER_EMAIL = "capsulas@onemillionpixels.site";
const MAX_BATCH = 25;

interface DueCapsule {
  id: string;
  recipient_email: string;
}

/** Runs on a cron sweep: emails whoever a sealed capsule's `deliver_at` has arrived for, then marks it delivered. */
export async function handleScheduledDelivery(env: Env): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const { results } = await env.DB.prepare(
    `SELECT id, recipient_email FROM capsule_blocks
     WHERE status = 'sold' AND deliver_at IS NOT NULL AND delivered_at IS NULL AND deliver_at <= ?
     LIMIT ?`
  )
    .bind(now, MAX_BATCH)
    .all<DueCapsule>();

  for (const row of results ?? []) {
    const shareUrl = `${env.PUBLIC_SITE_URL}/s/capsule/${row.id}`;
    try {
      await env.EMAIL.send({
        to: row.recipient_email,
        from: { email: SENDER_EMAIL, name: "One Million Pixels" },
        subject: "🛰️ Una cápsula ha llegado para ti / A capsule has arrived for you",
        html: `<p>Alguien selló un mensaje para ti en One Million Pixels. Ya puedes leerlo:</p><p><a href="${shareUrl}">${shareUrl}</a></p><hr/><p>Someone sealed a message for you on One Million Pixels. You can read it now:</p><p><a href="${shareUrl}">${shareUrl}</a></p>`,
        text: `Alguien selló un mensaje para ti en One Million Pixels. Léelo aquí: ${shareUrl}\n\nSomeone sealed a message for you on One Million Pixels. Read it here: ${shareUrl}`,
      });
      await env.DB.prepare(`UPDATE capsule_blocks SET delivered_at = ? WHERE id = ?`).bind(now, row.id).run();
    } catch (err) {
      console.error(`Failed to deliver capsule ${row.id}`, err);
    }
  }
}
