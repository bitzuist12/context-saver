function scrapeChatGPT() {
  const title = document.title.replace(' | ChatGPT', '').replace(' - ChatGPT', '').trim() || 'Untitled Conversation';
  const messages = [];

  // ChatGPT renders conversation in article elements or divs with data-message-author-role
  const messageEls = document.querySelectorAll('[data-message-author-role]');

  if (messageEls.length > 0) {
    messageEls.forEach(el => {
      const role = el.getAttribute('data-message-author-role');
      const text = el.innerText.trim();
      if (text) {
        const label = role === 'user' ? 'You' : 'ChatGPT';
        messages.push(`### ${label}\n\n${text}`);
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
