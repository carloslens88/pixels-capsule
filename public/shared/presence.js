const HEARTBEAT_INTERVAL_MS = 45000;

function getSessionId() {
  let id = sessionStorage.getItem("omp_session");
  if (!id) {
    id = crypto.randomUUID();
    sessionStorage.setItem("omp_session", id);
  }
  return id;
}

async function heartbeat(sessionId) {
  await fetch("/api/presence", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ sessionId }),
  }).catch(() => {});
}

async function fetchCount() {
  try {
    const res = await fetch("/api/presence");
    const data = await res.json();
    return data.count ?? 0;
  } catch {
    return null;
  }
}

/** Starts heartbeating this tab's presence and polling the live count, calling onUpdate(count) on each poll. */
export function startPresence(onUpdate) {
  const sessionId = getSessionId();

  async function tick() {
    await heartbeat(sessionId);
    const count = await fetchCount();
    if (count !== null) onUpdate(count);
  }

  tick();
  setInterval(tick, HEARTBEAT_INTERVAL_MS);
}
