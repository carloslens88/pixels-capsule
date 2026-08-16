const translations = {
  es: {
    landing: {
      subtitleHtml: 'Un muro compartido de <span class="k">1.000.000</span> píxeles, y un campo de cápsulas en órbita. Dos formas de dejar tu huella en la red.',
      wallTitle: "EL MURO // 2026",
      wallDesc: "Compra un píxel por 1 €. Escribe un mensaje, un emoji, tu enlace. Deja constancia de que estuviste aquí.",
      wallCta: "Entrar al muro →",
      capsulesTitle: "CÁPSULAS EN ÓRBITA",
      capsulesDesc: "Sella un mensaje en una cápsula y lánzala a un campo orbital compartido, dando vueltas para siempre.",
      capsulesCta: "Lanzar cápsula →",
      footerHtml: "&gt; dos formas de dejar tu huella_",
      statsLink: "estadísticas en vivo →",
    },
    common: {
      zoomOutTitle: "Alejar",
      zoomInTitle: "Acercar",
      zoomFitTitle: "Ajustar a la pantalla",
      zoomFitLabel: "Ajustar",
      cancel: "cancelar",
      close: "cerrar",
      visitLink: "visitar enlace ↗",
      emailLabel: "Email",
      countryLabel: "País (opcional)",
      countryPlaceholder: "— selecciona —",
      shareTwitter: "Compartir en X",
      shareWhatsapp: "WhatsApp",
      shareCopy: "Copiar enlace",
      shareCopied: "¡Copiado!",
      toastFirstOfCountry: "🎉 ¡Eres el primer comprador de {flag} {country}!",
      charityBanner: "💚 El 30% de cada compra se dona a las víctimas del terremoto en Venezuela y Colombia, para ayudar a reconstruir lo que se perdió. 🇻🇪🇨🇴",
      salesComingSoon: "🚧 Las compras abren muy pronto. Ya puedes explorar el muro — vuelve en unos días para dejar tu marca.",
    },
    detail: {
      titlePixel: "MARCA",
      titleCapsule: "SEÑAL",
      sealedUntil: "🔒 Sellada — se revela el {date}",
    },
    time: {
      secondsAgo: "hace {n}s",
      minutesAgo: "hace {n}m",
      hoursAgo: "hace {n}h",
      daysAgo: "hace {n}d",
    },
    pixels: {
      headerTaglineHtml: "&gt; click = 1px = 1€. arrastra para un bloque mayor_",
      titleHtml: "🧱 EL MURO // 2026",
      noSelection: "sin selección",
      mark_one: "{n} marca",
      mark_other: "{n} marcas",
      tickerEmpty: "esperando actividad en el muro...",
      statTotalLabel: "marcas totales",
      statPercentLabel: "% del muro ocupado",
      liveActivity: "ACTIVIDAD EN VIVO",
      logEmpty: "sin actividad todavía — sé el primero_",
      logNewMark: "nueva marca",
      statusCanceled: "compra cancelada — selección liberada.",
      statusMinPixels: "selecciona al menos {n} píxel(es).",
      toastBuyerNumber: "✔ ERES LA MARCA #{n} EN EL MURO",
      toastMilestone: "🏆 ¡HITO! Eres la marca #{n} en el Muro",
      toastGeneric: "✔ TU MARCA YA ESTÁ EN EL MURO",
      modalTitleHtml: "&gt; NUEVA_MARCA.init()",
      emojiLabel: "Emoji",
      messageLabel: "Mensaje",
      messagePlaceholder: "¿Qué quieres que se recuerde?",
      sloganLabel: "Frase / lema",
      sloganPlaceholder: 'p.ej. "estuve aquí en 2026"',
      linkLabel: "IG / TikTok / Twitch / Web (opcional)",
      imageLabel: "Imagen (opcional)",
      imageChoose: "Elegir imagen",
      imageNone: "sin archivo",
      buyButton: "comprar",
      buyButtonBusy: "grabando...",
      errorNeedContent: "Añade al menos un emoji, mensaje, frase o imagen.",
      errorNeedEmail: "Necesitamos tu email para confirmar la compra.",
    },
    capsules: {
      headerTaglineHtml: "&gt; click = lanzar una cápsula a órbita_",
      titleHtml: "🛰️ CÁPSULAS EN ÓRBITA",
      pricePillText: "cada cápsula cuesta {price}",
      statLaunchedLabel: "cápsulas lanzadas",
      statInvestedLabel: "invertido en total",
      liveSignals: "SEÑALES EN VIVO",
      logEmpty: "ninguna señal todavía — sé el primero_",
      logNoMessage: "señal sin mensaje",
      statusCanceled: "Lanzamiento cancelado.",
      toastBuyerNumber: "✔ TU CÁPSULA ES LA MARCA #{n}",
      toastMilestone: "🏆 ¡HITO! Tu cápsula es la marca #{n}",
      toastGeneric: "✔ CÁPSULA EN ÓRBITA",
      modalTitleHtml: "&gt; NUEVA_CÁPSULA.init()",
      messageLabel: "Mensaje",
      messagePlaceholder: "Escribe aquí lo que quieras mandar a órbita...",
      linkLabel: "Enlace (opcional)",
      linkPlaceholder: "https://tu-web.com",
      buyButton: "lanzar cápsula",
      buyButtonBusy: "codificando cápsula...",
      errorNeedMessageEmail: "Escribe un mensaje y tu email.",
      sealToggleLabel: "Sellar hasta una fecha (opcional)",
      sealDeliverAtLabel: "Fecha de entrega",
      sealRecipientLabel: "Email del destinatario",
      sealHint: "El mensaje quedará oculto para todos — nadie podrá verlo hasta ese día, cuando además avisamos por email al destinatario.",
      errorSealIncomplete: "Indica la fecha de entrega y el email del destinatario, o desactiva el sellado.",
      logSealed: "señal sellada — se revela pronto",
    },
    errors: {
      invalid_kind: "Algo no cuadra en la petición. Recarga la página e inténtalo de nuevo.",
      invalid_coordinates: "Esas coordenadas no son válidas.",
      min_block: "El bloque debe tener al menos {min} píxeles.",
      invalid_country: "Ese país no es válido.",
      invalid_link: "El enlace no es válido.",
      invalid_email: "El email no es válido.",
      missing_image: "Falta la imagen.",
      content_too_long: "El mensaje, emoji o frase es demasiado largo.",
      profanity: "Ese texto contiene lenguaje inapropiado. Prueba a reformularlo.",
      overlap: "Ese hueco ya está ocupado — prueba en otro sitio.",
      unsupported_type: "Formato de imagen no soportado.",
      too_large: "La imagen pesa demasiado (máx. 5MB).",
      missing_file: "Falta el archivo de imagen.",
      sales_disabled: "Las compras aún no están abiertas. Vuelve muy pronto.",
      invalid_delivery: "Indica la fecha de entrega y el email del destinatario, o desactiva el sellado.",
      invalid_deliver_at: "Esa fecha de entrega no es válida — debe ser al menos mañana y como mucho dentro de 5 años.",
      invalid_recipient_email: "El email del destinatario no es válido.",
      default: "Ha ocurrido un error. Inténtalo de nuevo.",
    },
  },
  en: {
    landing: {
      subtitleHtml: 'A shared wall of <span class="k">1,000,000</span> pixels, and a field of capsules in orbit. Two ways to leave your mark on the web.',
      wallTitle: "THE WALL // 2026",
      wallDesc: "Buy a pixel for 1 €. Write a message, an emoji, your link. Leave proof you were here.",
      wallCta: "Enter the wall →",
      capsulesTitle: "CAPSULES IN ORBIT",
      capsulesDesc: "Seal a message in a capsule and launch it into a shared orbital field, circling forever.",
      capsulesCta: "Launch a capsule →",
      footerHtml: "&gt; two ways to leave your mark_",
      statsLink: "live stats →",
    },
    common: {
      zoomOutTitle: "Zoom out",
      zoomInTitle: "Zoom in",
      zoomFitTitle: "Fit to screen",
      zoomFitLabel: "Fit",
      cancel: "cancel",
      close: "close",
      visitLink: "visit link ↗",
      emailLabel: "Email",
      countryLabel: "Country (optional)",
      countryPlaceholder: "— select —",
      shareTwitter: "Share on X",
      shareWhatsapp: "WhatsApp",
      shareCopy: "Copy link",
      shareCopied: "Copied!",
      toastFirstOfCountry: "🎉 You're the first buyer from {flag} {country}!",
      charityBanner: "💚 30% of every purchase is donated to earthquake relief for Venezuela and Colombia, helping rebuild what was lost. 🇻🇪🇨🇴",
      salesComingSoon: "🚧 Purchases open very soon. You can already explore the wall — check back in a few days to leave your mark.",
    },
    detail: {
      titlePixel: "MARK",
      titleCapsule: "SIGNAL",
      sealedUntil: "🔒 Sealed — unlocks on {date}",
    },
    time: {
      secondsAgo: "{n}s ago",
      minutesAgo: "{n}m ago",
      hoursAgo: "{n}h ago",
      daysAgo: "{n}d ago",
    },
    pixels: {
      headerTaglineHtml: "&gt; click = 1px = 1€. drag for a bigger block_",
      titleHtml: "🧱 THE WALL // 2026",
      noSelection: "no selection",
      mark_one: "{n} mark",
      mark_other: "{n} marks",
      tickerEmpty: "waiting for activity on the wall...",
      statTotalLabel: "total marks",
      statPercentLabel: "% of the wall claimed",
      liveActivity: "LIVE ACTIVITY",
      logEmpty: "no activity yet — be the first_",
      logNewMark: "new mark",
      statusCanceled: "purchase canceled — selection released.",
      statusMinPixels: "select at least {n} pixel(s).",
      toastBuyerNumber: "✔ YOU'RE MARK #{n} ON THE WALL",
      toastMilestone: "🏆 MILESTONE! You're mark #{n} on the Wall",
      toastGeneric: "✔ YOUR MARK IS ON THE WALL",
      modalTitleHtml: "&gt; NEW_MARK.init()",
      emojiLabel: "Emoji",
      messageLabel: "Message",
      messagePlaceholder: "What do you want people to remember?",
      sloganLabel: "Slogan / tagline",
      sloganPlaceholder: 'e.g. "I was here in 2026"',
      linkLabel: "IG / TikTok / Twitch / Web (optional)",
      imageLabel: "Image (optional)",
      imageChoose: "Choose image",
      imageNone: "no file",
      buyButton: "buy",
      buyButtonBusy: "saving...",
      errorNeedContent: "Add at least an emoji, message, slogan, or image.",
      errorNeedEmail: "We need your email to confirm the purchase.",
    },
    capsules: {
      headerTaglineHtml: "&gt; click = launch a capsule into orbit_",
      titleHtml: "🛰️ CAPSULES IN ORBIT",
      pricePillText: "each capsule costs {price}",
      statLaunchedLabel: "capsules launched",
      statInvestedLabel: "total invested",
      liveSignals: "LIVE SIGNALS",
      logEmpty: "no signals yet — be the first_",
      logNoMessage: "signal with no message",
      statusCanceled: "Launch canceled.",
      toastBuyerNumber: "✔ YOUR CAPSULE IS MARK #{n}",
      toastMilestone: "🏆 MILESTONE! Your capsule is mark #{n}",
      toastGeneric: "✔ CAPSULE IN ORBIT",
      modalTitleHtml: "&gt; NEW_CAPSULE.init()",
      messageLabel: "Message",
      messagePlaceholder: "Write what you want to send into orbit...",
      linkLabel: "Link (optional)",
      linkPlaceholder: "https://your-site.com",
      buyButton: "launch capsule",
      buyButtonBusy: "encoding capsule...",
      errorNeedMessageEmail: "Write a message and your email.",
      sealToggleLabel: "Seal until a date (optional)",
      sealDeliverAtLabel: "Delivery date",
      sealRecipientLabel: "Recipient's email",
      sealHint: "The message stays hidden from everyone — nobody can see it until that day, when we also email the recipient.",
      errorSealIncomplete: "Enter a delivery date and the recipient's email, or turn off sealing.",
      logSealed: "sealed signal — revealing soon",
    },
    errors: {
      invalid_kind: "Something's off with the request. Reload the page and try again.",
      invalid_coordinates: "Those coordinates aren't valid.",
      min_block: "The block must be at least {min} pixels.",
      invalid_country: "That country isn't valid.",
      invalid_link: "That link isn't valid.",
      invalid_email: "That email isn't valid.",
      missing_image: "Missing image.",
      content_too_long: "The message, emoji, or slogan is too long.",
      profanity: "That text contains inappropriate language. Try rephrasing it.",
      overlap: "That spot is already taken — try somewhere else.",
      unsupported_type: "Unsupported image format.",
      too_large: "The image is too large (max 5MB).",
      missing_file: "Missing image file.",
      sales_disabled: "Purchases aren't open yet. Check back very soon.",
      invalid_delivery: "Enter a delivery date and the recipient's email, or turn off sealing.",
      invalid_deliver_at: "That delivery date isn't valid — it must be at least tomorrow and at most 5 years out.",
      invalid_recipient_email: "That recipient email isn't valid.",
      default: "Something went wrong. Please try again.",
    },
  },
};

const STORAGE_KEY = "omp_lang";
const listeners = new Set();

function detectLang() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "es" || stored === "en") return stored;
  return navigator.language && navigator.language.toLowerCase().startsWith("en") ? "en" : "es";
}

let currentLang = detectLang();

/** Dot-path lookup, e.g. t("pixels.buyButton"). Supports {var} interpolation. */
export function t(key, vars) {
  const parts = key.split(".");
  let node = translations[currentLang];
  for (const part of parts) {
    node = node?.[part];
  }
  let str = node ?? key;
  if (vars) {
    for (const [k, v] of Object.entries(vars)) {
      str = str.replaceAll(`{${k}}`, v);
    }
  }
  return str;
}

/** Pluralized lookup: picks `${key}_one` or `${key}_other` based on n. */
export function tn(key, n) {
  return t(`${key}_${n === 1 ? "one" : "other"}`, { n });
}

export function formatRelativeTime(epochSeconds) {
  if (!epochSeconds) return "";
  const diff = Math.max(Math.floor(Date.now() / 1000) - epochSeconds, 0);
  if (diff < 60) return t("time.secondsAgo", { n: diff });
  if (diff < 3600) return t("time.minutesAgo", { n: Math.floor(diff / 60) });
  if (diff < 86400) return t("time.hoursAgo", { n: Math.floor(diff / 3600) });
  return t("time.daysAgo", { n: Math.floor(diff / 86400) });
}

/** Looks up a backend error code, falling back to the raw message or a generic default. */
export function errorMessage(err) {
  if (err && err.code) {
    const msg = t(`errors.${err.code}`, err.vars);
    if (msg !== `errors.${err.code}`) return msg;
  }
  return err?.message || t("errors.default");
}

export function getLang() {
  return currentLang;
}

export function onLangChange(cb) {
  listeners.add(cb);
}

/**
 * Applies translations to every matching element under `root`. Exported so callers can
 * re-run it on fragments cloned from a <template> — template content is inert and isn't
 * found by a document-wide querySelectorAll pass, so those clones need this called on
 * them explicitly right after cloning (see openPurchaseModal / openComposeModal).
 */
export function translateNode(root = document) {
  for (const el of root.querySelectorAll("[data-i18n]")) {
    el.textContent = t(el.getAttribute("data-i18n"));
  }
  for (const el of root.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = t(el.getAttribute("data-i18n-html"));
  }
  for (const el of root.querySelectorAll("[data-i18n-placeholder]")) {
    el.placeholder = t(el.getAttribute("data-i18n-placeholder"));
  }
  for (const el of root.querySelectorAll("[data-i18n-title]")) {
    el.title = t(el.getAttribute("data-i18n-title"));
  }
  for (const btn of root.querySelectorAll("[data-lang-btn]")) {
    btn.classList.toggle("active", btn.getAttribute("data-lang-btn") === currentLang);
  }
}

function applyStaticTranslations() {
  document.documentElement.lang = currentLang;
  translateNode(document);
}

export function setLang(lang) {
  if (lang !== "es" && lang !== "en") return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  applyStaticTranslations();
  for (const cb of listeners) cb(lang);
}

document.querySelectorAll("[data-lang-btn]").forEach((btn) => {
  btn.addEventListener("click", () => setLang(btn.getAttribute("data-lang-btn")));
});

applyStaticTranslations();
