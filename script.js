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

function getShareCardTags() {
  if (!currentContent) return [];
  const baseTags = selectedTags.length > 0 ? selectedTags : currentContent.tags;
  const oshiTag = customOshiText ? customOshiText + "っぽい" : null;
  return oshiTag ? [...baseTags, oshiTag] : baseTags;
}

// ── Preview render ─────────────────────────────────────────────────────
function renderPreview() {
  if (!currentContent) return;
  const container = document.getElementById("share-card-preview");
  container.innerHTML = "";

  const color = selectedColor || currentContent.defaultColor;
  const oshiInput = document.getElementById("oshi-input");
  const oshiText = oshiInput ? oshiInput.value.trim() : customOshiText;
  customOshiText = oshiText;

  // stripe
  const stripe = document.createElement("div");
  stripe.className = "share-card-stripe";
  stripe.style.background = color.hex;

  // inner
  const inner = document.createElement("div");
  inner.className = "share-card-inner";

  // brand
  const brand = document.createElement("div");
  brand.className = "share-card-brand";
  const logo = document.createElement("span");
  logo.className = "share-card-logo";
  logo.textContent = "KASANE";
  const subtitle = document.createElement("span");
  subtitle.className = "share-card-subtitle";
  subtitle.textContent = "好きの断片帳";
  brand.appendChild(logo);
  brand.appendChild(subtitle);

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

  // comment
  const comment = document.createElement("p");
  comment.className = "share-card-comment";
  comment.textContent = currentContent.shortComment;

  // tags
  const tagsEl = document.createElement("div");
  tagsEl.className = "share-card-tags";
  const tagsToShow = getShareCardTags();
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

  inner.appendChild(brand);
  inner.appendChild(type);
  inner.appendChild(media);
  inner.appendChild(rule);
  inner.appendChild(meta);
  inner.appendChild(comment);
  inner.appendChild(tagsEl);
  inner.appendChild(colorRow);

  container.appendChild(stripe);
  container.appendChild(inner);
}

// ── Save preview as image ──────────────────────────────────────────────
function createImageDownload(url, filename) {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("Canvasを画像化できませんでした。"));
      }
    }, "image/png");
  });
}

async function shareImageFile(blob, filename) {
  if (!navigator.share || !navigator.canShare || !window.File) {
    return false;
  }

  const file = new File([blob], filename, { type: "image/png" });

  if (!navigator.canShare({ files: [file] })) {
    return false;
  }

  try {
    await navigator.share({
      files: [file],
      title: "KASANE",
      text: "KASANEでカードを作りました。"
    });
    return true;
  } catch (error) {
    if (error && error.name === "AbortError") {
      return true;
    }
  }

  return false;
}

function getRelativeRect(element, baseRect) {
  const rect = element.getBoundingClientRect();
  return {
    x: rect.left - baseRect.left,
    y: rect.top - baseRect.top,
    width: rect.width,
    height: rect.height
  };
}

function drawRoundedRect(context, x, y, width, height, radius) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function setCanvasFont(context, element) {
  const style = window.getComputedStyle(element);
  context.font = [
    style.fontStyle,
    style.fontWeight,
    style.fontSize,
    style.fontFamily
  ].join(" ");
  context.fillStyle = style.color;
  context.textBaseline = "top";
  if ("letterSpacing" in context) {
    context.letterSpacing = style.letterSpacing;
  }
}

function drawTextElement(context, element, baseRect) {
  const rect = getRelativeRect(element, baseRect);
  setCanvasFont(context, element);

  const style = window.getComputedStyle(element);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
  const text = element.textContent || "";
  const shouldWrap = rect.height > lineHeight * 1.4 && text.length > 0;

  if (!shouldWrap) {
    context.fillText(text, rect.x, rect.y);
    return;
  }

  const lines = [];
  let line = "";
  [...text].forEach(char => {
    const nextLine = line + char;
    if (line && context.measureText(nextLine).width > rect.width) {
      lines.push(line);
      line = char.trimStart();
    } else {
      line = nextLine;
    }
  });
  if (line) lines.push(line);

  lines.forEach((lineText, index) => {
    context.fillText(lineText, rect.x, rect.y + lineHeight * index);
  });
}

function drawImageElement(context, image, baseRect) {
  const rect = getRelativeRect(image, baseRect);
  const style = window.getComputedStyle(image);
  const radius = parseFloat(style.borderRadius) || 0;

  drawRoundedRect(context, rect.x, rect.y, rect.width, rect.height, radius);
  context.fillStyle = style.backgroundColor;
  context.fill();
  context.save();
  context.clip();

  const naturalWidth = image.naturalWidth || rect.width;
  const naturalHeight = image.naturalHeight || rect.height;
  const imageScale = Math.min(rect.width / naturalWidth, rect.height / naturalHeight);
  const drawWidth = naturalWidth * imageScale;
  const drawHeight = naturalHeight * imageScale;
  const drawX = rect.x + (rect.width - drawWidth) / 2;
  const drawY = rect.y + (rect.height - drawHeight) / 2;
  context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
  context.restore();

  context.strokeStyle = style.borderColor;
  context.lineWidth = parseFloat(style.borderWidth) || 1;
  drawRoundedRect(context, rect.x + 0.5, rect.y + 0.5, rect.width - 1, rect.height - 1, radius);
  context.stroke();
}

function waitForPreviewImages(card) {
  const images = [...card.querySelectorAll("img")];
  return Promise.all(images.map(image => {
    if (image.complete && image.naturalWidth > 0) return Promise.resolve();
    if (image.decode) return image.decode().catch(() => undefined);
    return new Promise(resolve => {
      image.addEventListener("load", resolve, { once: true });
      image.addEventListener("error", resolve, { once: true });
    });
  }));
}

function drawPreviewToCanvas(card, scale) {
  const baseRect = card.getBoundingClientRect();
  const width = Math.ceil(baseRect.width);
  const height = Math.ceil(baseRect.height);
  const cardStyle = window.getComputedStyle(card);
  const canvas = document.createElement("canvas");
  canvas.width = width * scale;
  canvas.height = height * scale;

  const context = canvas.getContext("2d");
  context.scale(scale, scale);

  const radius = parseFloat(cardStyle.borderRadius) || 0;
  context.shadowColor = "rgba(0,0,0,0.07)";
  context.shadowBlur = 20;
  context.shadowOffsetY = 4;
  drawRoundedRect(context, 0, 0, width, height, radius);
  context.fillStyle = cardStyle.backgroundColor;
  context.fill();

  context.shadowColor = "transparent";
  context.lineWidth = 1;
  context.strokeStyle = cardStyle.borderColor;
  drawRoundedRect(context, 0.5, 0.5, width - 1, height - 1, radius);
  context.stroke();

  const stripe = card.querySelector(".share-card-stripe");
  if (stripe) {
    const stripeRect = getRelativeRect(stripe, baseRect);
    context.fillStyle = window.getComputedStyle(stripe).backgroundColor;
    context.fillRect(stripeRect.x, stripeRect.y, stripeRect.width, stripeRect.height);
  }

  const rule = card.querySelector(".share-card-rule");
  if (rule) {
    const ruleRect = getRelativeRect(rule, baseRect);
    context.fillStyle = window.getComputedStyle(rule).backgroundColor;
    context.fillRect(ruleRect.x, ruleRect.y, ruleRect.width, ruleRect.height);
  }

  const dot = card.querySelector(".share-card-color-dot");
  if (dot) {
    const dotRect = getRelativeRect(dot, baseRect);
    const dotStyle = window.getComputedStyle(dot);
    context.beginPath();
    context.arc(dotRect.x + dotRect.width / 2, dotRect.y + dotRect.height / 2, dotRect.width / 2, 0, Math.PI * 2);
    context.fillStyle = dotStyle.backgroundColor;
    context.fill();
    context.strokeStyle = dotStyle.borderColor;
    context.lineWidth = 1;
    context.stroke();
  }

  card.querySelectorAll(".share-card-image").forEach(image => {
    drawImageElement(context, image, baseRect);
  });

  card.querySelectorAll(
    ".share-card-logo, .share-card-subtitle, .share-card-type, .share-card-fragment span, .share-card-title, .share-card-author, .share-card-comment, .share-card-tag, .share-card-color-name, .share-card-color-hex"
  ).forEach(element => {
    drawTextElement(context, element, baseRect);
  });

  return canvas;
}

async function savePreviewImage() {
  const card = document.getElementById("share-card-preview");
  const saveButton = document.getElementById("btn-save-image");
  if (!card || !card.children.length) return;

  const originalText = saveButton.textContent;
  saveButton.disabled = true;
  saveButton.textContent = "保存準備中";

  try {
    const scale = 2;
    const filename = "kasane-card.png";
    await waitForPreviewImages(card);
    const canvas = drawPreviewToCanvas(card, scale);
    const blob = await canvasToBlob(canvas);
    const shared = await shareImageFile(blob, filename);

    if (!shared) {
      const pngUrl = URL.createObjectURL(blob);
      createImageDownload(pngUrl, filename);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    }
  } catch (error) {
    console.error(error);
    window.alert("画像を保存・共有できませんでした。別のブラウザでお試しください。");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = originalText;
  }
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

  // "画像を保存・共有" → share or download preview card
  document.getElementById("btn-save-image").addEventListener("click", savePreviewImage);
});
