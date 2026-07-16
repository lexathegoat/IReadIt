// Privacy Guardian - popup.js

const views = {
  noKey: document.getElementById("noKeyView"),
  idle: document.getElementById("idleView"),
  loading: document.getElementById("loadingView"),
  error: document.getElementById("errorView"),
  result: document.getElementById("resultView"),
};

function showView(name) {
  Object.entries(views).forEach(([k, el]) => el.classList.toggle("hidden", k !== name));
}

let currentTabId = null;
let currentTabUrl = "";
let timerInterval = null;
let timerStart = 0;

document.getElementById("settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("goSettingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
document.getElementById("analyzeBtn").addEventListener("click", runAnalysis);
document.getElementById("retryBtn").addEventListener("click", runAnalysis);
document.getElementById("reanalyzeBtn").addEventListener("click", runAnalysis);

init();

async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab?.id ?? null;
  currentTabUrl = tab?.url ?? "";
  document.getElementById("hostLabel").textContent = safeHost(currentTabUrl);

  const { apiKey } = await chrome.storage.local.get("apiKey");
  if (!apiKey) {
    showView("noKey");
  } else {
    showView("idle");
  }
}

function safeHost(url) {
  try { return new URL(url).host; } catch (e) { return "page"; }
}

// Function injected into the page to extract readable text
// Must not use closures because it runs in the page context
function extractPageTextFromDOM() {
  const keywordPattern = /(privacy|kvkk|personal\s*data|cookie|terms|usage\s*terms|notice|policy)/i;

  function textOf(el) {
    return (el.innerText || "").replace(/\s+/g, " ").trim();
  }

  let candidates = [];

  document.querySelectorAll("main, article, section, div").forEach(el => {
    const idClass = (el.id + " " + el.className).toString();

    if (keywordPattern.test(idClass)) {
      const t = textOf(el);
      if (t.length > 200) candidates.push(t);
    }
  });

  candidates.sort((a, b) => b.length - a.length);

  if (candidates.length > 0) {
    return candidates[0];
  }

  const main = document.querySelector("main") || document.querySelector("article");

  if (main) {
    const t = textOf(main);
    if (t.length > 200) return t;
  }

  return textOf(document.body);
}

async function runAnalysis() {
  if (currentTabId == null) return;

  showView("loading");
  startTimer();

  let pageText = "";

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: currentTabId },
      func: extractPageTextFromDOM,
    });

    pageText = result || "";

  } catch (e) {
    stopTimer();
    showError("Could not read page content: " + (e.message || e));
    return;
  }

  chrome.runtime.sendMessage(
    { action: "ANALYZE", pageText, pageUrl: currentTabUrl },

    (response) => {
      stopTimer();

      if (!response) {
        showError("No response received from background service.");
        return;
      }

      if (!response.ok) {
        showError(response.error || "An unknown error occurred.");
        return;
      }

      renderResult(response.result, response.elapsedMs);
    }
  );
}