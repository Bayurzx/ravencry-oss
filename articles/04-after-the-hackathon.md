# After the hackathon

![Editorial illustration of a prototype becoming a durable public-service system](images/04-after-the-hackathon-hero.png)

*The distance between a working demo and a service people can safely depend on.*

Thirty-nine hours built a working system. Eleven Docker containers, fifteen database migrations, thirty-four OSINT sources, five Nigerian languages in the AI pipeline. `docker compose ps` shows green across the board.

That's the snapshot. Here's the gap between the snapshot and a system that makes a difference.

> **Scope note:** this is a candid roadmap, not a claim that the current hackathon build is production-ready.

## What the demo didn't show

The three-minute video judges saw was the happy path. WhatsApp voice note comes in. Whisper transcribes. Qwen extracts and classifies. FLASH alert fires. Telegram broadcast goes out. Architecture diagram fades in. Eleven services, all healthy. One command.

What they didn't see: the phone numbers in the database are fake. The NAPTIP bridge is a mock that returns 200 and logs the payload. The ops dashboard is an empty Appsmith container. The SMS service only works because of a sandbox env var that routes everything to my personal test phone. The rate limiting fails open — which is architecturally correct for a safety system, but means an attacker could flood the pipeline with fake reports and there's nothing stopping them yet.

None of this is hidden. It's documented in the repo. The `pending_fix.md` file lists every gap. The design documents specify AES-256-GCM phone encryption, KMS key management, reverse image search for anti-fake, proper operator authentication. The code just doesn't do those things yet.

For a hackathon, that's the right call. The architecture proves the concept. The implementation details prove it can be built. The gaps prove I know what's left.

## The encryption gap

This is the one that bothers me most.

Migration 008 creates a `subscribers` table with `phone_encrypted BYTEA` and `phone_hash_sha256 TEXT` columns. The design is clean: store the phone number encrypted with AES-256-GCM, key in AWS Secrets Manager, decrypt at send time via `decryptPhone()`. The subscriber gets SMS alerts. Their number is never stored in plaintext.

`decryptPhone()` doesn't exist. There's no key in Secrets Manager. The seed data uses mock BYTEA values. The SMS service works because of `AT_SANDBOX_TEST_PHONES` — n8n sends subscriber UUIDs to the SMS service, which ignores them and sends everything to the hardcoded sandbox numbers instead.

If I unset that env var, the SMS service returns mock success without sending real SMS. The design is correct. The implementation is deferred. It's the first thing any production deployment needs to fix.

## The trust problem

Right now every report gets the same initial trust score. There's no reporter credibility history, no corroboration weighting, no metadata quality assessment. The trust scoring formula is specified in the optimization review — prior accuracy weighted at 0.4, metadata quality at 0.3, corroboration count at 0.2, proximity to incident at 0.1 — but none of it is implemented.

For a system that broadcasts alerts to thousands of subscribers, trust scoring is the difference between useful signal and noise. One bad actor with a grudge can submit fake kidnapping reports. Without credibility tracking, every report looks the same.

The anti-fake pipeline helps — QW-04 catches obvious hoaxes through textual analysis and metadata checks. But reverse image search isn't wired in. Google Vision or TinEye integration would catch recycled photos being passed off as current kidnapping evidence. That's a post-hackathon item. The prompt is written. The API integration isn't.

## The V2 roadmap

**Proposals under evaluation (V2):** These are hypotheses requiring legal, technical, and community-governance validation — not fact-checked capabilities.

Facial recognition is a proposed feature that could change operational reality. If implemented, when a citizen reports a sighting of a missing person, every sighting would be automatically matched against active missing person cases with confidence scores, blurry image enhancement, and gait analysis as a fallback when the face isn't visible. Significant privacy, consent, and regulatory review would be required before deployment.

License plate recognition on Nigerian roads would be a substantial training challenge. Plates are dirty, partially obscured, sometimes hand-painted. A model trained on clean European plates may perform poorly unless evaluated and adapted to Nigerian plate conditions. This would require a custom model trained on Nigerian plate patterns — the specific fonts, colors, state codes, and deterioration patterns that make Nigerian plates distinct.

Radio and TV broadcast automation could extend reach to the population that doesn't have smartphones. Auto-generate broadcast-ready alert text in Hausa, Yoruba, Igbo, and English. Push to NTA, Channels TV, local radio stations. The same FLASH alert that hits Telegram could be read on air within minutes. This would require formal media partnerships.

The case deduplication algorithm is specified but not implemented. When three different news sources report the same kidnapping, or when a citizen report and an OSINT sweep describe the same incident, the system needs to recognize that and merge them into one case. `pg_trgm` headline similarity gets part of the way there. Cross-referencing location, time, victim count, and circumstance would close the gap.

## The V3 vision

> **Scope note:** the following are long-term hypotheses requiring legal, technical, and community-governance validation. None are implemented or fact-checked capabilities.

This is where the project either scales or stays a hackathon demo.

A CCTV camera network would change the search radius from kilometers to meters. Filling stations, malls, banks, churches, schools — every institution with cameras becomes a node in a federated search network. The raw video stays on-premise. The system sends queries: "Have you recorded a child matching this description in the last six hours?" The camera owner's system runs the match locally and returns only a confidence score and timestamp. Privacy-preserving. Scalable. Hard to build.

Drone aerial feeds for search operations in rural areas. Thermal imaging for night searches. AI that detects human shapes, abandoned vehicles, and bush camp patterns from aerial footage. This exists in military contexts. Adapting it for civilian search and rescue, optimized for Nigerian terrain and vegetation patterns, is a year-long project.

Telecom CDR data from MTN, Airtel, Glo, and 9mobile for movement anomaly detection. If a phone that normally stays within a five-kilometer radius suddenly moves three hundred kilometers and goes dark, that's a signal. This requires MNO partnerships and a legal framework that doesn't exist yet. It's the hardest V3 item and potentially the most impactful.

Satellite imagery from Planet Labs or Sentinel-2 for forest camp detection in the northwestern states. Kidnappers set up temporary camps in forested areas between operations. Thermal anomaly detection from satellite passes could identify new camps before they're used. The resolution isn't high enough for individual identification, but it's high enough for camp detection.

Audio intelligence — gunshot detection, distress keyword spotting, voice biometrics, regional dialect geolocation — would turn every voice note into multiple intelligence signals. Right now Whisper transcribes and Qwen extracts. The audio itself contains more information than the transcript captures.

## What needs to happen first

Before any V2 features, four things need to be production-hardened.

Phone encryption. `decryptPhone()` function, KMS key in Secrets Manager, real BYTEA values in the subscriber table. Without this, SMS delivery can't leave the sandbox.

Operator authentication hardening. The API now has a login route with bcrypt password hashing, JWT signing via `signToken`, `requireAuth` middleware, and `requireRole` middleware on operator endpoints. The `operators` table is in active use. Demo mode (`AUTO_APPROVE_FLASH=true`) can bypass auth — that's the hackathon trade-off, not a missing implementation. Production hardening means adding token rotation, session expiry, MFA, and removing the auto-approve bypass.

Circuit breaker on Africa's Talking. Three consecutive SMS failures should skip SMS delivery for that broadcast cycle and alert the ops channel. Without this, a single AT outage cascades into sequential timeouts across the entire subscriber list.

A proper ops dashboard. Appsmith is running but empty. Operators need case lists, approval queues, sighting maps, source health monitors, and broadcast status panels. The Telegram bot works for demo, but a real operations team needs a real dashboard.

## The partnership question

RAVENCRY can't scale as a solo project. Four partnerships are non-negotiable.

Mobile network operators. MTN, Airtel, Glo, 9mobile need to zero-rate the USSD code so citizens don't pay for emergency reports. Africa's Talking provides the infrastructure. The MNOs provide the billing exemption. Without zero-rating, every report costs the citizen airtime, which suppresses usage in the communities that need it most.

Government integration. NAPTIP (National Agency for the Prohibition of Trafficking in Persons) is the government agency responsible for combating human trafficking and related forms of violence against persons. It has participated in missing-child alert partnerships, but its core statutory remit is trafficking in persons. The NAPTIP bridge is mocked right now. Real integration requires a formal partnership, an API key, and a data-sharing agreement. The Nigeria Police Force has an emergency response system that RAVENCRY's alert data could feed into. The Nigeria Data Protection Commission (NDPC) is the statutory data-protection authority under the Nigeria Data Protection Act 2023. Deployment would require compliance with the NDP Act and any applicable NDPC obligations.

Media partnerships. Channels TV, NTA, and local radio stations can broadcast FLASH alerts to audiences that don't have internet access. The broadcast automation module generates the alert text. The media partnership gets it on air.

Community organizations. NGOs operating in high-risk LGAs — Zamfara, Kaduna, Katsina, Borno, Sokoto — have trust relationships with communities that a technology platform can't replicate. They know who to call when an alert goes out. They know which reports are credible and which are local disputes being weaponized. The technology amplifies their existing work. It doesn't replace it.

## The honest timeline

| Horizon | Focus |
|---|---|
| Weeks 1–4 | Phone encryption, operator authentication, an SMS circuit breaker, and an ops dashboard—the four production blockers. |
| Months 2–3 | Trust scoring, reverse image search, case deduplication, and broadcast automation: the V2 core. |
| Months 4–6 | Facial recognition, license-plate recognition, and radio/TV broadcast integration. |
| Months 7–12 | A CCTV-federation pilot in one LGA, a drone-search partnership with one NGO, and zero-rating with one carrier—prove value locally before pursuing national deployment. |
| Year 2 | Telecom CDR access, satellite imagery, and audio intelligence, all dependent on regulatory frameworks and major partnerships. |

This timeline assumes funding. It assumes the hackathon leads to something — a grant, a fellowship, a partner organization with resources. If it doesn't, the code is public. The architecture is documented. The design decisions are explained. Anyone can pick up where thirty-nine hours left off.

The system works. Not in the way that changes a country yet. In the way that proves it's possible. Eleven containers, one command, five languages, zero barriers to entry for the person holding a feature phone in Zamfara trying to report a missing child. The rest is just time and resources.