# Trust-by-default

![Editorial illustration of careful human-centred report review](images/05-trust-by-default-hero.png)

*Why a missing-person alert system must prioritize reporting legitimate emergencies over aggressively filtering them out.*

Every minute a FLASH alert is delayed, a kidnapped child stays missing. Every hoax that gets broadcast erodes trust in the system. You cannot optimize for both. You have to pick which failure you can live with.

I picked false positives.

> **Design choice:** a report proceeds unless multiple strong signals justify human review. That is a deliberate trade-off, not a claim that every report is true.

## The math is uncomfortable

QW-04 is RAVENCRY's anti-fake detection module. It reads the raw citizen report plus any attached metadata and returns one of four verdicts: `legitimate`, `suspicious`, `hold_for_review`, or `likely_fake`.

The default is `legitimate`. The trust score starts at 0.7 out of 1.0. The escalation thresholds are: 0–2 red flags with any green flags → `legitimate`; 1–2 red flags with zero green flags → `suspicious`; 3+ red flags with zero green flags → `hold_for_review`; 5+ red flags with known hoax patterns → `likely_fake`. If the model returns a successful but empty or malformed response, the code defaults to `legitimate` with score 0.7. If the provider is down or the API times out, the endpoint returns a `502` error — it does not silently default to `legitimate`.

This is not a bug. This is the most deliberate design decision in the entire architecture.

False positives are bad. A hoax broadcast wastes operator time, annoys subscribers, and erodes the credibility of future alerts. False negatives are catastrophic. A real kidnapping that doesn't get broadcast because the anti-fake system was too cautious. A child who stays missing because the model flagged a legitimate report as suspicious.

Most content moderation systems default to skepticism. Spam filters block by default. Social media platforms suppress first and review later. The cost asymmetry is mild — a blocked email is mildly annoying, a suppressed post is slightly frustrating. The false positive and false negative have comparable costs.

RAVENCRY is not a content moderation system. It's a safety system. The cost asymmetry is extreme. A false positive costs trust. A false negative costs lives. When the costs are that far apart, the design has to reflect it.

## What QW-04 actually looks for

Below is an editorial summary of the red-flag patterns the prompt instructs the model to evaluate. (The actual prompt in `services/llm/src/prompts/antifake.ts` lists six individual red flags — such as generic descriptions, missing location details, and WhatsApp-forward formatting — rather than named categories.)

Narrative inconsistencies. QW-04's prompt instructs the model to evaluate the report text for internal contradictions — a description that doesn't match the reported circumstances, clothing details incompatible with the season mentioned in the text, or a timeline that doesn't add up within the narrative itself. A report describing a child in heavy harmattan clothing said to have disappeared in July is a red flag. Note: QW-04's endpoint receives only the report text, an optional reporter phone, and a numeric similar-report count. It does not receive images, EXIF data, weather data, device timestamps, or device-location data. EXIF parsing, reverse-image search, and device-location cross-referencing are specified but not integrated.

Impossible timelines within the narrative. Reports where the text itself describes events that are physically contradictory — the reporter says the incident happened in two distant locations at the same time, or claims they witnessed something impossible given the stated sequence. QW-04 evaluates the internal consistency of the narrative as written, not against external location or timestamp data.

Report volume. QW-04 receives a numeric `similar_reports_count` — the number of reports from the same area in the past 24 hours. A sudden spike may suggest a coordinated campaign. However, QW-04 cannot compare the actual wording across reports; it only sees a count, not the other reports' text. Cross-report text comparison would require a separate batch process.

Missing verifiable details. Real reports contain specific, messy details. The child was wearing a red sweater with a tear on the left sleeve. The last sighting was near the yellow container at the junction. Fake reports are vague — "a child was taken" with no clothing description, no exact location, no distinguishing marks. QW-04 scores report specificity.

Format anomalies. All-caps text, excessive punctuation, chain-message formatting, WhatsApp forward indicators. These aren't definitive proof of a hoax. People in distress sometimes type in all caps. But combined with other flags, they contribute to the pattern.

Three red flags. Not two. Not one. Three. The threshold is high because the cost of getting it wrong in the direction of suppression is unacceptable.

## Intended workflow when QW-04 flags a report

QW-04 is not currently wired into the report approval pipeline or an operator review queue. The intended workflow: when QW-04 returns `hold_for_review` or `likely_fake`, the report should go to an operator review queue with a flag explaining which red flags triggered the hold. A human would review the report, the metadata, and QW-04's analysis, then decide.

The intended design gives operators full override authority in either direction. If QW-04 flagged a legitimate report, the operator upgrades it and the broadcast proceeds. If QW-04 missed something, the operator can suppress even without three red flags. In the intended design, the final decision is always human — but note: when demo auto-approve (`AUTO_APPROVE_FLASH=true`) is enabled, broadcasts can proceed without human review or QW-04 enforcement at the gateway level.

In auto-approve mode — `AUTO_APPROVE_FLASH=true` — the approval route does not currently call QW-04 before broadcasting. The anti-fake check exists in the prompt system and the LLM service, but the approval pipeline is not yet wired to enforce QW-04's verdict at the gateway level. The intended design is that QW-04 acts as the gate and the operator as the backstop; the deployed code still needs that integration.

During the hackathon demo, auto-approve was on. The pipeline ran from citizen report to broadcast with zero human intervention. No false broadcasts were observed in our limited test cases. The trust-by-default design means that statistic doesn't prove much — we didn't test against sophisticated hoaxes, and the test corpus was small. But the architecture is correct. The implementation will catch up.

## What's missing

Reverse image search is the biggest gap. QW-04 analyzes report text only — its endpoint receives text, an optional reporter phone, and a similar-report count. It does not receive images, EXIF data, or device metadata. A photo recycled from a news article six months ago, stripped of metadata and re-uploaded, passes QW-04's checks because there's nothing in the text to flag.

Google Vision or TinEye integration would close this. Submit the photo to a reverse image search API. If the same image appears on a news site from three months ago, that's an immediate red flag. This integration would need to be built — the current prompt schema does not include a `reverse_image_search_hits` field, and no reverse-image API is called.

Cross-report correlation is the second gap. QW-04 evaluates each report in isolation. It can't compare three reports submitted within ten minutes from different phone numbers using slightly different wording to describe the same alleged incident. That correlation requires a batch process that runs after individual report evaluation. The design exists. The implementation doesn't.

Reporter credibility tracking is the third gap. A phone number that has submitted three accurate reports with confirmed sightings should have a higher trust baseline than a new number. A number that has submitted two reports that operators later marked as false should start with a lower baseline. The trust scoring formula is specified. The history tracking database isn't built.

## Why trust-by-default is not naivety

There's a common objection: "You're making it too easy to abuse the system."

The alternative is worse. Every friction point I add to prevent hoaxes also prevents legitimate reports. A citizen in Katsina with a feature phone and limited airtime is not going to complete a CAPTCHA, verify their identity, and submit supporting documentation before reporting a missing child. They're going to dial the USSD code, type what they can, and hope the system hears them.

If the system doesn't hear them because the anti-fake layer is too aggressive, they won't try again. They'll call their neighbors. They'll go to the police station. They'll do what people in Katsina have always done when a child goes missing, which is not enough, which is why we built this.

Trust-by-default is not naivety. It's the recognition that the cost of missing a real report far exceeds the cost of broadcasting a fake one. Most systems optimize for the wrong failure mode because both failure modes seem symmetric. They're not. And once you see the asymmetry, the design decision makes itself.

QW-04 is a hundred and fifty lines of prompt text and about a second of inference on qwen-plus. It costs fractions of a cent per check. It's the last line of defense between a hoax and thousands of phones. And its default answer is yes.