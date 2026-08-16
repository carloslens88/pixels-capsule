export function buildShareUrl(kind, blockId) {
  return `${location.origin}/s/${kind}/${blockId}`;
}

/** Renders share buttons (X, WhatsApp, copy-link) into `container`. */
export function renderShareButtons(container, { shareUrl, text, labels }) {
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(`${text} ${shareUrl}`)}`;

  container.innerHTML = `
    <a href="${twitterUrl}" target="_blank" rel="noopener">${labels.twitter}</a>
    <a href="${whatsappUrl}" target="_blank" rel="noopener">${labels.whatsapp}</a>
    <button type="button" id="toast-copy-link">${labels.copy}</button>
  `;

  const copyBtn = container.querySelector("#toast-copy-link");
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      copyBtn.textContent = labels.copied;
      setTimeout(() => {
        copyBtn.textContent = labels.copy;
      }, 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — silently ignore, the link is still visible in the toast text.
    }
  });
}
