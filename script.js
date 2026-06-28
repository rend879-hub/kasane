// ── State ──────────────────────────────────────────────────────────────
let currentFilter  = "all";
let currentIndex   = null;
let currentSection = "generator";
let currentContent = null;
let selectedTags   = [];
let selectedColor  = null;
let selectedTemplate = "post";
let customSymbolText = "";
let customTagText = "";
const preloadedImages = new Map();

const SHARE_TEMPLATES = {
  post: {
    className: "share-card-preview--post",
    filename: "kasane-card-post.png",
    exportWidth: 1080,
    tagLimit: 4,
    fragmentLimit: 72
  },
  header: {
    className: "share-card-preview--header",
    filename: "kasane-card-header.png",
    exportWidth: 1500,
    tagLimit: 1,
    fragmentLimit: 30
  },
  icon: {
    className: "share-card-preview--icon",
    filename: "kasane-card-icon.png",
    exportWidth: 1024,
    tagLimit: 1,
    fragmentLimit: 32
  }
};

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

function preloadImage(src) {
  if (!src) return Promise.resolve();
  if (preloadedImages.has(src)) return preloadedImages.get(src);

  const promise = new Promise(resolve => {
    const img = new Image();
    img.onload = () => resolve(src);
    img.onerror = () => resolve(src);
    img.src = src;
  });

  preloadedImages.set(src, promise);
  return promise;
}

function preloadPaintingImages() {
  KASANE_CONTENTS
    .filter(content => hasPaintingImage(content))
    .forEach(content => {
      preloadImage(content.imagePath);
    });
}

function getLearnFallbackIntro(content) {
  const type = typeLabel(content.type);
  const period = content.period ? content.period + "に位置づけられる" : "";
  return "『" + content.title + "』は、" + period + type + "として親しまれている作品です。作者は" + content.author + "。この断片には、作品全体の気配が小さく残っています。";
}

function getLearnFallbackPoint(content) {
  return content.shortComment || "言葉や色の奥に、少しだけ立ち止まりたくなる余韻があります。";
}

function getSourceLabel(content, learn) {
  if (learn && learn.sourceLabel) return learn.sourceLabel;
  if (content.type === "painting") return "画像の出典を見る";
  if (content.source === "青空文庫") return "青空文庫で読む";
  return content.source ? content.source + "で見る" : "出典を見る";
}

function createLearnItem(label, text, modifier) {
  if (!text) return null;

  const item = document.createElement("div");
  item.className = "learn-item" + (modifier ? " learn-item--" + modifier : "");

  const term = document.createElement("dt");
  term.className = "learn-term";
  term.textContent = label;

  const description = document.createElement("dd");
  description.className = "learn-description";
  description.textContent = text;

  item.appendChild(term);
  item.appendChild(description);
  return item;
}

function renderLearnPanel(containerId, content) {
  const container = document.getElementById(containerId);
  if (!container || !content) return;

  const learn = content.learn || {};
  const intro = learn.intro || getLearnFallbackIntro(content);
  const point = learn.point || getLearnFallbackPoint(content);
  const tips = learn.tips || "";
  const sourceLabel = getSourceLabel(content, learn);

  container.innerHTML = "";

  const details = document.createElement("details");
  details.className = "learn-details";

  const summary = document.createElement("summary");
  summary.className = "learn-summary";

  const summaryText = document.createElement("span");
  summaryText.className = "learn-summary-text";
  summaryText.textContent = "この断片をひらく";

  const summaryHint = document.createElement("span");
  summaryHint.className = "learn-summary-hint";
  summaryHint.textContent = "作品の背景を、少しだけ読む";

  summary.appendChild(summaryText);
  summary.appendChild(summaryHint);

  const body = document.createElement("div");
  body.className = "learn-body";

  const list = document.createElement("dl");
  list.className = "learn-list";

  [createLearnItem("これは何？", intro), createLearnItem("どこが面白い？", point), createLearnItem("Tips", tips, "tips")]
    .filter(Boolean)
    .forEach(item => list.appendChild(item));

  body.appendChild(list);

  if (content.sourceUrl) {
    const source = document.createElement("a");
    source.className = "learn-source-link";
    source.href = content.sourceUrl;
    source.target = "_blank";
    source.rel = "noopener noreferrer";
    source.textContent = sourceLabel;
    body.appendChild(source);
  }

  details.appendChild(summary);
  details.appendChild(body);
  container.appendChild(details);
}

function renderLearnPanels(content) {
  renderLearnPanel("learn-panel-generator", content);
  renderLearnPanel("learn-panel-preview", content);
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
    imageWrap.classList.remove("fragment-image-wrap--float-in");
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

  if (currentSection === "preview") renderPreview();
}

// ── Custom symbol ──────────────────────────────────────────────────────
function normalizeCustomSymbol(value) {
  return [...value.trim()].slice(0, 2).join("");
}

function updateCustomSymbol(value) {
  customSymbolText = normalizeCustomSymbol(value);

  if (currentSection === "preview") renderPreview();
}

function getSelectedDisplaySymbol() {
  return customSymbolText || "";
}

// ── Custom tag ─────────────────────────────────────────────────────────
function normalizeCustomTag(value) {
  return value
    .trim()
    .replace(/^#+/, "")
    .replace(/\s+/g, "");
}

function updateCustomTag(value) {
  customTagText = normalizeCustomTag(value);

  if (currentSection === "preview") renderPreview();
}

function getShareCardTags() {
  if (!currentContent) return [];
  const baseTags = selectedTags.length > 0 ? selectedTags : currentContent.tags;
  const customTag = customTagText ? customTagText : null;

  return [
    ...(customTag ? [customTag] : []),
    ...baseTags
  ];
}

function getTemplateConfig() {
  return SHARE_TEMPLATES[selectedTemplate] || SHARE_TEMPLATES.post;
}

function truncateText(text, limit) {
  const normalized = (text || "").replace(/\s+/g, " ").trim();
  if (normalized.length <= limit) return normalized;
  return normalized.slice(0, limit).trim() + "…";
}

function normalizeFragmentLines(text) {
  return (text || "")
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map(line => line.replace(/[ \t]+/g, " ").trim())
    .filter(Boolean);
}

function getIconFragmentDetails(text, limit) {
  const lines = normalizeFragmentLines(text);
  const normalized = lines.join("\n");
  const flatLength = normalized.replace(/\n/g, "").length;
  const safeLimit = Math.max(limit, 32);
  const ellipsisLimit = Math.min(Math.max(safeLimit, 32), 36);

  if (flatLength <= 16) {
    return { text: normalized, sizeClass: "share-card-fragment--short" };
  }

  if (flatLength <= 28) {
    return { text: normalized, sizeClass: "share-card-fragment--medium" };
  }

  if (flatLength <= 36) {
    return { text: normalized, sizeClass: "share-card-fragment--long" };
  }

  let remaining = ellipsisLimit;
  const clippedLines = [];

  for (const line of lines) {
    if (remaining <= 0) break;
    if (line.length <= remaining) {
      clippedLines.push(line);
      remaining -= line.length;
    } else {
      clippedLines.push(line.slice(0, remaining).trimEnd());
      remaining = 0;
    }
  }

  return {
    text: clippedLines.join("\n").trimEnd() + "…",
    sizeClass: "share-card-fragment--long"
  };
}

function appendFragmentLines(element, text) {
  const lines = (text || "").split("\n");
  lines.forEach((line, index) => {
    if (index > 0) element.appendChild(document.createElement("br"));
    const span = document.createElement("span");
    span.textContent = line;
    element.appendChild(span);
  });
}

function setSelectedTemplate(template) {
  if (!SHARE_TEMPLATES[template]) return;
  selectedTemplate = template;

  document.querySelectorAll(".template-option").forEach(btn => {
    const active = btn.dataset.template === template;
    btn.classList.toggle("template-option--active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  if (currentSection === "preview") renderPreview();
}

function openPreview() {
  renderPreview();
  showSection("preview");
}

// ── Preview render ─────────────────────────────────────────────────────
function renderPreview() {
  if (!currentContent) return;
  const container = document.getElementById("share-card-preview");
  container.innerHTML = "";
  const template = getTemplateConfig();
  container.className = "share-card-preview " + template.className;

  const color = selectedColor || currentContent.defaultColor;

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
    const fragmentDetails = selectedTemplate === "icon"
      ? getIconFragmentDetails(currentContent.fragment, template.fragmentLimit)
      : {
          text: truncateText(currentContent.fragment, template.fragmentLimit),
          sizeClass: ""
        };
    if (fragmentDetails.sizeClass) {
      media.classList.add(fragmentDetails.sizeClass);
    }
    appendFragmentLines(media, fragmentDetails.text);
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
  const tagsToShow = getShareCardTags().slice(0, template.tagLimit);
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
  const shouldShowColorLabel = selectedTemplate === "post";

  const displaySymbol = getSelectedDisplaySymbol();
  let symbolEl = null;
  if (displaySymbol) {
    symbolEl = document.createElement("span");
    symbolEl.className = "share-card-symbol";
    symbolEl.textContent = displaySymbol;
    symbolEl.style.color = color.hex;
    symbolEl.setAttribute("aria-hidden", "true");
  }

  inner.appendChild(brand);
  inner.appendChild(type);
  inner.appendChild(media);
  inner.appendChild(rule);
  inner.appendChild(meta);
  inner.appendChild(comment);
  inner.appendChild(tagsEl);
  if (shouldShowColorLabel) inner.appendChild(colorRow);
  if (symbolEl) inner.appendChild(symbolEl);

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
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) {
    return;
  }
  setCanvasFont(context, element);

  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
  const text = element.textContent || "";
  const shouldWrap = rect.height > lineHeight * 1.4 && text.length > 0;
  const opacity = parseFloat(style.opacity);
  context.save();
  context.globalAlpha = Number.isNaN(opacity) ? 1 : opacity;

  if (!shouldWrap) {
    context.fillText(text, rect.x, rect.y);
    context.restore();
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
    if (rect.y + lineHeight * (index + 1) > rect.y + rect.height + 0.5) {
      return;
    }
    context.fillText(lineText, rect.x, rect.y + lineHeight * index);
  });
  context.restore();
}

function drawImageElement(context, image, baseRect) {
  const rect = getRelativeRect(image, baseRect);
  if (rect.width <= 0 || rect.height <= 0) return;
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
    ".share-card-logo, .share-card-subtitle, .share-card-type, .share-card-fragment span, .share-card-title, .share-card-author, .share-card-comment, .share-card-tag, .share-card-color-name, .share-card-color-hex, .share-card-symbol"
  ).forEach(element => {
    drawTextElement(context, element, baseRect);
  });

  return canvas;
}

async function savePreviewImage() {
  const card = document.getElementById("share-card-preview");
  const saveButton = document.getElementById("btn-save-image");
  if (!card || !card.children.length) return;
  const template = getTemplateConfig();

  const originalText = saveButton.textContent;
  saveButton.disabled = true;
  saveButton.textContent = "保存準備中";

  try {
    await waitForPreviewImages(card);
    const cardWidth = Math.ceil(card.getBoundingClientRect().width) || 1;
    const scale = Math.max(2, template.exportWidth / cardWidth);
    const filename = template.filename;
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
function showContent(content) {
  currentContent = content;
  selectedTags   = [...content.tags];
  selectedColor  = content.defaultColor;

  renderFragment(content);
  renderLearnPanels(content);
  renderTagOptions(content.tags);
  renderColorOptions();
}

// ── Initialize ─────────────────────────────────────────────────────────
function initGenerator() {
  const filtered = getFilteredContents(currentFilter);
  const seed     = dateSeed();
  currentIndex   = seedIndex(seed, filtered.length);
  showContent(filtered[currentIndex]);
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
  showContent(filtered[currentIndex]);
}

function animateFragmentChange(content) {
  const card = document.querySelector(".fragment-card");
  if (card) {
    card.classList.remove("fragment-card--pulse");
    void card.offsetWidth;
    card.classList.add("fragment-card--pulse");
  }

  if (hasPaintingImage(content)) {
    const imageWrap = document.getElementById("fragment-image-wrap");
    if (imageWrap) {
      imageWrap.classList.remove("fragment-image-wrap--float-in");
      void imageWrap.offsetWidth;
      imageWrap.classList.add("fragment-image-wrap--float-in");
    }
  }
}

// ── Next fragment ──────────────────────────────────────────────────────
async function nextFragment() {
  const nextButton = document.getElementById("btn-next");
  const filtered = getFilteredContents(currentFilter);
  const nextIndex = (currentIndex + 1) % filtered.length;
  const nextContent = filtered[nextIndex];

  if (nextButton) nextButton.disabled = true;

  try {
    if (hasPaintingImage(nextContent)) {
      await preloadImage(nextContent.imagePath);
    }

    currentIndex = nextIndex;
    showContent(nextContent);
    animateFragmentChange(nextContent);
  } finally {
    if (nextButton) nextButton.disabled = false;
  }
}

// ── Event wiring ───────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  initGenerator();
  preloadPaintingImages();

  // type tabs
  document.querySelectorAll(".type-tab").forEach(btn => {
    btn.addEventListener("click", () => setFilter(btn.dataset.type));
  });

  document.querySelectorAll(".template-option").forEach(btn => {
    btn.addEventListener("click", () => setSelectedTemplate(btn.dataset.template));
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

  const customTagInput = document.getElementById("custom-tag-input");
  if (customTagInput) {
    customTagInput.addEventListener("input", e => {
      updateCustomTag(e.target.value);
    });
  }

  const customSymbolInput = document.getElementById("custom-symbol-input");
  if (customSymbolInput) {
    customSymbolInput.addEventListener("input", e => {
      updateCustomSymbol(e.target.value);
    });
  }

  // "カードを生成する" → render preview then show
  document.getElementById("btn-preview").addEventListener("click", openPreview);
  document.getElementById("btn-preview-top").addEventListener("click", openPreview);

  // "編集に戻る" → generator
  document.getElementById("btn-back").addEventListener("click", () => showSection("generator"));

  // "画像を保存・共有" → share or download preview card
  document.getElementById("btn-save-image").addEventListener("click", savePreviewImage);
});
