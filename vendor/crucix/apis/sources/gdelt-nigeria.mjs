// Modified for RAVENCRY - see NOTICE.md in this directory.
// GDELT Nigeria — GDELT API v2 with Nigeria-specific kidnapping/abduction queries
// Targets the GDELT DOC 2.0 API for full-text search across global news
// Focused on Nigeria geography + kidnapping/security event types
// No auth required. Rate limit: 1 request per 5 seconds.

import { safeFetch, ago } from '../utils/fetch.mjs';
import {
  loadKeywords,
  matchesAnyKeyword,
  matchesEscalator,
  matchesDeescalator,
} from '../../config/nigeria-keywords.mjs';

const BASE = 'https://api.gdeltproject.org/api/v2';

// Nigeria-specific kidnapping & security queries
const QUERIES = [
  // Primary: kidnapping/abduction in Nigeria
  'Nigeria AND (kidnap OR abduction OR abducted OR missing OR hostage OR ransom OR bandit OR trafficked)',
  // Secondary: child-specific
  'Nigeria AND (child AND (missing OR abducted OR kidnapped))',
  // Tertiary: school attacks (common kidnapping context in Nigeria)
  'Nigeria AND (school AND (attack OR raid OR kidnap OR abduct))',
];

// Rate limit helper — GDELT requires 5s between requests
function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

/**
 * Search GDELT for a specific query
 */
async function searchGDELT(query, maxRecords = 50) {
  const params = new URLSearchParams({
    query,
    mode: 'ArtList',
    maxrecords: String(maxRecords),
    timespan: '72h',         // Last 3 days for broader coverage
    format: 'json',
    sort: 'DateDesc',
  });
  const url = `${BASE}/doc/doc?${params}`;
  return safeFetch(url, { timeout: 15000 });
}

/**
 * Compact a GDELT article to our format
 */
function compactArticle(a) {
  return {
    title: a.title || '',
    url: a.url || '',
    date: a.seendate || '',
    domain: a.domain || '',
    language: a.language || '',
    country: a.sourcecountry || '',
    tone: a.tone !== undefined ? Number(a.tone) : undefined,
  };
}

/**
 * Score an article for Nigeria kidnapping relevance
 */
function scoreGDELTArticle(article, keywords) {
  const text = `${article.title}`.toLowerCase();
  let score = 0;

  // Keyword matches across all languages
  for (const lang of Object.values(keywords.kidnapping)) {
    for (const kw of lang) {
      if (text.includes(kw.toLowerCase())) score += 3;
    }
  }

  // Escalators
  if (matchesEscalator(text, keywords)) score += 5;

  // De-escalators
  if (matchesDeescalator(text, keywords)) score -= 3;

  // High-risk location mentions
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
  const allArticles = [];
  const queryResults = [];

  // Run queries sequentially to respect GDELT rate limit (1 req / 5s)
  for (const query of QUERIES) {
    try {
      const result = await searchGDELT(query, 50);
      const articles = (result?.articles || []).map(compactArticle);
      queryResults.push({ query, total: articles.length, error: null });
      allArticles.push(...articles);
    } catch (e) {
      queryResults.push({ query, total: 0, error: e.message });
    }
    // Rate limit: wait 5.5s between GDELT requests
    if (QUERIES.indexOf(query) < QUERIES.length - 1) {
      await delay(5500);
    }
  }

  // Deduplicate by title prefix
  const seen = new Set();
  const unique = [];
  for (const article of allArticles) {
    const key = article.title.substring(0, 60).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(article);
  }

  // Score and filter
  const scored = unique
    .map(a => ({ ...a, _score: scoreGDELTArticle(a, keywords) }))
    .filter(a => matchesAnyKeyword(a.title, keywords) || a._score > 2);

  // Sort by score descending, then by date descending
  scored.sort((a, b) => b._score - a._score || new Date(b.date || 0) - new Date(a.date || 0));

  const topMatches = scored.slice(0, 10).map(({ _score, ...a }) => ({
    ...a,
    relevanceScore: _score,
  }));

  // Identify FLASH-level events
  const flashEvents = topMatches.filter(m => m.relevanceScore >= 8);

  // Also get geo event locations for Nigeria
  let nigeriaGeoPoints = [];
  try {
    await delay(5500);
    const geoParams = new URLSearchParams({
      query: 'Nigeria AND (kidnap OR abduction OR conflict OR attack)',
      mode: 'PointData',
      timespan: '72h',
      format: 'GeoJSON',
      maxpoints: '100',
    });
    const geo = await safeFetch(`${BASE}/geo/geo?${geoParams}`, { timeout: 15000 });
    nigeriaGeoPoints = (geo?.features || [])
      .filter(f => f.geometry?.coordinates)
      .map(f => ({
        lat: f.geometry.coordinates[1],
        lon: f.geometry.coordinates[0],
        name: f.properties?.name || f.properties?.html || '',
        count: f.properties?.count || 1,
        type: f.properties?.type || 'event',
      }));
  } catch (e) {
    // Geo endpoint optional — don't break briefing
  }

  return {
    source: 'GDELT Nigeria',
    timestamp: new Date().toISOString(),
    queries: queryResults,
    totalArticles: unique.length,
    matchedArticles: scored.length,
    topMatches,
    flashEvents,
    geoPoints: nigeriaGeoPoints,
    allMatches: scored.slice(0, 25).map(({ _score, ...a }) => ({
      ...a,
      relevanceScore: _score,
    })),
  };
}

// CLI standalone runner
if (process.argv[1]?.endsWith('gdelt-nigeria.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
