#!/usr/bin/env node

// Crucix Master Orchestrator — runs all intelligence sources in parallel
// Outputs structured JSON for Claude to synthesize into actionable briefing

import './utils/env.mjs'; // Load API keys from .env
import { pathToFileURL } from 'node:url';

// === Tier 1: Core OSINT & Geopolitical ===
import { briefing as gdelt } from './sources/gdelt.mjs';
import { briefing as opensky } from './sources/opensky.mjs';
import { briefing as firms } from './sources/firms.mjs';
import { briefing as ships } from './sources/ships.mjs';
import { briefing as safecast } from './sources/safecast.mjs';
import { briefing as acled } from './sources/acled.mjs';
import { briefing as reliefweb } from './sources/reliefweb.mjs';
import { briefing as who } from './sources/who.mjs';
import { briefing as ofac } from './sources/ofac.mjs';
import { briefing as opensanctions } from './sources/opensanctions.mjs';
import { briefing as adsb } from './sources/adsb.mjs';

// === Tier 2: Economic & Financial ===
import { briefing as fred } from './sources/fred.mjs';
import { briefing as treasury } from './sources/treasury.mjs';
import { briefing as bls } from './sources/bls.mjs';
import { briefing as eia } from './sources/eia.mjs';
import { briefing as gscpi } from './sources/gscpi.mjs';
import { briefing as usaspending } from './sources/usaspending.mjs';
import { briefing as comtrade } from './sources/comtrade.mjs';

// === Tier 3: Weather, Environment, Technology, Social ===
import { briefing as noaa } from './sources/noaa.mjs';
import { briefing as epa } from './sources/epa.mjs';
import { briefing as patents } from './sources/patents.mjs';
import { briefing as bluesky } from './sources/bluesky.mjs';
import { briefing as reddit } from './sources/reddit.mjs';
import { briefing as telegram } from './sources/telegram.mjs';
import { briefing as kiwisdr } from './sources/kiwisdr.mjs';

// === Tier 4: Space & Satellites ===
import { briefing as space } from './sources/space.mjs';

// === Tier 5: Live Market Data ===
import { briefing as yfinance } from './sources/yfinance.mjs';

// === Tier 6: Cyber & Infrastructure ===
import { briefing as cisaKev } from './sources/cisa-kev.mjs';
import { briefing as cloudflareRadar } from './sources/cloudflare-radar.mjs';

// === Tier 7: Nigeria OSINT (RAVENCRY) ===
import { briefing as naptipRss } from './sources/naptip-rss.mjs';
import { briefing as gdeltNigeria } from './sources/gdelt-nigeria.mjs';
import { briefing as nigeriaNewsRss } from './sources/nigeria-news-rss.mjs';
import { briefing as citizenReports } from './sources/citizen-reports.mjs';
import { briefing as acledNigeria } from './sources/acled-nigeria.mjs';

const SOURCE_TIMEOUT_MS = 30_000; // 30s max per individual source

export async function runSource(name, fn, ...args) {
  const start = Date.now();
  let timer;
  try {
    const dataPromise = fn(...args);
    const timeoutPromise = new Promise((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Source ${name} timed out after ${SOURCE_TIMEOUT_MS / 1000}s`)), SOURCE_TIMEOUT_MS);
    });
    const data = await Promise.race([dataPromise, timeoutPromise]);
    return { name, status: 'ok', durationMs: Date.now() - start, data };
  } catch (e) {
    return { name, status: 'error', durationMs: Date.now() - start, error: e.message };
  } finally {
    clearTimeout(timer);
  }
}

export async function fullBriefing() {
  const start = Date.now();

  const allPromises = [
    // ═══════════════════════════════════════════════════════════════
    // Tier 1: Core OSINT & Geopolitical
    // ═══════════════════════════════════════════════════════════════
    // 🟡 KEEP · [📡 RSS] global news NLP — finds Nigeria stories in int'l media
    // ⚠️⚠️⚠️  MTN-blocks ~19 int'l RSS feeds (BBC, NYT, DW, etc.) — expect timeouts
    runSource('GDELT', gdelt),
    // 🔴 KILL · [🌐 API] aviation tracking — irrelevant to kidnapping
    runSource('OpenSky', opensky),
    // 🟢 KEEP · [🌐 API] NASA fire/thermal anomalies — bandit raids burn villages, early attack signal
    runSource('FIRMS', firms),
    // 🔴 KILL · [🌐 API] maritime shipping — irrelevant
    runSource('Maritime', ships),
    // 🔴 KILL · [🌐 API] radiation monitoring — irrelevant
    runSource('Safecast', safecast),
    // 🟡 KEEP · [🌐 API] global armed conflict data — useful for cross-reference but ACLED-Nigeria already covers us
    runSource('ACLED', acled),
    // 🔴 KILL · [🌐 API] humanitarian disasters — not our domain
    runSource('ReliefWeb', reliefweb),
    // 🔴 KILL · [🌐 API] WHO disease outbreaks — irrelevant
    runSource('WHO', who),
    // 🔴 KILL · [🌐 API] US sanctions list — irrelevant
    runSource('OFAC', ofac),
    // 🔴 KILL · [🌐 API] sanctions/PEPS database — irrelevant
    runSource('OpenSanctions', opensanctions),
    // 🔴 KILL · [🌐 API] aircraft ADS-B tracking — irrelevant
    runSource('ADS-B', adsb),

    // ═══════════════════════════════════════════════════════════════
    // Tier 2: Economic & Financial
    // ═══════════════════════════════════════════════════════════════
    // 🔴 KILL · US Federal Reserve economic data — irrelevant
    runSource('FRED', fred, process.env.FRED_API_KEY),
    // 🔴 KILL · US Treasury yields — irrelevant
    runSource('Treasury', treasury),
    // 🔴 KILL · US Bureau of Labor Statistics — irrelevant
    runSource('BLS', bls, process.env.BLS_API_KEY),
    // 🔴 KILL · US Energy Information Administration — irrelevant
    runSource('EIA', eia, process.env.EIA_API_KEY),
    // 🔴 KILL · global supply chain pressure index — irrelevant
    runSource('GSCPI', gscpi),
    // 🔴 KILL · US government spending — irrelevant
    runSource('USAspending', usaspending),
    // 🔴 KILL · UN trade statistics — irrelevant
    runSource('Comtrade', comtrade),

    // ═══════════════════════════════════════════════════════════════
    // Tier 3: Weather, Environment, Technology, Social
    // ═══════════════════════════════════════════════════════════════
    // 🔴 KILL · NOAA weather — irrelevant
    runSource('NOAA', noaa),
    // 🔴 KILL · EPA environmental data — irrelevant
    runSource('EPA', epa),
    // 🔴 KILL · patent filings — irrelevant
    runSource('Patents', patents),
    // 🔴 KILL · Bluesky social media — irrelevant
    runSource('Bluesky', bluesky),
    // 🔴 KILL · Reddit — irrelevant
    runSource('Reddit', reddit),
    // 🔴 KILL · Telegram channels — irrelevant
    runSource('Telegram', telegram),
    // 🔴 KILL · software-defined radio networks — irrelevant
    runSource('KiwiSDR', kiwisdr),

    // ═══════════════════════════════════════════════════════════════
    // Tier 4: Space & Satellites
    // ═══════════════════════════════════════════════════════════════
    // 🔴 KILL · satellite/space tracking — irrelevant
    runSource('Space', space),

    // ═══════════════════════════════════════════════════════════════
    // Tier 5: Live Market Data
    // ═══════════════════════════════════════════════════════════════
    // 🔴 KILL · stock market data — irrelevant
    runSource('YFinance', yfinance),

    // ═══════════════════════════════════════════════════════════════
    // Tier 6: Cyber & Infrastructure
    // ═══════════════════════════════════════════════════════════════
    // 🔴 KILL · US CISA known exploited vulnerabilities — irrelevant
    runSource('CISA-KEV', cisaKev),
    // 🟡 KILL · internet outages/traffic — might flag region-wide comms blackouts during attacks
    runSource('Cloudflare-Radar', cloudflareRadar),

    // ═══════════════════════════════════════════════════════════════
    // Tier 7: Nigeria OSINT (RAVENCRY) — NEVER KILL THESE
    // ═══════════════════════════════════════════════════════════════
    // 🟣 CRITICAL · [📡 RSS] NAPTIP + HumAngle + security RSS feeds (10 feeds, kidnapping/banditry tags)
    runSource('NAPTIP-RSS', naptipRss),
    // 🟣 CRITICAL · [🌐 API] GDELT filtered to Nigeria kidnapping queries (3 queries, 72h window, geolocated)
    runSource('GDELT-Nigeria', gdeltNigeria),
    // 🟣 CRITICAL · [📡 RSS] Punch/Vanguard/Guardian/Daily Trust/Premium Times RSS (5 feeds, keyword filtered)
    runSource('Nigeria-News-RSS', nigeriaNewsRss),
    // 🟣 CRITICAL · [🗄️  DB] Aurora pending_sweep citizen reports (API gateway → direct pg fallback)
    runSource('Citizen-Reports', citizenReports),
    // 🟣 CRITICAL · [🌐 API] ACLED Nigeria coded conflict events (abduction/banditry/VAC, geocoded, fatality counts)
    runSource('ACLED-Nigeria', acledNigeria),
  ];

  console.error(`[Ravencry] Starting intelligence sweep — ${allPromises.length} sources...`);
  // Each runSource has its own 30s timeout, so allSettled will resolve
  // within ~30s even if APIs hang. Global timeout is a safety net.
  const results = await Promise.allSettled(allPromises);

  const sources = results.map(r => r.status === 'fulfilled' ? r.value : { status: 'failed', error: r.reason?.message });
  const totalMs = Date.now() - start;

  const output = {
    crucix: {
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      totalDurationMs: totalMs,
      sourcesQueried: sources.length,
      sourcesOk: sources.filter(s => s.status === 'ok').length,
      sourcesFailed: sources.filter(s => s.status !== 'ok').length,
    },
    sources: Object.fromEntries(
      sources.filter(s => s.status === 'ok').map(s => [s.name, s.data])
    ),
    errors: sources.filter(s => s.status !== 'ok').map(s => ({ name: s.name, error: s.error })),
    timing: Object.fromEntries(
      sources.map(s => [s.name, { status: s.status, ms: s.durationMs }])
    ),
  };

  console.error(`[Ravencry] Sweep complete in ${totalMs}ms — ${output.crucix.sourcesOk}/${sources.length} sources returned data`);
  return output;
}

// Run and output when executed directly
const entryHref = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryHref && import.meta.url === entryHref) {
  const data = await fullBriefing();
  console.log(JSON.stringify(data, null, 2));
}
