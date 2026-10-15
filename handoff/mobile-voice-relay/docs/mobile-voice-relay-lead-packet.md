# RAVENCRY Voice Relay — Lead Handoff Packet

## Purpose

This packet lets the mobile developer build one isolated Flutter companion while
the core team builds the Evidence Briefing Desk. It protects the critical path:
the mobile feature is valuable only if it is delivered as a polished, runnable
module by the handoff deadline. It must never block the core submission.

**Product role:** Voice Relay is the citizen-side start of one RAVENCRY story:

`offline voice sighting -> local outbox -> evidence brief -> human approval -> alert`

It is **not** a second product, Devpost submission, backend, or live emergency
reporting service.

## What you must give the mobile developer

Send a folder or archive named `ravencry-voice-relay-handoff/` containing only:

1. `mobile-voice-relay-agent-guide.md` — the companion execution manual.
2. This lead packet.
3. The three visual references below:
   - `apps/web/home.png`
   - `apps/web/report.png`
   - `apps/web/detail.png`
4. `fixture-voice-sighting.json`, using the fixture in this document.
5. No `.env`, credentials, database dumps, private URLs, real phone numbers, or
   production data.

They do not need the RAVENCRY monorepo, Docker, PostgreSQL, or access to the
shared Git branch. Their delivery returns to you as an archive/patch, which you
alone merge into the Build Week integration branch.

## Product context to share

RAVENCRY is a Nigeria-native missing-persons and rapid-alert platform. Its core
principles are:

- **Any device, any network:** a person may have weak or no data connection.
- **Five languages:** English (`en`), Hausa (`ha`), Yoruba (`yo`), Igbo (`ig`),
  and Nigerian Pidgin (`pcm`).
- **Trust by design:** reports require human review before a public alert.
- **Low-bandwidth-first:** clear screens, large controls, no heavy animation,
  and explicit offline states.

The existing web PWA uses a compact dark interface:

| Token | Value | Use |
| --- | --- | --- |
| Background | `#0A0A0A` | Full screen |
| Card | `#1A1A1A` | Panels/outbox items |
| Foreground | `#FAFAFA` | Main text |
| Muted text | `#A3A3A3` | Supporting copy |
| Border | `#262626` | Dividers |
| FLASH/red | `#DC2626` | Primary urgent action only |
| Priority/amber | `#F59E0B` | Warnings |
| Success/green | `#22C55E` | Saved/complete states |

Use the system font and large touch targets. Immediate danger must always point
to **112**, without claiming that the app contacted emergency services.

## Canonical demo fixture

This is fictional demonstration data. It corresponds to an existing RAVENCRY
mock alert and deliberately describes a *sighting*, not a confirmed outcome.

```json
{
  "client_submission_id": "demo-voice-001",
  "known_case_id": "NR-2026-000001",
  "kind": "sighting",
  "language": "ha",
  "transcript": "Na ga Fatima Bello, yarinya mai shekara bakwai, kusa da Kasuwar Sabon Gari a Kano da misalin karfe tara na safe.",
  "english_gloss": "I saw Fatima Bello, a seven-year-old girl, near Sabon Gari Market in Kano at about nine in the morning.",
  "location_label": "Sabon Gari Market, Kano",
  "captured_at": "2026-07-20T08:15:00+01:00",
  "status": "queued"
}
```

Use this data in screenshots, video, and the local stub. Do not use a real
person, a real disappearance, or a real phone number.

## Shared integration contract

The Flutter feature owns local capture and persistence. The core project owns
all server behavior. The boundary is a single replaceable submission adapter.

```dart
class VoiceRelayReport {
  final String clientSubmissionId;
  final String? knownCaseId;
  final String kind; // sighting
  final String language; // en | ha | yo | ig | pcm
  final String transcript;
  final String locationLabel;
  final DateTime capturedAt;
  final String? audioLocalPath;
  final String status; // queued | sent_stub | failed
  final bool consentConfirmed;
}

abstract class VoiceRelaySubmissionAdapter {
  Future<SubmissionResult> submit(VoiceRelayReport report);
}
```

The local-only adapter must return:

```json
{
  "status": "queued_for_human_review",
  "case_reference": "DEMO-VOICE-001",
  "message": "Saved for human review. This demo has not contacted emergency services."
}
```

Do not expose the existing backend URL or attempt a production request in the
mobile task. At integration, replace the adapter only after the core endpoint
and manual integration test are working.

## Communication contract

### One async status update each day

The mobile developer sends this in the agreed channel by 6:00 PM WAT:

```text
Voice Relay status — YYYY-MM-DD
Completed: VR-__
Build/run proof: <screenshot or 15-sec clip>
Current blocker: <one concrete issue, or none>
Next: VR-__
Decision needed from lead: <yes/no; exact question>
```

### Escalation and decisions

- The developer may decide local Flutter architecture and visual details.
- The lead decides product scope, wording about safety, fixture changes, and any
  claim involving real delivery or emergency services.
- Ask one concrete question with a screenshot; do not wait silently for a broad
  review.
- No direct commits to the shared Build Week branch. No worktree sharing.

### Review moments

1. **First runnable screen:** lead checks visual direction and safety copy.
2. **Offline outbox:** developer sends a restart proof.
3. **Handoff:** lead runs the app independently before accepting it.

## Quality gates before integration

- Android debug build succeeds.
- Application works with airplane mode enabled after first launch.
- A queued report survives force-close/reopen.
- Permission denial yields a clear text-only fallback.
- The stub result says **human review**, not alert sent/delivered.
- The interface contains no secrets, real data, copyrighted audio, or unsupported
  claims.

## Lead integration checklist

1. Verify the archive has no `build/`, `.dart_tool/`, credentials, or secrets.
2. Copy the folder into `apps/voice-relay/` on the Build Week branch.
3. Run the supplied Flutter commands yourself on a clean checkout.
4. Repeat the manual checklist with airplane mode and microphone denial.
5. Add a short, accurate README section and include the feature in the video
   only after steps 1–4 succeed.
6. If the handoff misses **Monday 20 July, 10:00 AM WAT**, cut it without
   changing the core Evidence Briefing Desk scope.

## Important submission protection

The Build Week Devpost entry is one RAVENCRY submission. Describe Voice Relay as
an optional offline intake companion and the Evidence Briefing Desk as the core
meaningful extension. Keep the Qwen submission/page unchanged. Do not represent
a local stub as a deployed public-safety channel.
