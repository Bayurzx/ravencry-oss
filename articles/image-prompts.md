# Image direction for the RAVENCRY article series

Use one hero image per article. Add an inline image only where it explains a concrete system decision. Keep every image editorial rather than decorative.

## Shared direction

- **Format:** 16:9 landscape, at least 1600 × 900 pixels.
- **Visual language:** restrained editorial technology illustration or documentary-style photography; dark charcoal, muted indigo, warm amber, and small signal-red accents.
- **Composition:** leave comfortable negative space for a title overlay, but do not render the title into the image.
- **Always avoid:** text, UI labels, watermarks, logos, invented metrics, legible secrets, visible phone numbers, identifiable real people, sensational imagery, military imagery, and generic padlock/shield stock-art.
- **For product evidence:** prefer a real, redacted screenshot over a generated approximation. Do not generate cloud-console screens, terminal output, dashboards, or Terraform plans that could appear authentic but are not.

---

## 01 — Moving to Alibaba Cloud

### Hero (optional generated editorial image)

```text
Use case: stylized-concept
Asset type: technical blog hero image, 16:9 landscape
Primary request: an editorial illustration about moving a small web application to cloud infrastructure
Scene/backdrop: a calm nighttime operations desk; a single server instance represented by a small illuminated compute node inside a clean network boundary, connected to the internet through one distinct elastic address
Style/medium: premium editorial technology illustration, subtle isometric depth, not a product UI
Composition/framing: wide composition with negative space on the left for a headline; the infrastructure cluster on the right
Lighting/mood: quiet, methodical, reassuring
Color palette: charcoal, muted Alibaba-orange-adjacent amber without logos, slate blue, small signal-red accents
Constraints: communicate VPC, compute, network boundary, and deployment ownership visually without labels or text
Avoid: vendor logos, UI panels, code, terminal text, generic floating cloud icons, watermark
```

### Inline evidence — capture, do not generate

- A redacted ECS instance-details screenshot after the introduction.
- The existing `architecture.png` after the Terraform section.
- A clean, redacted terminal crop showing cloud-init completion or `docker compose ps` after the bootstrap section.

---

## 02 — Every service in its place

### Hero

```text
Use case: infographic-diagram
Asset type: technical blog hero image, 16:9 landscape
Primary request: a clear architectural illustration of a deliberately small multi-service deployment
Scene/backdrop: one server host containing distinct, calmly organized service blocks that connect to a central PostgreSQL data layer and an external alert-delivery edge
Style/medium: clean editorial systems diagram with soft depth and simple geometric forms, no text
Composition/framing: wide horizontal flow; an ingress edge at left, service cluster in the centre, data and delivery paths on the right; generous negative space above
Lighting/mood: precise, calm, intentional
Color palette: dark charcoal background, muted indigo services, warm amber data flow, restrained red only for alert paths
Constraints: make the "one host, many focused services" idea immediately legible without labels
Avoid: logos, tiny illegible labels, dashboards, Kubernetes imagery, watermark
```

### Inline evidence — use the real asset

- Use `architecture.png` after the opening. It is stronger and more credible than an invented infrastructure diagram.

---

## 03 — Teaching machines to hear Hausa

### Hero

```text
Use case: illustration-story
Asset type: editorial blog hero image, 16:9 landscape
Primary request: a respectful visual of a multilingual Nigerian missing-person report becoming a structured emergency alert
Scene/backdrop: a simple feature phone and a smartphone at opposite sides of the frame; speech or message signals move through an abstract language-processing path into a clear alert signal
Subject: technology serving people across Hausa, Yoruba, Igbo, Pidgin, and English without displaying written words
Style/medium: contemporary editorial illustration, human-centred, culturally grounded but not stereotyped
Composition/framing: wide composition; leave upper-left negative space for headline; message flow moves left to right
Lighting/mood: urgent but hopeful, attentive, dignified
Color palette: deep indigo, warm sand, small amber and signal-red highlights
Constraints: no visible text, no flags, no map labels, no distressed or identifiable child, no product logos
Avoid: sci-fi robot faces, surveillance imagery, watermark
```

### Optional inline image

```text
Use case: scientific-educational
Asset type: supporting article illustration, 16:9 landscape
Primary request: an abstract four-stage language-processing pipeline from raw spoken or typed report to extracted facts, urgency classification, news corroboration, and authenticity review
Style/medium: clean educational illustration with four distinct visual stages, no labels or text
Constraints: show uncertainty and human-review routing as part of the flow
Avoid: fabricated model performance charts, UI mockups, logos, watermark
```

---

## 04 — After the hackathon

### Hero

```text
Use case: stylized-concept
Asset type: reflective technical blog hero image, 16:9 landscape
Primary request: a working prototype on a workbench transitioning into a responsibly engineered public-service system
Scene/backdrop: a compact, illuminated prototype with visible unfinished connections; beyond it, a measured path of completed infrastructure elements extends into the distance
Style/medium: restrained editorial illustration, tangible materials, subtle isometric perspective
Composition/framing: prototype in the foreground at right; open roadmap path toward the left background; negative space for headline
Lighting/mood: honest, ambitious, sober rather than triumphant
Color palette: charcoal, muted indigo, warm amber; a small red accent only at the unfinished edge
Constraints: convey a gap between demo and operational readiness without disaster imagery or text
Avoid: rockets, trophy imagery, hype aesthetics, logos, watermark
```

### Optional inline image

- Use a simple native Markdown timeline table rather than a generated roadmap graphic; it will stay accurate when the roadmap changes.

---

## 05 — Trust-by-default

### Hero

```text
Use case: illustration-story
Asset type: ethical-technology blog hero image, 16:9 landscape
Primary request: a human report passing through a careful review system that prioritizes timely help while still routing suspicious cases to a person for review
Scene/backdrop: an abstract public-safety signal travels from a citizen-held phone toward two paths: one continues promptly as an alert, the other reaches a clearly human review desk; both paths remain connected
Style/medium: thoughtful editorial illustration, minimal, no text
Composition/framing: wide horizontal decision flow with the phone at left, a balanced review point in the centre, and the alert/review outcomes to the right
Lighting/mood: serious, humane, non-alarmist
Color palette: dark indigo, warm amber, restrained signal red, soft neutral skin tones only if people are depicted
Constraints: make the trade-off feel deliberate; the human reviewer must be visible as the final safeguard
Avoid: locks, shields, scales of justice, facial-recognition grids, surveillance cameras, watermark
```

---

## 06 — What's open and why

### Hero

```text
Use case: infographic-diagram
Asset type: security-transparency blog hero image, 16:9 landscape
Primary request: a transparent network-boundary illustration showing a small public-facing service with only a few necessary entry paths and several temporary development openings awaiting hardening
Scene/backdrop: a single network perimeter; three clear public paths enter a service boundary while three visibly temporary paths are marked by subtle unfinished construction cues, all without text
Style/medium: clean editorial systems illustration with understated technical geometry
Composition/framing: horizontal network flow; leave space for a headline at upper-left; the boundary and entry paths occupy the right two-thirds
Lighting/mood: candid, responsible, practical
Color palette: charcoal, slate blue, warm amber for necessary paths, muted red for temporary exposure
Constraints: show risk and remediation without implying a breach or showing recognisable brand interfaces
Avoid: padlocks, hacker silhouettes, binary rain, alarm screens, logos, labels, watermark
```

### Inline evidence — capture, do not generate

- Use a redacted Caddy routing excerpt or a simplified hand-authored diagram for the subdomain section.
- Use a small manually maintained port table for the port section; it is clearer than a decorative security image.