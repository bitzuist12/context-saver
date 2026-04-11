function scrapeTwitter() {
  const tweets = [];

  // Twitter/X thread: grab all tweet text elements in the thread
  const tweetEls = document.querySelectorAll('[data-testid="tweetText"]');

  tweetEls.forEach(el => {
    const text = el.innerText.trim();
    if (text) tweets.push(text);
  });

  if (tweets.length === 0) return null;

  // Get the author from the first tweet
  const authorEl = document.querySelector('[data-testid="User-Name"]');
  const author = authorEl ? authorEl.innerText.split('\n')[0].trim() : 'Unknown';

  // Build title from first tweet
  const firstTweet = tweets[0];
  const title = `${author.substring(0, 100)} — ${firstTweet.substring(0, 80)}${firstTweet.length > 80 ? '...' : ''}`;

  const content = tweets.map((t, i) => `**${i + 1}.** ${t}`).join('\n\n');

  return {
    title,
    content: `## Thread by ${author}\n\n${content}`,
    messageCount: tweets.length
  };
}

window.__contextSaver_scrapeTwitter = scrapeTwitter;
