// Content Script — injected on x.com
// Detects like button clicks, extracts tweet content, notifies SW

(function () {
  "use strict";

  let lastLikedTweetId = null;

  // Observe DOM for dynamically loaded tweets
  const observer = new MutationObserver(() => {
    attachLikeListeners();
  });

  observer.observe(document.body, { childList: true, subtree: true });
  attachLikeListeners();

  function attachLikeListeners() {
    // X uses aria-label="Like" on the like button (not yet liked)
    const likeButtons = document.querySelectorAll(
      '[data-testid="like"]:not([data-growx-attached])'
    );

    likeButtons.forEach((btn) => {
      btn.setAttribute("data-growx-attached", "true");
      btn.addEventListener("click", onLikeClick, { once: false });
    });
  }

  function onLikeClick(e) {
    const btn = e.currentTarget;

    // Small delay to let X process the like first
    setTimeout(() => {
      const tweetData = extractTweetFromButton(btn);
      if (!tweetData) return;

      // Deduplicate rapid double-fires
      const tweetId = tweetData.tweetId;
      if (tweetId && tweetId === lastLikedTweetId) return;
      lastLikedTweetId = tweetId;

      chrome.runtime.sendMessage({
        type: "TWEET_LIKED",
        payload: tweetData,
      });
    }, 300);
  }

  function extractTweetFromButton(btn) {
    // Walk up to the article element containing the tweet
    const article = btn.closest("article");
    if (!article) return null;

    // Extract tweet text
    const tweetTextEl = article.querySelector('[data-testid="tweetText"]');
    const tweetText = tweetTextEl ? tweetTextEl.innerText.trim() : "";

    if (!tweetText) return null;

    // Extract author handle
    const authorEl = article.querySelector('[data-testid="User-Name"]');
    let author = "unknown";
    if (authorEl) {
      // The handle is usually in a span containing @
      const spans = authorEl.querySelectorAll("span");
      for (const span of spans) {
        if (span.textContent.startsWith("@")) {
          author = span.textContent.slice(1); // remove @
          break;
        }
      }
    }

    // Extract tweet URL / ID from a timestamp link
    const timeLink = article.querySelector("time")?.closest("a");
    const tweetUrl = timeLink ? timeLink.href : window.location.href;
    const tweetId = tweetUrl.split("/status/")[1]?.split("?")[0] || null;

    return {
      tweetId,
      tweetText,
      author,
      tweetUrl,
      timestamp: Date.now(),
    };
  }
})();
