import { fetchConfig, fetchPixels, fetchBlock, uploadImage, checkout } from "/shared/api.js";
import { openDetailView, relativeTime } from "/shared/detail.js";
import { t, tn, onLangChange, errorMessage, translateNode, getLang } from "/shared/i18n.js";
import { attachEmojiPicker } from "/shared/emoji-picker.js";
import { flagEmoji, countryName } from "/shared/countries.js";
import { attachCountryAutocomplete } from "/shared/country-picker.js";
import { buildShareUrl, renderShareButtons } from "/shared/share.js";
import { startPresence } from "/shared/presence.js";

const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");
const gridWrap = document.getElementById("grid-wrap");
const statusMsg = document.getElementById("status-msg");
const template = document.getElementById("purchase-modal-template");
const readoutEl = document.getElementById("selection-readout");
const countPill = document.getElementById("count-pill");
const toastEl = document.getElementById("toast");
const tickerTrack = document.getElementById("ticker-track");
const statTotal = document.getElementById("stat-total");
const statPercent = document.getElementById("stat-percent");
const progressBarFill = document.getElementById("progress-bar-fill");
const viewersPill = document.getElementById("viewers-pill");
const activityLog = document.getElementById("activity-log");
const zoomLevelEl = document.getElementById("zoom-level");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const zoomFitBtn = document.getElementById("zoom-fit");

const TILE_SIZE = 1; // one tile = one pixel = the minimum purchasable unit
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 40;
const RETURN_PATH = "/pixels/";

let grid = { width: 1000, height: 1000, pricePerPixelCents: 100, minBlockPixels: 1 };
let soldBlocks = [];
const imageCache = new Map();

let zoom = 1;
let selecting = false;
let startTile = null; // {tx, ty}
let endTile = null;
let hoverTile = null;
let particles = [];
let sparks = [];
let highlightedKey = null; // "x,y" of the block highlighted via side-panel hover
const logEntryElements = new Map();

function blockKey(b) {
  return `${b.x},${b.y}`;
}

function formatPrice(cents) {
  return `${(cents / 100).toFixed(2)} €`;
}

function updateCountPill() {
  countPill.textContent = tn("pixels.mark", soldBlocks.length);
}

function updateTicker() {
  const recent = soldBlocks.slice(0, 15).filter((b) => b.message || b.slogan || b.emoji);
  if (recent.length === 0) {
    tickerTrack.textContent = t("pixels.tickerEmpty");
    return;
  }
  const items = recent.map((b) => {
    const text = b.slogan || b.message || "";
    const badge = b.buyerNumber ? ` <span class="hl">#${b.buyerNumber}</span>` : "";
    return `${b.emoji || "▪"} <span class="hl">${escapeHtml(text)}</span>${badge}`;
  });
  const doubled = [...items, ...items].join('<span class="sep">//</span>');
  tickerTrack.innerHTML = doubled;
}

function updateStatsPanel() {
  statTotal.textContent = soldBlocks.length.toString();
  const occupied = soldBlocks.reduce((sum, b) => sum + b.width * b.height, 0);
  const percent = (occupied / (grid.width * grid.height)) * 100;
  statPercent.textContent = `${percent.toFixed(4)}%`;
  // The true percentage is minuscule against 1M pixels — floor a small visible sliver
  // once at least something has sold, rather than showing a literally empty bar forever.
  const barPercent = soldBlocks.length > 0 ? Math.max(percent, 0.6) : 0;
  progressBarFill.style.width = `${Math.min(barPercent, 100)}%`;
}

function updateActivityLog() {
  logEntryElements.clear();
  if (soldBlocks.length === 0) {
    activityLog.innerHTML = `<div class="log-empty">${t("pixels.logEmpty")}</div>`;
    return;
  }
  activityLog.innerHTML = "";
  for (const b of soldBlocks.slice(0, 30)) {
    const text = b.slogan || b.message || (b.emoji ? `${b.emoji} ${t("pixels.logNewMark")}` : t("pixels.logNewMark"));
    const badge = b.buyerNumber ? `<span class="badge">#${b.buyerNumber}</span> · ` : "";
    const entry = document.createElement("button");
    entry.className = "log-entry";
    entry.type = "button";
    entry.innerHTML = `
      <img class="log-thumb" src="${escapeHtml(b.imageUrl)}" loading="lazy" alt="" />
      <div class="log-body">
        <div class="log-text">${b.emoji ? `${b.emoji} ` : ""}${escapeHtml(text)}</div>
        <div class="log-meta">${badge}${relativeTime(b.createdAt)} · (${b.x},${b.y})</div>
      </div>`;
    entry.addEventListener("click", () => openDetailView(b));
    entry.addEventListener("mouseenter", () => {
      highlightedKey = blockKey(b);
    });
    entry.addEventListener("mouseleave", () => {
      if (highlightedKey === blockKey(b)) highlightedKey = null;
    });
    logEntryElements.set(blockKey(b), entry);
    activityLog.appendChild(entry);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

const toastTextEl = document.getElementById("toast-text");
const toastShareEl = document.getElementById("toast-share");

function isMilestoneBuyer(n) {
  return n === 1 || n % 100 === 0;
}

function showToast(text, { milestone = false, shareUrl = null } = {}) {
  toastTextEl.textContent = text;
  toastEl.classList.toggle("milestone", milestone);
  toastShareEl.innerHTML = "";
  if (shareUrl) {
    renderShareButtons(toastShareEl, {
      shareUrl,
      text,
      labels: {
        twitter: t("common.shareTwitter"),
        whatsapp: t("common.shareWhatsapp"),
        copy: t("common.shareCopy"),
        copied: t("common.shareCopied"),
      },
    });
  }
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), shareUrl ? 12000 : 6000);
}

function spawnBurst(px, py, count = 40) {
  const colors = ["#00fff2", "#ff00d4", "#39ff14", "#ffb800"];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = (2 + Math.random() * 6) / zoom;
    particles.push({
      x: px,
      y: py,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      color: colors[Math.floor(Math.random() * colors.length)],
    });
  }
}

async function init() {
  [grid, soldBlocks] = await Promise.all([fetchConfig(), fetchPixels()]);

  canvas.width = grid.width;
  canvas.height = grid.height;
  if (!grid.salesEnabled) document.getElementById("sales-banner").hidden = false;
  updateCountPill();
  updateTicker();
  updateStatsPanel();
  updateActivityLog();
  onLangChange(() => {
    updateCountPill();
    updateTicker();
    updateActivityLog();
  });

  fitToScreen();
  requestAnimationFrame(frame);
  setInterval(refreshPixels, 30000);
  startPresence((count) => {
    viewersPill.textContent = `🔴 ${count}`;
  });

  const params = new URLSearchParams(location.search);
  const highlightParam = params.get("highlight");
  if (highlightParam) {
    const [hx, hy] = highlightParam.split(",").map(Number);
    const target = soldBlocks.find((b) => b.x === hx && b.y === hy);
    if (target) {
      panToBlock(target);
      highlightedKey = blockKey(target);
      openDetailView(target, {
        onClose: () => {
          highlightedKey = null;
          fitToScreen();
        },
      });
    }
  }

  if (params.get("purchase") === "success") {
    const blockId = params.get("blockId");
    const block = blockId ? await fetchBlock(blockId) : null;
    if (block && block.buyerNumber) {
      const milestone = isMilestoneBuyer(block.buyerNumber);
      const shareUrl = buildShareUrl("pixel", blockId);
      let text = milestone
        ? t("pixels.toastMilestone", { n: block.buyerNumber })
        : t("pixels.toastBuyerNumber", { n: block.buyerNumber });
      if (block.isFirstOfCountry && block.country) {
        text = t("common.toastFirstOfCountry", {
          flag: flagEmoji(block.country),
          country: countryName(block.country, getLang()),
        });
      }
      showToast(text, { milestone, shareUrl });
      spawnBurst(block.x + block.width / 2, block.y + block.height / 2, milestone ? 100 : 40);
    } else {
      showToast(t("pixels.toastGeneric"));
    }
    await refreshPixels();
  } else if (params.get("purchase") === "canceled") {
    statusMsg.textContent = t("pixels.statusCanceled");
  }
}

async function refreshPixels() {
  soldBlocks = await fetchPixels();
  updateCountPill();
  updateTicker();
  updateStatsPanel();
  updateActivityLog();
}

function maxTileX() {
  return Math.floor((grid.width - 1) / TILE_SIZE);
}
function maxTileY() {
  return Math.floor((grid.height - 1) / TILE_SIZE);
}

function setZoom(level) {
  zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, level));
  canvas.style.width = `${grid.width * zoom}px`;
  canvas.style.height = `${grid.height * zoom}px`;
  zoomLevelEl.textContent = `${Math.round(zoom * 100)}%`;
}

function fitToScreen() {
  const availW = gridWrap.clientWidth - 24;
  const availH = gridWrap.clientHeight - 24;
  setZoom(Math.min(availW / grid.width, availH / grid.height));
}

/** Zooms in on and centers the view on a shared block — used by ?highlight=x,y deep links. */
function panToBlock(block) {
  setZoom(Math.max(zoom, 10));
  const cx = (block.x + block.width / 2) * zoom;
  const cy = (block.y + block.height / 2) * zoom;
  gridWrap.scrollLeft = cx - gridWrap.clientWidth / 2;
  gridWrap.scrollTop = cy - gridWrap.clientHeight / 2;
}

zoomInBtn.addEventListener("click", () => setZoom(zoom * 1.5));
zoomOutBtn.addEventListener("click", () => setZoom(zoom / 1.5));
zoomFitBtn.addEventListener("click", fitToScreen);

gridWrap.addEventListener(
  "wheel",
  (evt) => {
    if (!evt.ctrlKey && !evt.metaKey) return; // plain wheel keeps scrolling the wall
    evt.preventDefault();
    setZoom(zoom * (evt.deltaY < 0 ? 1.2 : 1 / 1.2));
  },
  { passive: false }
);
window.addEventListener("resize", () => {
  if (!startTile) fitToScreen();
});

function frame(t) {
  draw(t);
  requestAnimationFrame(frame);
}

function draw(t) {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  drawScanBeam(t);
  drawSparks();

  for (const block of soldBlocks) {
    drawBlockImage(block);
  }

  if (zoom * TILE_SIZE >= 8) {
    drawTileGrid();
  }

  if (highlightedKey) {
    const highlighted = soldBlocks.find((b) => blockKey(b) === highlightedKey);
    if (highlighted) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 220);
      ctx.save();
      ctx.shadowColor = "#ff00d4";
      ctx.shadowBlur = (8 + pulse * 6) / zoom;
      ctx.strokeStyle = `rgba(255, 0, 212, ${0.7 + pulse * 0.3})`;
      ctx.lineWidth = Math.max(1.5, 2.5 / zoom);
      ctx.strokeRect(highlighted.x, highlighted.y, highlighted.width, highlighted.height);
      ctx.restore();
    }
  }

  if (hoverTile && !selecting) {
    const pulse = 0.5 + 0.5 * Math.sin(t / 260);
    ctx.save();
    ctx.shadowColor = "#00fff2";
    ctx.shadowBlur = 6 / zoom;
    ctx.strokeStyle = `rgba(0, 255, 242, ${0.5 + pulse * 0.5})`;
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.strokeRect(hoverTile.tx * TILE_SIZE, hoverTile.ty * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    ctx.restore();
  }

  if (startTile && endTile) {
    const rect = tileRectToPixels(startTile, endTile);
    ctx.save();
    ctx.fillStyle = "rgba(255, 0, 212, 0.22)";
    ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    ctx.shadowColor = "#ff00d4";
    ctx.shadowBlur = 8 / zoom;
    ctx.strokeStyle = "#ff00d4";
    ctx.lineWidth = Math.max(1, 1.5 / zoom);
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.lineDashOffset = -(t / 40);
    ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    ctx.restore();
    updateReadout(rect);
  }

  drawParticles();
}

function drawParticles() {
  if (particles.length === 0) return;
  const next = [];
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
    p.vy += 0.15 / zoom;
    p.life -= 0.02;
    if (p.life > 0) {
      ctx.save();
      ctx.globalAlpha = Math.max(p.life, 0);
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 6 / zoom;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 2.2 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      next.push(p);
    }
  }
  particles = next;
}

function drawScanBeam(t) {
  const cycle = 7000;
  const progress = (t % cycle) / cycle;
  const beamX = progress * canvas.width;
  const beamHalfWidth = canvas.width * 0.05;
  ctx.save();
  const grad = ctx.createLinearGradient(beamX - beamHalfWidth, 0, beamX + beamHalfWidth, 0);
  grad.addColorStop(0, "rgba(0, 255, 242, 0)");
  grad.addColorStop(0.5, "rgba(0, 255, 242, 0.09)");
  grad.addColorStop(1, "rgba(0, 255, 242, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(beamX - beamHalfWidth, 0, beamHalfWidth * 2, canvas.height);
  ctx.strokeStyle = "rgba(0, 255, 242, 0.3)";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  ctx.moveTo(beamX, 0);
  ctx.lineTo(beamX, canvas.height);
  ctx.stroke();
  ctx.restore();
}

function maybeSpawnSpark() {
  if (sparks.length >= 14 || Math.random() > 0.05) return;
  const x = Math.floor(Math.random() * grid.width);
  const y = Math.floor(Math.random() * grid.height);
  if (findBlockAt(x, y)) return;
  sparks.push({ x, y, life: 1 });
}

function drawSparks() {
  maybeSpawnSpark();
  const next = [];
  for (const s of sparks) {
    s.life -= 0.018;
    if (s.life > 0) {
      const alpha = Math.sin((1 - s.life) * Math.PI);
      ctx.save();
      ctx.globalAlpha = Math.max(alpha, 0);
      ctx.fillStyle = "#00fff2";
      ctx.shadowColor = "#00fff2";
      ctx.shadowBlur = 5 / zoom;
      ctx.beginPath();
      ctx.arc(s.x, s.y, 2.2 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      next.push(s);
    }
  }
  sparks = next;
}

function drawTileGrid() {
  ctx.strokeStyle = "rgba(0, 255, 242, 0.15)";
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  for (let gx = 0; gx <= grid.width; gx += TILE_SIZE) {
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, grid.height);
  }
  for (let gy = 0; gy <= grid.height; gy += TILE_SIZE) {
    ctx.moveTo(0, gy);
    ctx.lineTo(grid.width, gy);
  }
  ctx.stroke();
}

function drawBlockImage(block) {
  let img = imageCache.get(block.imageUrl);
  if (!img) {
    img = new Image();
    img.src = block.imageUrl;
    imageCache.set(block.imageUrl, img);
  }
  if (img.complete && img.naturalWidth > 0) {
    ctx.drawImage(img, block.x, block.y, block.width, block.height);
  }
}

function updateReadout(pixelRect) {
  const priceCents = pixelRect.width * pixelRect.height * grid.pricePerPixelCents;
  readoutEl.textContent = `${pixelRect.width}×${pixelRect.height}px — ${formatPrice(priceCents)}`;
}

function clearSelection() {
  startTile = null;
  endTile = null;
  readoutEl.textContent = t("pixels.noSelection");
}

function tileFromEvent(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = (evt.clientX - rect.left) * scaleX;
  const y = (evt.clientY - rect.top) * scaleY;
  const tx = Math.min(Math.max(Math.floor(x / TILE_SIZE), 0), maxTileX());
  const ty = Math.min(Math.max(Math.floor(y / TILE_SIZE), 0), maxTileY());
  return { tx, ty };
}

function tileRectToPixels(a, b) {
  const tx = Math.min(a.tx, b.tx);
  const ty = Math.min(a.ty, b.ty);
  const tw = Math.abs(b.tx - a.tx) + 1;
  const th = Math.abs(b.ty - a.ty) + 1;
  return { x: tx * TILE_SIZE, y: ty * TILE_SIZE, width: tw * TILE_SIZE, height: th * TILE_SIZE };
}

canvas.addEventListener("mousedown", (evt) => {
  selecting = true;
  startTile = tileFromEvent(evt);
  endTile = startTile;
});

let lastHoveredPanelEntry = null;
function syncPanelHighlightFromCanvas(tile) {
  const block = tile ? findBlockAt(tile.tx * TILE_SIZE, tile.ty * TILE_SIZE) : null;
  const el = block ? logEntryElements.get(blockKey(block)) : null;
  if (lastHoveredPanelEntry && lastHoveredPanelEntry !== el) {
    lastHoveredPanelEntry.classList.remove("highlighted");
  }
  if (el) el.classList.add("highlighted");
  lastHoveredPanelEntry = el;
}

canvas.addEventListener("mousemove", (evt) => {
  hoverTile = tileFromEvent(evt);
  if (selecting) {
    endTile = hoverTile;
  }
  syncPanelHighlightFromCanvas(hoverTile);
});

canvas.addEventListener("mouseleave", () => {
  hoverTile = null;
  syncPanelHighlightFromCanvas(null);
});

window.addEventListener("mouseup", () => {
  if (!selecting) return;
  selecting = false;
  if (!startTile || !endTile) return;
  const rect = tileRectToPixels(startTile, endTile);
  const singleTile = startTile.tx === endTile.tx && startTile.ty === endTile.ty;

  if (singleTile) {
    const clicked = findBlockAt(rect.x, rect.y);
    if (clicked) {
      clearSelection();
      openDetailView(clicked);
      return;
    }
  }

  if (rect.width * rect.height < grid.minBlockPixels) {
    statusMsg.textContent = t("pixels.statusMinPixels", { n: grid.minBlockPixels });
    clearSelection();
    return;
  }
  if (!grid.salesEnabled) {
    statusMsg.textContent = t("common.salesComingSoon");
    clearSelection();
    return;
  }
  openPurchaseModal(rect);
});

function findBlockAt(x, y) {
  return soldBlocks.find(
    (b) => x >= b.x && x < b.x + b.width && y >= b.y && y < b.y + b.height
  );
}

function wrapText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  let lines = 0;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
      lines++;
      if (lines >= maxLines) return;
    } else {
      line = testLine;
    }
  }
  if (line) context.fillText(line, x, cursorY);
}

/** Composes emoji/slogan/message (and an optional uploaded photo) into a single neon plaque PNG. */
async function renderPlaqueImage({ emoji, slogan, message, file }) {
  const c = document.createElement("canvas");
  c.width = 320;
  c.height = 320;
  const cx = c.getContext("2d");

  const photoBottom = file ? c.height * 0.5 : 0;

  cx.fillStyle = "#05070a";
  cx.fillRect(0, 0, c.width, c.height);

  if (file) {
    try {
      const bitmap = await createImageBitmap(file);
      const scale = Math.max(c.width / bitmap.width, photoBottom / bitmap.height);
      const dw = bitmap.width * scale;
      const dh = bitmap.height * scale;
      cx.drawImage(bitmap, (c.width - dw) / 2, (photoBottom - dh) / 2, dw, dh);
    } catch {
      // Unreadable image — fall back to plaque-only rendering.
    }
  }

  const plaqueTop = photoBottom;
  const grad = cx.createLinearGradient(0, plaqueTop, 0, c.height);
  grad.addColorStop(0, "#0b0f16");
  grad.addColorStop(1, "#05070a");
  cx.fillStyle = grad;
  cx.fillRect(0, plaqueTop, c.width, c.height - plaqueTop);

  cx.strokeStyle = "rgba(0, 255, 242, 0.7)";
  cx.lineWidth = 3;
  cx.strokeRect(4, plaqueTop + 4, c.width - 8, c.height - plaqueTop - 8);

  let cursorY = plaqueTop + 46;
  cx.textAlign = "center";

  if (emoji) {
    cx.shadowColor = "#00fff2";
    cx.shadowBlur = 14;
    cx.font = "46px serif";
    cx.fillStyle = "#e8fffe";
    cx.fillText(emoji, c.width / 2, cursorY);
    cx.shadowBlur = 0;
    cursorY += 44;
  }
  if (slogan) {
    cx.shadowColor = "#ff00d4";
    cx.shadowBlur = 8;
    cx.font = "bold 20px 'JetBrains Mono', monospace";
    cx.fillStyle = "#ff5fe8";
    cx.fillText(slogan, c.width / 2, cursorY);
    cx.shadowBlur = 0;
    cursorY += 30;
  }
  if (message) {
    cx.font = "15px 'JetBrains Mono', monospace";
    cx.fillStyle = "#a9e8ff";
    cx.textAlign = "left";
    wrapText(cx, message, 20, cursorY, c.width - 40, 21, 5);
  }

  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

function openPurchaseModal(rect) {
  const node = template.content.cloneNode(true);
  translateNode(node);
  const backdrop = node.querySelector(".modal-backdrop");
  const info = node.querySelector("#modal-selection-info");
  const priceEl = node.querySelector("#modal-price");
  const errorEl = node.querySelector("#modal-error");
  const emojiInput = node.querySelector("#modal-emoji");
  attachEmojiPicker(emojiInput);
  const messageInput = node.querySelector("#modal-message");
  const sloganInput = node.querySelector("#modal-slogan");
  const fileInput = node.querySelector("#modal-file");
  const fileBtn = node.querySelector("#modal-file-btn");
  const fileNameEl = node.querySelector("#modal-file-name");
  fileBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", () => {
    fileNameEl.textContent = fileInput.files[0]?.name || t("pixels.imageNone");
  });
  const linkInput = node.querySelector("#modal-link");
  const emailInput = node.querySelector("#modal-email");
  const countryInput = node.querySelector("#modal-country");
  const countryPicker = attachCountryAutocomplete(countryInput, getLang());
  const buyBtn = node.querySelector("#modal-buy");
  const cancelBtn = node.querySelector("#modal-cancel");

  const priceCents = rect.width * rect.height * grid.pricePerPixelCents;
  info.textContent = `${rect.width}x${rect.height}px @ (${rect.x}, ${rect.y})`;
  priceEl.textContent = formatPrice(priceCents);

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }

  function close() {
    document.body.removeChild(backdrop);
    clearSelection();
  }

  cancelBtn.addEventListener("click", close);

  buyBtn.addEventListener("click", async () => {
    const emoji = emojiInput.value.trim();
    const message = messageInput.value.trim();
    const slogan = sloganInput.value.trim();
    const file = fileInput.files[0] || null;

    if (!emoji && !message && !slogan && !file) {
      showError(t("pixels.errorNeedContent"));
      return;
    }
    if (!emailInput.value) {
      showError(t("pixels.errorNeedEmail"));
      return;
    }
    errorEl.classList.add("hidden");

    buyBtn.disabled = true;
    buyBtn.textContent = t("pixels.buyButtonBusy");
    try {
      const plaqueBlob = await renderPlaqueImage({ emoji, slogan, message, file });
      const imageKey = await uploadImage(plaqueBlob);
      const checkoutUrl = await checkout({
        kind: "pixel",
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        linkUrl: linkInput.value || `${location.origin}/`,
        email: emailInput.value,
        imageKey,
        message: message || undefined,
        emoji: emoji || undefined,
        slogan: slogan || undefined,
        country: countryPicker.getCode() || undefined,
        returnPath: RETURN_PATH,
      });
      location.href = checkoutUrl;
    } catch (err) {
      showError(errorMessage(err));
      buyBtn.disabled = false;
      buyBtn.textContent = t("pixels.buyButton");
    }
  });

  document.body.appendChild(node);
}

init();
