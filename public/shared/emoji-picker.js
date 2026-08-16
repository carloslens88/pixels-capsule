import { COUNTRY_CODES, flagEmoji } from "/shared/countries.js";

const EMOJIS = [
  // faces / emotions
  "😀", "😂", "🤣", "😅", "😍", "🥰", "😎", "🤩",
  "😭", "😤", "🥳", "🤔", "😴", "🥺", "😱", "🤯",
  // hearts
  "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍",
  "🤎", "💯", "💔", "❣️", "💕", "💞", "💓", "💗",
  // hands / gestures
  "👍", "👎", "🙌", "👏", "🤙", "✌️", "🤘", "🤟",
  "🙏", "💪", "👀", "👋", "🫡", "🤝", "👑", "💀",
  // fire / energy / weather
  "🔥", "⚡", "✨", "🌟", "💥", "💫", "⭐", "🌈",
  "☀️", "🌙", "☁️", "❄️", "🌊", "🍀", "🎯", "💧",
  // party / activities
  "🎉", "🎊", "🏆", "🎁", "🎈", "🎵", "🎮", "🎨",
  "⚽", "🏀", "🎸", "📸", "🎬", "🍕", "☕", "🍺",
  // animals
  "🐉", "🦄", "🐍", "🦋", "🐺", "🦅", "🐙", "🐸",
  "🐶", "🐱", "🦁", "🐢", "🦈", "🐝", "🌵", "🌸",
  // space / tech
  "🚀", "🛸", "🤖", "👾", "🌌", "🪐", "☄️", "🛰️",
  // misc / symbols
  "💎", "🔒", "🔑", "📌", "📍", "🗿", "💰", "🏴‍☠️",
];

const FLAGS = COUNTRY_CODES.map(flagEmoji);

function appendGrid(popover, list, onPick) {
  for (const emoji of list) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = emoji;
    btn.addEventListener("click", () => onPick(emoji));
    popover.appendChild(btn);
  }
}

/** Wires a small emoji-grid popover onto a text input — click to open, click an emoji to fill it in. */
export function attachEmojiPicker(input) {
  let popover = null;

  function close() {
    if (!popover) return;
    popover.remove();
    popover = null;
    document.removeEventListener("mousedown", onOutsideClick);
  }

  function onOutsideClick(evt) {
    if (popover && !popover.contains(evt.target) && evt.target !== input) close();
  }

  function pick(emoji) {
    input.value = emoji;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    close();
  }

  function open() {
    if (popover) return;
    popover = document.createElement("div");
    popover.className = "emoji-popover";
    appendGrid(popover, EMOJIS, pick);
    const divider = document.createElement("div");
    divider.className = "emoji-popover-divider";
    popover.appendChild(divider);
    appendGrid(popover, FLAGS, pick);
    input.insertAdjacentElement("afterend", popover);
    document.addEventListener("mousedown", onOutsideClick);
  }

  input.addEventListener("focus", open);
  input.addEventListener("click", open);
}
