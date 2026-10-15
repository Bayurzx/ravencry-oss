// NAPTIP RSS — Nigeria anti-trafficking & kidnapping OSINT feed aggregator
// Polls multiple RSS sources for Nigeria kidnapping/trafficking news
// Filters by Nigeria keywords (English, Hausa, Yoruba, Igbo, Pidgin)
// NAPTIP = National Agency for the Prohibition of Trafficking in Persons

import { fetchRSSFeed } from '../utils/rss.mjs';
import {
  loadKeywords,
  matchesAnyKeyword,
  matchesEscalator,
  matchesDeescalator,
} from '../../config/nigeria-keywords.mjs';

// Primary NAPTIP-aligned feeds covering Nigeria kidnapping & trafficking
const FEEDS = [
  // NAPTIP official (if RSS available — falls back gracefully)
  ['https://www.naptip.gov.ng/feed/', 'NAPTIP Official'],
  // Premium Times — Nigeria's leading investigative outlet, heavy on kidnapping coverage
  ['https://www.premiumtimesng.com/feed/', 'Premium Times'],
  // Daily Trust — Northern Nigeria coverage (Zamfara, Kaduna, Katsina, Borno)
  ['https://dailytrust.com/feed/', 'Daily Trust'],
  // The Cable — Nigeria security & crime desk
  ['https://www.thecable.ng/feed/', 'The Cable'],
  // HumAngle — General feed as baseline
  ['https://humanglemedia.com/feed/', 'HumAngle'],
  // HumAngle tag-specific feeds (targeted kidnapping/banditry coverage)
  ['https://humanglemedia.com/tag/kidnapping/feed/', 'HumAngle · Kidnapping'],
  ['https://humanglemedia.com/tag/banditry/feed/', 'HumAngle · Banditry'],
  ['https://humanglemedia.com/tag/insurgency/feed/', 'HumAngle · Insurgency'],
  ['https://humanglemedia.com/tag/abduction/feed/', 'HumAngle · Abduction'],
  ['https://humanglemedia.com/tag/boko-haram/feed/', 'HumAngle · Boko Haram'],
];

/**
 * Fetch all NAPTIP-aligned RSS feeds in parallel
 */
async function fetchAllFeeds() {
  const results = await Promise.allSettled(
    FEEDS.map(([url, name]) => fetchRSSFeed(url, name))
  );
  const allItems = [];
  const feedStatuses = {};
  for (let i = 0; i < FEEDS.length; i++) {
    const [url, name] = FEEDS[i];
    const result = results[i];
    if (result.status === 'fulfilled') {
      allItems.push(...result.value);
      feedStatuses[name] = { ok: true, count: result.value.length };
    } else {
      feedStatuses[name] = { ok: false, error: result.reason?.message || 'Unknown error' };
    }
  }
  return { allItems, feedStatuses };
}

/**
 * Score an article by keyword relevance
 */
function scoreArticle(article, keywords) {
  const text = `${article.title} ${article.description}`.toLowerCase();
  let score = 0;

  // Keyword matches across all languages
  for (const lang of Object.values(keywords.kidnapping)) {
    for (const kw of lang) {
      if (text.includes(kw.toLowerCase())) score += 3;
    }
  }

  // Escalators (child, school, etc.) boost priority
  if (matchesEscalator(text, keywords)) score += 5;

  // De-escalators reduce priority
  if (matchesDeescalator(text, keywords)) score -= 3;

  // High-risk LGA mentions
  for (const lga of keywords.locations.high_risk_lgas) {
    if (text.includes(lga.toLowerCase())) score += 2;
  }

  return score;
}

/**
 * Briefing — main entry point called by Crucix orchestrator
 */
export async function briefing() {
  const keywords = loadKeywords();
  const { allItems, feedStatuses } = await fetchAllFeeds();

  // Deduplicate by title prefix
  const seen = new Set();
  const unique = [];
  for (const item of allItems) {
    const key = item.title.substring(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }

  // Score and filter — only keep articles matching any kidnapping keyword
  const scored = unique
    .map(item => ({ ...item, _score: scoreArticle(item, keywords) }))
    .filter(item => matchesAnyKeyword(item.title + ' ' + item.description, keywords) || item._score > 2);

  // Sort by score descending
  scored.sort((a, b) => b._score - a._score);

  // Extract top matches
  const topMatches = scored.slice(0, 10).map(({ _score, ...item }) => ({
    ...item,
    relevanceScore: _score,
  }));

  // Identify FLASH-level events (high score + escalators)
  const flashEvents = topMatches.filter(m => m.relevanceScore >= 8);

  return {
    source: 'NAPTIP RSS (Nigeria anti-trafficking OSINT)',
    timestamp: new Date().toISOString(),
    feedsQueried: FEEDS.length,
    feedsOk: Object.values(feedStatuses).filter(f => f.ok).length,
    feedsFailed: Object.values(feedStatuses).filter(f => !f.ok).length,
    feedStatuses,
    totalArticles: unique.length,
    matchedArticles: scored.length,
    topMatches,
    flashEvents,
    allMatches: scored.slice(0, 30).map(({ _score, ...item }) => ({
      ...item,
      relevanceScore: _score,
    })),
  };
}

// CLI standalone runner
if (process.argv[1]?.endsWith('naptip-rss.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
