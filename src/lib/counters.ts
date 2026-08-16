import type { Env } from "../types";
import type { Kind } from "./blockTable";

/** Atomically increments and returns the given kind's buyer counter (RETURNING makes this race-free even under concurrent checkouts). */
export async function nextBuyerNumber(env: Env, kind: Kind): Promise<number> {
  const { results } = await env.DB.prepare(
    `UPDATE counters SET value = value + 1 WHERE name = ? RETURNING value`
  )
    .bind(`${kind}_buyer_number`)
    .all<{ value: number }>();
  return results[0].value;
}
