export interface Env {
  DB: D1Database;
  IMAGES: R2Bucket;

  STRIPE_SECRET_KEY: string;
  STRIPE_WEBHOOK_SECRET: string;
  /** Local-dev only. When "true", /api/checkout marks the block sold directly and never touches Stripe. Never set in wrangler.jsonc or as a deployed secret. */
  SKIP_PAYMENT_FOR_TESTING?: string;

  GRID_WIDTH: string;
  GRID_HEIGHT: string;
  PRICE_PER_PIXEL_CENTS: string;
  MIN_BLOCK_PIXELS: string;
  PUBLIC_SITE_URL: string;
  /** Kill switch for purchases. "false" while payments aren't wired up yet — the site is browsable but /api/checkout is rejected server-side. */
  SALES_ENABLED: string;
  /** Cloudflare Email Service binding, used to notify a capsule's recipient once its sealed delivery date arrives. */
  EMAIL: SendEmail;
}
