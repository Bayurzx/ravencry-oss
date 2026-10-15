# Working in this repository (fork)

You are in a **fork** of `ravencry-labs/ravencry`, cloned at
`C:\Users\USER\Desktop\code\ravencry-oss`.

`ravencry-labs/ravencry` is the open-source release of RAVENCRY — a Nigeria-native anti-kidnapping
and missing-persons alert platform. Reports arrive over WhatsApp, USSD, SMS, Telegram, and a PWA;
they are triaged into source-linked evidence briefs that a **human operator must approve** before any
alert is broadcast.

---

## 1. What this directory is, and what it is not

| | Path | Role |
|---|---|---|
| ✅ You are here | `C:\Users\USER\Desktop\code\ravencry-oss` | Fork of the public release. Work here. |
| 🌐 Source of truth | `github.com/ravencry-labs/ravencry` | The public upstream. Pull from it, PR to it. |
| 🔒 Unrelated | `C:\Users\USER\Desktop\code\ravencry` | A **separate, private** project on your machine. |

**These are two independent checkouts that happen to share a code lineage.** Do not:
- copy files between them,
- assume a commit in one exists in the other,
- push from one to the other's remote.

> ⚠️ **Do not mention or reference the private project** — not in commits, PRs, issues, comments, or
> docs in this repo. This fork is **public**. Describing a private repository here would disclose it.

---

## 2. Remotes

```
origin     https://github.com/Bayurzx/ravencry-oss.git        (your fork — push here)
upstream   https://github.com/ravencry-labs/ravencry.git      (public source — pull from here)
```

Your fork exists under your personal account as `Bayurzx/ravencry-oss` because `Bayurzx/ravencry`
(the private project) already occupied the plain name.

### Normal loop

```bash
git fetch upstream
git checkout main
git merge upstream/main          # or: git rebase upstream/main
git push origin main             # update your fork

git checkout -b fix/some-thing   # branch for your change
# ...work...
git push -u origin fix/some-thing
gh pr create --repo ravencry-labs/ravencry --base main
```

### Rules

- **Never** `git push --all` or `--mirror` from this fork; push branches explicitly.
- **Never** force-push `main`, and never force-push a branch that has an open PR.
- Prefer `git rebase upstream/main` over merge commits for a clean PR, unless the branch is shared.
- Do not push to `upstream` directly — it is the public release. Open a PR.

---

## 3. Non-negotiable design constraints

These define the product. A change that breaks one will be rejected regardless of quality:

1. **No autonomous broadcast.** An alert must always require a visible, explicit human approval step.
   Never remove or bypass the operator decision gate.
2. **No facial recognition**, and no storage of raw biometric data.
3. **No unverifiable claims.** Do not document or display a model, provider, or capability the code
   does not actually use.
4. **Evidence stays traceable.** A brief must cite its sources, capture times, and confidence.
5. **Demonstrable or deterministic.** Features must be verifiable live or from committed fixtures.

Full list: [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## 4. Secrets — this repo is public

- **Only `.env.example` is tracked.** Real values go in `.env`, which is gitignored. Never commit it.
- **Never commit real personal data.** No real phone numbers, names, or operator emails — in code,
  tests, fixtures, docs, commit messages, or issue text. Use obviously synthetic values such as
  `+2348000000000`.
- **Never commit `*tfplan*` or `*.tfstate`.** A saved Terraform plan embeds live resource IDs from a
  refresh against real infrastructure.

### `.env` gotcha

Do not put inline comments after a value — dotenv reads everything after `=` as the value:

```dotenv
LLM_MODEL=              # correct — truly empty
LLM_MODEL=   # note     # WRONG — the model name becomes "# note"
```

CI runs a **Secret and PII scan** on every push (`.github/workflows/ci.yml`) and will fail the build
if a real `.env` file, a Terraform plan/state file, or a credential-shaped string is tracked.

---

## 5. Verified local setup

Node **22+**, Docker, and a PostgreSQL client. The stack is 8 services under `services/` plus the
vendored `vendor/crucix/` dashboard.

### Docker (recommended)

```bash
cp .env.example .env
# Fill in .env — see section 4. Nothing runs usefully with an empty .env.

# local Postgres
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d dev-postgres
docker compose ps

# 15 migrations live in db/migrations/ (001_extensions.sql … ), apply them in order:
for f in db/migrations/*.sql; do psql "$DATABASE_URL" -f "$f"; done

# full stack
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d
docker compose ps
```

### Per-service (no Docker)

Run from the repo root; each service installs and runs independently.

```bash
cd services/api      && npm install && npm run dev   # :3003
cd services/llm      && npm install && npm run dev   # :3002
cd vendor/crucix     && npm install && npm run dev   # :3001
cd services/telegram && npm install && npm run dev   # :3005
cd services/sms      && npm install && npm run dev   # :3006
cd services/ussd     && npm install && npm run dev   # :3007
```

`services/`: `api`, `llm`, `naptip`, `sms`, `telegram`, `ussd`, `whatsapp`, `whisper`.

### Tests

```bash
cd vendor/crucix && node --test        # 54 tests; needs Node 22+
```

⚠️ Use **bare** `node --test`. On Node 24, `node --test test/` is treated as a module path and fails
with `MODULE_NOT_FOUND`. Integration tests skip themselves when the relevant API key is absent.

---

## 6. Known issues in the current tree

These are real and present as of `9f3dacf`. Fixing any of them makes a good first PR.

### 6a. Four broken links in `README.md`

| Link | Target | Status |
|---|---|---|
| `features.md` | — | ❌ **does not exist** — renamed to `docs/feature-map.md` |
| `hackathon_context.md` | — | ❌ **does not exist** — removed during cleanup |
| `steps3_db_docker.md` | — | ❌ **does not exist** — removed during cleanup |
| `git clone …/your-org/ravencry.git` | — | ❌ placeholder, not a real URL |

Working replacements that **do** exist:

- `docs/feature-map.md` — full feature map
- `docs/backlog.md` — open work
- `db/migrations/` — 15 migrations
- `docker-compose.yml` + `docker-compose.dev.yml`

### 6b. `README.md` "Quick Start — Docker" clone line

`git clone https://github.com/your-org/ravencry.git` is a template placeholder. Point it at
`https://github.com/ravencry-labs/ravencry.git`.

### 6c. `AGENTS.md` references a private board

`AGENTS.md` cites the Build Week delivery board as the active plan. That board is internal delivery
planning, not a public artifact. Treat `AGENTS.md` with caution and consider whether it belongs in
the public release at all.

---

## 7. Licences and third-party code

- This project is **AGPL-3.0** (root `LICENSE`).
- `vendor/crucix/` is derived from the upstream **Crucix** project, also **AGPL-3.0-only**. See
  [`vendor/crucix/NOTICE.md`](./vendor/crucix/NOTICE.md).

**If you modify anything under `vendor/crucix/`,** keep its `Modified for RAVENCRY` header accurate,
and add the header to any new modified file. Binary assets cannot carry a header — record them in
`NOTICE.md` instead.

By contributing you agree your contribution is licensed AGPL-3.0. Note AGPL §13: if you run a
modified version as a network service, you must offer the corresponding source.

---

## 8. Before you open a PR

- [ ] Branch is based on current `upstream/main`
- [ ] Narrowest relevant test run locally, and passing
- [ ] No secrets, no real personal data, no `*tfplan*` / `*.tfstate`
- [ ] If `vendor/crucix/` changed, its modification headers are accurate
- [ ] Docs updated if behaviour or setup changed
- [ ] PR description states which design constraint (§3) the change touches, if any

Use the PR template — it already lists these.

---

## 9. AI assistants working in this repo

Read [`AGENTS.md`](./AGENTS.md) and [`CONTRIBUTING.md`](./CONTRIBUTING.md) first. Then:

- Preserve the human-approval gate. Never make alert broadcast autonomous.
- Do not invent credentials, endpoints, or provider claims.
- Do not reference the private project described in §1.
- Prefer deterministic fixtures over live third-party calls in tests.
- Keep `.env.example` placeholder-only.
