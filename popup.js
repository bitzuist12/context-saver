const ALLOWED_SITES = ['chatgpt', 'claude', 'twitter', 'article'];
const MAX_CONTENT_LENGTH = 50_000_000; // 50MB

const siteLabels = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  twitter: 'X / Twitter',
  article: 'Article'
};

function slugify(text) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toISOString().split('T')[0];
}

function yamlSafe(str) {
  // Always quote and escape — safe for any input
  return '"' + String(str)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    + '"';
}

function sanitizeError(msg) {
  return String(msg || 'Unknown error').substring(0, 200);
}

function validateData(data) {
  if (!data || typeof data !== 'object') return 'No data returned from scraper';
  if (data.error) return sanitizeError(data.error);
  if (typeof data.content !== 'string' || data.content.length === 0) return 'No content found on this page';
  if (data.content.length > MAX_CONTENT_LENGTH) return 'Page content is too large to save';
  if (typeof data.title !== 'string' || data.title.length === 0) {
    data.title = 'Untitled';
  }
  if (!ALLOWED_SITES.includes(data.site)) return 'Invalid site type in scraper response';
  return null; // valid
}

function buildMarkdown(data) {
  const title = data.title.substring(0, 500);
  const lines = [
    '---',
    `title: ${yamlSafe(title)}`,
    `source: ${data.site}`,
    `url: ${yamlSafe(data.url)}`,
    `saved_at: ${data.savedAt}`,
    `messages: ${Number(data.messageCount) || 0}`,
    '---',
    '',
    `# ${title}`,
    '',
    `> Saved from **${siteLabels[data.site] || data.site}** on ${formatDate(data.savedAt)}`,
    `> ${data.url}`,
    '',
    data.content
  ];
  return lines.join('\n');
}

// Detect current site on popup open
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageTitle = document.getElementById('pageTitle');
  const siteType = document.getElementById('siteType');

  if (!pageTitle || !siteType) return;

  pageTitle.textContent = tab.title || 'Unknown page';

  // Try to detect site type
  try {
    const response = await chrome.tabs.sendMessage(tab.id, { action: 'detect' });
    if (response?.site) {
      siteType.textContent = siteLabels[response.site] || response.site;
    }
  } catch {
    // Content script might not be injected (non-matching URL)
    siteType.textContent = 'Article';
  }

  // Load saved folder preference
  const stored = await chrome.storage?.local?.get('folderPath').catch(() => null);
  if (stored?.folderPath) {
    document.getElementById('folderPath').value = stored.folderPath;
  }
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const folderPath = document.getElementById('folderPath').value.trim() || 'ContextSaver';

  btn.disabled = true;
  btn.textContent = 'Saving...';
  status.textContent = '';
  status.className = 'status';

  // Save folder preference
  chrome.storage?.local?.set({ folderPath }).catch(() => {});

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  try {
    // First try sending message to content script
    let data;
    try {
      data = await chrome.tabs.sendMessage(tab.id, { action: 'scrape' });
    } catch {
      // Content script not available — inject and scrape as article
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['scrapers/article.js']
      });
      const execResults = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          if (window.__contextSaver_scrapeArticle) {
            const result = window.__contextSaver_scrapeArticle();
            if (result) {
              result.site = 'article';
              result.url = window.location.href;
              result.savedAt = new Date().toISOString();
            }
            return result;
          }
          return null;
        }
      });
      data = execResults?.[0]?.result;
    }

    // Validate scraper response
    const error = validateData(data);
    if (error) {
      status.textContent = error;
      status.className = 'status error';
      btn.disabled = false;
      btn.textContent = 'Save as Markdown';
      return;
    }

    const markdown = buildMarkdown(data);
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const filename = `${folderPath}/${data.site}/${formatDate(data.savedAt)}-${slugify(data.title)}.md`;

    await chrome.downloads.download({
      url,
      filename,
      saveAs: false
    });

    const msgInfo = data.messageCount ? ` (${data.messageCount} messages)` : '';
    status.textContent = `Saved${msgInfo}`;
    status.className = 'status success';
    btn.textContent = 'Saved!';

    setTimeout(() => {
      btn.disabled = false;
      btn.textContent = 'Save as Markdown';
    }, 2000);

  } catch (err) {
    status.textContent = `Error: ${sanitizeError(err.message)}`;
    status.className = 'status error';
    btn.disabled = false;
    btn.textContent = 'Save as Markdown';
  }
});

init();
