// Modified for RAVENCRY - see NOTICE.md in this directory.
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
let _keywords = null;

export function loadKeywords() {
  if (!_keywords) {
    _keywords = JSON.parse(readFileSync(join(__dirname, 'nigeria-keywords.json'), 'utf-8'));
  }
  return _keywords;
}

export function matchesAnyKeyword(text, keywords) {
  const lower = text.toLowerCase();
  return Object.values(keywords.kidnapping)
    .flat()
    .some(kw => lower.includes(kw.toLowerCase()));
}

export function matchesEscalator(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.severity_escalators.some(kw => lower.includes(kw.toLowerCase()));
}

export function matchesDeescalator(text, keywords) {
  const lower = text.toLowerCase();
  return keywords.deescalators.some(kw => lower.includes(kw.toLowerCase()));
}
