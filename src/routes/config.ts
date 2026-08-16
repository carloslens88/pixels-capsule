import type { Env } from "../types";
import { gridConfig, json } from "../lib/grid";

export function handleGetConfig(env: Env): Response {
  return json(gridConfig(env));
}
