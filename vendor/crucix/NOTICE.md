# Third-Party Notice — Crucix

This directory contains code derived from **Crucix**.

| | |
|---|---|
| **Upstream project** | Crucix — "Your own intelligence terminal" |
| **Upstream site** | https://www.crucix.live/ |
| **Upstream license** | GNU Affero General Public License v3.0 only (AGPL-3.0-only) |
| **Upstream commit** | _not pinned — this directory was populated by cloning upstream and adapting it in place_ |
| **How obtained** | Cloned from upstream and incorporated into this repository |

## License compatibility

RAVENCRY is licensed **AGPL-3.0** (see the repository root `LICENSE`). Crucix is licensed
**AGPL-3.0-only**. These licenses are compatible, and AGPL-3.0 explicitly permits use,
modification, and redistribution provided its conditions are met. Reuse of Crucix code in this
repository is therefore permitted.

The full text of the upstream license is retained at `services/crucix/LICENSE`.

## Modifications

This directory is **not** pristine upstream code. Portions have been modified and additional files
have been added for RAVENCRY. Files that have been added or materially modified carry a header
comment:

```
Modified for RAVENCRY — see NOTICE in this directory.
```

Added and modified files include (non-exhaustive):

```text
apis/sources/acled-nigeria.mjs
apis/sources/gdelt-nigeria.mjs
apis/sources/nigeria-news-rss.mjs
config/nigeria-demo.mjs
config/nigeria-keywords.json
config/nigeria-keywords.mjs
test/nigeria-keywords.test.mjs
step_crucix.md
dashboard/public/ravencry-logo.png
ravencry.png
favicon_ravencry/            (RAVENCRY favicon set)
Dockerfile
docker-compose.yml
```

Binary assets (images, favicons) cannot carry a header comment; their modification is recorded
here instead.

## Attribution

Upstream author metadata is retained in `package.json`, marked as upstream:

```json
"author": "Crucix (upstream); RAVENCRY modifications"
```

## AGPL §13 — network use

AGPL-3.0 section 13 requires that users interacting with a modified version over a network be
offered the corresponding source. Because this repository is public, that obligation is satisfied
by the repository itself, and by the root `LICENSE`.

If this repository is ever made private while a network service built from it remains public, an
alternative source-offer mechanism must be provided to remain compliant.
