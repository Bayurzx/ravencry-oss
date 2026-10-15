# Evidence Briefing Desk — Manual Product Check

## Goal

Verify that the Evidence Briefing Desk presents the correct human decision for
each of its three deterministic cases. This check does **not** need Docker,
database access, API keys, or an internet connection after dependencies are
installed.

## Before you start

- Use the `build-week` branch.
- Open a terminal in `C:\Users\USER\Desktop\code\ravencry\apps\web`.
- Create the Qwen baseline tag before or immediately after this check:

  ```powershell
  git tag -a qwen-submission-2026-07-18 80a276dedc9dd7b6d9d50eef5d6dc6c434a62b98 -m "Qwen hackathon submission baseline"
  git push origin qwen-submission-2026-07-18
  ```

## Start the app

```powershell
npm run dev
```

Open [http://localhost:3000/evidence-desk](http://localhost:3000/evidence-desk).

Expected first screen: **Corroborated sighting** is selected, with a dark
RAVENCRY operator interface, a source timeline, a decision brief, and an
operator gate.

## Check A — Corroborated sighting

Select **Corroborated sighting**.

- [ ] Case subject is **Fatima Bello, age 7**.
- [ ] The timeline shows three source types: citizen report, sighting, and OSINT.
- [ ] At least two sources identify **Sabon Gari Market, Kano**.
- [ ] The Decision Brief says **Ready for human review**.
- [ ] The approval button is enabled.
- [ ] Click approval once. It changes to “Review recorded — escalation prepared.”
- [ ] The note below confirms that no alert was sent by the desk.

**Expected decision:** a human may choose to continue into the existing alert
workflow; the desk itself does not publish anything.

## Check B — Conflicting locations

Select **Conflicting locations**.

- [ ] Case subject is **Yusuf Ibrahim, age 9**.
- [ ] The timeline shows both **Kaduna Central Mosque, Kaduna** and **Kawo Bus
  Stop, Kaduna**.
- [ ] The Decision Brief says **Verify conflict first**.
- [ ] Both conflicting location values are visible under Contradictions.
- [ ] The approval button is disabled and says verification is required.

**Expected decision:** do not widen outreach or approve an alert until a human
verifies which location claim is reliable.

## Check C — Insufficient evidence

Select **Insufficient evidence**.

- [ ] Case subject is **Chioma Okoye, age 6**.
- [ ] The timeline contains only one PWA report.
- [ ] The Decision Brief says **Request more information**.
- [ ] The questions ask for clothing, precise last-seen time, and a safe callback
  method.
- [ ] The approval button is disabled.

**Expected decision:** request clarification through the original channel before
considering any escalation.

## Check D — Responsive and reset behavior

1. Open browser developer tools and switch to a narrow phone viewport (for
   example, 390px wide).

- [ ] No text, button, or panel is clipped.
- [ ] Scenario buttons remain usable.
- [ ] The operator gate remains visible below the other panels.

2. Return to **Corroborated sighting**, approve it, then switch to another
   scenario and return.

- [ ] Approval does not carry over to another scenario.
- [ ] Returning to the corroborated scenario starts with approval unrecorded.

## Result record

Copy this into the primary Codex thread after the check:

```text
Evidence Desk manual check — YYYY-MM-DD
Build: npm run dev
Corroborated: PASS / FAIL
Conflict: PASS / FAIL
Insufficient evidence: PASS / FAIL
Responsive/reset: PASS / FAIL
Screenshot or recording: <path or link>
Issue found: <none or one concrete description>
```

## If something fails

Capture one screenshot, state the scenario and exact expected/actual behavior,
then stop the check. Do not change fixtures or safety copy just to make the
screen look better; report it to Codex so the fix remains traceable.
