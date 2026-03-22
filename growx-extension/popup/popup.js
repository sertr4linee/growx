const dot = document.getElementById("status-dot");
const statusText = document.getElementById("status-text");
const hintText = document.getElementById("hint-text");
const btnOpenPanel = document.getElementById("btn-open-panel");
const btnSettings = document.getElementById("btn-settings");

// Check API key status
chrome.storage.sync.get(["apiKey"], (data) => {
  if (data.apiKey && data.apiKey.startsWith("sk-")) {
    dot.classList.add("ok");
    statusText.textContent = "Ready — API key configured";
  } else {
    dot.classList.add("warn");
    statusText.textContent = "Setup required";
    hintText.textContent = "Add your OpenAI API key in Settings to start generating replies.";
  }
});

btnOpenPanel.addEventListener("click", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab?.id) {
    chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  }
});

btnSettings.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
  window.close();
});
