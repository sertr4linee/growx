# GrowX Reply — Chrome Extension

Like a tweet → AI generates a reply → appears in side panel to copy.

## Install (dev mode)

1. Go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `growx-extension/` folder
4. Click the extension icon → **Settings** → add your OpenAI API key

## Usage

1. Open [x.com](https://x.com) in any tab
2. Like any tweet — the side panel opens automatically
3. Choose a tone (Casual / Pro / Humorous / Engaging)
4. Edit the reply if needed → click **Copy Reply**
5. Paste it as a reply on X

## Features

- ❤️ **Like-triggered** — detects like button click, no manual action needed
- 📊 **Side Panel UI** — native Chrome side panel, stays open while you browse
- 🎚️ **Tone selector** — 4 preset tones or your own custom prompt
- 🎯 **Niche context** — tell the AI your niche for on-brand replies
- ✍️ **Custom system prompt** — full control over AI behavior
- 🔄 **Regenerate** — get a new variation with one click
- 📋 **Copy to clipboard** — one-click copy with confirmation toast
- 👁️ **Tweet preview** — see which tweet you're replying to

## Settings

| Field | Description |
|---|---|
| API Key | Your OpenAI API key (sk-...) |
| Model | `gpt-4o-mini` (fast/cheap) or `gpt-4o` (smarter) |
| Niche | Your content niche (e.g. "SaaS founder, growth hacking") |
| Custom Prompt | Override the default tone system entirely |

## Architecture

```
growx-extension/
├── manifest.json          # MV3 manifest
├── background/sw.js       # Service Worker — OpenAI API, panel control
├── content/content.js     # Detects likes on x.com, extracts tweet
├── sidepanel/             # Side Panel UI (HTML/CSS/JS)
├── settings/              # Options page
├── popup/                 # Extension icon popup
└── icons/                 # Extension icons
```
