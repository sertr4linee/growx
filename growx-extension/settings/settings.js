const apiKeyInput = document.getElementById("apiKey");
const modelSelect = document.getElementById("model");
const nicheInput = document.getElementById("niche");
const customPromptInput = document.getElementById("customPrompt");
const btnSave = document.getElementById("btn-save");
const btnToggleKey = document.getElementById("btn-toggle-key");
const statusMsg = document.getElementById("status-msg");

// Load saved settings
chrome.storage.sync.get(["apiKey", "model", "niche", "customPrompt"], (data) => {
  if (data.apiKey) apiKeyInput.value = data.apiKey;
  if (data.model) modelSelect.value = data.model;
  if (data.niche) nicheInput.value = data.niche;
  if (data.customPrompt) customPromptInput.value = data.customPrompt;
});

// Toggle API key visibility
btnToggleKey.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  btnToggleKey.textContent = isPassword ? "🙈" : "👁";
});

// Save
btnSave.addEventListener("click", () => {
  const apiKey = apiKeyInput.value.trim();
  const model = modelSelect.value;
  const niche = nicheInput.value.trim();
  const customPrompt = customPromptInput.value.trim();

  if (!apiKey) {
    showStatus("API key is required", "error");
    return;
  }

  if (!apiKey.startsWith("sk-")) {
    showStatus("API key should start with sk-", "error");
    return;
  }

  chrome.storage.sync.set({ apiKey, model, niche, customPrompt }, () => {
    showStatus("✅ Settings saved!", "success");
    setTimeout(() => (statusMsg.textContent = ""), 3000);
  });
});

function showStatus(msg, type) {
  statusMsg.textContent = msg;
  statusMsg.className = `status ${type}`;
}
