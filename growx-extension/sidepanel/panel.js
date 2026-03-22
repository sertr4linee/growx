// Side Panel Logic

let currentTweet = null;
let currentTone = "casual";
let isGenerating = false;

// DOM refs
const emptyState = document.getElementById("empty-state");
const mainContent = document.getElementById("main-content");
const tweetAuthorEl = document.getElementById("tweet-author-handle");
const tweetTextEl = document.getElementById("tweet-text-content");
const tweetLinkEl = document.getElementById("tweet-link");
const replyTextarea = document.getElementById("reply-textarea");
const charCountEl = document.getElementById("char-count");
const loadingEl = document.getElementById("loading-indicator");
const errorEl = document.getElementById("error-message");
const btnRegenerate = document.getElementById("btn-regenerate");
const btnCopy = document.getElementById("btn-copy");
const btnSettings = document.getElementById("btn-settings");
const toast = document.getElementById("toast");
const toneButtons = document.querySelectorAll(".tone-btn");

// Init
init();

async function init() {
  // Check if there's already a liked tweet in session storage
  const stored = await chrome.storage.session.get("latestLikedTweet");
  if (stored.latestLikedTweet) {
    handleNewTweet(stored.latestLikedTweet);
  }

  // Listen for new tweets from SW
  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === "NEW_TWEET_LIKED") {
      handleNewTweet(message.payload);
    }
  });
}

function handleNewTweet(tweetData) {
  currentTweet = tweetData;

  // Show main content
  emptyState.classList.add("hidden");
  mainContent.classList.remove("hidden");

  // Populate tweet preview
  tweetAuthorEl.textContent = tweetData.author;
  tweetTextEl.textContent = tweetData.tweetText;
  tweetLinkEl.href = tweetData.tweetUrl || "#";

  // Clear previous reply
  replyTextarea.value = "";
  updateCharCount();
  hideError();

  // Auto-generate
  generateReply();
}

// Tone selection
toneButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    toneButtons.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    currentTone = btn.dataset.tone;
  });
});

// Buttons
btnRegenerate.addEventListener("click", () => {
  if (!isGenerating && currentTweet) generateReply();
});

btnCopy.addEventListener("click", () => {
  const text = replyTextarea.value.trim();
  if (!text) return;
  navigator.clipboard.writeText(text).then(() => {
    showToast();
  });
});

btnSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

// Textarea char count
replyTextarea.addEventListener("input", updateCharCount);

function updateCharCount() {
  const len = replyTextarea.value.length;
  charCountEl.textContent = len;
  charCountEl.parentElement.classList.toggle("over", len > 280);
}

async function generateReply() {
  if (isGenerating) return;
  isGenerating = true;
  setLoading(true);
  hideError();
  btnRegenerate.disabled = true;
  btnCopy.disabled = true;

  try {
    const settings = await chrome.storage.sync.get([
      "apiKey",
      "model",
      "niche",
      "customPrompt",
    ]);

    const response = await chrome.runtime.sendMessage({
      type: "GENERATE_REPLY",
      payload: {
        tweet: currentTweet.tweetText,
        author: currentTweet.author,
        tone: currentTone,
        niche: settings.niche || "",
        customPrompt: settings.customPrompt || "",
        model: settings.model || "gpt-4o-mini",
        apiKey: settings.apiKey || "",
      },
    });

    if (response.ok) {
      replyTextarea.value = response.reply;
      updateCharCount();
    } else {
      showError(response.error || "Generation failed");
    }
  } catch (err) {
    showError(err.message || "Unknown error");
  } finally {
    isGenerating = false;
    setLoading(false);
    btnRegenerate.disabled = false;
    btnCopy.disabled = false;
  }
}

function setLoading(on) {
  loadingEl.classList.toggle("hidden", !on);
  replyTextarea.classList.toggle("hidden", on);
}

function showError(msg) {
  errorEl.textContent = `⚠️ ${msg}`;
  errorEl.classList.remove("hidden");
}

function hideError() {
  errorEl.classList.add("hidden");
}

function showToast() {
  toast.classList.remove("hidden");
  setTimeout(() => toast.classList.add("hidden"), 2500);
}
