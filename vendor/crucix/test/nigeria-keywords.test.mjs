// Modified for RAVENCRY - see NOTICE.md in this directory.
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadKeywords,
  matchesAnyKeyword,
  matchesEscalator,
  matchesDeescalator
} from '../config/nigeria-keywords.mjs';

describe('Nigeria Keywords', () => {
  it('should load keywords successfully', () => {
    const keywords = loadKeywords();
    assert.ok(keywords);
    assert.ok(keywords.kidnapping);
    assert.ok(keywords.locations);
    assert.ok(keywords.severity_escalators);
    assert.ok(keywords.deescalators);
  });

  it('should return array of Hausa kidnapping terms in loadKeywords().kidnapping.hausa', () => {
    const keywords = loadKeywords();
    const hausaTerms = keywords.kidnapping.hausa;
    assert.ok(Array.isArray(hausaTerms));
    assert.ok(hausaTerms.includes('an sace'));
    assert.ok(hausaTerms.includes('an yi garkuwa'));
  });

  it('should return array of English kidnapping terms in loadKeywords().kidnapping.english', () => {
    const keywords = loadKeywords();
    const englishTerms = keywords.kidnapping.english;
    assert.ok(Array.isArray(englishTerms));
    assert.ok(englishTerms.includes('kidnap'));
    assert.ok(englishTerms.includes('ransom'));
  });

  it('should match English terms using matchesAnyKeyword', () => {
    const keywords = loadKeywords();
    const englishText = 'A person was kidnapped yesterday near the border';
    assert.equal(matchesAnyKeyword(englishText, keywords), true);

    const nonMatchingText = 'We went to the market to buy some groceries';
    assert.equal(matchesAnyKeyword(nonMatchingText, keywords), false);
  });

  it('should match Hausa terms using matchesAnyKeyword', () => {
    const keywords = loadKeywords();
    const hausaText = 'Sun ce an sace yara biyu a garin';
    assert.equal(matchesAnyKeyword(hausaText, keywords), true);
  });

  it('should match Yoruba, Igbo, and Pidgin terms using matchesAnyKeyword', () => {
    const keywords = loadKeywords();
    const pidginText = 'dem don carry my brother';
    assert.equal(matchesAnyKeyword(pidginText, keywords), true);

    const yorubaText = 'eniyan sonu ni Lagos';
    assert.equal(matchesAnyKeyword(yorubaText, keywords), true);

    const igboText = 'toro onye ozo nso';
    assert.equal(matchesAnyKeyword(igboText, keywords), true);
  });

  it('should match escalator keywords', () => {
    const keywords = loadKeywords();
    assert.equal(matchesEscalator('Three schoolchildren were affected', keywords), true);
    assert.equal(matchesEscalator('A normal incident occurred', keywords), false);
  });

  it('should match deescalator keywords', () => {
    const keywords = loadKeywords();
    assert.equal(matchesDeescalator('The hostages were rescued safely', keywords), true);
    assert.equal(matchesDeescalator('Search is ongoing', keywords), false);
  });
});
