// Modified for RAVENCRY - see NOTICE.md in this directory.
// =============================================================================
// RAVENCRY — Nigeria demo OSINT sources
// -----------------------------------------------------------------------------
// Representative, clearly-flagged sample data used ONLY when RAVENCRY_DEMO=true
// AND the corresponding live Nigeria source returned nothing (no ACLED token /
// no DATABASE_URL in the preview environment).
//
// SINGLE SOURCE OF TRUTH FOR THE LIVE SWAP:
//   - These objects mirror the EXACT raw shape that the real source fetchers
//     write into runs/latest.json under sources['ACLED-Nigeria'], etc.
//   - To go live: set RAVENCRY_DEMO=false (or unset it) and provide
//     ACLED_API_KEY / ACLED_EMAIL + DATABASE_URL. No code changes required —
//     synthesize() will simply read the real source objects instead of these.
//
// See step_crucix.md → "Swapping demo → live" for the full checklist.
// =============================================================================

// Real Nigerian kidnapping / banditry hotspots (state, LGA, approx coords).
// Coordinates are real LGA centroids; event details are illustrative.
const ACLED_NIGERIA = {
  totalEvents: 142,
  totalFatalities: 318,
  kidnappingEvents: 47,
  banditryEvents: 53,
  vacEvents: 29,
  protestEvents: 13,
  dailyTimeline: {
    '2026-03-28': 6, '2026-03-29': 9, '2026-03-30': 11,
    '2026-03-31': 8, '2026-04-01': 14, '2026-04-02': 12, '2026-04-03': 10,
  },
  highRiskStates: {
    Zamfara: 34, Katsina: 28, Kaduna: 22, Niger: 18,
    Sokoto: 14, Borno: 12, Benue: 8, Plateau: 6,
  },
  deadliestEvents: [
    { date: '2026-04-01', type: 'Violence against civilians', subType: 'Attack', state: 'Zamfara', location: 'Anka', fatalities: 41, lat: 12.1110, lon: 5.9230 },
    { date: '2026-03-30', type: 'Battles', subType: 'Armed clash', state: 'Katsina', location: 'Jibia', fatalities: 33, lat: 13.0830, lon: 7.2270 },
    { date: '2026-04-02', type: 'Violence against civilians', subType: 'Abduction', state: 'Kaduna', location: 'Birnin Gwari', fatalities: 27, lat: 11.0440, lon: 6.5470 },
    { date: '2026-03-29', type: 'Violence against civilians', subType: 'Attack', state: 'Niger', location: 'Shiroro', fatalities: 24, lat: 9.9670, lon: 6.8330 },
    { date: '2026-04-03', type: 'Battles', subType: 'Armed clash', state: 'Sokoto', location: 'Sabon Birni', fatalities: 19, lat: 13.5360, lon: 6.2840 },
    { date: '2026-03-31', type: 'Violence against civilians', subType: 'Attack', state: 'Borno', location: 'Gwoza', fatalities: 17, lat: 11.0860, lon: 13.6940 },
    { date: '2026-04-01', type: 'Violence against civilians', subType: 'Abduction', state: 'Benue', location: 'Guma', fatalities: 12, lat: 7.9230, lon: 8.5560 },
    { date: '2026-03-28', type: 'Riots', subType: 'Mob violence', state: 'Plateau', location: 'Bokkos', fatalities: 9, lat: 9.3000, lon: 9.0000 },
  ],
  kidnappingEventsList: [
    { date: '2026-04-03', state: 'Kaduna', location: 'Chikun — Abuja-Kaduna highway', fatalities: 2, lat: 10.4200, lon: 7.3500 },
    { date: '2026-04-03', state: 'Zamfara', location: 'Maradun — village raid', fatalities: 4, lat: 12.5900, lon: 6.2300 },
    { date: '2026-04-02', state: 'Katsina', location: 'Faskari — school abduction', fatalities: 1, lat: 11.7300, lon: 7.0200 },
    { date: '2026-04-02', state: 'Niger', location: 'Munya — farmers seized', fatalities: 0, lat: 9.7300, lon: 6.6300 },
    { date: '2026-04-01', state: 'Kaduna', location: 'Birnin Gwari — convoy ambush', fatalities: 6, lat: 11.0440, lon: 6.5470 },
    { date: '2026-04-01', state: 'Sokoto', location: 'Rabah — mass abduction', fatalities: 3, lat: 13.4500, lon: 6.4900 },
    { date: '2026-03-31', state: 'Zamfara', location: 'Tsafe — travellers taken', fatalities: 2, lat: 11.9400, lon: 6.9300 },
    { date: '2026-03-30', state: 'Benue', location: 'Guma — herder clash abduction', fatalities: 1, lat: 7.9230, lon: 8.5560 },
  ],
  geoPoints: [
    { lat: 12.1110, lon: 5.9230, type: 'Violence against civilians', subType: 'Attack', location: 'Anka, Zamfara', fatalities: 41 },
    { lat: 13.0830, lon: 7.2270, type: 'Battles', subType: 'Armed clash', location: 'Jibia, Katsina', fatalities: 33 },
    { lat: 11.0440, lon: 6.5470, type: 'Kidnapping', subType: 'Abduction', location: 'Birnin Gwari, Kaduna', fatalities: 27 },
    { lat: 9.9670, lon: 6.8330, type: 'Violence against civilians', subType: 'Attack', location: 'Shiroro, Niger', fatalities: 24 },
    { lat: 13.5360, lon: 6.2840, type: 'Battles', subType: 'Armed clash', location: 'Sabon Birni, Sokoto', fatalities: 19 },
    { lat: 11.0860, lon: 13.6940, type: 'Violence against civilians', subType: 'Attack', location: 'Gwoza, Borno', fatalities: 17 },
    { lat: 7.9230, lon: 8.5560, type: 'Kidnapping', subType: 'Abduction', location: 'Guma, Benue', fatalities: 12 },
    { lat: 10.4200, lon: 7.3500, type: 'Kidnapping', subType: 'Abduction', location: 'Chikun, Kaduna', fatalities: 2 },
    { lat: 12.5900, lon: 6.2300, type: 'Kidnapping', subType: 'Abduction', location: 'Maradun, Zamfara', fatalities: 4 },
    { lat: 11.7300, lon: 7.0200, type: 'Kidnapping', subType: 'Abduction', location: 'Faskari, Katsina', fatalities: 1 },
    { lat: 9.7300, lon: 6.6300, type: 'Kidnapping', subType: 'Abduction', location: 'Munya, Niger', fatalities: 0 },
    { lat: 13.4500, lon: 6.4900, type: 'Kidnapping', subType: 'Abduction', location: 'Rabah, Sokoto', fatalities: 3 },
    { lat: 11.9400, lon: 6.9300, type: 'Kidnapping', subType: 'Abduction', location: 'Tsafe, Zamfara', fatalities: 2 },
    { lat: 9.3000, lon: 9.0000, type: 'Riots', subType: 'Mob violence', location: 'Bokkos, Plateau', fatalities: 9 },
  ],
};

const CITIZEN_REPORTS = {
  totalPending: 11,
  flashCount: 3,
  priorityCount: 5,
  routineCount: 3,
  pendingCases: [
    { id: 'RC-2026-0412', name: 'Aisha M.', lga: 'Birnin Gwari', state: 'Kaduna', tier: 'FLASH', lat: 11.0440, lon: 6.5470 },
    { id: 'RC-2026-0411', name: 'Group of 8 students', lga: 'Faskari', state: 'Katsina', tier: 'FLASH', lat: 11.7300, lon: 7.0200 },
    { id: 'RC-2026-0410', name: 'Ibrahim S.', lga: 'Maradun', state: 'Zamfara', tier: 'FLASH', lat: 12.5900, lon: 6.2300 },
    { id: 'RC-2026-0409', name: 'Grace O.', lga: 'Guma', state: 'Benue', tier: 'PRIORITY', lat: 7.9230, lon: 8.5560 },
    { id: 'RC-2026-0408', name: 'Musa A.', lga: 'Shiroro', state: 'Niger', tier: 'PRIORITY', lat: 9.9670, lon: 6.8330 },
    { id: 'RC-2026-0407', name: 'Travellers (3)', lga: 'Chikun', state: 'Kaduna', tier: 'PRIORITY', lat: 10.4200, lon: 7.3500 },
    { id: 'RC-2026-0406', name: 'Fatima B.', lga: 'Rabah', state: 'Sokoto', tier: 'PRIORITY', lat: 13.4500, lon: 6.4900 },
    { id: 'RC-2026-0405', name: 'Emeka N.', lga: 'Sabon Birni', state: 'Sokoto', tier: 'PRIORITY', lat: 13.5360, lon: 6.2840 },
    { id: 'RC-2026-0404', name: 'Hauwa I.', lga: 'Tsafe', state: 'Zamfara', tier: 'ROUTINE', lat: 11.9400, lon: 6.9300 },
    { id: 'RC-2026-0403', name: 'Unnamed (farm workers)', lga: 'Munya', state: 'Niger', tier: 'ROUTINE', lat: 9.7300, lon: 6.6300 },
  ],
};

const NAPTIP_RSS = {
  feedsOk: 2,
  feedsFailed: 0,
  totalArticles: 38,
  matchedArticles: 9,
  flashEvents: [
    { title: 'NAPTIP confirms rescue of 14 trafficked minors in Kano corridor', source: 'NAPTIP', relevanceScore: 0.92 },
    { title: 'Joint task force intercepts abduction-for-ransom syndicate in Kaduna', source: 'NAPTIP', relevanceScore: 0.88 },
  ],
  topMatches: [
    { title: 'NAPTIP confirms rescue of 14 trafficked minors in Kano corridor', source: 'NAPTIP', relevanceScore: 0.92 },
    { title: 'Joint task force intercepts abduction-for-ransom syndicate in Kaduna', source: 'NAPTIP', relevanceScore: 0.88 },
    { title: 'Agency issues advisory on rising school-targeted abductions in NW states', source: 'NAPTIP', relevanceScore: 0.81 },
    { title: 'Cross-border trafficking route via Sokoto flagged for monitoring', source: 'NAPTIP', relevanceScore: 0.74 },
    { title: 'NAPTIP partners state govts on victim reintegration after mass release', source: 'NAPTIP', relevanceScore: 0.69 },
  ],
};

const GDELT_NIGERIA = {
  totalArticles: 64,
  matchedArticles: 21,
  flashEvents: [
    { title: 'Gunmen abduct dozens in fresh Zamfara village raid', domain: 'premiumtimesng.com', relevanceScore: 0.94 },
    { title: 'Kaduna highway attack: travellers seized along Abuja road', domain: 'channelstv.com', relevanceScore: 0.9 },
    { title: 'Schoolchildren taken in Katsina, security forces deployed', domain: 'punchng.com', relevanceScore: 0.87 },
  ],
  topMatches: [
    { title: 'Gunmen abduct dozens in fresh Zamfara village raid', domain: 'premiumtimesng.com', relevanceScore: 0.94 },
    { title: 'Kaduna highway attack: travellers seized along Abuja road', domain: 'channelstv.com', relevanceScore: 0.9 },
    { title: 'Schoolchildren taken in Katsina, security forces deployed', domain: 'punchng.com', relevanceScore: 0.87 },
    { title: 'Military launches operation against bandits in Niger forests', domain: 'dailytrust.com', relevanceScore: 0.79 },
    { title: 'Ransom economy: how kidnapping reshaped rural northwest Nigeria', domain: 'guardian.ng', relevanceScore: 0.72 },
  ],
  geoPoints: [
    { lat: 12.1110, lon: 5.9230, name: 'Zamfara village raid', count: 4 },
    { lat: 10.4200, lon: 7.3500, name: 'Kaduna highway abduction', count: 3 },
    { lat: 11.7300, lon: 7.0200, name: 'Katsina school abduction', count: 3 },
    { lat: 9.9670, lon: 6.8330, name: 'Niger forest operation', count: 2 },
  ],
};

const NIGERIA_NEWS_RSS = {
  feedsOk: 4,
  feedsFailed: 0,
  totalArticles: 96,
  matchedArticles: 18,
  flashEvents: [
    { title: 'Breaking: mass abduction reported in Maradun, Zamfara', source: 'Premium Times', relevanceScore: 0.93 },
    { title: 'Security alert: ambush on Birnin Gwari road leaves several missing', source: 'The Punch', relevanceScore: 0.86 },
  ],
  topMatches: [
    { title: 'Breaking: mass abduction reported in Maradun, Zamfara', source: 'Premium Times', relevanceScore: 0.93 },
    { title: 'Security alert: ambush on Birnin Gwari road leaves several missing', source: 'The Punch', relevanceScore: 0.86 },
    { title: 'Governor orders security review after Katsina school incident', source: 'Channels TV', relevanceScore: 0.8 },
    { title: 'Communities in Sokoto flee as banditry intensifies', source: 'Daily Trust', relevanceScore: 0.75 },
    { title: 'Vigilante groups bolster patrols across Niger State corridors', source: 'Vanguard', relevanceScore: 0.68 },
  ],
};

export function loadNigeriaDemo() {
  // Returned objects use the raw source shape consumed by synthesize().
  // _demo markers let synthesize() flag the data as demo in the UI.
  return {
    'ACLED-Nigeria': { ...ACLED_NIGERIA, _demo: true },
    'Citizen-Reports': { ...CITIZEN_REPORTS, _demo: true },
    'NAPTIP-RSS': { ...NAPTIP_RSS, _demo: true },
    'GDELT-Nigeria': { ...GDELT_NIGERIA, _demo: true },
    'Nigeria-News-RSS': { ...NIGERIA_NEWS_RSS, _demo: true },
  };
}

export default loadNigeriaDemo;
