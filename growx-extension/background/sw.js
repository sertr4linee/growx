// Service Worker — handles OpenAI calls and side panel control

const OPENAI_API_URL = "https://api.openai.com/v1/chat/completions";

// Open side panel when extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "TWEET_LIKED") {
    handleTweetLiked(message.payload, sender.tab);
    sendResponse({ ok: true });
  }

  if (message.type === "GENERATE_REPLY") {
    generateReply(message.payload)
      .then((reply) => sendResponse({ ok: true, reply }))
      .catch((err) => sendResponse({ ok: false, error: err.message }));
    return true; // keep channel open for async
  }
});

async function handleTweetLiked(payload, tab) {
  // Store the latest liked tweet so side panel can read it
  await chrome.storage.session.set({ latestLikedTweet: payload });

  // Open the side panel
  if (tab?.id) {
    chrome.sidePanel.open({ tabId: tab.id });
  }

  // Notify side panel if already open
  chrome.runtime.sendMessage({
    type: "NEW_TWEET_LIKED",
    payload,
  }).catch(() => {}); // ignore if panel not open yet
}

async function generateReply(payload) {
  const { tweet, author, tone, niche, customPrompt, model, apiKey } = payload;

  if (!apiKey) throw new Error("OpenAI API key not configured. Go to Settings.");

  const systemPrompt = buildSystemPrompt(tone, niche, customPrompt);
  const userPrompt = `Tweet by @${author}:\n"${tweet}"\n\nWrite a reply to this tweet.`;

  const res = await fetch(OPENAI_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 280,
      temperature: 0.85,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `OpenAI error ${res.status}`);
  }

  const data = await res.json();
  return data.choices[0].message.content.trim();
}

function buildSystemPrompt(tone, niche, customPrompt) {
  if (customPrompt && customPrompt.trim()) {
    return customPrompt.trim();
  }

  const nicheCtx = niche ? ` You are active in the niche: ${niche}.` : "";
  const toneMap = {
    casual: "Write in a casual, friendly and authentic tone. Sound human, not corporate.",
    pro: "Write in a professional, insightful tone. Demonstrate expertise and add value.",
    humorous: "Write in a witty, humorous tone. Be clever and entertaining without being cringe.",
    engaging: "Write a reply that sparks conversation. Ask a thoughtful question or make a bold statement.",
  };

  const toneInstruction = toneMap[tone] || toneMap.casual;

  return `You are a Twitter growth expert helping build an engaged audience.${nicheCtx}
${toneInstruction}
Rules:
- Keep replies under 280 characters
- No hashtags unless essential
- No emojis overload (max 1-2 if natural)
- Never start with "I" or be sycophantic
- Be specific to the tweet content — never generic
- Output ONLY the reply text, nothing else`;
}
