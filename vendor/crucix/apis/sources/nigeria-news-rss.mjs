// Modified for RAVENCRY - see NOTICE.md in this directory.
// Nigeria News RSS — 5 major Nigerian news RSS feeds in parallel
// Filters headlines by Nigeria kidnapping keywords (EN/HA/YO/IG/Pidgin)
// Sources: Punch, Vanguard, Guardian Nigeria, Daily Trust, Premium Times

import { fetchRSSFeed } from '../utils/rss.mjs';
import {
  loadKeywords,
  matchesAnyKeyword,
  matchesEscalator,
  matchesDeescalator,
} from '../../config/nigeria-keywords.mjs';

// 5 major Nigerian news RSS feeds
const FEEDS = [
  ['https://punchng.com/feed/', 'Punch Nigeria'],
  ['https://www.vanguardngr.com/feed/', 'Vanguard Nigeria'],
  ['https://guardian.ng/feed/', 'Guardian Nigeria'],
  ['https://dailytrust.com/feed/', 'Daily Trust'],
  ['https://www.premiumtimesng.com/feed/', 'Premium Times'],
];

/**
 * Fetch all 5 feeds in parallel
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

  // Escalators boost priority
  if (matchesEscalator(text, keywords)) score += 5;

  // De-escalators reduce
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

  // Score and filter — only articles matching any kidnapping keyword OR strong location+escalator signal
  const scored = unique
    .map(item => ({ ...item, _score: scoreArticle(item, keywords) }))
    .filter(item => matchesAnyKeyword(item.title + ' ' + item.description, keywords) || item._score > 3);

  // Sort by score descending
  scored.sort((a, b) => b._score - a._score);

  // Top 15 matches (clean output)
  const topMatches = scored.slice(0, 15).map(({ _score, ...item }) => ({
    ...item,
    relevanceScore: _score,
  }));

  // FLASH-level events
  const flashEvents = topMatches.filter(m => m.relevanceScore >= 8);

  // Category breakdowns
  const bySource = {};
  for (const item of topMatches) {
    bySource[item.source] = (bySource[item.source] || 0) + 1;
  }

  return {
    source: 'Nigeria News RSS (5 sources)',
    timestamp: new Date().toISOString(),
    feedsQueried: FEEDS.length,
    feedsOk: Object.values(feedStatuses).filter(f => f.ok).length,
    feedsFailed: Object.values(feedStatuses).filter(f => !f.ok).length,
    feedStatuses,
    totalArticles: unique.length,
    matchedArticles: scored.length,
    topMatches,
    flashEvents,
    bySource,
    allMatches: scored.slice(0, 30).map(({ _score, ...item }) => ({
      ...item,
      relevanceScore: _score,
    })),
  };
}

// CLI standalone runner
if (process.argv[1]?.endsWith('nigeria-news-rss.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
