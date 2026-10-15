// n8n Webhook Emitter — fires POST to N8N_WEBHOOK_URL when FLASH Nigeria events are detected
// Used by the Crucix sweep cycle to trigger downstream RAVENCRY workflows (OSINT ingestion, broadcast)

import '../utils/env.mjs'; // Load .env into process.env (needed for standalone execution)
import { collectFlashEvents } from '../../lib/tiers.mjs';

/**
 * Fire the n8n FLASH webhook if Nigeria sources have actionable FLASH events.
 * Called from server.mjs after each sweep cycle completes.
 *
 * @param {object} sweepData - The raw sweep data from fullBriefing()
 * @param {object} synthesized - The synthesized dashboard data
 * @returns {Promise<{fired: boolean, flashSources: number, totalEvents: number}>}
 */
export async function emitFlashWebhook(sweepData, synthesized) {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const webhookSecret = process.env.N8N_WEBHOOK_SECRET || '';

  if (!webhookUrl) {
    // No webhook configured — silent no-op (don't log every sweep to avoid noise)
    return { fired: false, flashSources: 0, totalEvents: 0, reason: 'N8N_WEBHOOK_URL not set' };
  }

  const flashBySource = collectFlashEvents(sweepData);
  const totalEvents = flashBySource.reduce((sum, s) => sum + s.count, 0);

  if (totalEvents === 0) {
    return { fired: false, flashSources: 0, totalEvents: 0, reason: 'no flash events' };
  }

  // Build the webhook payload
  const payload = {
    crucix_version: '2.0.0',
    timestamp: new Date().toISOString(),
    type: 'nigeria-flash-events',
    totalFlashEvents: totalEvents,
    totalSources: flashBySource.length,
    sources: flashBySource.map(s => ({
      source: s.source,
      eventCount: s.count,
      events: s.events.slice(0, 20).map(e => ({
        title: e.title || e.notes || '',
        date: e.date || '',
        location: e.location || e.state || '',
        state: e.state || '',
        lga: e.lga || '',
        relevanceScore: e.relevanceScore || 0,
        type: e._type || 'flash',
        url: e.url || null,
        fatalities: e.fatalities || 0,
        lat: e.lat || null,
        lon: e.lon || null,
      })),
    })),
    // Include aggregate Nigeria summary for downstream workflow decisions
    nigeriaSummary: synthesized?.nigeria || null,
    // Include key meta for dedup/triage
    meta: {
      sweepSourcesOk: sweepData?.crucix?.sourcesOk || 0,
      sweepSourcesTotal: sweepData?.crucix?.sourcesQueried || 0,
      sweepDurationMs: sweepData?.crucix?.totalDurationMs || 0,
    },
  };

  try {
    const headers = {
      'Content-Type': 'application/json',
      'User-Agent': 'Crucix-RAVENCRY/1.0',
    };
    if (webhookSecret) {
      headers['X-Webhook-Secret'] = webhookSecret;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[Ravencry] n8n webhook failed (HTTP ${res.status}): ${errBody.slice(0, 200)}`);
      return { fired: false, flashSources: flashBySource.length, totalEvents, reason: `HTTP ${res.status}` };
    }

    console.log(`[Ravencry] ✅ n8n FLASH webhook fired — ${totalEvents} events from ${flashBySource.length} sources`);
    return { fired: true, flashSources: flashBySource.length, totalEvents };
  } catch (err) {
    console.error(`[Ravencry] n8n webhook error: ${err.message}`);
    return { fired: false, flashSources: flashBySource.length, totalEvents, reason: err.message };
  }
}

/**
 * Fire a manual FLASH test event — used for testing the n8n webhook integration.
 * Call with: node apis/webhooks/test-flash.mjs
 */
export async function emitTestFlashEvent() {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  if (!webhookUrl) {
    console.error('[Ravencry] N8N_WEBHOOK_URL not set — cannot fire test event');
    return { fired: false, reason: 'N8N_WEBHOOK_URL not set' };
  }

  const payload = {
    crucix_version: '2.0.0',
    timestamp: new Date().toISOString(),
    type: 'nigeria-flash-events',
    isTest: true,
    totalFlashEvents: 1,
    totalSources: 1,
    sources: [{
      source: 'TEST-SOURCE',
      eventCount: 1,
      events: [{
        title: 'TEST FLASH: Child reported missing in Zamfara Central',
        date: new Date().toISOString(),
        location: 'Gusau, Zamfara State',
        state: 'Zamfara',
        relevanceScore: 10,
        type: 'flash',
        url: null,
        fatalities: 0,
        lat: 12.1713,
        lon: 6.6598,
      }],
    }],
    nigeriaSummary: null,
    meta: {
      sweepSourcesOk: 34,
      sweepSourcesTotal: 34,
      sweepDurationMs: 0,
    },
  };

  const webhookSecret = process.env.N8N_WEBHOOK_SECRET || '';
  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'Crucix-RAVENCRY/1.0',
  };
  if (webhookSecret) {
    headers['X-Webhook-Secret'] = webhookSecret;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => '');
      console.error(`[Ravencry] Test FLASH webhook failed (HTTP ${res.status}): ${errBody.slice(0, 200)}`);
      return { fired: false, reason: `HTTP ${res.status}` };
    }

    console.log('[Ravencry] ✅ Test FLASH webhook fired successfully');
    console.log(JSON.stringify(payload, null, 2));
    return { fired: true };
  } catch (err) {
    console.error(`[Ravencry] Test FLASH webhook error: ${err.message}`);
    return { fired: false, reason: err.message };
  }
}

// CLI runner for manual test
if (process.argv[1]?.endsWith('n8n.mjs')) {
  const result = await emitTestFlashEvent();
  console.log('Result:', JSON.stringify(result, null, 2));
}
