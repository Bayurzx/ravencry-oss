# Prompt 07 — Alert Delivery Layer
## Geofenced broadcast: SMS, Telegram, SSE, NAPTIP bridge

---

## INSTRUCTION TO AI

Build the complete alert delivery layer for RAVENCRY. This fires after Crucix classifies an event as FLASH or PRIORITY and an operator (or auto-approve rule) confirms broadcast.

Every millisecond matters on a FLASH alert. This layer must be fast, parallel, and failure-tolerant.

---

## DELIVERY MATRIX

| Channel                      | FLASH                 | PRIORITY            | ROUTINE | Notes               |
| ---------------------------- | --------------------- | ------------------- | ------- | ------------------- |
| SMS blast (Africa's Talking) | ✅ All LGA subscribers | ✅ Affected LGA only | ❌       | Geofenced           |
| Telegram alert channel       | ✅ Public channel      | ✅ Public channel    | ❌       | Photo attached      |
| Telegram ops channel         | ✅                     | ✅                   | ✅       | All cases go to ops |
| WhatsApp broadcast           | ✅ Opted-in contacts   | ❌                   | ❌       | AT Business API     |
| SSE dashboard feed           | ✅                     | ✅                   | ✅       | All cases           |
| NAPTIP Amber bridge          | ✅ Children only       | ❌                   | ❌       | Webhook call        |
| PWA push notification        | ✅                     | ✅                   | ❌       | Web Push API        |
| X/Twitter auto-post          | ✅                     | ❌                   | ❌       | V2                  |

---

## N8N WORKFLOW: WF-02 FLASH BROADCAST

### Full node spec (produce importable n8n JSON):

```
1. Webhook Trigger
   Path: /ravencry-flash-broadcast
   Method: POST
   Validate header: X-RAVENCRY-Secret matches env var

2. HTTP Request — Fetch full case
   GET {API_BASE}/api/cases/{case_id}
   Include: person details, last seen coordinates, photo S3 URL

3. Code Node — Calculate geofence
   Input: last_seen_lat, last_seen_lng
   Logic: PostGIS query to Aurora → SELECT phone FROM subscribers 
          WHERE ST_DWithin(location::geography, ST_MakePoint({lng},{lat})::geography, 160000)
          AND active = true
   Output: subscriber_phones[] (batched in groups of 100)

4. HTTP Request — Get pre-signed photo URL
   If photo exists: GET {API_BASE}/api/media/presigned/{case_id}
   Timeout: 3s, skip photo on timeout

5. [Parallel branch A] — Telegram broadcast
   POST https://api.telegram.org/bot{TOKEN}/sendPhoto
   chat_id: {ALERT_CHANNEL_ID}
   caption: format from alert-templates.json FLASH.telegram
   parse_mode: Markdown
   On fail: send text-only fallback (no photo)

6. [Parallel branch B] — SMS batch
   Split subscriber_phones into batches of 100
   For each batch: POST Africa's Talking SMS API
   Body: format from alert-templates.json FLASH.sms
   Sender: RAVENCRY
   Log: DynamoDB PUT item { alert_id, channel: 'sms', recipients_count, sent_at }

7. [Parallel branch C] — WhatsApp broadcast
   POST Africa's Talking WhatsApp API
   To: opted-in WhatsApp subscribers (separate query, flag whatsapp_opted_in = true)
   Template: FLASH_ALERT (pre-approved template for broadcast)

8. [Parallel branch D] — NAPTIP bridge
   IF case.victim_age < 18:
     POST {NAPTIP_WEBHOOK_URL} with NAPTIP-formatted payload
     Log result (non-blocking — NAPTIP failure should not block broadcast)

9. [Parallel branch E] — PWA Web Push
   POST {API_BASE}/api/push/broadcast
   Payload: { title: "FLASH ALERT", body: "{name}, {area}", case_id }
   Filter: subscribers with push_token and location within geofence

10. Code Node — Compile delivery report
    Count: sms_sent, telegram_sent, whatsapp_sent, naptip_notified
    Status: 'broadcast_complete'

11. HTTP Request — Update case status
    PATCH {API_BASE}/api/cases/{case_id}
    Body: { status: 'broadcast_complete', broadcast_at: now, delivery_report }

12. DynamoDB — Log alert issuance
    Table: ravencry-alerts
    Item: { alert_id, case_id, tier: 'FLASH', channels[], recipient_count, sent_at, delivery_report }

13. Error handler (catch all)
    On any critical failure: POST to Telegram OPS channel with error detail
    Never silently fail a FLASH broadcast
```

---

## GEOFENCE SERVICE: `services/geofence/index.mjs`

```javascript
import { pool } from '../db/aurora.mjs'

export async function getSubscribersInRadius({ lat, lng, radiusKm = 160 }) {
  const result = await pool.query(`
    SELECT phone, whatsapp_opted_in, push_token
    FROM subscribers
    WHERE active = true
      AND ST_DWithin(
        location::geography,
        ST_MakePoint($1, $2)::geography,
        $3
      )
  `, [lng, lat, radiusKm * 1000])
  return result.rows
}

export async function getSubscribersByLGA({ lga, state }) {
  // Fallback when coordinates not available
  const result = await pool.query(`
    SELECT phone, whatsapp_opted_in, push_token
    FROM subscribers
    WHERE active = true
      AND (lga ILIKE $1 OR state ILIKE $2)
  `, [`%${lga}%`, `%${state}%`])
  return result.rows
}
```

---

## SMS BATCH SERVICE: `services/sms/index.mjs`

```javascript
import AfricasTalking from 'africastalking'

const AT = AfricasTalking({
  apiKey: process.env.AFRICASTALKING_API_KEY,
  username: process.env.AFRICASTALKING_USERNAME
})

export async function sendSMSBatch({ phones, message, senderId = 'RAVENCRY' }) {
  // AT accepts max 100 recipients per call
  const batches = chunkArray(phones, 100)
  const results = []
  for (const batch of batches) {
    try {
      const res = await AT.SMS.send({
        to: batch,
        message,
        from: senderId
      })
      results.push({ batch_size: batch.length, status: 'sent', response: res })
    } catch (err) {
      results.push({ batch_size: batch.length, status: 'failed', error: err.message })
      // Continue — don't block remaining batches
    }
  }
  return results
}
```

---

## NAPTIP BRIDGE: `services/naptip/index.mjs`

```javascript
export function formatNAPTIPPayload(caseData) {
  // Maps RAVENCRY case fields to NAPTIP Amber Alert schema
  return {
    child_name: caseData.person_name,
    child_age: caseData.age_estimate,
    child_gender: caseData.gender,
    last_seen_location: caseData.last_seen_location,
    last_seen_time: caseData.last_seen_time,
    description: caseData.clothing_description,
    case_reference: caseData.case_id,
    reporting_agency: 'RAVENCRY',
    contact_number: '112'
  }
}

export async function triggerNAPTIPAlert(caseData) {
  const payload = formatNAPTIPPayload(caseData)
  const res = await fetch(process.env.NAPTIP_WEBHOOK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.NAPTIP_API_KEY}`
    },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(5000)  // 5s timeout — non-blocking
  })
  return { status: res.ok ? 'sent' : 'failed', http_status: res.status }
}
```

---

## SSE ENDPOINT: `routes/events.mjs`

```javascript
// Server-Sent Events for live dashboard feed
// Each alert broadcasts to all connected ops dashboard clients

const clients = new Set()

export function broadcastEvent(event) {
  const data = `data: ${JSON.stringify(event)}\n\n`
  for (const client of clients) {
    client.res.write(data)
  }
}

router.get('/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_URL)
  
  const client = { id: Date.now(), res }
  clients.add(client)
  
  // Send current active cases on connect
  getActiveAlerts().then(alerts => {
    res.write(`data: ${JSON.stringify({ type: 'initial', alerts })}\n\n`)
  })
  
  req.on('close', () => clients.delete(client))
})
```

---

## WEB PUSH SERVICE: `services/push/index.mjs`

```javascript
import webpush from 'web-push'

webpush.setVapidDetails(
  'mailto:alerts@ravencry.ng',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
)

export async function sendPushNotification({ pushToken, title, body, caseId }) {
  const payload = JSON.stringify({
    title,
    body,
    icon: '/icons/ravencry-192.png',
    badge: '/icons/badge-72.png',
    data: { case_id: caseId, url: `/alert/${caseId}` },
    actions: [{ action: 'sighting', title: '👁 I saw them' }]
  })
  try {
    await webpush.sendNotification(JSON.parse(pushToken), payload)
    return { status: 'sent' }
  } catch (err) {
    if (err.statusCode === 410) {
      // Subscription expired — remove from DB
      await removeExpiredPushToken(pushToken)
    }
    return { status: 'failed', reason: err.message }
  }
}
```

---

## OPERATOR APPROVAL FLOW

### Endpoint: POST /api/ops/alerts/:id/approve

```javascript
router.post('/ops/alerts/:id/approve', requireOperatorAuth, async (req, res) => {
  const { id } = req.params
  const { operator_id } = req.user

  // Update alert status
  await pool.query(
    `UPDATE alerts SET status = 'approved', approved_by = $1, approved_at = NOW() WHERE id = $2`,
    [operator_id, id]
  )

  // Log to DynamoDB audit trail
  await auditLog({ action: 'ALERT_APPROVED', alert_id: id, operator_id })

  // Trigger n8n broadcast workflow
  await fetch(process.env.N8N_FLASH_WEBHOOK, {
    method: 'POST',
    headers: { 'X-RAVENCRY-Secret': process.env.N8N_WEBHOOK_SECRET },
    body: JSON.stringify({ case_id: id })
  })

  res.json({ status: 'broadcast_initiated' })
})
```

### Auto-approve rule (for hackathon demo):
If `OPERATOR_AUTO_APPROVE=true` in `.env`, FLASH cases skip the approval queue.
**Never enable in production.**

---

## VERIFICATION CHECKLIST

- [ ] FLASH case triggers n8n WF-02 from Crucix webhook
- [ ] Telegram alert channel receives formatted message with photo within 10 seconds
- [ ] SMS sent to all subscribers within 160km geofence (verify in AT dashboard)
- [ ] Subscribers outside 160km radius do NOT receive SMS
- [ ] NAPTIP webhook fires for child cases (age < 18)
- [ ] SSE: open `/events` in browser → new alert appears within 5 seconds of broadcast trigger
- [ ] PWA push notification received on subscribed device
- [ ] Broadcast failure (e.g. AT down) logged to DynamoDB, ops Telegram notified
- [ ] Operator approve flow: button in Appsmith → alert fires within 30 seconds
- [ ] Auto-approve mode works for hackathon demo
