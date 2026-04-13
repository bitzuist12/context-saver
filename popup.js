const ALLOWED_SITES = ['chatgpt', 'claude', 'twitter', 'article'];
const MAX_CONTENT_LENGTH = 50_000_000; // 50MB
const DEFAULT_FOLDER_PREFIX = 'ContextSaver';
const SCRAPER_FILES = {
  chatgpt: 'scrapers/chatgpt.js',
  claude: 'scrapers/claude.js',
  twitter: 'scrapers/twitter.js',
  article: 'scrapers/article.js'
};
const SCRAPER_FUNCTIONS = {
  chatgpt: '__contextSaver_scrapeChatGPT',
  claude: '__contextSaver_scrapeClaude',
  twitter: '__contextSaver_scrapeTwitter',
  article: '__contextSaver_scrapeArticle'
};

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

function detectSiteFromUrl(urlString) {
  try {
    const { hostname } = new URL(urlString || '');
    if (/^([a-z0-9-]+\.)?chatgpt\.com$/.test(hostname) || /^([a-z0-9-]+\.)?chat\.openai\.com$/.test(hostname)) return 'chatgpt';
    if (/^([a-z0-9-]+\.)?claude\.ai$/.test(hostname)) return 'claude';
    if (/^([a-z0-9-]+\.)?x\.com$/.test(hostname) || /^([a-z0-9-]+\.)?twitter\.com$/.test(hostname)) return 'twitter';
  } catch {
    // Ignore malformed URLs and fall through to article mode.
  }

  return 'article';
}

function setFolderStatus(message, type = '') {
  const el = document.getElementById('folderStatus');
  if (!el) return;
  el.textContent = message || '';
  el.className = `settings-status${type ? ` ${type}` : ''}`;
}

function normalizeFolderPath(input) {
  const raw = String(input || '').trim();

  if (!raw) {
    return { value: DEFAULT_FOLDER_PREFIX, error: null };
  }

  if (raw.startsWith('/') || raw.startsWith('~/') || /^[a-zA-Z]:[\\/]/.test(raw)) {
    return {
      value: null,
      error: 'Use a folder name like "Hamilton", not an absolute path. To save on Desktop, change Chrome download location.'
    };
  }

  const normalized = raw
    .replace(/\\/g, '/')
    .replace(/\/+/g, '/')
    .replace(/^\/|\/$/g, '');

  if (!normalized || normalized.split('/').some(part => part === '.' || part === '..')) {
    return {
      value: null,
      error: 'Use a relative folder prefix like "ContextSaver" or "KnowledgeBase/Hamilton".'
    };
  }

  return { value: normalized, error: null };
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

async function runScraper(tabId, site) {
  const file = SCRAPER_FILES[site];
  const functionName = SCRAPER_FUNCTIONS[site];

  if (!file || !functionName) {
    return { error: `Unknown site type: ${site}` };
  }

  await chrome.scripting.executeScript({
    target: { tabId },
    files: [file]
  });

  const execResults = await chrome.scripting.executeScript({
    target: { tabId },
    func: (scraperName) => {
      try {
        const scraper = window[scraperName];
        if (typeof scraper !== 'function') {
          return { error: `Scraper function not found: ${scraperName}` };
        }
        return scraper();
      } catch (error) {
        return { error: `Scraper error: ${error.message}` };
      }
    },
    args: [functionName]
  });

  const result = execResults?.[0]?.result;
  return result || null;
}

async function persistFolderPath(rawValue, { showFeedback = false } = {}) {
  const folderInput = document.getElementById('folderPath');
  const result = normalizeFolderPath(rawValue);

  if (result.error) {
    if (showFeedback) {
      setFolderStatus(result.error, 'error');
    }
    return result;
  }

  folderInput.value = result.value;
  await chrome.storage?.local?.set({ folderPath: result.value }).catch(() => {});

  if (showFeedback) {
    setFolderStatus(`Default folder saved: ${result.value}`, 'success');
  } else {
    setFolderStatus('');
  }

  return result;
}

// Detect current site on popup open
async function init() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const pageTitle = document.getElementById('pageTitle');
  const siteType = document.getElementById('siteType');
  const folderInput = document.getElementById('folderPath');

  if (!pageTitle || !siteType) return;

  pageTitle.textContent = tab.title || 'Unknown page';
  const detectedSite = detectSiteFromUrl(tab.url);
  siteType.textContent = siteLabels[detectedSite] || detectedSite;

  // Load saved folder preference
  const stored = await chrome.storage?.local?.get('folderPath').catch(() => null);
  if (stored?.folderPath) {
    folderInput.value = stored.folderPath;
  } else {
    folderInput.value = DEFAULT_FOLDER_PREFIX;
  }

  folderInput.addEventListener('change', async () => {
    await persistFolderPath(folderInput.value, { showFeedback: true });
  });

  folderInput.addEventListener('blur', async () => {
    await persistFolderPath(folderInput.value, { showFeedback: true });
  });

  folderInput.addEventListener('keydown', async (event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    await persistFolderPath(folderInput.value, { showFeedback: true });
  });
}

document.getElementById('saveBtn').addEventListener('click', async () => {
  const btn = document.getElementById('saveBtn');
  const status = document.getElementById('status');
  const folderInput = document.getElementById('folderPath');
  const folderPathResult = await persistFolderPath(folderInput.value, { showFeedback: false });

  if (folderPathResult.error) {
    status.textContent = folderPathResult.error;
    status.className = 'status error';
    return;
  }

  const folderPath = folderPathResult.value;

  btn.disabled = true;
  btn.textContent = 'Saving...';
  status.textContent = '';
  status.className = 'status';

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const site = detectSiteFromUrl(tab.url);

  try {
    const data = await runScraper(tab.id, site);

    if (data && typeof data === 'object' && !data.error) {
      data.site = site;
      data.url = tab.url;
      data.savedAt = new Date().toISOString();
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
