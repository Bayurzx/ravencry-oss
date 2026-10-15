// Shared Tier Constants — FLASH / PRIORITY / ROUTINE
// Used by: briefing orchestrator, Telegram alerter, Discord alerter, n8n webhook, dashboard inject
//
// FLASH:    Immediate action required — child abduction, mass kidnapping, active bandit attack
// PRIORITY: Important signal cluster — armed clash with casualties, confirmed kidnapping, protest escalation
// ROUTINE:  Noteworthy change — general security incident, minor protest, historical reference

export const TIER = {
  FLASH: 'FLASH',
  PRIORITY: 'PRIORITY',
  ROUTINE: 'ROUTINE',
};

export const TIER_EMOJI = {
  FLASH: '🔴',
  PRIORITY: '🟡',
  ROUTINE: '🔵',
};

export const TIER_LABEL = {
  FLASH: 'FLASH',
  PRIORITY: 'PRIORITY',
  ROUTINE: 'ROUTINE',
};

// Cooldown between alerts of the same tier (milliseconds)
export const TIER_COOLDOWN_MS = {
  FLASH: 5 * 60 * 1000,     // 5 min — FLASH alerts break through quickly
  PRIORITY: 30 * 60 * 1000, // 30 min
  ROUTINE: 60 * 60 * 1000,  // 60 min
};

// Maximum alerts per hour per tier
export const TIER_MAX_PER_HOUR = {
  FLASH: 6,
  PRIORITY: 4,
  ROUTINE: 2,
};

/**
 * Map a Nigeria source relevance score to a RAVENCRY tier.
 * Scores come from keyword matching in source modules.
 * Thresholds tuned for Nigeria kidnapping context.
 */
export function mapRelevanceToTier(score) {
  if (score >= 8) return TIER.FLASH;
  if (score >= 4) return TIER.PRIORITY;
  return TIER.ROUTINE;
}

/**
 * Determine if a Nigeria event qualifies as FLASH based on risk factors.
 * Used by the n8n webhook emitter to decide whether to trigger downstream workflows.
 */
export function isFlashEvent(eventData) {
  // Explicit tier field
  if (eventData.tier === TIER.FLASH) return true;

  // High relevance score
  if (eventData.relevanceScore >= 8) return true;

  // Flash events array present and non-empty
  if (Array.isArray(eventData.flashEvents) && eventData.flashEvents.length > 0) return true;

  return false;
}

/**
 * Aggregate all FLASH-worthy events from Nigeria sources in the sweep data.
 * Returns an array of { source, events: [...] } for sources that have FLASH events.
 */
export function collectFlashEvents(sweepData) {
  const sources = sweepData?.sources || {};
  const flashBySource = [];

  const nigeriaSources = ['NAPTIP-RSS', 'GDELT-Nigeria', 'Nigeria-News-RSS', 'ACLED-Nigeria'];
  for (const sourceName of nigeriaSources) {
    const sourceData = sources[sourceName];
    if (!sourceData || sourceData.error) continue;

    const events = [];

    // Direct flashEvents array (naptip-rss, gdelt-nigeria, nigeria-news-rss)
    if (Array.isArray(sourceData.flashEvents) && sourceData.flashEvents.length > 0) {
      events.push(...sourceData.flashEvents);
    }

    // ACLED Nigeria: kidnappingEventsList are FLASH-level by definition
    if (sourceName === 'ACLED-Nigeria') {
      if (Array.isArray(sourceData.kidnappingEventsList) && sourceData.kidnappingEventsList.length > 0) {
        events.push(...sourceData.kidnappingEventsList.map(e => ({
          ...e,
          _source: 'ACLED-Nigeria',
          _type: 'kidnapping',
        })));
      }
      // Banditry events with fatalities >= 3 are FLASH
      if (Array.isArray(sourceData.banditryEventsList)) {
        const highCasualty = sourceData.banditryEventsList.filter(e => (e.fatalities || 0) >= 3);
        events.push(...highCasualty.map(e => ({
          ...e,
          _source: 'ACLED-Nigeria',
          _type: 'banditry-high-casualty',
        })));
      }
    }

    // Top matches with FLASH-level scores
    if (Array.isArray(sourceData.topMatches)) {
      const flashMatches = sourceData.topMatches.filter(m => m.relevanceScore >= 8);
      for (const m of flashMatches) {
        // Avoid duplicates with flashEvents
        const isDuplicate = events.some(e =>
          e.title === m.title || (e.date && m.date && e.date === m.date && e.location === m.state)
        );
        if (!isDuplicate) {
          events.push({ ...m, _source: sourceName, _type: 'high-score-match' });
        }
      }
    }

    if (events.length > 0) {
      flashBySource.push({ source: sourceName, count: events.length, events });
    }
  }

  return flashBySource;
}
