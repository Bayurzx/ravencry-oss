# T-063 · Offline PWA + Background Sync Test
> **Phase:** HACKATHON Phase 7 | **Integration Testing** | **~20 min**
> **Depends on:** T-047 (4-step report form with offline queue)
> **LLM:** `["Human"]` — Requires Chrome DevTools Network panel, manual offline toggle, physical observation of sync behavior.

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────┐
│                   BROWSER (PWA)                       │
│                                                      │
│  Report Form  ──►  useOfflineQueue()                  │
│                      │                               │
│              ┌───────┴────────┐                      │
│              ▼                ▼                       │
│       navigator.onLine    navigator.onLine            │
│            = true            = false                  │
│              │                │                       │
│         POST /api/      addToQueue()                  │
│         reports  ──►     (IndexedDB)                  │
│         case_id ✓         queued: true ✓              │
│                                                       │
│  window 'online' event ──► retryAll()                 │
│                            │                          │
│                     ┌──────┴──────┐                   │
│                     ▼              ▼                   │
│               success →      4xx error →              │
│            removeFromQueue   removeFromQueue          │
│            (synced ✅)       (dropped —                │
│                              won't succeed             │
│                              on retry)                 │
│                              │                        │
│                     network error →                   │
│                       stays queued                    │
│                       (retry on next online event)    │
└──────────────────────────────────────────────────────┘
```

**Key files:**
- `apps/web/lib/offline-queue.ts` — IndexedDB store (`ravencry` DB, `report-queue` + `alert-cache` object stores)
- `apps/web/hooks/useOfflineQueue.ts` — React hook: `submitReport()`, `retryAll()`, `queueLength`
- `apps/web/app/~offline/page.tsx` — Service worker precached offline fallback page

**Sync behavior:**
- `navigator.onLine === false` → auto-queues to IndexedDB, returns `{ queued: true }`
- `navigator.onLine === true` but network error → also queues (graceful degradation)
- `window 'online'` event → `retryAll()` fires automatically
- 4xx responses → dropped from queue (validation errors won't fix on retry)
- 5xx / network error → stays in queue for next retry


## Prerequisites

1. **PWA running locally** — `cd apps/web && npm run dev` (or `pnpm dev`)

2. **Disable mock fallback** — the mock layer swallows connection errors and returns fake case IDs, which blocks the offline queue from working. Create or edit `apps/web/.env.local`:

   ```dotenv
   NEXT_PUBLIC_DISABLE_MOCK=true
   ```

   > **⚠️ Without this:** `ERR_CONNECTION_REFUSED` from the API triggers `isNetworkError()` → `MOCK_FALLBACK` → returns a fake `NR-2026-XXXXXX` case ID. The PWA shows a success screen instead of queueing to IndexedDB.

3. **API gateway running** — Local DB + SSL disabled (remote Aurora won't work from local):

   ```powershell
   # Set these BEFORE starting the API:
   $env:DB_SSL = 'false'
   $env:DATABASE_URL = 'postgres://postgres:test@localhost:5433/ravencry'

   # Verify DB is reachable before starting:
   psql $env:DATABASE_URL -c "SELECT 1 AS db_ok;"
   # Expected: 1 row returned

   cd services/api && npx tsx src/index.ts
   ```

   > **⚠️ Common pitfall:** If `DATABASE_URL` points to remote Aurora and `DB_SSL` isn't set,
   > the API starts but every POST returns 500. Reports stay in the queue forever.
   > Always verify with the `SELECT 1` check above before beginning the test.

4. **Chrome DevTools** with Network panel open


## Step 1: Verify Offline Fallback Page

1. Open `http://localhost:3000` in Chrome
2. Navigate to the Report form (click "Report" in the nav)
3. **Verify the form loads** — 4-step wizard is visible with progress bar
4. Open DevTools → Application → Storage → IndexedDB → `ravencry`
5. Verify two object stores exist: `report-queue` and `alert-cache`
6. Verify `report-queue` is **empty** at start


## Step 2: Simulate Offline Report Submission

### 2a. Go Offline

1. DevTools → Network tab → find the "Throttling" dropdown (top bar, next to "Disable cache")
2. Select **"Offline"** from the dropdown
3. The network status indicator at top of DevTools should show ⚠️ Offline
4. Confirm: `navigator.onLine` shows `false` in the Console (`window.navigator.onLine`)

### 2b. Submit a Report While Offline

1. Fill out the 4-step report form:
   - **Step 1 (Details):** Name: "Musa Abubakar", Age: 12, Gender: Male
   - **Step 2 (Last Seen):** Location: "Kaduna Central Market", Time: "yesterday 3pm"
   - **Step 3 (Circumstance):** Select "missing" — note: "last seen wearing school uniform"
   - **Step 4 (Contact):** Phone: `+2348030001064` (optional)

2. Click **Submit**

3. **Expected behavior:**
   - The form should NOT show an error saying "network unavailable"
   - Should show a **confirmation message**: "Saved, will send when online" (or equivalent)
   - The submit button should be responsive again (not stuck showing spinner)
   - URL should stay on the report page (no 500 error redirect)

4. Open DevTools → Application → Storage → IndexedDB → `ravencry` → `report-queue`
5. **Verify:** One entry exists with:
   ```json
   {
     "id": "<UUID>",
     "data": {
       "person_name": "Musa Abubakar",
       "age_estimate": 12,
       ...
     },
     "createdAt": <timestamp>
   }
   ```


## Step 3: Go Back Online — Verify Auto-Sync

### 3a. Reconnect

1. DevTools → Network tab → change "Offline" back to **"No throttling"** (or "Fast 3G")
2. The `online` event fires instantly

### 3b. Check IndexedDB — Queue Should Be Empty

1. DevTools → Application → Storage → IndexedDB → `ravencry` → `report-queue`
2. **Expected:** The queue entry is **gone** (removed after successful sync)
3. If still present, click on it and check if it's the same report or a different one

### 3c. Verify Case Created in PostgreSQL

```bash
loadenv .\.env

# Check most recent PWA cases (joined with persons for name)
psql $LOCAL_PG -c "
SELECT c.id, c.status, c.last_seen_lga, c.input_channel, c.language,
       p.full_name AS person_name, c.created_at
FROM cases c
LEFT JOIN persons p ON c.person_id = p.id
WHERE c.input_channel = 'pwa'
ORDER BY c.created_at DESC
LIMIT 3;
"
```

**Expected:** At least one row with `input_channel = 'pwa'`, `status = 'pending_triage'`, `language = 'en'`. The most recent entry should match the test report ("Musa Abubakar", "Kaduna Central Market").

> **Why not `LIKE '%Musa Abubakar%'`:** The name goes into `persons.full_name`, not `cases.raw_report`. The `raw_report` column stores the `description` field from the form payload, which is `[data.description, data.extra]` joined together — not the person's name.


## Step 4: Test Network Error → Queue (Online but API Down)

### 4a. Stop the API Gateway

```bash
# In the terminal running services/api:
# Press Ctrl+C to stop
```

### 4b. Submit While Online (API Unreachable)

1. Ensure network is **online** (not throttled to Offline)
2. Fill out another report with different details:
   - Name: "Aisha Mohammed", Age: 8, Gender: Female
3. Click Submit

4. **Expected behavior:**
   - Form does NOT crash or show a raw fetch error
   - The report should be **quietly queued** (same as offline behavior)
   - The user sees the "will send when possible" confirmation
   - `queueLength` in the hook state increments

5. Check IndexedDB — verify the report is in `report-queue`

### 4c. Restart API and Sync

1. Restart the API gateway: `cd services/api && npx tsx src/index.ts`
2. Wait 2-3 seconds for the `online` event (actually, the API coming back doesn't trigger `online` — manually trigger `retryAll()` by going offline then back online, or by calling `retryAll()` from the console)
3. Alternative: Open a new tab at `http://localhost:3000/offline` — the `useOfflineQueue` hook in any mounted component will attempt retry

4. **Verify:** IndexedDB queue is empty. Case exists in PostgreSQL.


## Step 5: Test 4xx Rejection → Auto-Drop From Queue

This tests that validation errors (400-range) are dropped from the queue rather than retried forever.

### 5a. Ensure API is running and network is online

### 5b. Queue a request that will fail validation

The easiest way is to directly inject a bad record into IndexedDB:

1. Open DevTools → Console
2. Paste and run:

```javascript
// Open the IndexedDB and inject a deliberately bad queued report
const db = await new Promise((resolve, reject) => {
  const request = indexedDB.open('ravencry', 1);
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});
const tx = db.transaction('report-queue', 'readwrite');
const store = tx.objectStore('report-queue');
await store.put({
  id: crypto.randomUUID(),
  data: {
    person_name: '',    // empty name — API will 400
    age_estimate: -1,   // negative age — API will 400
    last_seen_lga: '',
    circumstance: '',
    input_channel: 'pwa'
  },
  createdAt: Date.now()
});
await tx.done;
console.log('Injected bad record into report-queue');
```

3. Trigger a sync — wait for the next `online` event or call `window.dispatchEvent(new Event('online'))` from the console
4. **Verify:** The bad record is **removed** from IndexedDB (4xx errors → drop, don't retry)


## Step 6: Alert Cache Offline Resilience

The PWA also caches the last fetched alerts for offline viewing.

### 6a. Load alerts online

1. Ensure API is running
2. Navigate to `http://localhost:3000` (home page with alert feed)
3. Wait for the alert cards to load

### 6b. Go offline

1. DevTools → Network → Offline
2. **Refresh the page** (Ctrl+R)

### 6c. Verify cached alerts

1. **Expected:** The page should still render (service worker or cached HTML)
2. Alert cards from the last fetch should appear (from IndexedDB `alert-cache`)
3. An offline banner/indicator should be visible

### 6d. Verify alert cache in IndexedDB

1. DevTools → Application → IndexedDB → `ravencry` → `alert-cache`
2. There should be one entry with key `"cached-alerts"` containing the last fetched alerts


## Step 7: Service Worker Precached Offline Page

1. Ensure you're offline (Network → Offline)
2. Navigate to `http://localhost:3000/~offline`
3. **Expected:** A self-contained offline page loads (not the Chrome dinosaur)


## Quick-Start (Single Copy-Paste Block)

```bash
# Terminal 1: Start PWA
cd apps/web && npm run dev

# Terminal 2: Start API
cd services/api && npx tsx src/index.ts

# Terminal 3: Open Chrome with DevTools
# 1. Go to http://localhost:3000
# 2. DevTools → Network → Offline
# 3. Submit report form
# 4. DevTools → Application → IndexedDB → ravencry → report-queue → verify entry exists
# 5. DevTools → Network → No throttling (back online)
# 6. Check IndexedDB → report-queue should be empty
# 7. Verify in psql:
psql $LOCAL_PG -c "SELECT id, status, last_seen_lga, input_channel, language FROM cases WHERE input_channel = 'pwa' ORDER BY created_at DESC LIMIT 3;"
```


## Definition of Done

- [x] Report submitted while offline queues to IndexedDB (`report-queue` has entry)
- [x] UI shows "Saved, will send when online" confirmation (not an error)
- [x] Going back online auto-triggers sync (`window 'online'` → `retryAll()`)
- [x] Queue is empty after successful sync
- [x] Case exists in PostgreSQL with `input_channel = 'pwa'`
- [x] API-down scenario (online but unreachable) also queues reports
- [x] 4xx validation errors drop from queue (not retried forever)
- [x] Alert cache (`alert-cache` in IndexedDB) survives offline page refresh
- [ ] `/~offline` page loads when network is unavailable
