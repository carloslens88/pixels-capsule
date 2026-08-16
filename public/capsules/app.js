import { fetchConfig, fetchCapsules, fetchBlock, uploadImage, checkout } from "/shared/api.js";
import { openDetailView, relativeTime } from "/shared/detail.js";
import { t, tn, onLangChange, errorMessage, translateNode, getLang } from "/shared/i18n.js";
import { flagEmoji, countryName } from "/shared/countries.js";
import { attachCountryAutocomplete } from "/shared/country-picker.js";
import { buildShareUrl, renderShareButtons } from "/shared/share.js";
import { startPresence } from "/shared/presence.js";

const canvas = document.getElementById("grid-canvas");
const ctx = canvas.getContext("2d");
const gridWrap = document.getElementById("grid-wrap");
const statusMsg = document.getElementById("status-msg");
const template = document.getElementById("purchase-modal-template");
const pricePill = document.getElementById("price-pill");
const viewersPill = document.getElementById("viewers-pill");
const toastEl = document.getElementById("toast");
const toastTextEl = document.getElementById("toast-text");
const toastShareEl = document.getElementById("toast-share");
const statTotal = document.getElementById("stat-total");
const statInvested = document.getElementById("stat-invested");
const activityLog = document.getElementById("activity-log");
const zoomLevelEl = document.getElementById("zoom-level");
const zoomInBtn = document.getElementById("zoom-in");
const zoomOutBtn = document.getElementById("zoom-out");
const zoomFitBtn = document.getElementById("zoom-fit");

// A capsule only reserves a small footprint (this is what sets its price via the
// shared pricePerPixel formula) — it is drawn much larger than that on screen, and
// its stored x/y is only the *launch point*: the orbit radius/angle are derived from
// it each frame, so no extra schema is needed to represent motion.
const FOOTPRINT = { width: 5, height: 2 };
const CAPSULE_W = 34;
const CAPSULE_H = 34;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 20;
const RETURN_PATH = "/capsules/";

let grid = { width: 1000, height: 1000, pricePerPixelCents: 100, minBlockPixels: 1 };
let capsules = [];
const imageCache = new Map();
let stars = [];
let shootingStars = [];
let comets = [];
let particles = [];

let zoom = 1;
let hoverPoint = null;
let lastT = 0;
let highlightedKey = null; // "x,y" of the capsule highlighted via side-panel hover
const logEntryElements = new Map();

function blockKey(b) {
  return `${b.x},${b.y}`;
}

function formatPrice(cents) {
  return `${(cents / 100).toFixed(2)} €`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function updateStatsPanel() {
  statTotal.textContent = capsules.length.toString();
  const totalCents = capsules.length * FOOTPRINT.width * FOOTPRINT.height * grid.pricePerPixelCents;
  statInvested.textContent = formatPrice(totalCents);
}

function updateActivityLog() {
  logEntryElements.clear();
  if (capsules.length === 0) {
    activityLog.innerHTML = `<div class="log-empty">${t("capsules.logEmpty")}</div>`;
    return;
  }
  activityLog.innerHTML = "";
  for (const b of capsules.slice(0, 30)) {
    const text = b.message || (b.sealed ? t("capsules.logSealed") : t("capsules.logNoMessage"));
    const badge = b.buyerNumber ? `<span class="badge">#${b.buyerNumber}</span> · ` : "";
    const entry = document.createElement("button");
    entry.className = "log-entry";
    entry.type = "button";
    entry.innerHTML = `
      <img class="log-thumb" src="${escapeHtml(b.imageUrl)}" loading="lazy" alt="" />
      <div class="log-body">
        <div class="log-text">🛰️ ${escapeHtml(text)}</div>
        <div class="log-meta">${badge}${relativeTime(b.createdAt)}</div>
      </div>`;
    entry.addEventListener("click", () => openDetailView(b, { titleKey: "detail.titleCapsule" }));
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

function makeStar(minR, maxR, driftSpeed) {
  const angle = Math.random() * Math.PI * 2;
  return {
    x: Math.random() * grid.width,
    y: Math.random() * grid.height,
    r: Math.random() * (maxR - minR) + minR,
    phase: Math.random() * Math.PI * 2,
    vx: Math.cos(angle) * driftSpeed,
    vy: Math.sin(angle) * driftSpeed,
  };
}

function maybeSpawnShootingStar() {
  if (shootingStars.length >= 1 || Math.random() > 0.0025) return;
  const fromLeft = Math.random() < 0.5;
  const y0 = Math.random() * grid.height * 0.6;
  shootingStars.push({
    x: fromLeft ? -20 : grid.width + 20,
    y: y0,
    vx: (fromLeft ? 1 : -1) * (grid.width * 0.0016 + Math.random() * grid.width * 0.001),
    vy: grid.height * 0.0007,
    life: 1,
  });
}

function drawShootingStars() {
  maybeSpawnShootingStar();
  const next = [];
  for (const s of shootingStars) {
    s.x += s.vx;
    s.y += s.vy;
    s.life -= 0.012;
    if (s.life > 0 && s.x > -40 && s.x < grid.width + 40 && s.y < grid.height + 40) {
      ctx.save();
      ctx.globalAlpha = Math.max(s.life, 0);
      ctx.strokeStyle = "#e8fffe";
      ctx.shadowColor = "#00fff2";
      ctx.shadowBlur = 8;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x - s.vx * 6, s.y - s.vy * 6);
      ctx.stroke();
      ctx.restore();
      next.push(s);
    }
  }
  shootingStars = next;
}

function maybeSpawnComet() {
  if (comets.length >= 1 || Math.random() > 0.00015) return;
  const fromLeft = Math.random() < 0.5;
  const speed = grid.width * 0.0009 + Math.random() * grid.width * 0.0004;
  comets.push({
    x: fromLeft ? -60 : grid.width + 60,
    y: Math.random() * grid.height * 0.7,
    vx: (fromLeft ? 1 : -1) * speed,
    vy: grid.height * 0.0004 + Math.random() * grid.height * 0.0003,
  });
}

function drawComets() {
  maybeSpawnComet();
  const next = [];
  for (const c of comets) {
    c.x += c.vx;
    c.y += c.vy;
    if (c.x > -100 && c.x < grid.width + 100 && c.y < grid.height + 100) {
      const tailX = c.x - c.vx * 14;
      const tailY = c.y - c.vy * 14;
      ctx.save();
      const grad = ctx.createLinearGradient(c.x, c.y, tailX, tailY);
      grad.addColorStop(0, "rgba(255, 184, 0, 0.9)");
      grad.addColorStop(1, "rgba(255, 184, 0, 0)");
      ctx.strokeStyle = grad;
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(c.x, c.y);
      ctx.lineTo(tailX, tailY);
      ctx.stroke();

      ctx.shadowColor = "#ffb800";
      ctx.shadowBlur = 16;
      ctx.fillStyle = "#fff3d6";
      ctx.beginPath();
      ctx.arc(c.x, c.y, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      next.push(c);
    }
  }
  comets = next;
}

async function init() {
  [grid, capsules] = await Promise.all([fetchConfig(), fetchCapsules()]);

  canvas.width = grid.width;
  canvas.height = grid.height;
  if (!grid.salesEnabled) document.getElementById("sales-banner").hidden = false;

  const area = grid.width * grid.height;
  const farCount = Math.round(area / 1400);
  const nearCount = Math.round(area / 4200);
  stars = [
    ...Array.from({ length: farCount }, () => makeStar(0.3, 0.9, 0.002)),
    ...Array.from({ length: nearCount }, () => makeStar(1, 2.2, 0.01)),
  ];

  updatePricePill();
  updateStatsPanel();
  updateActivityLog();
  onLangChange(() => {
    updatePricePill();
    updateActivityLog();
  });

  fitToScreen();
  requestAnimationFrame(frame);
  setInterval(refreshCapsules, 30000);
  startPresence((count) => {
    viewersPill.textContent = `🔴 ${count}`;
  });

  const params = new URLSearchParams(location.search);
  const highlightParam = params.get("highlight");
  if (highlightParam) {
    const [hx, hy] = highlightParam.split(",").map(Number);
    const target = capsules.find((b) => b.x === hx && b.y === hy);
    if (target) {
      panToCapsule(target);
      highlightedKey = blockKey(target);
      openDetailView(target, {
        titleKey: "detail.titleCapsule",
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
      const milestone = block.buyerNumber === 1 || block.buyerNumber % 100 === 0;
      const shareUrl = buildShareUrl("capsule", blockId);
      let text = milestone
        ? t("capsules.toastMilestone", { n: block.buyerNumber })
        : t("capsules.toastBuyerNumber", { n: block.buyerNumber });
      if (block.isFirstOfCountry && block.country) {
        text = t("common.toastFirstOfCountry", {
          flag: flagEmoji(block.country),
          country: countryName(block.country, getLang()),
        });
      }
      toastTextEl.textContent = text;
      toastEl.classList.toggle("milestone", milestone);
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
      const pos = orbitPosition(block, lastT);
      spawnBurst(pos.x, pos.y, milestone ? 100 : 40);
    } else {
      toastTextEl.textContent = t("capsules.toastGeneric");
      toastShareEl.innerHTML = "";
    }
    toastEl.classList.remove("hidden");
    setTimeout(() => toastEl.classList.add("hidden"), 12000);
    setTimeout(refreshCapsules, 1500);
  } else if (params.get("purchase") === "canceled") {
    statusMsg.textContent = t("capsules.statusCanceled");
  }
}

function updatePricePill() {
  pricePill.textContent = t("capsules.pricePillText", {
    price: formatPrice(FOOTPRINT.width * FOOTPRINT.height * grid.pricePerPixelCents),
  });
}

async function refreshCapsules() {
  capsules = await fetchCapsules();
  updateStatsPanel();
  updateActivityLog();
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

/** Zooms in on and centers the view roughly where a capsule currently orbits — used by ?highlight=x,y deep links. */
function panToCapsule(block) {
  setZoom(Math.max(zoom, 6));
  const pos = orbitPosition(block, performance.now());
  gridWrap.scrollLeft = pos.x * zoom - gridWrap.clientWidth / 2;
  gridWrap.scrollTop = pos.y * zoom - gridWrap.clientHeight / 2;
}

zoomInBtn.addEventListener("click", () => setZoom(zoom * 1.5));
zoomOutBtn.addEventListener("click", () => setZoom(zoom / 1.5));
zoomFitBtn.addEventListener("click", fitToScreen);

gridWrap.addEventListener(
  "wheel",
  (evt) => {
    if (!evt.ctrlKey && !evt.metaKey) return;
    evt.preventDefault();
    setZoom(zoom * (evt.deltaY < 0 ? 1.2 : 1 / 1.2));
  },
  { passive: false }
);
window.addEventListener("resize", fitToScreen);

function frame(t) {
  lastT = t;
  drawSpace(t);
  drawShootingStars();
  drawComets();
  drawCapsules(t);
  drawHover();
  drawParticles();
  requestAnimationFrame(frame);
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

function drawParticles() {
  if (particles.length === 0) return;
  const next = [];
  for (const p of particles) {
    p.x += p.vx;
    p.y += p.vy;
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

function drawSpace(t) {
  ctx.fillStyle = "#02040a";
  ctx.fillRect(0, 0, grid.width, grid.height);

  const cx = grid.width / 2;
  const cy = grid.height / 2;
  const nebula1 = ctx.createRadialGradient(cx * 0.6, cy * 0.5, 0, cx * 0.6, cy * 0.5, grid.width * 0.4);
  nebula1.addColorStop(0, "rgba(0, 255, 242, 0.06)");
  nebula1.addColorStop(1, "rgba(0, 255, 242, 0)");
  ctx.fillStyle = nebula1;
  ctx.fillRect(0, 0, grid.width, grid.height);

  const nebula2 = ctx.createRadialGradient(cx * 1.3, cy * 1.4, 0, cx * 1.3, cy * 1.4, grid.width * 0.35);
  nebula2.addColorStop(0, "rgba(255, 0, 212, 0.05)");
  nebula2.addColorStop(1, "rgba(255, 0, 212, 0)");
  ctx.fillStyle = nebula2;
  ctx.fillRect(0, 0, grid.width, grid.height);

  const nebula3 = ctx.createRadialGradient(cx * 0.25, cy * 1.5, 0, cx * 0.25, cy * 1.5, grid.width * 0.3);
  nebula3.addColorStop(0, "rgba(57, 255, 20, 0.04)");
  nebula3.addColorStop(1, "rgba(57, 255, 20, 0)");
  ctx.fillStyle = nebula3;
  ctx.fillRect(0, 0, grid.width, grid.height);

  for (const s of stars) {
    s.x = (s.x + s.vx + grid.width) % grid.width;
    s.y = (s.y + s.vy + grid.height) % grid.height;
    const alpha = 0.35 + 0.5 * Math.abs(Math.sin(t / 1400 + s.phase));
    ctx.fillStyle = `rgba(216, 245, 255, ${alpha})`;
    ctx.fillRect(s.x, s.y, s.r, s.r);
  }

  // central hub — the point everything orbits around
  const pulse = 0.6 + 0.4 * Math.sin(t / 500);
  ctx.save();
  ctx.shadowColor = "#00fff2";
  ctx.shadowBlur = 20;
  ctx.strokeStyle = `rgba(0, 255, 242, ${0.4 + pulse * 0.3})`;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(cx, cy, 10 + pulse * 3, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, cy, 3, 0, Math.PI * 2);
  ctx.fillStyle = "#00fff2";
  ctx.fill();
  ctx.restore();
}

/** Derives a capsule's current orbital position from its stored launch point — no extra fields needed. */
function orbitPosition(block, t) {
  const centerX = grid.width / 2;
  const centerY = grid.height / 2;
  const ox = block.x + block.width / 2 - centerX;
  const oy = block.y + block.height / 2 - centerY;
  const radius = Math.hypot(ox, oy);
  const baseAngle = Math.atan2(oy, ox);
  const seed = (Math.abs(block.x * 131 + block.y * 97) % 1000) / 1000;
  const dir = seed < 0.5 ? 1 : -1;
  const angularSpeed = (0.00003 + seed * 0.00005) * dir;
  const angle = baseAngle + t * angularSpeed;
  return {
    x: centerX + Math.cos(angle) * radius,
    y: centerY + Math.sin(angle) * radius,
    seed,
  };
}

function drawCapsules(t) {
  for (const b of capsules) {
    let img = imageCache.get(b.imageUrl);
    if (!img) {
      img = new Image();
      img.src = b.imageUrl;
      imageCache.set(b.imageUrl, img);
    }
    if (!img.complete || img.naturalWidth === 0) continue;

    const pos = orbitPosition(b, t);
    const bob = Math.sin(t / 700 + pos.seed * Math.PI * 2) * (grid.height * 0.004);

    ctx.save();
    ctx.shadowColor = "rgba(0, 255, 242, 0.5)";
    ctx.shadowBlur = 8;
    ctx.drawImage(img, pos.x - CAPSULE_W / 2, pos.y - CAPSULE_H / 2 + bob, CAPSULE_W, CAPSULE_H);
    ctx.restore();

    if (highlightedKey === blockKey(b)) {
      const pulse = 0.5 + 0.5 * Math.sin(t / 220);
      ctx.save();
      ctx.shadowColor = "#ff00d4";
      ctx.shadowBlur = (10 + pulse * 6) / zoom;
      ctx.strokeStyle = `rgba(255, 0, 212, ${0.7 + pulse * 0.3})`;
      ctx.lineWidth = Math.max(1.5, 2.5 / zoom);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y + bob, CAPSULE_W * 0.75, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }
}

function drawHover() {
  if (!hoverPoint) return;
  ctx.save();
  ctx.shadowColor = "#00fff2";
  ctx.shadowBlur = 6 / zoom;
  ctx.strokeStyle = "rgba(0, 255, 242, 0.85)";
  ctx.setLineDash([4 / zoom, 4 / zoom]);
  ctx.lineWidth = Math.max(1, 1.5 / zoom);
  ctx.strokeRect(hoverPoint.x - CAPSULE_W / 2, hoverPoint.y - CAPSULE_H / 2, CAPSULE_W, CAPSULE_H);

  // preview of the orbit this capsule would take
  const cx = grid.width / 2;
  const cy = grid.height / 2;
  const radius = Math.hypot(hoverPoint.x - cx, hoverPoint.y - cy);
  ctx.strokeStyle = "rgba(0, 255, 242, 0.15)";
  ctx.setLineDash([3 / zoom, 6 / zoom]);
  ctx.lineWidth = 1 / zoom;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function pointFromEvent(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const x = Math.min(Math.max((evt.clientX - rect.left) * scaleX, 0), grid.width);
  const y = Math.min(Math.max((evt.clientY - rect.top) * scaleY, 0), grid.height);
  return { x, y };
}

function findCapsuleAt(x, y) {
  return capsules.find((b) => {
    const pos = orbitPosition(b, lastT);
    return (
      x >= pos.x - CAPSULE_W / 2 &&
      x <= pos.x + CAPSULE_W / 2 &&
      y >= pos.y - CAPSULE_H / 2 &&
      y <= pos.y + CAPSULE_H / 2
    );
  });
}

let lastHoveredPanelEntry = null;
function syncPanelHighlightFromCanvas(pt) {
  const capsule = pt ? findCapsuleAt(pt.x, pt.y) : null;
  const el = capsule ? logEntryElements.get(blockKey(capsule)) : null;
  if (lastHoveredPanelEntry && lastHoveredPanelEntry !== el) {
    lastHoveredPanelEntry.classList.remove("highlighted");
  }
  if (el) el.classList.add("highlighted");
  lastHoveredPanelEntry = el;
}

canvas.addEventListener("mousemove", (evt) => {
  hoverPoint = pointFromEvent(evt);
  syncPanelHighlightFromCanvas(hoverPoint);
});
canvas.addEventListener("mouseleave", () => {
  hoverPoint = null;
  syncPanelHighlightFromCanvas(null);
});

canvas.addEventListener("click", (evt) => {
  const pt = pointFromEvent(evt);
  const hit = findCapsuleAt(pt.x, pt.y);
  if (hit) {
    openDetailView(hit, { titleKey: "detail.titleCapsule" });
    return;
  }

  if (!grid.salesEnabled) {
    statusMsg.textContent = t("common.salesComingSoon");
    return;
  }

  const x = Math.round(Math.min(Math.max(pt.x - FOOTPRINT.width / 2, 0), grid.width - FOOTPRINT.width));
  const y = Math.round(Math.min(Math.max(pt.y - FOOTPRINT.height / 2, 0), grid.height - FOOTPRINT.height));
  openComposeModal({ x, y, width: FOOTPRINT.width, height: FOOTPRINT.height });
});

function wrapText(context, text, x, y, maxWidth, lineHeight) {
  const words = text.split(/\s+/);
  let line = "";
  let cursorY = y;
  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (context.measureText(testLine).width > maxWidth && line) {
      context.fillText(line, x, cursorY);
      line = word;
      cursorY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) context.fillText(line, x, cursorY);
}

async function renderCapsuleImage(message) {
  const c = document.createElement("canvas");
  c.width = 240;
  c.height = 320;
  const cx = c.getContext("2d");

  const grad = cx.createLinearGradient(0, 0, 0, c.height);
  grad.addColorStop(0, "#0b0f16");
  grad.addColorStop(1, "#050b12");
  cx.fillStyle = grad;
  cx.fillRect(0, 0, c.width, c.height);

  cx.strokeStyle = "rgba(0, 255, 242, 0.7)";
  cx.lineWidth = 3;
  cx.strokeRect(6, 6, c.width - 12, c.height - 12);

  cx.beginPath();
  cx.arc(c.width - 36, 36, 20, 0, Math.PI * 2);
  cx.fillStyle = "rgba(255, 0, 212, 0.15)";
  cx.fill();
  cx.strokeStyle = "#ff00d4";
  cx.lineWidth = 2;
  cx.stroke();
  cx.fillStyle = "#ff5fe8";
  cx.font = "20px serif";
  cx.textAlign = "center";
  cx.textBaseline = "middle";
  cx.fillText("🛰️", c.width - 36, 38);

  cx.shadowColor = "#00fff2";
  cx.shadowBlur = 6;
  cx.fillStyle = "#a9e8ff";
  cx.font = "16px 'JetBrains Mono', monospace";
  cx.textAlign = "left";
  cx.textBaseline = "alphabetic";
  wrapText(cx, message, 24, 90, c.width - 48, 24);
  cx.shadowBlur = 0;

  return new Promise((resolve) => c.toBlob(resolve, "image/png"));
}

function openComposeModal(rect) {
  const node = template.content.cloneNode(true);
  translateNode(node);
  const backdrop = node.querySelector(".modal-backdrop");
  const messageInput = node.querySelector("#modal-message");
  const linkInput = node.querySelector("#modal-link");
  const emailInput = node.querySelector("#modal-email");
  const countryInput = node.querySelector("#modal-country");
  const countryPicker = attachCountryAutocomplete(countryInput, getLang());
  const priceEl = node.querySelector("#modal-price");
  const errorEl = node.querySelector("#modal-error");
  const buyBtn = node.querySelector("#modal-buy");
  const cancelBtn = node.querySelector("#modal-cancel");
  const sealToggle = node.querySelector("#modal-seal-toggle");
  const sealFields = node.querySelector("#modal-seal-fields");
  const sealHint = node.querySelector("#modal-seal-hint");
  const deliverAtInput = node.querySelector("#modal-deliver-at");
  const recipientEmailInput = node.querySelector("#modal-recipient-email");

  const minDeliverDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
  deliverAtInput.min = minDeliverDate.toISOString().slice(0, 10);

  sealToggle.addEventListener("change", () => {
    sealFields.hidden = !sealToggle.checked;
    sealHint.hidden = !sealToggle.checked;
  });

  const priceCents = rect.width * rect.height * grid.pricePerPixelCents;
  priceEl.textContent = formatPrice(priceCents);

  function showError(msg) {
    errorEl.textContent = msg;
    errorEl.classList.remove("hidden");
  }

  function close() {
    document.body.removeChild(backdrop);
  }

  cancelBtn.addEventListener("click", close);

  buyBtn.addEventListener("click", async () => {
    if (!messageInput.value.trim() || !emailInput.value) {
      showError(t("capsules.errorNeedMessageEmail"));
      return;
    }
    if (sealToggle.checked && (!deliverAtInput.value || !recipientEmailInput.value)) {
      showError(t("capsules.errorSealIncomplete"));
      return;
    }
    errorEl.classList.add("hidden");
    buyBtn.disabled = true;
    buyBtn.textContent = t("capsules.buyButtonBusy");
    try {
      const message = messageInput.value.trim();
      const blob = await renderCapsuleImage(message);
      const imageKey = await uploadImage(blob);
      const checkoutUrl = await checkout({
        kind: "capsule",
        x: rect.x,
        y: rect.y,
        width: rect.width,
        height: rect.height,
        linkUrl: linkInput.value || `${location.origin}/`,
        email: emailInput.value,
        imageKey,
        message,
        country: countryPicker.getCode() || undefined,
        returnPath: RETURN_PATH,
        deliverAt: sealToggle.checked ? deliverAtInput.value : undefined,
        recipientEmail: sealToggle.checked ? recipientEmailInput.value : undefined,
      });
      location.href = checkoutUrl;
    } catch (err) {
      showError(errorMessage(err));
      buyBtn.disabled = false;
      buyBtn.textContent = t("capsules.buyButton");
    }
  });

  document.body.appendChild(node);
}

init();
