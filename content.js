// Content script — listens for messages from the popup to scrape the current page

const SCRAPE_TIMEOUT_MS = 10000;

const SITE_SCRAPERS = {
  chatgpt: '__contextSaver_scrapeChatGPT',
  claude: '__contextSaver_scrapeClaude',
  twitter: '__contextSaver_scrapeTwitter',
  article: '__contextSaver_scrapeArticle'
};

function detectSite() {
  const url = window.location.hostname;
  if (url.includes('chatgpt.com') || url.includes('chat.openai.com')) return 'chatgpt';
  if (url.includes('claude.ai')) return 'claude';
  if (url.includes('x.com') || url.includes('twitter.com')) return 'twitter';
  return 'article';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'scrape') {
    const site = detectSite();
    const scraperFn = SITE_SCRAPERS[site];

    if (!scraperFn) {
      sendResponse({ error: `Unknown site type: ${site}` });
      return;
    }

    // Load the scraper script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(`scrapers/${site}.js`);

    let responded = false;

    // Timeout if scraping takes too long
    const timeout = setTimeout(() => {
      if (!responded) {
        responded = true;
        window.removeEventListener('message', handler);
        sendResponse({ error: 'Scraping timed out — the page may have an unusual structure' });
      }
    }, SCRAPE_TIMEOUT_MS);

    // Listen for the result via postMessage
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'CONTEXT_SAVER_RESULT') return;

      window.removeEventListener('message', handler);
      clearTimeout(timeout);

      if (responded) return;
      responded = true;

      const result = event.data.data;
      if (result) {
        result.site = site;
        result.url = window.location.href;
        result.savedAt = new Date().toISOString();
      }
      sendResponse(result);
    };
    window.addEventListener('message', handler);

    script.onload = () => {
      script.remove();
      // Call the scraper safely without template string injection
      const execScript = document.createElement('script');
      execScript.textContent = `
        (function() {
          var fn = window[${JSON.stringify(scraperFn)}];
          var result = fn ? fn() : null;
          window.postMessage({
            type: 'CONTEXT_SAVER_RESULT',
            data: result
          }, window.location.origin);
        })();
      `;
      document.head.appendChild(execScript);
      execScript.remove();
    };

    script.onerror = () => {
      if (!responded) {
        responded = true;
        clearTimeout(timeout);
        window.removeEventListener('message', handler);
        sendResponse({ error: `Failed to load scraper for ${site}` });
      }
    };

    document.head.appendChild(script);
    return true; // Keep message channel open for async response
  }

  if (request.action === 'detect') {
    sendResponse({ site: detectSite() });
  }
});
