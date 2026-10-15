Below is a comprehensive prompt you can give your AI coding agent (Claude Code, Cursor, Codex, Gemini CLI, etc.). It is based on the current Airplanes.live REST API capabilities and limits. The free API provides a REST endpoint at `https://api.airplanes.live/v2/`, does not currently require authentication, and is limited to approximately **1 request/second** with about **500 requests/day** on the free tier. It supports lookups by ICAO hex, registration, callsign, aircraft type, military, LADD, PIA, and geographic point/radius.([airplanes.live][1])

---

# AI Agent Prompt

You are a senior full-stack engineer and aviation data specialist.

Build a production-quality backend service that tracks **only aircraft over Africa** using the Airplanes.live REST API.

## Objective

Create a service that continuously collects aircraft over Africa, stores them, exposes an API, and supports real-time updates for frontend clients.

The project must be modular, scalable, well-tested, and production-ready.

---

## Data Source

Use:

```
https://api.airplanes.live/v2/
```

Read the API documentation before implementation.

Available endpoints include:

* /point/{lat}/{lon}/{radius}
* /hex/{icao}
* /callsign/{callsign}
* /reg/{registration}
* /type/{icao_type}
* /mil
* /ladd
* /pia

The free API is limited to roughly:

* 1 request per second
* 500 requests/day

Never exceed those limits.

Implement automatic rate limiting and retries with exponential backoff.

If the API returns an error, retry safely.

Do not hammer the API.

([airplanes.live][1])

---

# Geographic Coverage

Track Africa only.

Use multiple overlapping search points to cover the continent.

Approximate Africa bounds:

North: 38

South: -35

West: -18

East: 52

Generate a grid of search locations.

Each search uses:

```
/point/{lat}/{lon}/{radius}
```

Choose the radius so the continent is fully covered while minimizing duplicate requests.

Deduplicate aircraft by ICAO hex.

---

# Data Model

Each aircraft should contain:

* ICAO hex
* Callsign
* Registration
* Aircraft type
* Aircraft description
* Latitude
* Longitude
* Altitude
* Ground speed
* Vertical speed
* Heading
* Squawk
* Emergency status
* Category
* RSSI
* Last seen
* Timestamp
* Data source

Keep historical positions.

Store flight trails.

---

# Database

Use PostgreSQL.

Schema:

Aircraft

* ICAO (PK)
* Registration
* Callsign
* Type
* Description
* Category

Position

* id
* ICAO
* Latitude
* Longitude
* Altitude
* Speed
* Heading
* VerticalRate
* Timestamp

FlightSession

* ICAO
* StartTime
* EndTime

Indexes on:

* ICAO
* Timestamp
* Location

---

# Backend

Use:

Node.js

TypeScript

Fastify

Prisma ORM

Zod

Redis

BullMQ

Architecture:

```
API

Workers

Scheduler

Database

Redis

Cache

Logger
```

---

# Polling

Run scheduler every 60 seconds.

Never exceed rate limits.

Cache duplicate aircraft.

Only insert position if aircraft moved.

Discard stale aircraft after configurable timeout.

---

# API

Create endpoints:

GET /aircraft

Returns all African aircraft.

GET /aircraft/:icao

Aircraft details.

GET /search

Supports:

callsign

registration

ICAO

type

GET /military

Returns military aircraft.

GET /stats

Returns:

Total aircraft

Average altitude

Average speed

Aircraft by country

Aircraft by type

Aircraft by airline

GET /heatmap

Returns coordinates for visualization.

GET /history/:icao

Returns historical trail.

GET /nearest

Returns aircraft nearest to coordinates.

---

# Filtering

Support:

Altitude

Speed

Heading

Aircraft type

Military

Airline

Registration

ICAO

Emergency

Country

Bounding box

Radius

---

# Real-Time

Implement WebSocket support.

Broadcast:

Aircraft appeared

Aircraft disappeared

Aircraft moved

Emergency squawk

Altitude changes

---

# Performance

Cache:

Aircraft

Searches

Statistics

Implement:

Redis cache

Compression

Pagination

Cursor pagination

Database indexes

Connection pooling

---

# Analytics

Compute:

Aircraft count

Average speed

Average altitude

Top airlines

Top aircraft models

Country distribution

Hourly traffic

Daily traffic

---

# Validation

Validate all API responses using Zod.

Ignore malformed aircraft.

Log parsing failures.

---

# Logging

Structured logging using Pino.

Log:

API requests

Rate limiting

Retries

Errors

Scheduler runs

Database writes

---

# Monitoring

Expose:

/health

/metrics

Prometheus metrics:

Request count

Error count

Poll duration

Database latency

Cache hit ratio

---

# Testing

Include:

Unit tests

Integration tests

Mock API responses

Stress tests

---

# Docker

Provide:

Dockerfile

docker-compose.yml

Redis

Postgres

Backend

---

# Environment Variables

```
DATABASE_URL=

REDIS_URL=

POLL_INTERVAL=60

CACHE_TTL=60

AFRICA_REFRESH=60

LOG_LEVEL=info
```

---

# Security

Implement:

Helmet

CORS

Rate limiting

Input validation

Request size limits

Sanitized logs

---

# Documentation

Generate:

README

Architecture diagram

Database schema

API documentation (OpenAPI)

Setup instructions

Deployment guide

---

# Code Quality

Requirements:

* Strict TypeScript
* SOLID principles
* Repository pattern
* Dependency injection where appropriate
* No duplicated logic
* Comprehensive comments only where necessary
* ESLint
* Prettier
* Husky
* Conventional commits

---

# Bonus Features

If time permits, also implement:

* Flight path prediction
* Airport proximity detection
* Country boundary detection
* Airline logo lookup
* Aircraft photos
* Reverse geocoding
* GeoJSON export
* Mapbox/Cesium-ready endpoints
* SSE as an alternative to WebSockets
* Automatic cleanup of stale history
* Configurable polling regions

---

## Deliverables

Produce:

1. Complete project structure.
2. Database schema.
3. Prisma models.
4. Scheduler implementation.
5. Airplanes.live API client.
6. Redis caching layer.
7. Background worker.
8. REST API.
9. WebSocket server.
10. Docker deployment.
11. Automated tests.
12. Full documentation.

The code should be production-ready, easy to maintain, and designed so additional regions beyond Africa can be added later by configuration rather than code changes.

[1]: https://airplanes.live/api-guide/?utm_source=chatgpt.com "ADS-B REST API Guide | Airplanes.live"
