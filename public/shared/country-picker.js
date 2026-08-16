import { flagEmoji, countryName, sortedCountryCodes } from "/shared/countries.js";

function normalize(str) {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

/**
 * Turns a text input into a country-name autocomplete (styled popover, filters as you
 * type). The selected ISO code lives in `input.dataset.countryCode` — empty string if
 * nothing valid is currently selected.
 */
export function attachCountryAutocomplete(input, lang) {
  const codes = sortedCountryCodes(lang);
  let popover = null;
  let options = [];
  let activeIndex = -1;

  function optionLabel(code) {
    return `${flagEmoji(code)} ${countryName(code, lang)}`;
  }

  function close() {
    if (!popover) return;
    popover.remove();
    popover = null;
    activeIndex = -1;
    document.removeEventListener("mousedown", onOutsideClick);
  }

  function onOutsideClick(evt) {
    if (popover && !popover.contains(evt.target) && evt.target !== input) {
      commitOrClear();
      close();
    }
  }

  /** If the visible text no longer matches the stored selection, drop the selection. */
  function commitOrClear() {
    const code = input.dataset.countryCode;
    if (code && input.value !== optionLabel(code)) {
      input.value = "";
      delete input.dataset.countryCode;
    }
  }

  function select(code) {
    input.value = optionLabel(code);
    input.dataset.countryCode = code;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    close();
  }

  function setActive(index) {
    activeIndex = index;
    [...popover.children].forEach((el, i) => el.classList.toggle("active", i === activeIndex));
    popover.children[activeIndex]?.scrollIntoView({ block: "nearest" });
  }

  function render(filter) {
    const norm = normalize(filter || "");
    options = codes.filter((c) => normalize(countryName(c, lang)).includes(norm)).slice(0, 60);

    if (!popover) {
      popover = document.createElement("div");
      popover.className = "autocomplete-popover";
      input.insertAdjacentElement("afterend", popover);
      document.addEventListener("mousedown", onOutsideClick);
    }
    popover.innerHTML = "";

    if (options.length === 0) {
      const empty = document.createElement("div");
      empty.className = "autocomplete-empty";
      empty.textContent = "—";
      popover.appendChild(empty);
      return;
    }

    options.forEach((code) => {
      const item = document.createElement("button");
      item.type = "button";
      item.className = "autocomplete-item";
      item.textContent = optionLabel(code);
      item.addEventListener("mousedown", (evt) => evt.preventDefault()); // don't blur the input before the click fires
      item.addEventListener("click", () => select(code));
      popover.appendChild(item);
    });
    setActive(0);
  }

  function moveActive(delta) {
    if (!popover || options.length === 0) return;
    setActive((activeIndex + delta + options.length) % options.length);
  }

  input.addEventListener("focus", () => render(input.dataset.countryCode ? "" : input.value));
  input.addEventListener("input", () => {
    delete input.dataset.countryCode;
    render(input.value);
  });
  input.addEventListener("keydown", (evt) => {
    if (evt.key === "ArrowDown") {
      evt.preventDefault();
      moveActive(1);
    } else if (evt.key === "ArrowUp") {
      evt.preventDefault();
      moveActive(-1);
    } else if (evt.key === "Enter") {
      if (popover && options[activeIndex]) {
        evt.preventDefault();
        select(options[activeIndex]);
      }
    } else if (evt.key === "Escape") {
      commitOrClear();
      close();
    }
  });

  return { getCode: () => input.dataset.countryCode || "" };
}
