# Security Policy

## Reporting a vulnerability

**Please do not open a public issue for security problems.**

Report privately by using GitHub's
[Report a vulnerability](https://docs.github.com/en/code-security/security-advisories/guidance-on-reporting-and-writing-information-about-vulnerabilities/privately-reporting-a-security-vulnerability)
form under the **Security** tab of this repository. That opens a private advisory visible only to
maintainers.

If you cannot use that form, contact a maintainer directly.

### What to include

- A description of the issue and its impact.
- Steps to reproduce, or a proof of concept.
- The affected component (for example `services/api`, `services/ussd`, `apps/web`).
- Whether you believe the issue is already public.

### What to expect

- Acknowledgement within **7 days**.
- An assessment and severity triage within **14 days**.
- Credit in the advisory once a fix ships, unless you prefer to remain anonymous.

## Scope

This is a **kidnapping and missing-persons reporting system**. Reports may contain personal data
about vulnerable people. Please treat anything you discover as sensitive and report it privately
rather than publishing it.

### In scope

- The services under `services/` and the web app under `apps/web/`.
- Credential handling, phone-number encryption, and operator authentication.
- Access-control flaws, injection, and data exposure.

### Out of scope

- Denial of service against infrastructure you do not own.
- Vulnerabilities in third-party dependencies with no exploit path in this codebase — report those
  upstream (see also `vendor/crucix/NOTICE.md`).
- Findings that require a compromised device or an already-privileged operator account.

## Handling of secrets

This repository is public. **Never commit credentials.** Real values belong in `.env`, which is
gitignored. Only `.env.example` is tracked, and it must contain placeholders exclusively.

If you find a real credential in the repository or its history, report it privately, do not use it,
and do not disclose it.

## Design constraints that are intentionally not vulnerabilities

These are deliberate product decisions, not flaws:

- **No autonomous broadcast.** Every alert requires explicit human operator approval. Reports that
  the system "could" auto-send are working as designed.
- **No facial recognition** and no raw biometric storage.
- **No verified-model claims** that the system cannot substantiate.
