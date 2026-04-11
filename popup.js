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
  // If the string contains characters that could break YAML, quote and escape it
  if (/[\n\r"\\:#{}\[\],&*?|>!%@`]/.test(str) || str.startsWith(' ') || str.endsWith(' ')) {
    return '"' + str.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n') + '"';
  }
  return '"' + str + '"';
}

function buildMarkdown(data) {
  const lines = [
    '---',
    `title: ${yamlSafe(data.title)}`,
    `source: ${data.site}`,
    `url: ${yamlSafe(data.url)}`,
    `saved_at: ${data.savedAt}`,
    `messages: ${data.messageCount || 0}`,
    '---',
    '',
    `# ${data.title}`,
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
      const results = await chrome.scripting.executeScript({
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

    if (!data || data.error || !data.content) {
      status.textContent = data?.error || 'Nothing to save on this page';
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
    status.textContent = `Error: ${err.message}`;
    status.className = 'status error';
    btn.disabled = false;
    btn.textContent = 'Save as Markdown';
  }
});

init();
