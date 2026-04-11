function scrapeArticle() {
  // Use Readability-inspired heuristics to extract article content
  const title = document.title.trim() ||
    document.querySelector('h1')?.innerText.trim() ||
    'Untitled Article';

  // Try common article containers
  const selectors = [
    'article',
    '[role="article"]',
    '.post-content',
    '.article-content',
    '.entry-content',
    '.post-body',
    'main',
    '.content'
  ];

  let content = '';

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.innerText.trim().length > 200) {
      content = el.innerText.trim();
      break;
    }
  }

  // Fallback: find the largest text block within body's direct children and their immediate children
  if (!content) {
    const root = document.querySelector('main') || document.body;
    const candidates = root.querySelectorAll(':scope > div, :scope > section, :scope > div > div, :scope > div > section');
    let maxLen = 0;
    let bestEl = null;

    candidates.forEach(div => {
      const len = div.innerText.length;
      if (len > maxLen && len > 200) {
        maxLen = len;
        bestEl = div;
      }
    });

    if (bestEl) {
      content = bestEl.innerText.trim();
    }
  }

  if (!content) return null;

  // Try to find author
  const authorEl = document.querySelector(
    '[rel="author"], .author, .byline, [class*="author"], meta[name="author"]'
  );
  const author = authorEl
    ? (authorEl.content || authorEl.innerText || '').trim()
    : '';

  return {
    title,
    content: author ? `*By ${author}*\n\n${content}` : content,
    messageCount: 0
  };
}

window.__contextSaver_scrapeArticle = scrapeArticle;
