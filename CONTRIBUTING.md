# Contributing to RAVENCRY

Thank you for helping. This is an anti-kidnapping and missing-persons alert system, so correctness
and safety matter more than speed.

## Before you start

Read, in order:

1. [`README.md`](./README.md) — what the project is and how to run it.
2. [`docs/backlog.md`](./docs/backlog.md) — what is actually open right now.
3. [`docs/feature-map.md`](./docs/feature-map.md) — the full intended feature set.
4. [`prompt-system/specs/build-week-2026.md`](./prompt-system/specs/build-week-2026.md) — the active
   delivery board. **Check task ownership and dependencies here before starting work.**
5. [`SECURITY.md`](./SECURITY.md) — how to report vulnerabilities.

## Non-negotiable design constraints

These define the product. A change that breaks one of them will be rejected regardless of quality:

1. **No autonomous broadcast.** An alert must always require a visible, explicit human approval step.
   Never remove or bypass the operator decision gate.
2. **No facial recognition**, and no storage of raw biometric data.
3. **No unverifiable model claims.** Do not document or display a model, provider, or capability that
   the code does not actually use.
4. **Evidence must be traceable.** A brief must cite its sources, capture times, and confidence.
5. **Demonstrable or deterministic.** Features must be verifiable live or from committed fixtures.

## Getting set up

```bash
git clone <repo-url>
cd ravencry
cp .env.example .env      # then fill in your own values
npm install               # per-service installs are described in README.md
```

**Never commit `.env`.** It is gitignored. Only `.env.example` is tracked, and it must contain
placeholders only — no real hostnames, resource IDs, keys, phone numbers, or personal emails.

⚠️ **`.env` gotcha:** do not put inline comments after a value.

```dotenv
LLM_MODEL=            # correct — truly empty
LLM_MODEL=   # note    # WRONG — dotenv reads "# note" as the value
```

## Making a change

1. **Branch** from the current default branch. Use a descriptive name
   (`fix/ussd-rate-limit-postgres`, `docs/backlog-cleanup`).
2. **Keep commits scoped.** One concern per commit, message describing the *feature or fix*, not the
   file touched.
3. **Never commit** credentials, real personal data, generated plans or state
   (`*tfplan*`, `*.tfstate`), or build output.
4. **Test** what you changed. Run the narrowest relevant test, and broaden only if needed.
5. **Open a pull request** using the template, and state which constraint above your change touches,
   if any.

## Third-party code

`vendor/crucix/` is derived from the upstream **Crucix** project (AGPL-3.0-only). See
[`vendor/crucix/NOTICE.md`](./vendor/crucix/NOTICE.md).

If you modify anything under `vendor/crucix/`, you **must** keep its `Modified for RAVENCRY` header
accurate. Adding a new modified file means adding that header.

## Licensing

This project is licensed **AGPL-3.0**. By contributing you agree your contribution is licensed under
the same terms. Note that AGPL §13 requires offering source to users who interact with the software
over a network — keep that in mind before introducing code that cannot be published.

## Questions

Open an issue, or see [`docs/backlog.md`](./docs/backlog.md) for what is currently in flight.
