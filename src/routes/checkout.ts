import type { Env } from "../types";
import { gridConfig, json } from "../lib/grid";
import { getStripe } from "../lib/stripe";
import { nextBuyerNumber } from "../lib/counters";
import { isKind, tableFor } from "../lib/blockTable";
import { containsProfanity } from "../lib/moderation";
import { isValidCountryCode } from "../lib/countries";

const RESERVATION_TTL_SECONDS = 30 * 60;
const MAX_MESSAGE_LENGTH = 140;
const MAX_EMOJI_LENGTH = 16;
const MAX_SLOGAN_LENGTH = 80;
const MIN_DELIVER_DELAY_SECONDS = 24 * 60 * 60;
const MAX_DELIVER_DELAY_SECONDS = 5 * 365 * 24 * 60 * 60;

interface CheckoutBody {
  kind: string;
  x: number;
  y: number;
  width: number;
  height: number;
  linkUrl: string;
  email: string;
  imageKey: string;
  returnPath?: string;
  message?: string;
  emoji?: string;
  slogan?: string;
  country?: string;
  deliverAt?: string;
  recipientEmail?: string;
}

function isValidHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Optional short-text field: returns trimmed text, null if omitted/empty, or undefined if it fails validation. */
function optionalText(value: unknown, maxLength: number): string | null | undefined {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string" || value.length > maxLength) return undefined;
  return value.trim();
}

export async function handleCheckout(request: Request, env: Env): Promise<Response> {
  const body = await request.json<Partial<CheckoutBody>>();
  const { x, y, width, height, linkUrl, email, imageKey } = body;
  const grid = gridConfig(env);

  if (!grid.salesEnabled) {
    return json({ error: "Sales are not open yet", code: "sales_disabled" }, { status: 403 });
  }

  if (!isKind(body.kind)) {
    return json({ error: "Invalid or missing kind", code: "invalid_kind" }, { status: 400 });
  }
  const kind = body.kind;
  const table = tableFor(kind);

  const returnPath =
    typeof body.returnPath === "string" && body.returnPath.startsWith("/") && !body.returnPath.startsWith("//")
      ? body.returnPath
      : "/";

  if (
    !Number.isInteger(x) || !Number.isInteger(y) ||
    !Number.isInteger(width) || !Number.isInteger(height) ||
    x! < 0 || y! < 0 || width! <= 0 || height! <= 0 ||
    x! + width! > grid.width || y! + height! > grid.height
  ) {
    return json({ error: "Invalid block coordinates", code: "invalid_coordinates" }, { status: 400 });
  }
  if (width! * height! < grid.minBlockPixels) {
    return json(
      { error: `Block must be at least ${grid.minBlockPixels} pixels`, code: "min_block", vars: { min: grid.minBlockPixels } },
      { status: 400 }
    );
  }
  if (!linkUrl || !isValidHttpUrl(linkUrl)) {
    return json({ error: "Invalid link URL", code: "invalid_link" }, { status: 400 });
  }
  if (!email || !isValidEmail(email)) {
    return json({ error: "Invalid email", code: "invalid_email" }, { status: 400 });
  }
  if (!imageKey || typeof imageKey !== "string") {
    return json({ error: "Missing imageKey", code: "missing_image" }, { status: 400 });
  }
  const country = body.country ? (isValidCountryCode(body.country) ? body.country : undefined) : null;
  if (country === undefined) {
    return json({ error: "Invalid country code", code: "invalid_country" }, { status: 400 });
  }

  const message = optionalText(body.message, MAX_MESSAGE_LENGTH);
  const emoji = optionalText(body.emoji, MAX_EMOJI_LENGTH);
  const slogan = optionalText(body.slogan, MAX_SLOGAN_LENGTH);
  if (message === undefined || emoji === undefined || slogan === undefined) {
    return json({ error: "Message, emoji, or slogan is too long", code: "content_too_long" }, { status: 400 });
  }
  if ((message && containsProfanity(message)) || (slogan && containsProfanity(slogan))) {
    return json({ error: "Inappropriate language", code: "profanity" }, { status: 400 });
  }

  // Sealed delivery is capsule-only: the wall is meant to be immediate, not delayed.
  let deliverAt: number | null = null;
  let recipientEmail: string | null = null;
  if (kind === "capsule" && (body.deliverAt || body.recipientEmail)) {
    if (!body.deliverAt || !body.recipientEmail) {
      return json(
        { error: "A delivery date and a recipient email are both required to seal a capsule", code: "invalid_delivery" },
        { status: 400 }
      );
    }
    if (!isValidEmail(body.recipientEmail)) {
      return json({ error: "Invalid recipient email", code: "invalid_recipient_email" }, { status: 400 });
    }
    const parsedMs = Date.parse(body.deliverAt);
    const nowSeconds = Math.floor(Date.now() / 1000);
    const deliverAtSeconds = Math.floor(parsedMs / 1000);
    if (
      !Number.isFinite(parsedMs) ||
      deliverAtSeconds < nowSeconds + MIN_DELIVER_DELAY_SECONDS ||
      deliverAtSeconds > nowSeconds + MAX_DELIVER_DELAY_SECONDS
    ) {
      return json({ error: "Invalid delivery date", code: "invalid_deliver_at" }, { status: 400 });
    }
    deliverAt = deliverAtSeconds;
    recipientEmail = body.recipientEmail.trim();
  }

  const now = Math.floor(Date.now() / 1000);

  // Release any expired reservations before checking for overlap. Each kind only ever
  // checks against its own table, so pixels and capsules never collide with each other.
  await env.DB.prepare(`DELETE FROM ${table} WHERE status = 'pending' AND expires_at < ?`)
    .bind(now)
    .run();

  const overlap = await env.DB.prepare(
    `SELECT id FROM ${table}
     WHERE status IN ('sold', 'pending')
       AND x < ? AND ? < x + width
       AND y < ? AND ? < y + height
     LIMIT 1`
  )
    .bind(x! + width!, x, y! + height!, y)
    .first();

  if (overlap) {
    return json({ error: "One or more of these pixels are already taken", code: "overlap" }, { status: 409 });
  }

  const priceCents = width! * height! * grid.pricePerPixelCents;
  const blockId = crypto.randomUUID();

  if (env.SKIP_PAYMENT_FOR_TESTING === "true") {
    // Local-dev only escape hatch: never calls Stripe. See types.ts for the guard rails.
    const buyerNumber = await nextBuyerNumber(env, kind);
    await env.DB.prepare(
      `INSERT INTO ${table} (id, x, y, width, height, status, owner_email, link_url, image_key, price_cents, created_at, expires_at, message, emoji, slogan, buyer_number, country, deliver_at, recipient_email, delivered_at)
       VALUES (?, ?, ?, ?, ?, 'sold', ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, NULL)`
    )
      .bind(blockId, x, y, width, height, email, linkUrl, imageKey, priceCents, now, message, emoji, slogan, buyerNumber, country, deliverAt, recipientEmail)
      .run();

    return json({ checkoutUrl: `${returnPath}?purchase=success&blockId=${blockId}` });
  }

  const expiresAt = now + RESERVATION_TTL_SECONDS;

  await env.DB.prepare(
    `INSERT INTO ${table} (id, x, y, width, height, status, owner_email, link_url, image_key, price_cents, created_at, expires_at, message, emoji, slogan, country, deliver_at, recipient_email, delivered_at)
     VALUES (?, ?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL)`
  )
    .bind(blockId, x, y, width, height, email, linkUrl, imageKey, priceCents, now, expiresAt, message, emoji, slogan, country, deliverAt, recipientEmail)
    .run();

  const stripe = getStripe(env);
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: email,
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: priceCents,
          product_data: {
            name: `Block ${width}x${height} at (${x}, ${y})`,
          },
        },
        quantity: 1,
      },
    ],
    metadata: { blockId, kind },
    success_url: `${env.PUBLIC_SITE_URL}${returnPath}?purchase=success&blockId=${blockId}`,
    cancel_url: `${env.PUBLIC_SITE_URL}${returnPath}?purchase=canceled`,
  });

  await env.DB.prepare(`UPDATE ${table} SET stripe_session_id = ? WHERE id = ?`)
    .bind(session.id, blockId)
    .run();

  return json({ checkoutUrl: session.url });
}
