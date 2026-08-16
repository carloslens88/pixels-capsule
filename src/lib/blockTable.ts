export type Kind = "pixel" | "capsule";

const TABLES: Record<Kind, string> = {
  pixel: "pixel_blocks",
  capsule: "capsule_blocks",
};

export function isKind(value: unknown): value is Kind {
  return value === "pixel" || value === "capsule";
}

/** Table name is only ever taken from this fixed map, never interpolated from raw user input. */
export function tableFor(kind: Kind): string {
  return TABLES[kind];
}
