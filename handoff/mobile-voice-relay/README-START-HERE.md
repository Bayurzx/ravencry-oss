# RAVENCRY Voice Relay — Start Here

This bundle is an **isolated Flutter task** for the RAVENCRY Build Week team.
It contains everything needed to build the Voice Relay companion without access
to the RAVENCRY backend, database, secrets, or shared Git repository.

## How to use this bundle

1. Extract this folder anywhere outside the shared RAVENCRY repository.
2. Create an empty Flutter workspace named `voice_relay` beside this bundle.
3. In Codex, open **only** the `voice_relay` workspace, create a pinned thread
   called `RAVENCRY Voice Relay — Mobile`, and use the first prompt in
   `docs/mobile-voice-relay-agent-guide.md`.
4. Read documents in this order:
   - `docs/mobile-voice-relay-agent-guide.md`
   - `docs/mobile-voice-relay-todo.md`
   - `docs/mobile-voice-relay-lead-packet.md`
5. Use `fixtures/voice-relay-sighting.json` for every demo state. The images in
   `references/` are visual inspiration, not source code to modify.
6. Complete the todo in order. Send the daily status update to the project lead
   by 6:00 PM WAT.
7. At handoff, deliver the Flutter source folder, `HANDOFF.md`, three screenshots,
   and a 20–30 second demo clip. Do not include build artifacts, API keys, or
   private data.

## Safety and scope

The app saves a fictional report locally and queues it for **human review**. It
must never claim that a report has been sent, that an alert has been issued, or
that emergency services have been contacted. If the user is in immediate danger,
the interface must tell them to call 112.

**Handoff deadline:** Monday 20 July, 10:00 AM WAT.
