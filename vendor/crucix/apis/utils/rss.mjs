// Shared RSS feed parser for Crucix source modules
// Handles RSS 2.0 XML parsing, CDATA sections, and date parsing

import { safeFetch } from './fetch.mjs';

/**
 * Parse an RSS 2.0 XML string into structured items
 * @param {string} xml - Raw RSS XML
 * @param {string} sourceName - Human-readable source name
 * @returns {Array<{title: string, url: string|null, date: string, description: string, source: string}>}
 */
export function parseRSSItems(xml, sourceName) {
  const items = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  let match;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    const title = extractCDATA(block, 'title');
    const link = extractLink(block);
    const pubDate = extractTag(block, 'pubDate');
    const description = extractCDATA(block, 'description');

    if (title && title !== sourceName) {
      items.push({
        title: title.trim(),
        url: sanitizeUrl(link?.trim()),
        date: pubDate?.trim() || '',
        description: (description || '').trim().substring(0, 300),
        source: sourceName,
      });
    }
  }
  return items;
}

/**
 * Fetch and parse an RSS feed URL
 * @param {string} url - RSS feed URL
 * @param {string} sourceName - Human-readable source name
 * @returns {Promise<Array>} Parsed RSS items
 */
export async function fetchRSSFeed(url, sourceName) {
  try {
    const result = await safeFetch(url, { timeout: 12000 });
    if (result?.error) {
      console.error(`[Ravencry] RSS fetch error (${sourceName}): ${result.error}`);
      return [];
    }
    const xml = result?.rawText || (typeof result === 'string' ? result : JSON.stringify(result));
    if (!xml || xml.length < 50) return [];
    return parseRSSItems(xml, sourceName);
  } catch (e) {
    console.error(`[Ravencry] RSS fetch failed (${sourceName}): ${e.message}`);
    return [];
  }
}

// --- Internal helpers ---

function extractCDATA(block, tag) {
  // Try CDATA first
  const cdataRegex = new RegExp(`<${tag}>(?:<!\\[CDATA\\[)?(.*?)(?:\\]\\]>)?<\\/${tag}>`, 'is');
  const match = block.match(cdataRegex);
  if (match) return decodeEntities(match[1]);
  // Try without CDATA
  const plainRegex = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'is');
  const plainMatch = block.match(plainRegex);
  return plainMatch ? decodeEntities(plainMatch[1]) : '';
}

function extractTag(block, tag) {
  const regex = new RegExp(`<${tag}[^>]*>(.*?)<\\/${tag}>`, 'is');
  return block.match(regex)?.[1] || '';
}

function extractLink(block) {
  // Try <link> with CDATA
  let link = extractCDATA(block, 'link');
  if (link) return link;
  // Some feeds use <guid> as permalink
  const guid = extractCDATA(block, 'guid');
  if (guid && (guid.startsWith('http://') || guid.startsWith('https://'))) return guid;
  return '';
}

function sanitizeUrl(raw) {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

function decodeEntities(str) {
  return str
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));
}
