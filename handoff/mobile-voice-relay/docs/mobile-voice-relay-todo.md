# RAVENCRY Voice Relay — Mobile Todo

> **Owner:** Mobile developer
>
> **Read first:** `mobile-voice-relay-agent-guide.md` and
> `mobile-voice-relay-lead-packet.md`. Work in an isolated Flutter folder only.
> This is a RAVENCRY feature, not a separate product.

## Delivery rules

- No API keys, database, backend, production URL, shared Git branch, or real
  data.
- Use `fixtures/voice-relay-sighting.json` only.
- Never say a report was sent, broadcast, or delivered. The correct result is
  **queued for human review**.
- Send the daily status template in the agent guide by 6:00 PM WAT.
- Handoff is due **Monday 20 July, 10:00 AM WAT**.

## Tasks

### VR-00 — Scaffold and safety shell

**Estimate:** 45 minutes

- [ ] Create the Flutter app in the isolated workspace.
- [ ] Add RAVENCRY dark-theme tokens and a visible offline badge.
- [ ] Add: “If you are in immediate danger, call 112.”

**Manual check:** `flutter run` opens the dark safety shell on Android.

### VR-01 — Language and consent

**Estimate:** 45 minutes

- [ ] Show English, Hausa, Yoruba, Igbo, and Pidgin choices.
- [ ] Require acknowledgement that a human reviews reports before continuing.

**Manual check:** Try to continue without consent; it must be blocked. Select
Hausa and continue successfully.

### VR-02 — Voice capture with safe fallback

**Estimate:** 90 minutes

- [ ] Add hold-to-record/start-stop behavior for local audio only.
- [ ] If microphone permission is denied or unavailable, show a text-input
  fallback instead of a dead end.

**Manual check:** Record once; then deny microphone permission and complete the
fallback path.

### VR-03 — Fixture review card

**Estimate:** 45 minutes

- [ ] Load the supplied fictional Hausa sighting fixture.
- [ ] Show transcript, English gloss, location, time, language, and “Not sent
  yet.”

**Manual check:** Compare every displayed value with the fixture JSON.

### VR-04 — Persistent offline outbox

**Estimate:** 90 minutes

- [ ] Save the reviewed item locally with status `queued`.
- [ ] Render a simple outbox list.

**Manual check:** Enable airplane mode, queue one report, force-close, reopen,
and confirm the queued report remains.

### VR-05 — Local-only send stub

**Estimate:** 45 minutes

- [ ] Add a replaceable submission adapter.
- [ ] Implement only a local stub returning `DEMO-VOICE-001` and
  `queued_for_human_review`.

**Manual check:** “Try sending” produces the fixture response without a network
request or claim of delivery.

### VR-06 — Demo-quality manual QA

**Estimate:** 45 minutes

- [ ] Run every check in the agent guide.
- [ ] Fix only problems that damage the stated demo story.
- [ ] Capture three screenshots: record/offline, review/queued, outbox/restart.

**Manual check:** Android debug build succeeds and the clip can be replayed.

### VR-07 — Handoff

**Estimate:** 30 minutes

- [ ] Remove `build/`, `.dart_tool/`, secrets, and IDE caches.
- [ ] Write `HANDOFF.md`: Flutter version, packages, run/build commands,
  changed files, and completed manual checks.
- [ ] Deliver source, screenshots, and a 20–30 second demo clip to the lead.

**Definition of done:** The lead can run the app from the handoff without a
database, API key, or shared repository access.
