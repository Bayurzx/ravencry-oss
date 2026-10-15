// Modified for RAVENCRY - see NOTICE.md in this directory.
// ACLED Nigeria — Nigeria-scoped ACLED conflict event filter
// Reuses the existing ACLED auth layer (acled.mjs) — same credentials, same session cache
// Filters: country=Nigeria, event_types relevant to kidnapping/banditry/abduction
// ACLED codes banditry and kidnapping-for-ransom under:
//   Violence against civilians → Abduction/forced disappearance
//   Battles → Armed clash (banditry/insurgent activity)
//
// Academic/registered access required: set ACLED_EMAIL + ACLED_PASSWORD in .env

import { getEvents, authenticate, EVENT_TYPES } from './acled.mjs';
import { daysAgo } from '../utils/fetch.mjs';
import '../utils/env.mjs';

// Sub-event types for kidnapping/abduction/banditry in ACLED's ontology
const KIDNAPPING_SUB_TYPES = [
  'Abduction/forced disappearance',
  'Sexual violence',
];

const BANDITRY_SUB_TYPES = [
  'Armed clash',
  'Attack',
  'Looting/property destruction',
];

const PROTEST_SUB_TYPES = [
  'Peaceful protest',
  'Protest with intervention',
  'Excessive force against protesters',
  'Violent demonstration',
  'Mob violence',
];

// Nigeria event types we care about
const RELEVANT_EVENT_TYPES = [
  'Violence against civilians',
  'Battles',
  'Explosions/Remote violence',
  'Riots',
  'Protests',
];

/**
 * Group events by a given field
 */
function groupBy(events, field) {
  const map = {};
  for (const e of events) {
    const key = e[field] || 'Unknown';
    if (!map[key]) map[key] = { count: 0, fatalities: 0 };
    map[key].count += 1;
    map[key].fatalities += parseInt(e.fatalities, 10) || 0;
  }
  return map;
}

/**
 * Briefing — Nigeria-specific ACLED events
 */
export async function briefing() {
  if (!process.env.ACLED_EMAIL || !process.env.ACLED_PASSWORD) {
    return {
      source: 'ACLED Nigeria',
      timestamp: new Date().toISOString(),
      status: 'no_credentials',
      message: 'Set ACLED_EMAIL and ACLED_PASSWORD in .env. Register at https://acleddata.com/user/register',
    };
  }

  const start = daysAgo(7);
  const end = daysAgo(0);

  // Fetch Nigeria events — ACLED API supports country filter natively
  const data = await getEvents({
    country: 'Nigeria',
    eventDateStart: start,
    eventDateEnd: end,
    limit: 1000,
  });

  if (data?.error) {
    return { source: 'ACLED Nigeria', timestamp: new Date().toISOString(), error: data.error };
  }

  let events = (data?.data || []).map(e => ({
    ...e,
    lat: parseFloat(e.latitude) || null,
    lon: parseFloat(e.longitude) || null,
  }));

  const totalFatalities = events.reduce((sum, e) => sum + (parseInt(e.fatalities, 10) || 0), 0);

  // === Kidnapping/abduction events ===
  const kidnappingEvents = events.filter(e =>
    KIDNAPPING_SUB_TYPES.includes(e.sub_event_type)
  );

  // === Banditry/armed clash events ===
  const banditryEvents = events.filter(e =>
    BANDITRY_SUB_TYPES.includes(e.sub_event_type) &&
    e.event_type === 'Battles'
  );

  // === All violence against civilians ===
  const vacEvents = events.filter(e =>
    e.event_type === 'Violence against civilians'
  );

  // === Protest/riot events ===
  const protestEvents = events.filter(e =>
    ['Riots', 'Protests'].includes(e.event_type)
  );

  // === By admin1 (state) ===
  const byState = groupBy(events, 'admin1');

  // === By event type ===
  const byType = groupBy(events, 'event_type');

  // === By sub-event type ===
  const bySubType = groupBy(events, 'sub_event_type');

  // === Deadliest events (top 20) ===
  const deadliestEvents = events
    .filter(e => parseInt(e.fatalities, 10) > 0)
    .sort((a, b) => (parseInt(b.fatalities, 10) || 0) - (parseInt(a.fatalities, 10) || 0))
    .slice(0, 20)
    .map(e => ({
      date: e.event_date,
      type: e.event_type,
      subType: e.sub_event_type,
      state: e.admin1,
      location: e.location,
      fatalities: parseInt(e.fatalities, 10) || 0,
      lat: e.lat,
      lon: e.lon,
      notes: (e.notes || '').slice(0, 200),
    }));

  // === High-risk state ranking (ranked by fatalities) ===
  const highRiskStates = Object.entries(byState)
    .sort((a, b) => b[1].fatalities - a[1].fatalities)
    .slice(0, 10)
    .reduce((obj, [k, v]) => { obj[k] = v; return obj; }, {});

  // === Geo-points for map rendering ===
  const geoPoints = events
    .filter(e => e.lat != null && e.lon != null)
    .slice(0, 200)
    .map(e => ({
      lat: e.lat,
      lon: e.lon,
      type: e.event_type,
      subType: e.sub_event_type,
      location: e.location,
      fatalities: parseInt(e.fatalities, 10) || 0,
      date: e.event_date,
    }));

  // === Daily timeline (last 7 days) ===
  const dailyTimeline = {};
  for (const e of events) {
    const day = e.event_date?.slice(0, 10); // YYYY-MM-DD
    if (!day) continue;
    if (!dailyTimeline[day]) dailyTimeline[day] = { total: 0, fatalities: 0, kidnapping: 0, banditry: 0 };
    dailyTimeline[day].total += 1;
    dailyTimeline[day].fatalities += parseInt(e.fatalities, 10) || 0;
    if (KIDNAPPING_SUB_TYPES.includes(e.sub_event_type)) dailyTimeline[day].kidnapping += 1;
    if (BANDITRY_SUB_TYPES.includes(e.sub_event_type) && e.event_type === 'Battles') dailyTimeline[day].banditry += 1;
  }

  return {
    source: 'ACLED Nigeria',
    timestamp: new Date().toISOString(),
    period: { start, end },
    totalEvents: events.length,
    totalFatalities,
    kidnappingEvents: kidnappingEvents.length,
    banditryEvents: banditryEvents.length,
    vacEvents: vacEvents.length,
    protestEvents: protestEvents.length,
    byState,
    byType,
    bySubType,
    highRiskStates,
    deadliestEvents,
    kidnappingEventsList: kidnappingEvents.slice(0, 15).map(e => ({
      date: e.event_date,
      state: e.admin1,
      location: e.location,
      fatalities: parseInt(e.fatalities, 10) || 0,
      lat: e.lat,
      lon: e.lon,
      notes: (e.notes || '').slice(0, 200),
    })),
    banditryEventsList: banditryEvents.slice(0, 15).map(e => ({
      date: e.event_date,
      state: e.admin1,
      location: e.location,
      fatalities: parseInt(e.fatalities, 10) || 0,
      lat: e.lat,
      lon: e.lon,
      notes: (e.notes || '').slice(0, 200),
    })),
    geoPoints,
    dailyTimeline,
  };
}

// CLI standalone runner
if (process.argv[1]?.endsWith('acled-nigeria.mjs')) {
  const data = await briefing();
  console.log(JSON.stringify(data, null, 2));
}
