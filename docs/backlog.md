# RAVENCRY — Backlog

**Consolidated:** 2026-10-15
**Supersedes:** `pending_features.md`, `pending_fix.md`, and the NEXT ACTIONS section of `features.md`
**Feature detail lives in:** [`feature-map.md`](./feature-map.md)

---

## ⚠️ Infra context — read before triaging

The deployment this backlog was written against **no longer exists**:

| Was | Status |
|---|---|
| Alibaba Cloud ECS (Docker Compose host) | 🔴 **terraform-destroyed** |
| AWS Aurora PostgreSQL | 🔴 **deleted** |
| AWS DynamoDB | 🔴 **deleted** |
| AWS S3 (`ravencry-media-prod`) | 🔴 **deleted** |
| AWS EC2 | 🔴 **deleted** |
| **Future target** | ⬜ **Hetzner** (not yet provisioned) |

This changes the priority of several items below: anything that *removes an AWS dependency* is now
more urgent, not less, and anything that only made sense against live Aurora/EC2 is closed.

---

## A. Open fixes (code-level — still valid)

These are independent of the infrastructure teardown. **These are the ones that matter.**

### A1. `decryptPhone()` not implemented — SMS cannot leave sandbox 🔴 **HIGHEST**

- **File:** `services/sms/src/index.ts:265-297`
- **State:** production path fully commented out with `// ---- Option A` / `// ---- Option B` markers.
  `decryptPhone()` does not exist anywhere in the codebase.
- **Impact:** real subscriber phone numbers cannot be stored, and SMS delivery cannot leave the
  Africa's Talking sandbox. **This blocks any real-world use.**
- **Note:** previously logged as "the #1 post-hackathon priority" — still true.
- **Related:** `services/sms/src/crypto.ts` holds the crypto helpers this should use.

### A2. USSD rate limiting still on DynamoDB, not PostgreSQL 🔴 **HIGH — now more urgent**

- **Files:** `services/ussd/src/session.ts`
- **State:** still imports `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`, and calls
  `GetCommand`/`PutCommand` against the `ravencry-sessions` table.
- **Ready but not applied:** migration `db/migrations/015_ussd_rate_limits.sql` exists; the
  PostgreSQL rewrite exists in `steps_aliyun.md` Step 6 but was never applied to `session.ts`.
- **⚠️ Why this is now urgent:** AWS and DynamoDB are **deleted**. This code path cannot work at all
  until the rewrite lands. It is a hard blocker for USSD on Hetzner.

### A3. Orphaned `dynamo.ts` dead code in API Gateway 🟡 **MEDIUM**

- **File:** `services/api/package.json`
- **State:** still depends on `@aws-sdk/client-dynamodb` and `@aws-sdk/lib-dynamodb`; `dynamo.ts` is
  orphaned.
- **Action:** remove the module and both dependencies. Same DynamoDB-exit theme as A2.

### A4. Caddyfile IP whitelists removed for testing 🟡 **MEDIUM — security**

- **File:** `Caddyfile`
- **State:** whitelists were temporarily removed to allow testing and **never re-added**.
- **Action:** re-add before any public deployment. Combine with the Hetzner migration so the new
  host starts with the whitelists in place.

---

## B. Closed (verified complete — kept for the record)

Do not re-do these. They were verified against the now-deleted infra, so they only matter as
evidence that the *repo* is correct; a Hetzner rebuild should replay the migrations.

| Fix | Verified | Note |
|---|---|---|
| `pending_sweep` added to `case_status` enum | ✅ 2026-06-26 | migration `db/migrations/002_enums.sql` is the source of truth |
| `LLM_MODEL` / `LLM_BASE_URL` inline comments in `.env` | ✅ 2026-06-26 | the **lesson stands**: never put inline comments after `=` in `.env`, dotenv reads them as the value |
| `.env` config drift across files | ✅ 2026-06-26 | lesson stands: keep provider/service URLs consistent per environment |
| `pg_trgm` extension on Aurora | ✅ 2026-06-26 | re-create on Hetzner during migration |

---

## C. Pending features

### C1. Aircraft Intelligence source (Crucix dashboard)

Integrate `research/airplane.live.md` as an intelligence source in the crucix dashboard — **not** a
standalone flight tracker. Scoped to anti-kidnapping / missing-persons relevance.

**Reference:** Airplanes.live REST API (`/v2/`), free tier ~1 req/s, ~500 req/day.

**Core (crisis-relevant):**

- **Emergency squawk alerts** — 7500 (hijack), 7600 (radio failure), 7700 (general emergency).
  Feeds the existing alert pipeline (Telegram, WhatsApp, SSE).
- **Military aircraft monitoring** — Sahel / Lake Chad security context.
- **Country crossing detection** — "Aircraft crossed Nigeria→Niger at 14:32 UTC." Actionable if a
  victim is moved by air across borders.
- **Search by registration / ICAO hex** — link aircraft movements to case investigations.

**Supporting:**

- **Geospatial queries** — correlate aircraft positions with abduction sites or last-seen coordinates.
- **Event notifications** — "aircraft entered monitored area" via existing Crucix alert adapters.
- **Historical flight trails / replay** — post-incident investigation.

**Architecture constraints:**

- Provider-agnostic: treat Airplanes.live as one interchangeable source (ADS-B Exchange, OpenSky…).
- Event-driven polling of **points of interest only** (last-seen coordinates, border crossings, known
  airstrips) — not continent-wide blanket coverage.
- Rate-limit-aware with exponential backoff; cache aggressively.
- One new backend service under `services/` with a minimal REST + SSE interface for the crucix frontend.

### C2. `naptip-rss` source module

Add the first Nigerian source module (`apis/sources/naptip-rss.mjs`) to crucix. Listed as a next
action in the original feature map and still not built.

---

## D. Previously-listed next actions — status

From the original `features.md` NEXT ACTIONS list, reconciled against reality:

| Action | Status |
|---|---|
| Fork Crucix repo and run local sweep demo | ✅ done — vendored at `vendor/crucix/` |
| Add first Nigerian source module (`naptip-rss.mjs`) | ⬜ open → see C2 |
| Set up Aurora PostgreSQL with missing-persons schema | 🔴 **obsolete** — Aurora deleted |
| Deploy Crucix dashboard to Vercel | ⬜ open — needs re-link to the new org |
| Wire Telegram bot with two-way commands | ✅ done |
| Register Africa's Talking sandbox account | ✅ done |
| Draft architecture diagram for Devpost submission | ✅ done |
| Record deployment proof (Vercel URL + DB screenshot) | 🔴 **obsolete** — infra deleted |

---

## E. Infrastructure migration (new)

- [ ] **Provision Hetzner** and re-create the schema by replaying `db/migrations/`
- [ ] **Decide the database target** — self-hosted PostgreSQL on Hetzner, or managed
- [ ] **Decide object storage** — replaces the deleted S3 bucket; S3-compatible (Hetzner/MinIO) keeps
      code changes minimal
- [ ] **Re-add Caddyfile IP whitelists** as part of A4
- [ ] **Re-place the secrets** — `.env` on the new host needs the rotated ACLED / FIRMS / n8n values
- [ ] **Remove AWS-specific config** once A2 and A3 land
