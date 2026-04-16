function scrapeChatGPT() {
  const title = document.title.replace(' | ChatGPT', '').replace(' - ChatGPT', '').trim() || 'Untitled Conversation';
  const messages = [];

  // ChatGPT uses content-visibility: auto on sections, which causes innerText to return
  // empty for off-screen messages. Temporarily force visibility to fix this.
  const sections = document.querySelectorAll('section');
  sections.forEach(s => { s.style.contentVisibility = 'visible'; });

  // ChatGPT renders conversation in article elements or divs with data-message-author-role
  const messageEls = document.querySelectorAll('[data-message-author-role]');

  if (messageEls.length > 0) {
    messageEls.forEach(el => {
      const role = el.getAttribute('data-message-author-role');
      const text = el.innerText.trim();
      if (text) {
        const label = role === 'user' ? 'You' : 'ChatGPT';
        let content = text;

        // Collect citation URLs (filter by hostname to avoid matching utm_source=chatgpt.com)
        if (role === 'assistant') {
          const links = Array.from(el.querySelectorAll('a[href]')).filter(a => {
            try { return new URL(a.href).hostname !== 'chatgpt.com'; } catch { return false; }
          });
          const uniqueUrls = [...new Set(links.map(a => {
            // Strip utm_source tracking param
            try {
              const u = new URL(a.href);
              u.searchParams.delete('utm_source');
              return u.toString();
            } catch { return a.href; }
          }))];
          if (uniqueUrls.length > 0) {
            content += '\n\n**Sources:**\n' + uniqueUrls.map(u => `- ${u}`).join('\n');
          }
        }

        messages.push(`### ${label}\n\n${content}`);
      }
    });
  } else {
    // Fallback: grab all turn containers
    const turns = document.querySelectorAll('[class*="agent-turn"], [class*="user-turn"], .text-message');
    turns.forEach(turn => {
      const text = turn.innerText.trim();
      if (text) messages.push(text);
    });
  }

  // Restore original content-visibility
  sections.forEach(s => { s.style.contentVisibility = ''; });

  if (messages.length === 0) {
    // Last resort: grab main content area
    const main = document.querySelector('main');
    if (main) {
      return { title, content: main.innerText.trim(), messageCount: 0 };
    }
    return null;
  }

  return {
    title,
    content: messages.join('\n\n---\n\n'),
    messageCount: messages.length
  };
}

window.__contextSaver_scrapeChatGPT = scrapeChatGPT;
