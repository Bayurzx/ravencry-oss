# RAVENCRY — Build Log

> **Purpose:** Running log of key decisions, discoveries, and "why we did what we did" during implementation.
> **NOT:** A copy of the design docs / spec. This captures the *rationale* behind choices made at build time.

---

## 1. Environment reality vs. spec target

**Discovery:** The spec targeted **Next.js 14 + `src/` directory + Webpack + Tailwind v3 (`tailwind.config.ts`)**. The actual running v0 sandbox is **Next.js 16 + root `app/` + Turbopack + Tailwind v4 (`@theme` in `globals.css`)** with **React 19**.

**Decision:** Adapt to the running environment rather than fight it. Building for a stack that isn't installed would mean a project that never previews.

**Consequences / mappings:**
- Spec's `src/app/...` → root `app/...`; `@/*` resolves to project root.
- Spec's `tailwind.config.ts` color palette → CSS tokens in `app/globals.css` under `@theme`.
- Dependency versions are newer than the spec pins (react-leaflet 5, i18next 26, etc.) because that's what this environment ships. No behavioral spec items were dropped because of this.

**Why it's acceptable:** Every functional requirement (pages, hooks, libs, i18n, offline behavior) maps cleanly onto Next 16. The differences are structural, not feature-level.

---

## 2. Seed-data fallback in the API client

**Discovery:** There is no backend running in the v0 sandbox; the spec's Express API + Postgres + Redis live elsewhere. Without a fallback the entire PWA would render empty/error states and be undemonstrable.

**Decision:** `lib/api.ts` calls `NEXT_PUBLIC_API_URL` first and, **only on network failure**, falls back to seed data from `lib/mock-data.ts`. Real server errors (4xx/5xx) still propagate so error states remain testable.

**Escape hatch:** `NEXT_PUBLIC_DISABLE_MOCK=true` disables the fallback for true integration testing. Point `NEXT_PUBLIC_API_URL` at the real Express API and the app uses live data with no code changes.

**Why:** Keeps the frontend independently demoable and reviewable while staying production-honest the moment a backend is attached.

---

## 3. i18n — flat keys + inline resources

**Discovery:** Components were initially drafted with nested keys (e.g. `sighting.descriptionLabel`) but the locale files are flat (`sighting_desc_label`).

**Decision:** Standardize on **flat snake_case keys** across EN + HA and audit every `t('...')` call against the locale files before considering it done. Resources are bundled inline via `lib/i18n.ts` (and mirrored to `public/locales/**` for spec compliance) so first paint has translations without a network round-trip.

**Why flat:** Avoids a class of silent "missing key shows raw string" bugs that are easy to miss in a two-language app, and keeps the EN/HA files diffable line-for-line.

---

## 4. Leaflet in a Next 16 / Turbopack world

**Discoveries & fixes:**
- Leaflet touches `window` on import → all map components are loaded via `next/dynamic` with `ssr: false`.
- Default Leaflet marker icons break under bundlers (broken image paths) → patched `L.Icon.Default` to use the unpkg CDN marker assets inside an effect.
- `leaflet/dist/leaflet.css` must be imported in the map component or tiles/controls render unstyled.

**Why a library at all:** Per design guidelines, geographic/spatial UI must use an established mapping library — never hand-rolled SVG. Leaflet + OSM tiles need no API key, which matters for a free public-safety tool.

---

## 5. Component export convention bug

**Discovery:** A type-check (`tsc --noEmit`) caught mismatched import styles — `ErrorState`/`LoadingSpinner` were default exports but imported as named in `AlertDetail`, and `ReportWizard` was imported as named but was a default export.

**Decision:** Provide **both** named and default exports on the shared low-level components (`LoadingSpinner`, `ErrorState`) to be tolerant of either import style, and fix the `ReportWizard` import to default.

**Lesson logged:** Run `tsc --noEmit` as the cheap gate before browser verification — it caught these instantly.

---

## 6. Missing design tokens → invisible buttons

**Discovery:** Browser verification of `/subscribe` showed an "Enable Alerts" button with no background. Root cause: components referenced `accent`, `destructive`, and `found` color tokens that were never defined in `@theme`.

**Decision:** Add the missing tokens (`--color-accent`, `--color-destructive`, `--color-found` + foregrounds) to `globals.css`. Verified the spinner keyframe (`ravencry-spin`) existed too.

**Lesson logged:** A clean type-check is **not** proof the UI works. Visual/browser verification surfaced a real defect that compiled fine. This is now a standard step.

---

## 7. The `/sighting/[caseId]` route was a dead link

**Discovery (during checklist audit):** `AlertCard` linked to `/sighting/[caseId]`, but that route never existed — only `/alert/[caseId]` (which embeds a sighting form) did. Clicking the card's "report sighting" action would have 404'd.

**Decision:** Create `app/sighting/[caseId]/page.tsx` reusing the existing `SightingForm` component, then browser-verified it renders with its map.

**Why it matters:** Auditing my own work against the checklist — rather than trusting memory — caught a genuine user-facing break.

---

## 8. Offline-first: the biggest reversal of the build

**Initial decision (later overturned):** Skipped the service worker, reasoning that `next-pwa` is Webpack-only and incompatible with Next 16 + Turbopack.

**Why that was wrong:** Without a SW, `lib/offline-queue.ts` and the IndexedDB alert cache in `useAlertFeed.ts` are **inert** — they can store data, but if the shell can't boot offline none of it ever reaches a user on a dropped 2G connection. For an anti-kidnapping alert network in Nigeria, offline-first is the core value proposition, not polish.

**Discovery that unblocked it:** `@serwist/turbopack` now exists — a Turbopack-native path that compiles the SW via an esbuild-backed Route Handler and registers it with `<SerwistProvider>`. No pivot to Next 14 / Webpack required.

**What was built:**
- `next.config.mjs` wrapped with `withSerwist(...)`.
- `app/serwist/[path]/route.ts` compiles the worker (native esbuild).
- `app/sw.ts` implements the spec's exact runtime caching: **StaleWhileRevalidate, 5-min** for `GET /api/alerts/active`; **CacheFirst, max-50, 7-day, purgeOnQuotaError** for `*.amazonaws.com` photos; app-shell precache; `skipWaiting` + `clientsClaim` + navigation preload.
- `app/~offline/page.tsx` — a branded, self-contained fallback that keeps **112 / WhatsApp / USSD** visible with zero connectivity (no network/i18n hydration dependency).

**Verification note:** Service workers do **not** function in the dev preview iframe — verification required a real `next build` + `next start`, which confirmed `/serwist/sw.js` generates with the precache manifest and both runtime caches.

---

## 9. Service worker registration crash in the v0 preview

**Symptom:** `SecurityError: The script resource is behind a redirect, which is disallowed` when registering `/serwist/sw.js`.

**Root cause:** The v0 preview proxy serves the SW script through a redirect, and browsers forbid SW registration behind redirects. Compounding this, SWs don't work in the dev preview iframe anyway.

**Decision:** Gate `<SerwistProvider>` behind `NODE_ENV === 'production'`. In dev the layout renders the same `I18nProvider` / `OfflineBanner` / children tree without attempting registration. The full offline shell still activates in the deployed production build — the only place it actually works.

**Why not just change the SW path/scope:** The redirect is imposed by the preview proxy, not our code; the honest fix is to not register where it can't function rather than paper over the environment.

---

## 10. Added Yoruba + Igbo languages

**Trigger:** User asked to extend the EN/HA switcher to Igbo and Yoruba — Nigeria's other two major indigenous languages, matching the network's national reach.

**Decision:** Added full `yo.json` / `ig.json` locales (all 73 keys, proper diacritics), registered them in `lib/i18n.ts`, and expanded `LanguageSelector` to EN/HA/YO/IG.

**Why it was low-risk:** The system already used a flat-key, resource-bundle pattern and the `LanguageCode` type already anticipated `yo`/`ig` — so this was additive, no refactor. Mirrored into `public/locales` for consistency with the existing convention. Verified language switching live in the browser.

---

## Standing principles that emerged

1. **Build for the environment that's actually running**, then document the spec deltas instead of silently diverging.
2. **`tsc --noEmit` is the cheap gate; browser verification is the real gate.** Neither alone is sufficient (see #6).
3. **Audit against the checklist, don't trust memory** — it caught the dead route in #7.
4. **Reverse a decision the moment its premise is proven wrong** — the SW skip in #8 was the right call to undo once `@serwist/turbopack` was confirmed.
5. **Don't fake capability in environments that can't support it** — gate, don't paper over (#9).
