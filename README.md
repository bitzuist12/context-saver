# Context Saver

Chrome extension that saves conversations and articles as local Markdown files with YAML frontmatter. Zero dependencies, no external services — everything stays on your machine.

<!-- TODO: Uncomment after Chrome Web Store approval
[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/EXTENSION_ID)](https://chrome.google.com/webstore/detail/EXTENSION_ID)
-->

## Install

**Chrome Web Store (recommended):**

> Coming soon — store submission in progress.

**Manual install (developers):**

1. Clone this repo or download the ZIP
2. Open `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select this folder

## Supported Sites

- **ChatGPT** — full conversation with role labels
- **Claude** — full conversation with role labels
- **X / Twitter** — threads with numbered tweets
- **Any article** — extracts main content using readability heuristics

## Usage

1. Navigate to a ChatGPT conversation, Claude chat, Twitter thread, or any article
2. Click the Context Saver extension icon
3. Click **Save as Markdown**
4. File saves to `Downloads/ContextSaver/{site-type}/` as a `.md` file

You can customize the save folder prefix in the popup settings.

## Google Drive Sync

Point Chrome's download folder (or the `ContextSaver` subfolder) to a Google Drive-synced directory and your saves will auto-sync.

## Output Format

Each saved file is Markdown with YAML frontmatter:

```markdown
---
title: "Conversation Title"
source: chatgpt
url: "https://chatgpt.com/c/..."
saved_at: 2026-04-11T10:30:00.000Z
messages: 24
---

# Conversation Title

> Saved from **ChatGPT** on 2026-04-11
> https://chatgpt.com/c/...

### You
...

### ChatGPT
...
```

## How It Works

The extension uses a content script (`content.js`) that detects which site you're on and loads the appropriate scraper from `scrapers/`. Each scraper extracts content using site-specific DOM selectors with fallback heuristics. The popup (`popup.js`) orchestrates the flow and triggers a Markdown file download via the Chrome Downloads API.

```
popup.js          → UI + download logic
content.js        → site detection + scraper loading
scrapers/
  chatgpt.js      → ChatGPT conversation extractor
  claude.js       → Claude conversation extractor
  twitter.js      → X/Twitter thread extractor
  article.js      → Generic article extractor (fallback)
```

**Note:** Scrapers rely on DOM selectors that may change when sites update their UI. If a scraper stops working, the selectors in the relevant `scrapers/*.js` file likely need updating.

## Permissions

- `activeTab` — access the current tab when you click the extension
- `scripting` — inject scraper scripts into the page
- `downloads` — save Markdown files
- `storage` — remember your folder preference

## Privacy

Context Saver makes **zero network requests**. No analytics, no telemetry, no accounts. Your data never leaves your browser. See the full [Privacy Policy](PRIVACY.md).

## Contributing

Found a broken scraper? Want to add a new site? See [CONTRIBUTING.md](.github/CONTRIBUTING.md).

## License

MIT
