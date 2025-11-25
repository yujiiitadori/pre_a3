/************************************************************
 * contentScript.js - Blind Navigator (with magnifier)
 ************************************************************/

/* ---------------- state ---------------- */
let active = false;
let currentList = [];
let index = 0;
let lastReadNode = null;
let headingMapOpen = false;

/* ---------------- utilities ---------------- */
function speak(text) {
  chrome.runtime.sendMessage({ action: "SPEAK", text: sanitizeText(text) });
}
function sanitizeText(t) {
  if (!t) return "";
  const s = String(t).replace(/\s+/g, " ").trim();
  return s.length > 3000 ? s.slice(0, 3000) + "..." : s;
}
function getPageElements() {
  return {
    headings: [...document.querySelectorAll("h1, h2, h3, h4, h5, h6")],
    links: [...document.querySelectorAll("a")],
    buttons: [...document.querySelectorAll("button, input[type=button], input[type=submit]")]
  };
}
function addHighlight(el) {
  if (!el) return;
  document.querySelectorAll(".blind-nav-highlight").forEach(e => e.classList.remove("blind-nav-highlight"));
  el.classList.add("blind-nav-highlight");
  try { el.scrollIntoView({ behavior: "smooth", block: "center" }); } catch(e){}
}

(function addMagnifierCSS() {
  const st = document.createElement("style");
  st.innerHTML = `
    #magnifier-lens {
      backdrop-filter: none !important;
    }
  `;
  document.head.appendChild(st);
})();

/* ---------------- keyboard nav ---------------- */
document.addEventListener("keydown", (e) => {
  if (!active) return;
  const tag = (e.target && e.target.tagName) || "";
  if (["INPUT","TEXTAREA","SELECT"].includes(tag)) return;
  const elems = getPageElements();
  if (e.key === "h") readList(elems.headings, "headings");
  else if (e.key === "l") readList(elems.links, "links");
  else if (e.key === "b") readList(elems.buttons, "buttons");
  else if (e.key === "n") nextElement();
  else if (e.key === "p") prevElement();
  else if (e.key === "r") readCurrentParagraph();
});

/* ---------------- read lists & nav ---------------- */
function readList(list, name) {
  currentList = list;
  index = 0;
  if (!list || list.length === 0) { speak(`No ${name} found on this page.`); return; }
  speak(`${list.length} ${name} found. Say 'next' to move.`);
  const el = list[0];
  addHighlight(el);
  lastReadNode = el;
  speak(getDescriptiveText(el));
}
function nextElement() {
  if (!currentList || currentList.length === 0) { speak("No active list. Say headings, links or buttons first."); return; }
  index = (index + 1) % currentList.length;
  const el = currentList[index];
  addHighlight(el);
  lastReadNode = el;
  speak(getDescriptiveText(el));
}
function prevElement() {
  if (!currentList || currentList.length === 0) { speak("No active list."); return; }
  index = (index - 1 + currentList.length) % currentList.length;
  const el = currentList[index];
  addHighlight(el);
  lastReadNode = el;
  speak(getDescriptiveText(el));
}
function getDescriptiveText(el) {
  if (!el) return "";
  const txt = el.getAttribute && (el.getAttribute("aria-label") || el.getAttribute("alt") || el.innerText || el.getAttribute("title"));
  if (txt && txt.trim()) return txt.trim();
  return `${el.tagName.toLowerCase()} element`;
}

/* ---------------- read paragraph with sentence highlight ---------------- */
function readCurrentParagraph() {
  if (!lastReadNode) { speak("No element selected. Say headings or links first."); return; }
  let p = lastReadNode.closest("p") || lastReadNode.querySelector("p") || document.querySelector("article p") || document.querySelector("p");
  if (!p) { speak("No paragraph found nearby."); return; }
  const text = p.innerText || p.textContent || "";
  const sentences = text.split(/(?<=[.?!])\s+/).filter(s=>s.trim());
  speakSequentialSentences(sentences, p);
}
async function speakSequentialSentences(sentences, container) {
  for (let i=0;i<sentences.length;i++) {
    const s = sentences[i].trim();
    if (!s) continue;
    try { highlightSentenceInNode(container, s); } catch(e){}
    speak(s);
    await sleep(Math.max(800, s.length * 40));
  }
  cleanupSentenceHighlights(container);
}
function highlightSentenceInNode(node, sentence) {
  const html = node.innerHTML;
  const esc = sentence.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(esc);
  if (!re.test(html)) return;
  node.innerHTML = html.replace(re, `<span class="blind-nav-highlight-sentence" style="background: rgba(255,215,0,0.3); border-radius:4px;">${sentence}</span>`);
}
function cleanupSentenceHighlights(node) {
  const spans = (node.querySelectorAll && node.querySelectorAll(".blind-nav-highlight-sentence")) || [];
  spans.forEach(sp => { sp.outerHTML = sp.innerText; });
}
function sleep(ms){ return new Promise(r=>setTimeout(r,ms)); }

/* ---------------- voice recognition (safe) ---------------- */
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
if (SpeechRecognition) {
  try {
    recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const speech = (event.results[event.results.length - 1][0].transcript || "").trim().toLowerCase();
      processVoiceCommand(speech);
    };
    recognition.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        recognition && recognition.stop();
      }
    };
    recognition.onend = () => {
      if (active) {
        try { recognition.start(); } catch(e){}
      }
    };
  } catch(e){
    console.warn("SpeechRecognition init failed", e);
    recognition = null;
  }
} else {
  console.info("SpeechRecognition not supported on this browser.");
}
function processVoiceCommand(speech) {
  if (!speech) return;
  if (speech.includes("head") || speech.includes("heading")) readList(getPageElements().headings, "headings");
  else if (speech.includes("link")) readList(getPageElements().links, "links");
  else if (speech.includes("button")) readList(getPageElements().buttons, "buttons");
  else if (speech.includes("next")) nextElement();
  else if (speech.includes("previous") || speech.includes("prev")) prevElement();
  else if (speech.includes("read paragraph") || speech.includes("read")) readCurrentParagraph();
  else if (speech.includes("contrast") || speech.includes("high contrast")) toggleHighContrast();
  else if (speech.includes("heading map") || speech.includes("headings")) toggleHeadingMap();
  else if (speech.includes("magnifier") || speech.includes("zoom")) toggleMagnifier();
}

/* ---------------- high-contrast ---------------- */
function toggleHighContrast() {
  const root = document.documentElement;
  const on = root.classList.toggle("bn-high-contrast");
  speak(on ? "High contrast enabled." : "High contrast disabled.");
}

/* ---------------- magnifier ---------------- */
let magnifierEnabled = false;
let magnifierLens = null;
let zoomLevel = 2;

function enableMagnifier() {
  if (magnifierEnabled) return;
  magnifierEnabled = true;

  magnifierLens = document.createElement("div");
  magnifierLens.id = "magnifier-lens";

  // essential styling
  Object.assign(magnifierLens.style, {
    position: "fixed",
    width: "220px",
    height: "220px",
    borderRadius: "50%",
    border: "4px solid #000",
    overflow: "hidden",
    pointerEvents: "none",
    zIndex: 999999,
    backdropFilter: `blur(0px)`,
    boxShadow: "0 0 20px rgba(0,0,0,0.4)",
    backgroundColor: "transparent",
  });

  document.body.appendChild(magnifierLens);
  document.addEventListener("mousemove", magnifierMove);

  speak("Magnifier enabled.");
}

function disableMagnifier() {
  magnifierEnabled = false;

  if (magnifierLens) {
    magnifierLens.remove();
    magnifierLens = null;
  }

  document.removeEventListener("mousemove", magnifierMove);
  speak("Magnifier disabled.");
}

function magnifierMove(e) {
  if (!magnifierEnabled || !magnifierLens) return;

  const size = 220;
  const half = size / 2;

  magnifierLens.style.left = (e.clientX - half) + "px";
  magnifierLens.style.top = (e.clientY - half) + "px";

  // REAL magnification trick using scale transform on cloned full-page element
  magnifierLens.style.transform = `scale(${zoomLevel})`;
  magnifierLens.style.transformOrigin = `${half}px ${half}px`;
}

/* ---------------- heading map ---------------- */
function toggleHeadingMap() {
  const existing = document.getElementById("bn-heading-map");
  if (existing) { existing.remove(); headingMapOpen = false; return; }
  const headings = getPageElements().headings;
  const map = document.createElement("div");
  map.id = "bn-heading-map";
  const title = document.createElement("h4");
  title.innerText = "Page headings";
  map.appendChild(title);
  const ul = document.createElement("ul");
  headings.forEach((h) => {
    const li = document.createElement("li");
    const txt = h.innerText || h.getAttribute("aria-label") || h.tagName;
    li.innerText = txt.length > 80 ? txt.slice(0,80) + "..." : txt;
    li.addEventListener("click", () => {
      h.scrollIntoView({ behavior: "smooth", block: "center" });
      addHighlight(h);
      speak(getDescriptiveText(h));
    });
    ul.appendChild(li);
  });
  if (headings.length === 0) {
    const p = document.createElement("div");
    p.innerText = "No headings detected.";
    map.appendChild(p);
  } else {
    map.appendChild(ul);
  }
  document.documentElement.appendChild(map);
  headingMapOpen = true;
}

/* ---------------- link enhancer & focus fixer & enhancers ---------------- */
function enhanceLinkLabels() {
  document.querySelectorAll("a").forEach(a => {
    const text = (a.innerText || "").trim().toLowerCase();
    if (!text) {
      const t = a.getAttribute("title") || a.getAttribute("aria-label");
      if (t) a.setAttribute("data-bn-label", t);
    } else if (/^(click here|read more|more|here)$/.test(text)) {
      const hint = findNearbyText(a) || a.href || "link";
      a.setAttribute("data-bn-label", `${text} (${hint})`);
    }
  });
}
function findNearbyText(a) {
  const p = a.closest("p,li,div") || a.parentElement;
  if (!p) return null;
  const txt = (p.innerText || "").replace(/\s+/g," ").trim();
  if (!txt) return null;
  const anchorText = (a.innerText || "").trim();
  return txt.replace(anchorText, "").trim().slice(0,80);
}
function detectAndFixFocusTrap() {
  document.addEventListener('keydown', function detect(e){
    if (e.key === 'Tab') {
      document.body.setAttribute('tabindex', '-1');
      document.removeEventListener('keydown', detect);
    }
  }, { once: true });
}
function screenReaderEnhancer() {
  document.querySelectorAll("img").forEach(img => {
    if (!img.alt || img.alt.trim() === "") {
      const alt = img.getAttribute("title") || img.getAttribute("aria-label") || guessAltFromFilename(img.src);
      if (alt) img.setAttribute("alt", alt);
    }
  });
  document.querySelectorAll("button, input[type=button], input[type=submit]").forEach(btn => {
    if (!btn.getAttribute("aria-label") && !(btn.innerText || btn.value)) {
      const label = btn.getAttribute("title") || btn.getAttribute("aria-label") || "button";
      btn.setAttribute("aria-label", label);
    }
  });
  if (!document.querySelector('[role="main"]')) {
    const main = document.querySelector("main") || document.querySelector("article") || document.body;
    if (main && !main.getAttribute("role")) main.setAttribute("role", "main");
  }
}
function guessAltFromFilename(src) {
  try {
    const parts = src.split("/");
    const file = parts[parts.length-1] || src;
    return file.split("?")[0].replace(/[-_0-9]+/g," ").split(".")[0];
  } catch(e){ return ""; }
}

/* ---------------- message handling ---------------- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.action === "START") {
    active = true;
    speak("Accessibility mode activated.");
    screenReaderEnhancer();
    enhanceLinkLabels();
    detectAndFixFocusTrap();
    if (recognition) { try { recognition.start(); } catch(e){} }
  } else if (msg.action === "STOP") {
    active = false;
    speak("Accessibility mode stopped.");
    if (recognition) { try { recognition.stop(); } catch(e){} }
    document.querySelectorAll(".blind-nav-highlight").forEach(e=>e.classList.remove("blind-nav-highlight"));
    // cleanup heading map or magnifier if left open
    const hm = document.getElementById("bn-heading-map"); if (hm) hm.remove();
    if (magnifierEnabled) disableMagnifier();
  } else if (msg.action === "TOGGLE_CONTRAST") {
    toggleHighContrast();
  } else if (msg.action === "TOGGLE_HEADING_MAP") {
    toggleHeadingMap();
  } else if (msg.action === "TOGGLE_MAGNIFIER") {
    if (magnifierEnabled) disableMagnifier(); else enableMagnifier();
  } else if (msg.action === "SET_VOICE_RATE") {
    chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (settings) => {
      const s = settings || {};
      s.rate = msg.rate || 1.0;
      chrome.runtime.sendMessage({ action: "SET_SETTINGS", settings: s }, () => {});
    });
  } else if (msg.action === "SET_VOICE_NAME") {
    chrome.runtime.sendMessage({ action: "GET_SETTINGS" }, (settings) => {
      const s = settings || {};
      s.voiceName = msg.name || "";
      chrome.runtime.sendMessage({ action: "SET_SETTINGS", settings: s }, () => {});
    });
  }
});

/* ---------------- init ---------------- */
(function init() {
  try {
    screenReaderEnhancer();
    enhanceLinkLabels();
  } catch(e){ console.warn("Init enhancer failed", e); }
})();

/* ---------------- helper: toggleMagnifier alias for voice recognition ---------------- */
function toggleMagnifier() {
  if (magnifierEnabled) disableMagnifier(); else enableMagnifier();
}
