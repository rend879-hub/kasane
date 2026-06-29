// ── State ──────────────────────────────────────────────────────────────
let currentFilter  = "all";
let currentIndex   = null;
let currentSection = "generator";
let currentContent = null;
let selectedTags   = [];
let selectedColor  = null;
let visibleTagOptions = [];
let selectedTemplate = "post";
let customSymbolText = "";
let customTagText = "";
let presenceSettings = {
  name: "",
  tags: [],
  enabled: true
};
const preloadedImages = new Map();
const PRESENCE_STORAGE_KEY = "kasanePresenceSettings";
const LIBRARY_STORAGE_KEY = "kasaneLibraryItems";
const LIBRARY_MAX_ITEMS = 20;

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
const BOOKMARK_EXPORT_WIDTH = 1800;
const BOOKMARK_EXPORT_HEIGHT = Math.round(BOOKMARK_EXPORT_WIDTH * 127 / 89);
const BOOKMARK_FILENAME = "kasane-bookmark-lsize.png";
const BOOKMARK_TAG_LIMIT = 4;
const COLOR_FINDER_OPTIONS = [
  {
    id: "sakura",
    label: "桜",
    colorName: "桜色",
    tags: ["春", "儚い", "光", "祝福"],
    description: "やわらかく、少しだけ儚い気配を持つ色です。春、記憶、祝福、淡い光に近い断片とよく重なります。"
  },
  {
    id: "ruri",
    label: "青",
    colorName: "瑠璃色",
    tags: ["夜", "祈り", "静けさ", "青"],
    description: "深く澄んだ青です。夜、祈り、静けさ、遠い光に近い断片とよく重なります。"
  },
  {
    id: "asagi",
    label: "青緑",
    colorName: "浅葱色",
    tags: ["青", "風", "透明感", "水"],
    description: "青と緑のあわいにある色です。風、水、透明感、若さに近い断片とよく重なります。"
  },
  {
    id: "fuji",
    label: "紫",
    colorName: "藤色",
    tags: ["静けさ", "祈り", "余白", "儚い"],
    description: "淡く静かな紫です。祈り、余白、儚さ、静かな感情に近い断片とよく重なります。"
  },
  {
    id: "gofun",
    label: "白",
    colorName: "胡粉色",
    tags: ["光", "祈り", "透明感", "雪"],
    description: "やわらかい白です。光、祈り、雪、透明感に近い断片とよく重なります。"
  },
  {
    id: "sumi",
    label: "黒",
    colorName: "墨色",
    tags: ["夜", "孤独", "不穏", "影"],
    description: "深い黒に近い色です。夜、孤独、不穏、強い輪郭を持つ断片とよく重なります。"
  },
  {
    id: "ginnezumi",
    label: "灰",
    colorName: "銀鼠",
    tags: ["無常", "静けさ", "余白", "孤独"],
    description: "静かで控えめな灰色です。余白、無常、ひとりの時間、落ち着いた断片とよく重なります。"
  },
  {
    id: "kinari",
    label: "生成",
    colorName: "生成色",
    tags: ["余白", "物語", "日記", "やさしさ"],
    description: "紙や布のような自然な色です。余白、日記、物語、やさしい静けさに近い断片とよく重なります。"
  },
  {
    id: "ki",
    label: "黄",
    colorName: "山吹色",
    tags: ["光", "黄色", "祝福", "花"],
    description: "明るい光を思わせる色です。花、祝福、生命感、まっすぐな明るさに近い断片とよく重なります。"
  },
  {
    id: "aka",
    label: "赤",
    colorName: "薄紅",
    tags: ["恋", "春", "花", "凛とした"],
    description: "熱を帯びたやわらかな赤です。恋、花、春、まっすぐな感情に近い断片とよく重なります。"
  }
];
let selectedColorFinderOption = null;

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

function seededUnit(seed) {
  return (((seed * 1664525 + 1013904223) >>> 0) / 4294967296);
}

function hasPresencePreference() {
  const hasTags = Array.isArray(presenceSettings.tags) && presenceSettings.tags.length > 0;
  const name = (presenceSettings.name || "").trim();
  return presenceSettings.enabled && (hasTags || name.length >= 2);
}

function normalizePresenceText(value) {
  return String(value || "").trim().toLowerCase();
}

function getPresenceScore(content) {
  if (!hasPresencePreference() || !content) return 0;

  const contentTags = Array.isArray(content.tags) ? content.tags : [];
  const presenceTags = Array.isArray(presenceSettings.tags) ? presenceSettings.tags : [];
  const matchedTagCount = presenceTags.filter(tag => contentTags.includes(tag)).length;
  let score = matchedTagCount * 1.4;

  const name = normalizePresenceText(presenceSettings.name);
  if (name.length >= 2) {
    const nameFields = [
      content.themeGroup,
      content.title,
      content.author,
      content.shortComment,
      contentTags.join(" ")
    ];

    if (nameFields.some(field => normalizePresenceText(field).includes(name))) {
      score += 0.6;
    }
  }

  return Math.min(score, 3);
}

function getPresenceWeight(content) {
  return 1 + getPresenceScore(content) * 0.45;
}

function pickWeightedIndex(contents, excludedIndex, randomUnit) {
  if (!contents.length) return null;

  const candidates = contents
    .map((content, index) => ({ index, weight: getPresenceWeight(content) }))
    .filter(item => item.index !== excludedIndex);

  if (!candidates.length) return 0;

  const totalWeight = candidates.reduce((sum, item) => sum + item.weight, 0);
  let cursor = Math.max(0, Math.min(randomUnit, 0.999999)) * totalWeight;

  for (const item of candidates) {
    cursor -= item.weight;
    if (cursor <= 0) return item.index;
  }

  return candidates[candidates.length - 1].index;
}

function pickPresenceWeightedIndex(contents, currentIndex, seed) {
  if (!contents.length) return null;

  if (!hasPresencePreference()) {
    return typeof currentIndex === "number"
      ? (currentIndex + 1) % contents.length
      : seedIndex(seed, contents.length);
  }

  const randomUnit = typeof seed === "number" ? seededUnit(seed) : Math.random();
  const excludedIndex = typeof currentIndex === "number" ? currentIndex : null;
  return pickWeightedIndex(contents, excludedIndex, randomUnit);
}

function typeLabel(type) {
  const map = { classic: "古典", painting: "絵画", poem: "詩" };
  return map[type] || type;
}

function typeBadgeClass(type) {
  const map = { classic: "badge--classic", painting: "badge--painting", poem: "badge--poem" };
  return map[type] || "";
}

function templateLabel(template) {
  const map = { post: "投稿用", header: "ヘッダー", icon: "アイコン", bookmark: "しおり" };
  return map[template] || template;
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
  visibleTagOptions = [...tags];
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
  if (currentContent) renderTagOptions(visibleTagOptions.length ? visibleTagOptions : currentContent.tags);
}

// ── Presence settings ─────────────────────────────────────────────────
function getPresenceTagOptions() {
  const tagSet = new Set();
  KASANE_CONTENTS.forEach(content => {
    (content.tags || []).forEach(tag => tagSet.add(tag));
  });
  return [...tagSet];
}

function renderPresenceTags() {
  const container = document.getElementById("presence-tag-options");
  if (!container) return;

  container.innerHTML = "";
  getPresenceTagOptions().forEach(tag => {
    const isActive = presenceSettings.tags.includes(tag);
    const btn = document.createElement("button");
    btn.className = "tag-chip" + (isActive ? " tag-chip--active" : "");
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.textContent = "#" + tag;
    btn.addEventListener("click", () => togglePresenceTag(tag));
    container.appendChild(btn);
  });
}

function togglePresenceTag(tag) {
  if (presenceSettings.tags.includes(tag)) {
    presenceSettings.tags = presenceSettings.tags.filter(t => t !== tag);
  } else {
    presenceSettings.tags = [...presenceSettings.tags, tag];
  }
  renderPresenceTags();
  clearPresenceSaveMessage();
}

function getStoredPresenceSettings() {
  try {
    const raw = localStorage.getItem(PRESENCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return {
      name: typeof parsed.name === "string" ? parsed.name.slice(0, 32) : "",
      tags: Array.isArray(parsed.tags) ? parsed.tags.filter(tag => typeof tag === "string") : [],
      enabled: typeof parsed.enabled === "boolean" ? parsed.enabled : true
    };
  } catch (error) {
    console.warn("気配設定を読み込めませんでした。", error);
    return null;
  }
}

function loadPresenceSettings() {
  const stored = getStoredPresenceSettings();
  if (stored) {
    presenceSettings = stored;
  }
}

function syncPresenceForm() {
  const nameInput = document.getElementById("presence-name-input");
  const enabledInput = document.getElementById("presence-enabled-input");

  if (nameInput) nameInput.value = presenceSettings.name;
  if (enabledInput) enabledInput.checked = presenceSettings.enabled;
  renderPresenceTags();
}

function clearPresenceSaveMessage() {
  const message = document.getElementById("presence-save-message");
  if (message) message.textContent = "";
}

function savePresenceSettings() {
  const nameInput = document.getElementById("presence-name-input");
  const enabledInput = document.getElementById("presence-enabled-input");
  const message = document.getElementById("presence-save-message");

  presenceSettings = {
    name: nameInput ? nameInput.value.trim().slice(0, 32) : "",
    tags: [...presenceSettings.tags],
    enabled: enabledInput ? enabledInput.checked : true
  };

  localStorage.setItem(PRESENCE_STORAGE_KEY, JSON.stringify(presenceSettings));

  if (nameInput) nameInput.value = presenceSettings.name;
  if (message) message.textContent = "保存しました";
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

// ── Color finder ──────────────────────────────────────────────────────
function getColorFinderColor(option) {
  return KASANE_COLORS.find(color => color.name === option.colorName) || KASANE_COLORS[0];
}

function getColorFinderMatches(option) {
  const relatedTags = option.tags || [];
  const scored = KASANE_CONTENTS
    .map(content => {
      const contentTags = Array.isArray(content.tags) ? content.tags : [];
      const tagScore = relatedTags.filter(tag => contentTags.includes(tag)).length;
      const themeText = [
        content.themeGroup,
        content.shortComment,
        content.title
      ].join(" ");
      const themeScore = relatedTags.filter(tag => themeText.includes(tag)).length * 0.4;
      return { content, score: tagScore + themeScore };
    })
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map(item => item.content);
}

function pickColorFinderContent(option) {
  const matches = getColorFinderMatches(option);
  if (matches.length) return matches[0];
  return currentContent || KASANE_CONTENTS[0];
}

function renderColorFinderOptions() {
  const container = document.getElementById("color-finder-options");
  if (!container) return;

  container.innerHTML = "";
  COLOR_FINDER_OPTIONS.forEach(option => {
    const color = getColorFinderColor(option);
    const isActive = selectedColorFinderOption && selectedColorFinderOption.id === option.id;
    const btn = document.createElement("button");
    btn.className = "color-finder-chip" + (isActive ? " color-finder-chip--active" : "");
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    btn.setAttribute("aria-label", option.label + "から探す");

    const swatch = document.createElement("span");
    swatch.className = "color-finder-swatch";
    swatch.style.background = color.hex;
    swatch.style.borderColor = color.hex === "#FFFFFC" || color.hex === "#FBFAF5" ? "#E0DDD7" : "rgba(0,0,0,0.12)";

    const label = document.createElement("span");
    label.className = "color-finder-chip-label";
    label.textContent = option.label;

    btn.appendChild(swatch);
    btn.appendChild(label);
    btn.addEventListener("click", () => selectColorFinderOption(option));
    container.appendChild(btn);
  });
}

function renderColorFinderResult(option) {
  const container = document.getElementById("color-finder-result");
  if (!container) return;

  container.innerHTML = "";

  if (!option) {
    const empty = document.createElement("p");
    empty.className = "color-finder-empty";
    empty.textContent = "気になる色をひとつ選んでください。";
    container.appendChild(empty);
    return;
  }

  const color = getColorFinderColor(option);
  const content = pickColorFinderContent(option);

  const header = document.createElement("div");
  header.className = "color-finder-result-header";

  const swatch = document.createElement("span");
  swatch.className = "color-finder-result-swatch";
  swatch.style.background = color.hex;
  swatch.style.borderColor = color.hex === "#FFFFFC" || color.hex === "#FBFAF5" ? "#E0DDD7" : "rgba(0,0,0,0.12)";

  const heading = document.createElement("div");
  const name = document.createElement("h2");
  name.className = "color-finder-result-title";
  name.textContent = color.name;

  const basic = document.createElement("p");
  basic.className = "color-finder-result-basic";
  basic.textContent = "伝統色";

  heading.appendChild(name);
  heading.appendChild(basic);
  header.appendChild(swatch);
  header.appendChild(heading);

  const description = document.createElement("p");
  description.className = "color-finder-description";
  description.textContent = option.description;

  const tagList = document.createElement("div");
  tagList.className = "color-finder-tags";
  option.tags.forEach(tag => {
    const tagEl = document.createElement("span");
    tagEl.className = "color-finder-tag";
    tagEl.textContent = "#" + tag;
    tagList.appendChild(tagEl);
  });

  const fragment = document.createElement("div");
  fragment.className = "color-finder-fragment";

  const fragmentLabel = document.createElement("p");
  fragmentLabel.className = "color-finder-fragment-label";
  fragmentLabel.textContent = "気配に近い断片";

  const fragmentText = document.createElement("p");
  fragmentText.className = "color-finder-fragment-text";
  fragmentText.textContent = content.fragment;

  const fragmentMeta = document.createElement("p");
  fragmentMeta.className = "color-finder-fragment-meta";
  fragmentMeta.textContent = "『" + content.title + "』 " + content.author;

  fragment.appendChild(fragmentLabel);
  fragment.appendChild(fragmentText);
  fragment.appendChild(fragmentMeta);

  const action = document.createElement("button");
  action.className = "btn btn--primary color-finder-action";
  action.type = "button";
  action.textContent = "この色でカードを作る";
  action.addEventListener("click", () => applyColorFinderOption(option));

  container.appendChild(header);
  container.appendChild(description);
  container.appendChild(tagList);
  container.appendChild(fragment);
  container.appendChild(action);
}

function selectColorFinderOption(option) {
  selectedColorFinderOption = option;
  renderColorFinderOptions();
  renderColorFinderResult(option);
}

function setTypeTabState(filter) {
  document.querySelectorAll(".type-tab").forEach(btn => {
    const active = btn.dataset.type === filter;
    btn.classList.toggle("type-tab--active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });
}

function applyColorFinderOption(option) {
  const content = pickColorFinderContent(option);
  const color = getColorFinderColor(option);
  const mergedTags = [...new Set([...(option.tags || []), ...(content.tags || [])])];

  currentFilter = "all";
  currentIndex = KASANE_CONTENTS.findIndex(candidate => candidate.contentId === content.contentId);
  currentContent = content;
  selectedColor = color;
  selectedTags = [...option.tags];

  setTypeTabState(currentFilter);
  renderFragment(content);
  renderLearnPanels(content);
  renderTagOptions(mergedTags);
  renderColorOptions();
  showSection("generator");
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
  const bookmarkArea = document.getElementById("bookmark-preview-area");
  if (bookmarkArea) {
    bookmarkArea.hidden = true;
  }
  renderPreview();
  showSection("preview");
}

function openBookmarkPreview() {
  renderPreview();
  renderBookmarkPreview();
  showSection("preview");

  const bookmarkArea = document.getElementById("bookmark-preview-area");
  if (bookmarkArea) {
    bookmarkArea.hidden = false;
  }

  const bookmarkSheet = document.getElementById("bookmark-sheet-preview");
  if (bookmarkSheet) {
    bookmarkSheet.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// ── Library ───────────────────────────────────────────────────────────
function getStoredLibraryItems() {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(item => item && typeof item === "object") : [];
  } catch (error) {
    console.warn("保管庫を読み込めませんでした。", error);
    return [];
  }
}

function setStoredLibraryItems(items) {
  const limitedItems = Array.isArray(items) ? items.slice(0, LIBRARY_MAX_ITEMS) : [];
  localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(limitedItems));
}

function setLibrarySaveMessage(text) {
  const message = document.getElementById("library-save-message");
  if (message) message.textContent = text;
}

function createLibraryItem(template) {
  if (!currentContent) return null;

  const now = new Date();
  const color = selectedColor || currentContent.defaultColor;

  return {
    id: "library_" + now.getTime(),
    savedAt: now.toISOString(),
    template: template,
    contentId: currentContent.contentId,
    type: currentContent.type,
    title: currentContent.title,
    author: currentContent.author,
    fragment: currentContent.fragment,
    shortComment: currentContent.shortComment,
    tags: getShareCardTags(),
    color: color,
    symbol: getSelectedDisplaySymbol(),
    imagePath: currentContent.imagePath || ""
  };
}

function saveCurrentToLibrary(template) {
  const item = createLibraryItem(template);
  if (!item) {
    setLibrarySaveMessage("残せる断片がまだありません。");
    return;
  }

  const items = [item, ...getStoredLibraryItems()].slice(0, LIBRARY_MAX_ITEMS);
  setStoredLibraryItems(items);
  setLibrarySaveMessage("保管庫に残しました。");

  if (currentSection === "library") {
    renderLibraryItems();
  }
}

function formatSavedAt(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function appendLibraryMeta(parent, label, value) {
  if (!value) return;

  const item = document.createElement("div");
  item.className = "library-meta-item";

  const term = document.createElement("dt");
  term.textContent = label;

  const description = document.createElement("dd");
  description.textContent = value;

  item.appendChild(term);
  item.appendChild(description);
  parent.appendChild(item);
}

function renderLibraryItems() {
  const list = document.getElementById("library-list");
  const empty = document.getElementById("library-empty");
  if (!list || !empty) return;

  const items = getStoredLibraryItems();
  list.innerHTML = "";
  empty.hidden = items.length > 0;

  items.forEach(item => {
    const article = document.createElement("article");
    article.className = "library-card";

    const top = document.createElement("div");
    top.className = "library-card-top";

    const labels = document.createElement("div");
    labels.className = "library-labels";

    const type = document.createElement("span");
    type.className = "library-label";
    type.textContent = typeLabel(item.type);
    labels.appendChild(type);

    const template = document.createElement("span");
    template.className = "library-label library-label--template";
    template.textContent = templateLabel(item.template);
    labels.appendChild(template);

    if (item.template === "bookmark") {
      const bookmark = document.createElement("span");
      bookmark.className = "library-label library-label--bookmark";
      bookmark.textContent = "しおり";
      labels.appendChild(bookmark);
    }

    const savedAt = document.createElement("time");
    savedAt.className = "library-saved-at";
    savedAt.dateTime = item.savedAt || "";
    savedAt.textContent = formatSavedAt(item.savedAt);

    top.appendChild(labels);
    top.appendChild(savedAt);

    const fragment = document.createElement("p");
    fragment.className = "library-fragment";
    fragment.textContent = item.fragment || "";

    const title = document.createElement("p");
    title.className = "library-work";
    title.textContent = "『" + (item.title || "") + "』";

    const author = document.createElement("p");
    author.className = "library-author";
    author.textContent = item.author || "";

    const meta = document.createElement("dl");
    meta.className = "library-meta";
    appendLibraryMeta(meta, "色", item.color && item.color.name ? item.color.name : "");
    appendLibraryMeta(meta, "重ねた日", formatSavedAt(item.savedAt));

    const tags = document.createElement("div");
    tags.className = "library-tags";
    (Array.isArray(item.tags) ? item.tags : []).forEach(tag => {
      const tagEl = document.createElement("span");
      tagEl.className = "library-tag";
      tagEl.textContent = "#" + tag;
      tags.appendChild(tagEl);
    });

    const actions = document.createElement("div");
    actions.className = "library-actions";

    const openButton = document.createElement("button");
    openButton.className = "btn btn--ghost";
    openButton.type = "button";
    openButton.dataset.libraryOpenId = item.id;
    openButton.textContent = "この断片をひらく";

    const deleteButton = document.createElement("button");
    deleteButton.className = "library-delete-btn";
    deleteButton.type = "button";
    deleteButton.dataset.libraryDeleteId = item.id;
    deleteButton.textContent = "削除";

    actions.appendChild(openButton);
    actions.appendChild(deleteButton);

    article.appendChild(top);
    article.appendChild(fragment);
    article.appendChild(title);
    article.appendChild(author);
    if (tags.children.length) article.appendChild(tags);
    article.appendChild(meta);
    article.appendChild(actions);
    list.appendChild(article);
  });
}

function deleteLibraryItem(id) {
  const items = getStoredLibraryItems().filter(item => item.id !== id);
  setStoredLibraryItems(items);
  renderLibraryItems();
}

function restoreLibraryItem(id) {
  const item = getStoredLibraryItems().find(libraryItem => libraryItem.id === id);
  if (!item) return;

  const content = KASANE_CONTENTS.find(candidate => candidate.contentId === item.contentId);
  if (!content) return;

  const color = KASANE_COLORS.find(candidate => {
    if (!item.color) return false;
    return candidate.name === item.color.name || candidate.hex === item.color.hex;
  }) || content.defaultColor;

  const itemTags = Array.isArray(item.tags) ? item.tags.filter(tag => typeof tag === "string") : [];
  const contentTags = Array.isArray(content.tags) ? content.tags : [];
  const restoredSelectedTags = itemTags.filter(tag => contentTags.includes(tag));
  const restoredCustomTag = itemTags.find(tag => !contentTags.includes(tag)) || "";

  currentFilter = "all";
  currentIndex = KASANE_CONTENTS.findIndex(candidate => candidate.contentId === content.contentId);
  document.querySelectorAll(".type-tab").forEach(btn => {
    const active = btn.dataset.type === "all";
    btn.classList.toggle("type-tab--active", active);
    btn.setAttribute("aria-pressed", active ? "true" : "false");
  });

  showContent(content);
  selectedTags = restoredSelectedTags.length ? restoredSelectedTags : [...contentTags];
  selectedColor = color;
  customSymbolText = typeof item.symbol === "string" ? normalizeCustomSymbol(item.symbol) : "";
  customTagText = normalizeCustomTag(restoredCustomTag);

  const customTagInput = document.getElementById("custom-tag-input");
  if (customTagInput) customTagInput.value = customTagText;

  const customSymbolInput = document.getElementById("custom-symbol-input");
  if (customSymbolInput) customSymbolInput.value = customSymbolText;

  renderFragment(content);
  renderLearnPanels(content);
  renderTagOptions(content.tags);
  renderColorOptions();

  if (item.template === "bookmark") {
    openBookmarkPreview();
  } else {
    const restoredTemplate = SHARE_TEMPLATES[item.template] ? item.template : "post";
    setSelectedTemplate(restoredTemplate);
    openPreview();
  }
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

  const bookmarkArea = document.getElementById("bookmark-preview-area");
  if (bookmarkArea && !bookmarkArea.hidden) {
    renderBookmarkPreview();
  }
}

// ── Bookmark preview render ───────────────────────────────────────────
function createBookmarkItem() {
  const color = selectedColor || currentContent.defaultColor;
  const titleText = "『" + currentContent.title + "』";
  const authorText = currentContent.author;
  const metaLength = [...titleText + authorText].length;
  const item = document.createElement("div");
  item.className = "bookmark-item";
  if (metaLength >= 42) {
    item.classList.add("bookmark-item--very-long-meta");
  } else if (metaLength >= 30) {
    item.classList.add("bookmark-item--long-meta");
  }
  item.style.setProperty("--bookmark-accent", color.hex);

  const symbol = document.createElement("span");
  symbol.className = "bookmark-symbol";
  symbol.textContent = getSelectedDisplaySymbol();
  symbol.setAttribute("aria-hidden", "true");

  const type = document.createElement("p");
  type.className = "bookmark-type";
  type.textContent = typeLabel(currentContent.type);

  const fragment = document.createElement("p");
  fragment.className = "bookmark-fragment";
  fragment.textContent = truncateText(currentContent.fragment, hasPaintingImage(currentContent) ? 28 : 38);

  item.appendChild(symbol);
  item.appendChild(type);

  if (hasPaintingImage(currentContent)) {
    const img = document.createElement("img");
    img.className = "bookmark-image";
    img.src = currentContent.imagePath;
    img.alt = "『" + currentContent.title + "』";
    item.appendChild(img);
  }

  item.appendChild(fragment);

  const rule = document.createElement("div");
  rule.className = "bookmark-rule";
  rule.setAttribute("aria-hidden", "true");
  item.appendChild(rule);

  const meta = document.createElement("div");
  meta.className = "bookmark-meta";
  const title = document.createElement("span");
  title.className = "bookmark-title";
  title.textContent = titleText;
  const author = document.createElement("span");
  author.className = "bookmark-author";
  author.textContent = authorText;
  meta.appendChild(title);
  meta.appendChild(author);
  item.appendChild(meta);

  const tags = document.createElement("div");
  tags.className = "bookmark-tags";
  getShareCardTags().slice(0, BOOKMARK_TAG_LIMIT).forEach(tag => {
    const tagEl = document.createElement("span");
    tagEl.className = "bookmark-tag";
    tagEl.textContent = "#" + tag;
    tags.appendChild(tagEl);
  });
  item.appendChild(tags);

  const colorRow = document.createElement("div");
  colorRow.className = "bookmark-color";
  const dot = document.createElement("span");
  dot.className = "bookmark-color-dot";
  dot.setAttribute("aria-hidden", "true");
  const colorName = document.createElement("span");
  colorName.className = "bookmark-color-name";
  colorName.textContent = color.name;
  colorRow.appendChild(dot);
  colorRow.appendChild(colorName);
  item.appendChild(colorRow);

  const brand = document.createElement("p");
  brand.className = "bookmark-brand";
  brand.textContent = "KASANE";
  item.appendChild(brand);

  return item;
}

function renderBookmarkPreview() {
  if (!currentContent) return;
  const area = document.getElementById("bookmark-preview-area");
  const sheet = document.getElementById("bookmark-sheet-preview");
  if (!area || !sheet) return;

  area.hidden = false;
  sheet.innerHTML = "";
  sheet.style.setProperty("--bookmark-accent", (selectedColor || currentContent.defaultColor).hex);
  sheet.appendChild(createBookmarkItem());
  sheet.appendChild(createBookmarkItem());
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

function buildCanvasTextLines(context, text, maxWidth) {
  const chars = [...(text || "").replace(/\s+/g, " ").trim()];
  const lines = [];
  let line = "";

  chars.forEach(char => {
    const nextLine = line + char;
    if (line && context.measureText(nextLine).width > maxWidth) {
      lines.push(line);
      line = char.trimStart();
    } else {
      line = nextLine;
    }
  });
  if (line) lines.push(line);

  return lines;
}

function drawWrappedTextElement(context, element, baseRect) {
  const rect = getRelativeRect(element, baseRect);
  const style = window.getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) {
    return;
  }

  setCanvasFont(context, element);
  const fontSize = parseFloat(style.fontSize) || 16;
  const lineHeight = parseFloat(style.lineHeight) || fontSize * 1.2;
  const opacity = parseFloat(style.opacity);
  const lines = buildCanvasTextLines(context, element.textContent || "", rect.width);

  context.save();
  context.globalAlpha = Number.isNaN(opacity) ? 1 : opacity;
  lines.forEach((lineText, index) => {
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

function drawBookmarkToCanvas(sheet) {
  const baseRect = sheet.getBoundingClientRect();
  const width = Math.ceil(baseRect.width);
  const height = Math.ceil(baseRect.height);
  const sheetStyle = window.getComputedStyle(sheet);
  const canvas = document.createElement("canvas");
  canvas.width = BOOKMARK_EXPORT_WIDTH;
  canvas.height = BOOKMARK_EXPORT_HEIGHT;

  const context = canvas.getContext("2d");
  const scaleX = BOOKMARK_EXPORT_WIDTH / Math.max(width, 1);
  const scaleY = BOOKMARK_EXPORT_HEIGHT / Math.max(height, 1);
  context.scale(scaleX, scaleY);

  const sheetBackground = sheetStyle.backgroundColor === "rgba(0, 0, 0, 0)"
    ? "#F8F4EA"
    : sheetStyle.backgroundColor;
  context.fillStyle = sheetBackground || "#F8F4EA";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(128, 116, 101, 0.24)";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(width / 2, 0);
  context.lineTo(width / 2, height);
  context.stroke();

  context.strokeStyle = sheetStyle.borderColor;
  context.strokeRect(0.5, 0.5, width - 1, height - 1);

  sheet.querySelectorAll(".bookmark-item").forEach(item => {
    const itemRect = getRelativeRect(item, baseRect);
    const itemStyle = window.getComputedStyle(item);
    const accent = itemStyle.getPropertyValue("--bookmark-accent").trim() || (selectedColor || currentContent.defaultColor).hex;

    context.fillStyle = itemStyle.backgroundColor;
    context.fillRect(itemRect.x, itemRect.y, itemRect.width, itemRect.height);
    context.strokeStyle = itemStyle.borderColor;
    context.lineWidth = parseFloat(itemStyle.borderWidth) || 1;
    context.strokeRect(itemRect.x + 0.5, itemRect.y + 0.5, itemRect.width - 1, itemRect.height - 1);

    context.strokeStyle = "rgba(224, 221, 215, 0.82)";
    context.strokeRect(itemRect.x + 5.5, itemRect.y + 5.5, itemRect.width - 11, itemRect.height - 11);

    context.fillStyle = accent;
    context.globalAlpha = 0.86;
    context.fillRect(itemRect.x, itemRect.y, 4, itemRect.height);
    context.globalAlpha = 1;

    context.save();
    context.beginPath();
    context.rect(itemRect.x, itemRect.y, itemRect.width, itemRect.height);
    context.clip();

    const rule = item.querySelector(".bookmark-rule");
    if (rule) {
      const ruleRect = getRelativeRect(rule, baseRect);
      context.fillStyle = window.getComputedStyle(rule).backgroundColor;
      context.fillRect(ruleRect.x, ruleRect.y, ruleRect.width, ruleRect.height);
    }

    item.querySelectorAll(".bookmark-image").forEach(image => {
      drawImageElement(context, image, baseRect);
    });

    const dot = item.querySelector(".bookmark-color-dot");
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

    item.querySelectorAll(
      ".bookmark-symbol, .bookmark-type, .bookmark-fragment, .bookmark-tag, .bookmark-color-name, .bookmark-brand"
    ).forEach(element => {
      drawTextElement(context, element, baseRect);
    });

    item.querySelectorAll(".bookmark-title, .bookmark-author").forEach(element => {
      drawWrappedTextElement(context, element, baseRect);
    });

    context.restore();
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

async function saveBookmarkImage() {
  const sheet = document.getElementById("bookmark-sheet-preview");
  const saveButton = document.getElementById("btn-save-bookmark");
  if (!sheet || !sheet.children.length) return;

  const originalText = saveButton.textContent;
  saveButton.disabled = true;
  saveButton.textContent = "保存準備中";

  try {
    await waitForPreviewImages(sheet);
    const canvas = drawBookmarkToCanvas(sheet);
    const blob = await canvasToBlob(canvas);
    const shared = await shareImageFile(blob, BOOKMARK_FILENAME);

    if (!shared) {
      const pngUrl = URL.createObjectURL(blob);
      createImageDownload(pngUrl, BOOKMARK_FILENAME);
      setTimeout(() => URL.revokeObjectURL(pngUrl), 1000);
    }
  } catch (error) {
    console.error(error);
    window.alert("しおり画像を保存できませんでした。別のブラウザでお試しください。");
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
  currentIndex   = pickPresenceWeightedIndex(filtered, null, seed);
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

  document.querySelectorAll(".nav-presence-btn").forEach(btn => {
    btn.classList.toggle("active", name === "presence");
  });

  document.querySelectorAll(".nav-library-btn").forEach(btn => {
    btn.classList.toggle("active", name === "library");
  });

  document.querySelectorAll(".nav-color-finder-btn").forEach(btn => {
    btn.classList.toggle("active", name === "color-finder");
  });

  if (name === "presence") {
    syncPresenceForm();
  }

  if (name === "library") {
    renderLibraryItems();
    setLibrarySaveMessage("");
  }

  if (name === "color-finder") {
    renderColorFinderOptions();
    renderColorFinderResult(selectedColorFinderOption);
  }
}

// ── Filter / type switching ────────────────────────────────────────────
function setFilter(filter) {
  currentFilter = filter;

  setTypeTabState(filter);

  const filtered = getFilteredContents(filter);
  const seed     = dateSeed();
  currentIndex   = pickPresenceWeightedIndex(filtered, null, seed);
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
  const nextIndex = pickPresenceWeightedIndex(filtered, currentIndex);
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
  loadPresenceSettings();
  initGenerator();
  preloadPaintingImages();
  syncPresenceForm();
  renderColorFinderOptions();
  renderColorFinderResult(selectedColorFinderOption);

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

  document.querySelectorAll(".nav-presence-btn").forEach(btn => {
    btn.addEventListener("click", () => showSection("presence"));
  });

  document.querySelectorAll(".nav-library-btn").forEach(btn => {
    btn.addEventListener("click", () => showSection("library"));
  });

  document.querySelectorAll(".nav-color-finder-btn").forEach(btn => {
    btn.addEventListener("click", () => showSection("color-finder"));
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

  const presenceNameInput = document.getElementById("presence-name-input");
  if (presenceNameInput) {
    presenceNameInput.addEventListener("input", e => {
      presenceSettings.name = e.target.value.slice(0, 32);
      clearPresenceSaveMessage();
    });
  }

  const presenceEnabledInput = document.getElementById("presence-enabled-input");
  if (presenceEnabledInput) {
    presenceEnabledInput.addEventListener("change", e => {
      presenceSettings.enabled = e.target.checked;
      clearPresenceSaveMessage();
    });
  }

  document.getElementById("btn-save-presence").addEventListener("click", savePresenceSettings);

  // "カードを生成する" → render preview then show
  document.getElementById("btn-preview").addEventListener("click", openPreview);
  document.getElementById("btn-preview-top").addEventListener("click", openPreview);
  document.getElementById("btn-bookmark").addEventListener("click", openBookmarkPreview);
  document.getElementById("btn-bookmark-top").addEventListener("click", openBookmarkPreview);

  // "編集に戻る" → generator
  document.getElementById("btn-back").addEventListener("click", () => showSection("generator"));

  // "画像を保存・共有" → share or download preview card
  document.getElementById("btn-save-image").addEventListener("click", savePreviewImage);
  document.getElementById("btn-save-library-card").addEventListener("click", () => {
    saveCurrentToLibrary(selectedTemplate);
  });

  // "しおりを生成" → render bookmark preview below the card
  document.getElementById("btn-generate-bookmark").addEventListener("click", renderBookmarkPreview);
  document.getElementById("btn-save-bookmark").addEventListener("click", saveBookmarkImage);
  document.getElementById("btn-save-library-bookmark").addEventListener("click", () => {
    saveCurrentToLibrary("bookmark");
  });
  document.getElementById("btn-back-bookmark").addEventListener("click", () => showSection("generator"));

  const libraryList = document.getElementById("library-list");
  if (libraryList) {
    libraryList.addEventListener("click", event => {
      const openButton = event.target.closest("[data-library-open-id]");
      if (openButton) {
        restoreLibraryItem(openButton.dataset.libraryOpenId);
        return;
      }

      const deleteButton = event.target.closest("[data-library-delete-id]");
      if (deleteButton) {
        deleteLibraryItem(deleteButton.dataset.libraryDeleteId);
      }
    });
  }
});
