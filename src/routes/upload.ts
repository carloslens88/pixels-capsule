import type { Env } from "../types";
import { json } from "../lib/grid";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg", "image/gif", "image/webp"]);
const MAX_BYTES = 5 * 1024 * 1024;

export async function handleUpload(request: Request, env: Env): Promise<Response> {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return json({ error: "Missing file", code: "missing_file" }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return json({ error: "Unsupported image type", code: "unsupported_type" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return json({ error: "Image too large (max 5MB)", code: "too_large" }, { status: 400 });
  }

  const ext = file.type.split("/")[1];
  const key = `${crypto.randomUUID()}.${ext}`;

  await env.IMAGES.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });

  return json({ imageKey: key });
}
