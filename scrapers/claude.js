function scrapeClaude() {
  const title = document.title.replace(' - Claude', '').trim() || 'Untitled Conversation';
  const messages = [];

  // Primary: grab all turn containers by data-testid
  const allTurns = document.querySelectorAll('[data-testid="human-turn"], [data-testid="assistant-turn"]');

  if (allTurns.length > 0) {
    allTurns.forEach(turn => {
      const isHuman = turn.getAttribute('data-testid') === 'human-turn';
      const label = isHuman ? 'You' : 'Claude';
      const text = turn.innerText.trim();
      if (text) {
        messages.push(`### ${label}\n\n${text}`);
      }
    });
  } else {
    // Fallback: grab message content divs
    const contentDivs = document.querySelectorAll('.prose, [class*="message-content"]');
    contentDivs.forEach((div, i) => {
      const text = div.innerText.trim();
      if (text) {
        const label = i % 2 === 0 ? 'You' : 'Claude';
        messages.push(`### ${label}\n\n${text}`);
      }
    });
  }

  if (messages.length === 0) {
    const main = document.querySelector('main') || document.querySelector('[class*="conversation"]');
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

window.__contextSaver_scrapeClaude = scrapeClaude;
