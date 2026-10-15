# What We Learned: Build Notes from a 39-Hour Hackathon

RAVENCRY took about 39 hours of build time spread across seven phases. Most of it went smoothly. Some of it didn't. Here's what surprised us.

## Docker Hides Bugs from Local Dev

The first production deploy to EC2 surfaced a cascade of issues that local development had masked.

Multi-stage Dockerfiles default to the last stage. Our `api` and `llm` services were accidentally running the `dev` stage (tsx, no compile, no curl, root user) because `docker-compose.yml` had no `target: production`. tsx doesn't validate tsconfig, so an invalid `ignoreDeprecations: "6.0"` setting (TypeScript 6.0 doesn't exist) went unnoticed. tsx runs JIT with no import graph check, so broken `packages/shared/` imports compiled fine locally but failed under `tsc` in the production build. And `node:22-alpine` has no `curl` or `wget`, so healthchecks silently crashed — the service responded fine, but Docker marked it unhealthy because the healthcheck command itself couldn't run.

The fix was three changes: add `target: production`, fix the tsconfig, widen the API build context to the project root, and add `RUN apk add --no-cache curl` to three Dockerfiles.

Then there was Docker COPY semantics. `COPY packages/shared/src/ packages/shared/` (trailing slash on source) copies the *contents* of `src/` into the destination. `COPY packages/shared/ packages/shared/` (no trailing slash) copies the directory itself, preserving the `src/types.ts` path. Import paths of `../../../../packages/shared/src/types` break when `src/` is flattened. One character makes the difference.

## Caddy Has No rate_limit Plugin in the Stock Image

The `caddy:2-alpine` image is bare. The `rate_limit` directive we had in the Caddyfile caused a config parse error at startup. We removed the block, added DNS settings to docker-compose (systemd-resolved stub `127.0.0.53` is unreachable from containers — set `dns: [8.8.8.8]`), and removed the `*.ravencry.cv` wildcard (impossible via Pxxl DNS — no DNS-01 plugin available).

Also: EC2 already had Caddy installed via `apt` from an earlier setup step. It was bound to ports 80 and 443. The Docker Caddy container got `address already in use`. Fix: `sudo systemctl stop caddy && sudo systemctl disable caddy`.

## LLM-Agnostic from Day One Was the Right Call

The TODO said "Create `services/qwen/`" but the LLM service was already built under `services/llm/` with a full provider abstraction. Four providers implemented (Qwen, OpenAI, DeepSeek, Gemini), four endpoints, one `LLM_PROVIDER` env var. Creating a second `services/qwen/` would have duplicated the abstraction, Docker Compose config, and all four endpoints.

This cost an extra 30 minutes of abstraction work up front. In return, the demo pitch became: "The AI pipeline runs on Qwen. Swap one environment variable and it runs on GPT-4o, DeepSeek, or Gemini — no code changes." For a hackathon sponsored by Qwen Cloud but scored on AWS + Vercel (where vendor neutrality matters), this worked out well.

## dotenv Parses Comments as Values

An empty env var with an inline comment:

```
LLM_MODEL=  # (optional) override default model
```

dotenv treats everything after the `=` as the value — including the comment text. The LLM service logged `TypeError: Invalid URL` with input `# (optional) override API base URL/chat/completions`. The fix: `LLM_MODEL=` with nothing after the `=`.

## n8n Runs in Docker. Docker Doesn't See Your Host's localhost.

Inside the n8n container, `localhost:3002` is the container's own loopback, not the Windows host where the LLM service runs. HTTP Request nodes return "connection refused" even though `curl localhost:3002/classify-osint` works from PowerShell. The fix: `LLM_SERVICE_URL=http://host.docker.internal:3002` in `.env`.

n8n production webhooks also require an explicit Respond to Webhook node — they don't auto-respond like test mode. Without it, the webhook returns HTTP 500. We added Respond nodes as the final step in all three workflows.

And the IF node in n8n v2 only applies one combinator (AND or OR) to all its conditions — you can't mix them in a single node. Workaround: chain two IF nodes when you need both.

## Design vs. Reality: The Phone Encryption Gap

The subscriber schema (`migration 008`) stores phone numbers as `phone_encrypted` BYTEA — AES-256-GCM encrypted, with the key in AWS Secrets Manager. The design intent is that the SMS service decrypts at send time using `decryptPhone()` with a KMS key.

In practice: `decryptPhone()` never got written. No encryption key exists in Secrets Manager. The seed data uses mock BYTEA values. The SMS service works because of an env var called `AT_SANDBOX_TEST_PHONES` — n8n sends subscriber UUIDs, the SMS service ignores them and sends to the sandbox numbers instead. If the env var is unset, it returns mock success without sending real SMS.

For a hackathon, this is the right call. The architecture is correct. The implementation is deferred. But it's the gap anyone reading the code will notice.

## Schema Exists in Four Places. The DB Wins.

The extraction output schema lived in four locations, each slightly different: DB columns (`clothing_desc`, `last_seen_lga`), shared TypeScript types (`clothing_desc`, `last_seen_lga`), LLM prompt (`clothing_desc`, `last_seen_lga`, `confidence`), and the spec document (`clothing_description`, `last_seen_location_lga`, `extraction_confidence`, `additional_context`). The spec used different field names than the code.

We chose the DB as the consuming authority. The API gateway reads `clothing_desc` and `last_seen_lga` directly from PostgreSQL. Renaming fields in the LLM output to match the spec would have broken the mapping between what the LLM returns and what gets stored. The spec is aspirational. The DB is what runs.

## HumAngle Uses Tags, Not Categories, for RSS

WordPress exposes `/category/<slug>/feed/` and `/tag/<slug>/feed/` differently. HumAngle's category feeds returned 404. Their tag feeds returned 200 for `kidnapping`, `banditry`, `insurgency`, `abduction`, and `boko-haram`. We added all five alongside the general feed, bringing the NAPTIP RSS module from 5 to 10 feeds.

## npm ci Fails When the Lockfile Is Stale

`services/llm/package-lock.json` was out of sync with `package.json`. Newer transitive dependencies (`@emnapi/core`, `@emnapi/runtime`) weren't in the lockfile. `npm ci` on EC2 failed. Fix: `rm -f package-lock.json && npm install` to regenerate.

## Summary

The pattern across all of these is the same: local dev is not production. A lot of small things — Docker stage defaults, COPY trailing slashes, dotenv parsing, Docker networking, missing curl — all worked fine on a Windows laptop and all broke the moment the same code hit an EC2 instance. None of them were hard to fix. All of them cost time to find.

For anyone building a multi-service Docker Compose app for production: add healthchecks that use the same tooling the production image has, set `target: production` explicitly, test with the exact same base image you'll deploy with, and keep empty env vars truly empty. Those four rules would have caught most of what went wrong before we pushed to EC2.
