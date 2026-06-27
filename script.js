// ── State ──────────────────────────────────────────────────────────────
let currentFilter  = "all";
let currentIndex   = null;
let currentSection = "generator";
let currentContent = null;
let selectedTags   = [];
let selectedColor  = null;
let customOshiText = "";

// ── Helpers ────────────────────────────────────────────────────────────
function getFilteredContents(filter) {
  if (filter === "all") return KASANE_CONTENTS;
  return KASANE_CONTENTS.filter(c => c.type === filter);
}

function dateSeed() {
  const now = new Date();
  return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
}

function seedIndex(seed, len) {
  return ((seed * 1664525 + 1013904223) >>> 0) % len;
}

function typeLabel(type) {
  const map = { classic: "古典", painting: "絵画", poem: "詩" };
  return map[type] || type;
}

function typeBadgeClass(type) {
  const map = { classic: "badge--classic", painting: "badge--painting", poem: "badge--poem" };
  return map[type] || "";
}

function hasPaintingImage(content) {
  return content.type === "painting" && Boolean(content.imagePath);
}

// ── Render fragment card ───────────────────────────────────────────────
function renderFragment(content) {
  const badge     = document.getElementById("fragment-badge");
  const imageWrap = document.getElementById("fragment-image-wrap");
  const imageEl   = document.getElementById("fragment-image");
  const fragmentEl = document.getElementById("fragment-text");
  const titleEl   = document.getElementById("fragment-title");
  const authorEl  = document.getElementById("fragment-author");
  const commentEl = document.getElementById("fragment-comment");

  badge.textContent = typeLabel(content.type);
  badge.className   = "badge " + typeBadgeClass(content.type);

  if (hasPaintingImage(content)) {
    imageEl.src = content.imagePath;
    imageEl.alt = "『" + content.title + "』";
    imageWrap.hidden = false;
    fragmentEl.hidden = true;
    fragmentEl.innerHTML = "";
  } else {
    imageEl.removeAttribute("src");
    imageEl.alt = "";
    imageWrap.hidden = true;
    fragmentEl.hidden = false;
    fragmentEl.innerHTML = content.fragment
      .split("\n")
      .map(line => `<span>${line}</span>`)
      .join("<br>");
  }

  titleEl.textContent  = "『" + content.title + "』";
  authorEl.textContent = content.author;
  commentEl.textContent = content.shortComment;

  // accent stripe color
  document.documentElement.style.setProperty("--accent-current", selectedColor ? selectedColor.hex : content.defaultColor.hex);

  const colorNameEl = document.getElementById("color-name");
  const colorDotEl  = document.getElementById("color-dot");
  if (colorNameEl) colorNameEl.textContent = selectedColor ? selectedColor.name : content.defaultColor.name;
  if (colorDotEl)  colorDotEl.style.background = selectedColor ? selectedColor.hex : content.defaultColor.hex;
}

// ── Tag options ────────────────────────────────────────────────────────
function renderTagOptions(tags) {
  const container = document.getElementById("tag-options");
  container.innerHTML = "";
  tags.forEach(tag => {
    const btn = document.createElement("button");
    btn.className = "tag-chip" + (selectedTags.includes(tag) ? " tag-chip--active" : "");
    btn.setAttribute("aria-pressed", selectedTags.includes(tag) ? "true" : "false");
    btn.textContent = "#" + tag;
    btn.addEventListener("click", () => toggleTag(tag));
    container.appendChild(btn);
  });
}

function toggleTag(tag) {
  if (selectedTags.includes(tag)) {
    selectedTags = selectedTags.filter(t => t !== tag);
  } else {
    selectedTags = [...selectedTags, tag];
  }
  if (currentContent) renderTagOptions(currentContent.tags);
}

// ── Color options ──────────────────────────────────────────────────────
function renderColorOptions() {
  const container = document.getElementById("color-options");
  container.innerHTML = "";
  KASANE_COLORS.forEach(color => {
    const btn = document.createElement("button");
    const isActive = selectedColor && selectedColor.name === color.name;
    btn.className = "color-chip" + (isActive ? " color-chip--active" : "");
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.setAttribute("aria-label", color.name + " (" + color.basic + ")");

    const swatch = document.createElement("span");
    swatch.className = "color-swatch";
    swatch.style.background = color.hex;
    swatch.style.borderColor = color.hex === "#FFFFFC" || color.hex === "#FBFAF5" ? "#E0DDD7" : "rgba(0,0,0,0.12)";

    const label = document.createElement("span");
    label.textContent = color.name;

    btn.appendChild(swatch);
    btn.appendChild(label);
    btn.addEventListener("click", () => selectColor(color));
    container.appendChild(btn);
  });
}

function selectColor(color) {
  selectedColor = color;
  document.documentElement.style.setProperty("--accent-current", color.hex);
  const colorNameEl = document.getElementById("color-name");
  const colorDotEl  = document.getElementById("color-dot");
  if (colorNameEl) colorNameEl.textContent = color.name;
  if (colorDotEl)  colorDotEl.style.background = color.hex;
  renderColorOptions();
}

// ── Oshi text ──────────────────────────────────────────────────────────
function updateOshiText(value) {
  customOshiText = value.trim();
}

// ── Preview render ─────────────────────────────────────────────────────
function renderPreview() {
  if (!currentContent) return;
  const container = document.getElementById("share-card-preview");
  container.innerHTML = "";

  const color = selectedColor || currentContent.defaultColor;

  // stripe
  const stripe = document.createElement("div");
  stripe.className = "share-card-stripe";
  stripe.style.background = color.hex;

  // inner
  const inner = document.createElement("div");
  inner.className = "share-card-inner";

  // logo
  const logo = document.createElement("span");
  logo.className = "share-card-logo";
  logo.textContent = "KASANE";

  // type
  const type = document.createElement("p");
  type.className = "share-card-type";
  type.textContent = typeLabel(currentContent.type);

  // fragment
  let media;
  if (hasPaintingImage(currentContent)) {
    media = document.createElement("figure");
    media.className = "share-card-image-wrap";
    const img = document.createElement("img");
    img.className = "share-card-image";
    img.src = currentContent.imagePath;
    img.alt = "『" + currentContent.title + "』";
    media.appendChild(img);
  } else {
    media = document.createElement("div");
    media.className = "share-card-fragment";
    media.innerHTML = currentContent.fragment
      .split("\n")
      .map(line => `<span>${line}</span>`)
      .join("<br>");
  }

  // rule
  const rule = document.createElement("div");
  rule.className = "share-card-rule";
  rule.setAttribute("aria-hidden", "true");

  // meta
  const meta = document.createElement("div");
  meta.className = "share-card-meta";
  const titleEl  = document.createElement("span");
  titleEl.className = "share-card-title";
  titleEl.textContent = "『" + currentContent.title + "』";
  const authorEl = document.createElement("span");
  authorEl.className = "share-card-author";
  authorEl.textContent = currentContent.author;
  meta.appendChild(titleEl);
  meta.appendChild(authorEl);

  // tags
  const tagsEl = document.createElement("div");
  tagsEl.className = "share-card-tags";
  const tagsToShow = selectedTags.length > 0 ? selectedTags : currentContent.tags;
  tagsToShow.forEach(tag => {
    const t = document.createElement("span");
    t.className = "share-card-tag";
    t.textContent = "#" + tag;
    tagsEl.appendChild(t);
  });

  // color
  const colorRow = document.createElement("div");
  colorRow.className = "share-card-color";
  const dot = document.createElement("span");
  dot.className = "share-card-color-dot";
  dot.style.background = color.hex;
  dot.setAttribute("aria-hidden", "true");
  const cName = document.createElement("span");
  cName.className = "share-card-color-name";
  cName.textContent = color.name;
  const cHex = document.createElement("span");
  cHex.className = "share-card-color-hex";
  cHex.textContent = color.hex;
  colorRow.appendChild(dot);
  colorRow.appendChild(cName);
  colorRow.appendChild(cHex);

  // oshi
  const oshi = document.createElement("p");
  oshi.className = "share-card-oshi";
  if (customOshiText) {
    oshi.textContent = customOshiText + "の気配を重ねる";
  } else {
    oshi.textContent = "誰かの気配を、ここに重ねる。";
  }

  inner.appendChild(logo);
  inner.appendChild(type);
  inner.appendChild(media);
  inner.appendChild(rule);
  inner.appendChild(meta);
  inner.appendChild(tagsEl);
  inner.appendChild(colorRow);
  inner.appendChild(oshi);

  container.appendChild(stripe);
  container.appendChild(inner);
}

// ── Show content ───────────────────────────────────────────────────────
function showContent(content, resetOshi) {
  currentContent = content;
  selectedTags   = [...content.tags];
  selectedColor  = content.defaultColor;
  if (resetOshi) customOshiText = "";

  renderFragment(content);
  renderTagOptions(content.tags);
  renderColorOptions();
}

// ── Initialize ─────────────────────────────────────────────────────────
function initGenerator() {
  const filtered = getFilteredContents(currentFilter);
  const seed     = dateSeed();
  currentIndex   = seedIndex(seed, filtered.length);
  showContent(filtered[currentIndex], false);
}

// ── Section switching ──────────────────────────────────────────────────
function showSection(name) {
  currentSection = name;
  document.querySelectorAll(".section").forEach(s => s.classList.remove("section--active"));
  document.getElementById("section-" + name).classList.add("section--active");

  document.querySelectorAll(".nav-about-btn").forEach(btn => {
    btn.classList.toggle("active", name === "about");
  });
}

// ── Filter / type switching ────────────────────────────────────────────
function setFilter(filter) {
  currentFilter = filter;

  document.querySelectorAll(".type-tab").forEach(btn => {
    const active = btn.dataset.type === filter;
    btn.classList.toggle("type-tab--active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  const filtered = getFilteredContents(filter);
  const seed     = dateSeed();
  currentIndex   = seedIndex(seed, filtered.length);
  showContent(filtered[currentIndex], false);
}

// ── Next fragment ──────────────────────────────────────────────────────
function nextFragment() {
  const filtered = getFilteredContents(currentFilter);
  currentIndex   = (currentIndex + 1) % filtered.length;
  showContent(filtered[currentIndex], false);  // preserve oshi text

  const card = document.querySelector(".fragment-card");
  card.classList.remove("fragment-card--pulse");
  void card.offsetWidth;
  card.classList.add("fragment-card--pulse");
}

// ── Event wiring ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initGenerator();

  // type tabs
  document.querySelectorAll(".type-tab").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.type));
  });

  // nav logo → generator
  document.querySelectorAll(".nav-logo-btn").forEach(btn => {
    btn.addEventListener("click", () => showSection("generator"));
  });

  // nav About / footer link → about
  document.querySelectorAll(".nav-about-btn").forEach(btn => {
    btn.addEventListener("click", () => showSection("about"));
  });

  // "別の断片を見る"
  document.getElementById("btn-next").addEventListener("click", nextFragment);

  // oshi input
  document.getElementById("oshi-input").addEventListener("input", e => {
    updateOshiText(e.target.value);
  });

  // "カードを確認する" → render preview then show
  document.getElementById("btn-preview").addEventListener("click", () => {
    renderPreview();
    showSection("preview");
  });

  // "編集に戻る" → generator
  document.getElementById("btn-back").addEventListener("click", () => showSection("generator"));
});
