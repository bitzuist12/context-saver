// Content script — listens for messages from the popup to scrape the current page

const SCRAPE_TIMEOUT_MS = 10000;

const SITE_SCRAPERS = {
  chatgpt: '__contextSaver_scrapeChatGPT',
  claude: '__contextSaver_scrapeClaude',
  twitter: '__contextSaver_scrapeTwitter',
  article: '__contextSaver_scrapeArticle'
};

function detectSite() {
  const hostname = window.location.hostname;
  if (/^([a-z0-9-]+\.)?chatgpt\.com$/.test(hostname) || /^([a-z0-9-]+\.)?chat\.openai\.com$/.test(hostname)) return 'chatgpt';
  if (/^([a-z0-9-]+\.)?claude\.ai$/.test(hostname)) return 'claude';
  if (/^([a-z0-9-]+\.)?x\.com$/.test(hostname) || /^([a-z0-9-]+\.)?twitter\.com$/.test(hostname)) return 'twitter';
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

    // Generate a nonce to validate postMessage authenticity
    const nonce = crypto.getRandomValues(new Uint32Array(2)).join('-');

    // Load the scraper script
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(`scrapers/${site}.js`);

    let responded = false;

    function respond(data) {
      if (responded) return;
      responded = true;
      window.removeEventListener('message', handler);
      clearTimeout(timeout);
      sendResponse(data);
    }

    // Timeout if scraping takes too long
    const timeout = setTimeout(() => {
      respond({ error: 'Scraping timed out — the page may have an unusual structure' });
    }, SCRAPE_TIMEOUT_MS);

    // Listen for the result via postMessage
    const handler = (event) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type !== 'CONTEXT_SAVER_RESULT') return;
      if (event.data?.nonce !== nonce) return;

      const result = event.data.data;
      if (result) {
        result.site = site;
        result.url = window.location.href;
        result.savedAt = new Date().toISOString();
      }
      respond(result);
    };
    window.addEventListener('message', handler);

    script.onload = () => {
      script.remove();
      // Call the scraper with try-catch and nonce verification
      const execScript = document.createElement('script');
      execScript.textContent = `
        (function() {
          try {
            var fn = window[${JSON.stringify(scraperFn)}];
            var result = fn ? fn() : null;
            window.postMessage({
              type: 'CONTEXT_SAVER_RESULT',
              nonce: ${JSON.stringify(nonce)},
              data: result
            }, window.location.origin);
          } catch (e) {
            window.postMessage({
              type: 'CONTEXT_SAVER_RESULT',
              nonce: ${JSON.stringify(nonce)},
              data: { error: 'Scraper error: ' + e.message }
            }, window.location.origin);
          }
        })();
      `;
      document.head.appendChild(execScript);
      execScript.remove();
    };

    script.onerror = () => {
      respond({ error: `Failed to load scraper for ${site}` });
    };

    document.head.appendChild(script);
    return true; // Keep message channel open for async response
  }

  if (request.action === 'detect') {
    sendResponse({ site: detectSite() });
  }
});
