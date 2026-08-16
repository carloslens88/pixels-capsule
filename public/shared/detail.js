import { t, formatRelativeTime, getLang } from "/shared/i18n.js";

function formatDeliverDate(unixSeconds) {
  return new Date(unixSeconds * 1000).toLocaleDateString(getLang() === "es" ? "es-ES" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

/** True if linkUrl is just the site root — the default we fill in when the buyer left the link blank. */
export function isPlaceholderLink(linkUrl) {
  if (!linkUrl) return true;
  try {
    const u = new URL(linkUrl);
    return u.origin === location.origin && (u.pathname === "/" || u.pathname === "");
  } catch {
    return true;
  }
}

export { formatRelativeTime as relativeTime };

/** Read-only popover for a purchased block — shown on click instead of navigating away. */
export function openDetailView(block, { titleKey = "detail.titlePixel", onClose } = {}) {
  const backdrop = document.createElement("div");
  backdrop.className = "modal-backdrop";
  const hasRealLink = !isPlaceholderLink(block.linkUrl);

  backdrop.innerHTML = `
    <div class="modal detail-modal">
      <div class="modal-header"><h2>&gt; ${t(titleKey)}${block.buyerNumber ? ` #${block.buyerNumber}` : ""}</h2></div>
      <img class="detail-image" src="${escapeHtml(block.imageUrl)}" alt="" />
      ${block.sealed ? `<div class="detail-sealed">${t("detail.sealedUntil", { date: formatDeliverDate(block.deliverAt) })}</div>` : ""}
      ${block.emoji ? `<div class="detail-emoji">${block.emoji}</div>` : ""}
      ${block.slogan ? `<div class="detail-slogan">${escapeHtml(block.slogan)}</div>` : ""}
      ${block.message ? `<div class="detail-message">${escapeHtml(block.message)}</div>` : ""}
      <div class="detail-meta">(${block.x}, ${block.y}) · ${block.width}x${block.height}px${block.createdAt ? ` · ${formatRelativeTime(block.createdAt)}` : ""}</div>
      <div class="actions">
        <button id="detail-close">${t("common.close")}</button>
        ${hasRealLink ? `<button class="primary" id="detail-visit">${t("common.visitLink")}</button>` : ""}
      </div>
    </div>
  `;

  function close() {
    document.body.removeChild(backdrop);
    onClose?.();
  }
  backdrop.addEventListener("click", (evt) => {
    if (evt.target === backdrop) close();
  });
  backdrop.querySelector("#detail-close").addEventListener("click", close);
  const visitBtn = backdrop.querySelector("#detail-visit");
  if (visitBtn) {
    visitBtn.addEventListener("click", () => window.open(block.linkUrl, "_blank", "noopener"));
  }

  document.body.appendChild(backdrop);
}
