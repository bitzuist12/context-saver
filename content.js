// Content script — listens for messages from the popup to scrape the current page

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
    // Dynamically load the right scraper
    const script = document.createElement('script');
    script.src = chrome.runtime.getURL(`scrapers/${site}.js`);
    script.onload = () => {
      script.remove();
      // Execute the scraper function
      const scraperFn = `__contextSaver_scrape${site.charAt(0).toUpperCase() + site.slice(1)}`;
      const execScript = document.createElement('script');
      execScript.textContent = `
        window.postMessage({
          type: 'CONTEXT_SAVER_RESULT',
          data: window['${scraperFn}'] ? window['${scraperFn}']() : null
        }, '*');
      `;
      document.head.appendChild(execScript);
      execScript.remove();
    };
    document.head.appendChild(script);

    // Listen for the result
    const handler = (event) => {
      if (event.data?.type === 'CONTEXT_SAVER_RESULT') {
        window.removeEventListener('message', handler);
        const result = event.data.data;
        if (result) {
          result.site = site;
          result.url = window.location.href;
          result.savedAt = new Date().toISOString();
        }
        sendResponse(result);
      }
    };
    window.addEventListener('message', handler);

    // Return true to keep the message channel open for async response
    return true;
  }

  if (request.action === 'detect') {
    sendResponse({ site: detectSite() });
  }
});
