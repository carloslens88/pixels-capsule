import type Stripe from "stripe";
import type { Env } from "../types";
import { getStripe } from "../lib/stripe";
import { nextBuyerNumber } from "../lib/counters";
import { isKind, tableFor } from "../lib/blockTable";

export async function handleWebhook(request: Request, env: Env): Promise<Response> {
  const signature = request.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  const payload = await request.text();
  const stripe = getStripe(env);

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const blockId = session.metadata?.blockId;
    const kind = session.metadata?.kind;
    if (blockId && isKind(kind)) {
      const table = tableFor(kind);
      const buyerNumber = await nextBuyerNumber(env, kind);
      await env.DB.prepare(
        `UPDATE ${table} SET status = 'sold', expires_at = NULL, buyer_number = ? WHERE id = ? AND stripe_session_id = ?`
      )
        .bind(buyerNumber, blockId, session.id)
        .run();
    }
  }

  if (event.type === "checkout.session.expired") {
    const session = event.data.object as Stripe.Checkout.Session;
    const blockId = session.metadata?.blockId;
    const kind = session.metadata?.kind;
    if (blockId && isKind(kind)) {
      const table = tableFor(kind);
      await env.DB.prepare(`DELETE FROM ${table} WHERE id = ? AND status = 'pending'`).bind(blockId).run();
    }
  }

  return new Response("ok", { status: 200 });
}
