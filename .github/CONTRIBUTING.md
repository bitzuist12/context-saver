# Contributing to Context Saver

Thanks for helping out. This guide covers the most common contribution: fixing a broken scraper.

## How scrapers work

Each file in `scrapers/` exports a single function that reads the page DOM and returns:

```js
{
  title: "Page or conversation title",
  content: "Markdown-formatted content",
  messageCount: 12  // number of messages/tweets, or 0 for articles
}
```

The function is called by `content.js` after being injected into the page. It runs in the page's JS context, so it has full access to the DOM.

## When a scraper breaks

Sites change their HTML structure regularly. When a scraper stops working:

1. Open the site in Chrome and navigate to the content you want to save
2. Right-click an element (e.g., a message bubble) and click **Inspect**
3. Look for stable attributes — `data-testid`, `role`, semantic tags. These are more reliable than class names
4. Update the selectors in the relevant `scrapers/*.js` file
5. Test by loading the unpacked extension and clicking Save

### What makes a good selector

Prefer (most stable to least):

- `data-testid` attributes — these are usually kept stable for testing
- `role` and other ARIA attributes
- Semantic HTML tags (`article`, `main`, `nav`)
- `data-*` custom attributes
- Class names — **least stable**, often auto-generated. Use `[class*="keyword"]` as a last resort

### Selector tips

- Always have a fallback path. The primary selector may break, but a broader fallback can still capture something useful.
- Check that `.innerText` actually returns the text you want — some sites nest content in shadow DOM or iframes that `innerText` can't reach.
- Test with both short and long conversations/threads.

## Adding a new scraper

To add support for a new site:

1. Create `scrapers/yoursite.js` with a function that returns `{ title, content, messageCount }`
2. Export it as `window.__contextSaver_scrapeYoursite = scrapeYoursite`
3. Add the site detection in `content.js`:
   - Add the hostname check in `detectSite()`
   - Add the function name in `SITE_SCRAPERS`
4. Add the label in `popup.js` in the `siteLabels` object
5. Add `"scrapers/yoursite.js"` to `web_accessible_resources` in `manifest.json`

## Testing locally

1. Make your changes
2. Go to `chrome://extensions/`
3. Click the reload button on Context Saver
4. Navigate to the target page and click the extension icon
5. Check the downloaded `.md` file for correct formatting

## Code style

- Vanilla JS only, no build tools, no dependencies
- Keep each scraper under 60 lines
- Always return `null` if nothing useful was found (don't return empty content)
- Use `innerText` for visible text, not `textContent` (which includes hidden elements)

## Reporting a broken scraper

If you don't want to fix it yourself, open an issue with:

- Which site stopped working
- What you see when you click Save (error message or empty file)
- A screenshot of the page's DOM structure (Inspect Element) if possible
