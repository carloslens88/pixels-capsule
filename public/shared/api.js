export async function fetchConfig() {
  const res = await fetch("/api/config");
  return res.json();
}

export async function fetchPixels() {
  const res = await fetch("/api/pixels");
  return res.json();
}

export async function fetchCapsules() {
  const res = await fetch("/api/capsules");
  return res.json();
}

export async function fetchBlock(id) {
  const res = await fetch(`/api/blocks/${id}`);
  if (!res.ok) return null;
  return res.json();
}

async function throwApiError(res, fallbackMessage) {
  const data = await res.json().catch(() => ({}));
  const err = new Error(data.error || fallbackMessage);
  err.code = data.code;
  err.vars = data.vars;
  throw err;
}

export async function uploadImage(fileOrBlob) {
  const formData = new FormData();
  formData.append("file", fileOrBlob, "upload.png");
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) await throwApiError(res, "Upload failed");
  const { imageKey } = await res.json();
  return imageKey;
}

export async function checkout(payload) {
  const res = await fetch("/api/checkout", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) await throwApiError(res, "Checkout failed");
  const { checkoutUrl } = await res.json();
  return checkoutUrl;
}
