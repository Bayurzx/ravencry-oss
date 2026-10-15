<#
.SYNOPSIS
  RAVENCRY monorepo structure initializer.
  Data-driven: edit the $Structure array below to add/remove dirs and files.
  Safe: never overwrites existing files. Only creates what's missing.

.USAGE
  cd c:\Users\USER\Desktop\code\ravencry
  .\scripts\init-monorepo.ps1              # dry-run (shows what would be created)
  .\scripts\init-monorepo.ps1 -Apply       # actually create dirs/files
  .\scripts\init-monorepo.ps1 -Apply -Verbose  # create + show every action
  .\scripts\init-monorepo.ps1 -Diff        # show only missing items

.NOTES
  Version: 1.0.0
  Last updated: 2026-06-15
  Source of truth: specs/design.md Section 9 (monorepo structure)
#>

param(
    [switch]$Apply,    # Actually create the structure (default: dry-run)
    [switch]$Diff      # Only show items that don't exist yet
)

$Root = Split-Path -Parent $PSScriptRoot  # project root (one level up from /scripts/)

# ============================================================================
# STRUCTURE DEFINITION
# ============================================================================
# Format: "path" or "path|content"
#   - Paths ending with / are directories
#   - Paths without / are files (created empty unless content is provided after |)
#   - Content uses \n for newlines
#   - To add a new dir or file: just add a line here and re-run with -Apply
# ============================================================================

$Structure = @(
    # ── Top-level config files ──────────────────────────────────────────────
    ".env.example"
    "docker-compose.yml"
    "docker-compose.dev.yml"
    "Caddyfile"
    "package.json"
    "README.md"

    # ── Apps ─────────────────────────────────────────────────────────────────
    "apps/"
    "apps/web/"                          # Next.js PWA (deployed to Vercel)
    "apps/web/public/"
    "apps/web/public/locales/"
    "apps/web/public/locales/en/"
    "apps/web/public/locales/ha/"        # Hausa translations
    "apps/web/src/"
    "apps/web/src/app/"
    "apps/web/src/app/layout.tsx"
    "apps/web/src/app/page.tsx"
    "apps/web/src/app/report/"
    "apps/web/src/app/report/page.tsx"
    "apps/web/src/app/alert/"
    "apps/web/src/app/alert/[id]/"
    "apps/web/src/app/alert/[id]/page.tsx"
    "apps/web/src/components/"
    "apps/web/src/components/AlertCard.tsx"
    "apps/web/src/components/AlertFeed.tsx"
    "apps/web/src/components/ReportWizard/"
    "apps/web/src/components/ReportWizard/Step1.tsx"
    "apps/web/src/components/ReportWizard/Step2.tsx"
    "apps/web/src/components/ReportWizard/Step3.tsx"
    "apps/web/src/components/ReportWizard/Step4.tsx"
    "apps/web/src/components/ReportWizard/index.tsx"
    "apps/web/src/components/LanguageSelector.tsx"
    "apps/web/src/components/Map.tsx"
    "apps/web/src/hooks/"
    "apps/web/src/hooks/useAlertFeed.ts"
    "apps/web/src/hooks/useOfflineQueue.ts"
    "apps/web/src/lib/"
    "apps/web/src/lib/api.ts"
    "apps/web/src/lib/idb.ts"            # IndexedDB for offline queue
    "apps/web/src/types/"
    "apps/web/src/types/index.ts"
    "apps/ops/"                          # Appsmith export (JSON)

    # ── Services ─────────────────────────────────────────────────────────────

    # --- API Gateway ---
    "services/"
    "services/api/"
    "services/api/package.json"
    "services/api/tsconfig.json"
    "services/api/Dockerfile"
    "services/api/src/"
    "services/api/src/index.ts"
    "services/api/src/routes/"
    "services/api/src/routes/reports.ts"
    "services/api/src/routes/sightings.ts"
    "services/api/src/routes/alerts.ts"
    "services/api/src/routes/subscribe.ts"
    "services/api/src/routes/health.ts"
    "services/api/src/routes/ops.ts"       # Operator endpoints (approve/suppress)
    "services/api/src/routes/events.ts"    # SSE endpoint
    "services/api/src/middleware/"
    "services/api/src/middleware/rateLimit.ts"
    "services/api/src/middleware/errorHandler.ts"
    "services/api/src/middleware/auth.ts"
    "services/api/src/db/"
    "services/api/src/db/pool.ts"          # pg Pool connection
    "services/api/src/db/dynamo.ts"        # DynamoDB client
    "services/api/src/db/s3.ts"            # S3 client + pre-signed URLs

    # --- LLM Provider (AGNOSTIC) ---
    # This is the key abstraction: a shared interface that Qwen, OpenAI,
    # Gemini, DeepSeek, or any other provider implements.
    "services/llm/"
    "services/llm/package.json"
    "services/llm/tsconfig.json"
    "services/llm/Dockerfile"
    "services/llm/src/"
    "services/llm/src/index.ts"            # Express server: POST /extract, /classify, etc.
    "services/llm/src/client.ts"           # LLM client factory (picks provider from ENV)
    "services/llm/src/providers/"
    "services/llm/src/providers/base.ts"   # Abstract base: ILLMProvider interface
    "services/llm/src/providers/qwen.ts"   # Qwen (DashScope) implementation
    "services/llm/src/providers/openai.ts" # OpenAI-compatible (works with DeepSeek too)
    "services/llm/src/providers/gemini.ts" # Google Gemini implementation
    "services/llm/src/prompts/"
    "services/llm/src/prompts/extract.ts"  # QW-01: field extraction prompt
    "services/llm/src/prompts/classify.ts" # QW-02: severity classification prompt
    "services/llm/src/prompts/osint.ts"    # QW-03: OSINT classification prompt
    "services/llm/src/prompts/antifake.ts" # QW-04: anti-fake detection prompt
    "services/llm/src/validation/"
    "services/llm/src/validation/schema.ts"  # AJV schema validation for LLM output
    "services/llm/src/__tests__/"
    "services/llm/src/__tests__/hausa.test.ts"
    "services/llm/src/__tests__/yoruba.test.ts"
    "services/llm/src/__tests__/pidgin.test.ts"
    "services/llm/src/__tests__/classification.test.ts"

    # --- Whisper (voice transcription) ---
    "services/whisper/"
    "services/whisper/Dockerfile"
    "services/whisper/requirements.txt"
    "services/whisper/whisper_server.py"

    # --- WhatsApp handler ---
    "services/whatsapp/"
    "services/whatsapp/package.json"
    "services/whatsapp/src/"
    "services/whatsapp/src/index.ts"
    "services/whatsapp/src/handler.ts"     # AT webhook handler
    "services/whatsapp/src/session.ts"     # DynamoDB session state

    # --- Telegram handler ---
    "services/telegram/"
    "services/telegram/package.json"
    "services/telegram/src/"
    "services/telegram/src/index.ts"
    "services/telegram/src/bot.ts"         # Telegram bot commands
    "services/telegram/src/broadcast.ts"   # FLASH alert broadcast to channel

    # --- USSD handler ---
    "services/ussd/"
    "services/ussd/package.json"
    "services/ussd/src/"
    "services/ussd/src/index.ts"
    "services/ussd/src/handler.ts"         # AT USSD callback handler
    "services/ussd/src/menus.ts"           # Menu tree definition
    "services/ussd/src/session.ts"         # DynamoDB session state machine

    # --- SMS service ---
    "services/sms/"
    "services/sms/package.json"
    "services/sms/src/"
    "services/sms/src/index.ts"
    "services/sms/src/sender.ts"           # AT batch SMS
    "services/sms/src/templates.ts"        # Alert message templates

    # --- NAPTIP bridge ---
    "services/naptip/"
    "services/naptip/package.json"
    "services/naptip/src/"
    "services/naptip/src/index.ts"
    "services/naptip/src/cap.ts"           # CAP XML serializer
    "services/naptip/src/bridge.ts"        # Webhook trigger

    # --- Crucix (forked OSINT engine) ---
    "services/crucix/"
    "services/crucix/config/"
    "services/crucix/config/nigeria-keywords.json"
    "services/crucix/apis/"
    "services/crucix/apis/sources/"
    "services/crucix/apis/sources/naptip-rss.mjs"
    "services/crucix/apis/sources/gdelt-nigeria.mjs"
    "services/crucix/apis/sources/nigeria-news-rss.mjs"
    "services/crucix/apis/sources/citizen-reports.mjs"
    "services/crucix/apis/sources/sighting-feed.mjs"

    # ── Shared packages ──────────────────────────────────────────────────────
    "packages/"
    "packages/shared/"
    "packages/shared/package.json"
    "packages/shared/src/"
    "packages/shared/src/index.ts"
    "packages/shared/src/types.ts"         # Shared TypeScript types (Case, Person, Alert, etc.)
    "packages/shared/src/constants.ts"     # FLASH/PRIORITY/ROUTINE, HIGH_RISK_STATES, etc.
    "packages/shared/src/crypto.ts"        # AES-256-GCM phone encrypt/decrypt
    "packages/shared/src/trust-score.ts"   # Trust scoring algorithm
    "packages/shared/src/dedup.ts"         # Case deduplication logic
    "packages/shared/src/geo.ts"           # Geofence helpers, LGA lookup

    # ── Database ─────────────────────────────────────────────────────────────
    "db/"
    "db/migrations/"
    "db/migrations/001_extensions.sql"
    "db/migrations/002_enums.sql"
    "db/migrations/003_sequences.sql"
    "db/migrations/004_persons.sql"
    "db/migrations/005_cases.sql"
    "db/migrations/006_sightings.sql"
    "db/migrations/007_alerts.sql"
    "db/migrations/008_subscribers.sql"
    "db/migrations/009_push_subscriptions.sql"
    "db/migrations/010_operators.sql"
    "db/migrations/011_sources.sql"
    "db/migrations/012_lga_coords.sql"
    "db/migrations/013_functions.sql"
    "db/migrations/014_seed_operators.sql"
    "db/seed.sql"
    "db/seed-lga-coords.sql"               # 774 Nigerian LGA centroids

    # ── n8n workflows ────────────────────────────────────────────────────────
    "n8n-workflows/"
    "n8n-workflows/wf-01-whatsapp-intake.json"
    "n8n-workflows/wf-02-flash-broadcast.json"
    "n8n-workflows/wf-03-osint-ingestion.json"

    # ── Scripts ──────────────────────────────────────────────────────────────
    "scripts/"
    # (this file lives here)

    # ── Docs ─────────────────────────────────────────────────────────────────
    "docs/"
    "docs/architecture.mermaid"
    "docs/alert-lifecycle.mermaid"
)

# ============================================================================
# EXECUTION
# ============================================================================

$created = @()
$existed = @()
$errors  = @()

foreach ($entry in $Structure) {
    $fullPath = Join-Path $Root $entry.Replace("/", "\")

    $isDir = $entry.EndsWith("/")

    if ($isDir) {
        if (Test-Path $fullPath) {
            $existed += $entry
            if (-not $Diff) { Write-Host "  EXISTS  $entry" -ForegroundColor DarkGray }
        } else {
            $created += $entry
            if ($Apply) {
                try {
                    New-Item -ItemType Directory -Path $fullPath -Force | Out-Null
                    Write-Host "  CREATE  $entry" -ForegroundColor Green
                } catch {
                    $errors += $entry
                    Write-Host "  ERROR   $entry - $_" -ForegroundColor Red
                }
            } else {
                Write-Host "  WOULD CREATE  $entry" -ForegroundColor Yellow
            }
        }
    } else {
        # File entry — might have content after |
        $parts = $entry -split '\|', 2
        $filePath = (Join-Path $Root $parts[0].Replace("/", "\"))
        $content = if ($parts.Count -gt 1) { $parts[1].Replace('\n', "`n") } else { "" }

        # Ensure parent directory exists
        $parentDir = Split-Path $filePath -Parent
        if (-not (Test-Path $parentDir)) {
            if ($Apply) {
                New-Item -ItemType Directory -Path $parentDir -Force | Out-Null
            }
        }

        if (Test-Path $filePath) {
            $existed += $parts[0]
            if (-not $Diff) { Write-Host "  EXISTS  $($parts[0])" -ForegroundColor DarkGray }
        } else {
            $created += $parts[0]
            if ($Apply) {
                try {
                    [System.IO.File]::WriteAllText($filePath, $content)
                    Write-Host "  CREATE  $($parts[0])" -ForegroundColor Green
                } catch {
                    $errors += $parts[0]
                    Write-Host "  ERROR   $($parts[0]) - $_" -ForegroundColor Red
                }
            } else {
                Write-Host "  WOULD CREATE  $($parts[0])" -ForegroundColor Yellow
            }
        }
    }
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  RAVENCRY Monorepo Structure Report" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "  Total entries:   $($Structure.Count)" -ForegroundColor White
Write-Host "  Already exist:   $($existed.Count)" -ForegroundColor DarkGray
Write-Host "  To create:       $($created.Count)" -ForegroundColor $(if ($Apply) { "Green" } else { "Yellow" })
if ($errors.Count -gt 0) {
    Write-Host "  Errors:          $($errors.Count)" -ForegroundColor Red
}
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan

if (-not $Apply -and $created.Count -gt 0) {
    Write-Host ""
    Write-Host "  This was a DRY RUN. Run with -Apply to create:" -ForegroundColor Yellow
    Write-Host "    .\scripts\init-monorepo.ps1 -Apply" -ForegroundColor Yellow
}

if ($Apply -and $created.Count -gt 0) {
    Write-Host ""
    Write-Host "  ✅ Structure created successfully!" -ForegroundColor Green
}
