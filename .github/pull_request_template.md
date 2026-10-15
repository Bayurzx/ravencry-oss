## What this changes

<!-- One or two sentences. Describe the change, not the files touched. -->

## Why

<!-- The problem it solves. Link the backlog entry or issue if there is one. -->

Closes #

## Component

- [ ] `apps/web`
- [ ] `services/*`
- [ ] `vendor/crucix`
- [ ] `infra`
- [ ] `db/migrations`
- [ ] docs / tooling

## Design constraints

Confirm none of these are broken. See [CONTRIBUTING.md](../blob/HEAD/CONTRIBUTING.md).

- [ ] Alert broadcast still requires explicit human approval
- [ ] No facial recognition or raw biometric storage added
- [ ] No claim of a model/provider the code does not actually use
- [ ] Evidence remains source-linked and traceable

## Checks

- [ ] Tests added or updated for the change
- [ ] Ran the narrowest relevant test locally and it passes
- [ ] No credentials, real personal data, `*tfplan*`, or `*.tfstate` committed
- [ ] If anything under `vendor/crucix/` was modified, its `Modified for RAVENCRY` header is accurate
- [ ] Docs updated if behaviour or setup changed

## Notes for reviewers

<!-- Anything surprising, risky, or worth a second look. -->
