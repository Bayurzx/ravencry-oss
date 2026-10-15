# RAVENCRY Voice Relay — Mobile Developer + Codex Guide

## Read this first

You are building **Voice Relay**, an isolated Flutter companion for RAVENCRY.
You are not building a separate product and you are not touching the shared
repository, backend, database, or Devpost submission.

Your job is to make a credible offline mobile interaction that can later feed
the RAVENCRY Evidence Briefing Desk. A report is only **queued for human review**;
it is never automatically broadcast or sent to emergency services.

## Success in one sentence

On Android, a person can record or use a text fallback for a fictional Hausa
sighting, save it locally while offline, reopen the app to see it in an outbox,
and use a local stub to show that it is queued for human review.

## Hard boundaries

- Work only in your own isolated folder/repository.
- Do not request or use `.env` files, API keys, database access, production URLs,
  or the shared Git branch.
- Do not build real sync, authentication, maps, push notifications, cloud
  services, alert broadcasting, transcription, or a new backend.
- Do not use real people, case data, phone numbers, or copyrighted music.
- Do not rename the feature or create a Devpost page. The project name remains
  RAVENCRY.
- Ask the lead before changing the fixture, safety wording, or payload contract.

## Setup

1. Create a fresh local Flutter workspace named `voice_relay`.
2. Put this guide and the lead packet in the workspace root.
3. Use your normal Flutter Android toolchain and emulator/device.
4. Keep your Codex workspace sandboxed to this folder. Approve only ordinary
   dependency installation and local build actions; do not grant it access to
   the RAVENCRY production repository or accounts.
5. Create a single pinned Codex thread named `RAVENCRY Voice Relay — Mobile`.
   Keep the whole feature in that thread so its context does not fragment.

### Recommended Codex workflow

- Use GPT-5.6 Terra at **high** reasoning for the first architecture and
  implementation pass; use a lower/medium setting for small visual or cleanup
  tasks if your credits are limited.
- At the start of each Codex turn, name exactly one task ID from the todo below
  and its acceptance criterion.
- Ask Codex to inspect the current code before editing, make the smallest change,
  run the relevant manual build/check, and report changed files.
- Do not use parallel agent work, broad refactors, or speculative feature work.
- You do not need `/feedback` for this isolated helper thread. The project lead's
  primary Build Week thread is the submission evidence thread.

### First message to your Codex agent

```text
Read mobile-voice-relay-agent-guide.md and mobile-voice-relay-lead-packet.md.
We are implementing only the next unchecked VR task. This is an isolated Flutter
workspace with no backend, database, API key, or production URL. Use the supplied
fictional fixture only. Keep all report results labelled "queued for human review";
never claim a report was sent or an alert was issued. Before editing, summarize
the task, acceptance criterion, files you expect to touch, and the smallest
manual verification. Then implement it and report the result.
```

## Visual and language direction

- Dark background `#0A0A0A`, cards `#1A1A1A`, white text `#FAFAFA`, muted text
  `#A3A3A3`, red primary action `#DC2626`, green success `#22C55E`.
- Use system fonts, 16px-or-larger form text, large touch targets, and very
  little animation. Design for a slow connection and a worried user.
- The selectable language codes are `en`, `ha`, `yo`, `ig`, and `pcm`.
- Display: “If you are in immediate danger, call 112.”

## Fixture and contract

Use the `fixture-voice-sighting.json` supplied by the lead. It represents a
fictional sighting connected to `NR-2026-000001`.

Implement this minimal payload shape:

```dart
class VoiceRelayReport {
  final String clientSubmissionId;
  final String? knownCaseId;
  final String kind;
  final String language;
  final String transcript;
  final String locationLabel;
  final DateTime capturedAt;
  final String? audioLocalPath;
  final String status;
  final bool consentConfirmed;
}
```

Keep submission behind an interface. Your only implementation is a local stub
that returns `DEMO-VOICE-001` with `queued_for_human_review`.

## Todo board

Mark a task complete only after its manual check passes.

| ID | Task | Done when |
| --- | --- | --- |
| VR-00 | Scaffold and safety shell | `flutter run` works; dark RAVENCRY title, 112 safety line, and offline badge are visible. |
| VR-01 | Language + consent | User chooses one of five languages and must acknowledge human review before continuing. |
| VR-02 | Voice capture | Hold-to-record starts/stops a local recording. If permission is denied/unavailable, text fallback is usable. |
| VR-03 | Fixture review card | The fictional Hausa transcript, English gloss, location, capture time, selected language, and “not sent yet” state are clear. |
| VR-04 | Persistent outbox | Save one queued report locally; force-close/reopen and it remains. |
| VR-05 | Local stub result | “Try sending” returns `DEMO-VOICE-001` and clearly says it is queued for human review. |
| VR-06 | Manual QA | Complete every checklist item, capture proof, and fix only defects that affect the demo story. |
| VR-07 | Handoff | Produce the archive, `HANDOFF.md`, screenshots, and short clip; send them to the lead. |

## Manual QA checklist

- [ ] Fresh install opens successfully.
- [ ] Language selection persists through the current report flow.
- [ ] Consent is required before queueing.
- [ ] Microphone permission is requested.
- [ ] Permission denial presents a usable text-only path.
- [ ] Start/stop creates a local audio item or a clearly labelled deterministic
      demo recording.
- [ ] Airplane mode does not prevent queueing.
- [ ] Force-close/reopen retains the queued report.
- [ ] Stub sends no network request and returns `DEMO-VOICE-001`.
- [ ] Android debug build succeeds.

## Daily communication

Send the lead one message by 6:00 PM WAT:

```text
Voice Relay status — YYYY-MM-DD
Completed: VR-__
Proof: <screenshot or short clip>
Blocker: <one specific issue, or none>
Next: VR-__
Decision needed: <exact yes/no question, if any>
```

Send an immediate message—not a code dump—if a boundary or safety wording is
unclear. The lead decides scope and claims; you decide Flutter implementation.

## Handoff package — due Monday 20 July, 10:00 AM WAT

Deliver:

1. The complete `voice_relay/` source folder, excluding `build/`, `.dart_tool/`,
   secrets, and IDE caches.
2. `HANDOFF.md` with Flutter version, packages used, exact run/build commands,
   changed files, and the completed QA checklist.
3. Three screenshots: recording/offline, review/queued, outbox after restart.
4. One 20–30 second silent or voiceover-free demo clip.

After handoff, do not make more scope changes unless the lead asks. The lead will
independently run the app and decide whether Voice Relay joins the final video.
