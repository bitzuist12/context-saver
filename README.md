# Context Saver

Chrome extension that saves conversations and articles as local Markdown files.

## Supported Sites

- **ChatGPT** — saves full conversation with role labels
- **Claude** — saves full conversation with role labels
- **X / Twitter** — saves threads
- **Any article** — extracts main content using readability heuristics

## Install

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** → select this folder

## Usage

1. Navigate to a ChatGPT conversation, Claude chat, Twitter thread, or any article
2. Click the Context Saver extension icon
3. Click **Save as Markdown**
4. File saves to `Downloads/ContextSaver/{site-type}/` as a `.md` file

## Google Drive Sync

Point Chrome's download folder (or the `ContextSaver` subfolder) to a Google Drive-synced directory and your saves will auto-sync.

## Output Format

Each saved file is a Markdown file with YAML frontmatter:

```markdown
---
title: "Conversation Title"
source: chatgpt
url: https://chatgpt.com/c/...
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
