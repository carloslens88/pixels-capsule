import type { Env } from "../types";

export function gridConfig(env: Env) {
  return {
    width: Number(env.GRID_WIDTH),
    height: Number(env.GRID_HEIGHT),
    pricePerPixelCents: Number(env.PRICE_PER_PIXEL_CENTS),
    minBlockPixels: Number(env.MIN_BLOCK_PIXELS),
    salesEnabled: env.SALES_ENABLED === "true",
  };
}

export function json(data: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
  });
}
