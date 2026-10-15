// ---- Enums ----
export type CaseStatus =
  | 'pending_triage'
  | 'in_triage'
  | 'pending_review'
  | 'active'
  | 'broadcast_complete'
  | 'cold'
  | 'resolved'
  | 'false_report'

export type AlertTier = 'FLASH' | 'PRIORITY' | 'ROUTINE'
export type Gender = 'male' | 'female' | 'unknown'
export type Circumstance =
  | 'abduction'
  | 'missing'
  | 'witnessed_kidnapping'
  | 'unknown'
export type InputChannel =
  | 'whatsapp'
  | 'telegram'
  | 'ussd'
  | 'sms'
  | 'pwa'
  | 'osint'
  | 'manual'
export type LanguageCode = 'en' | 'ha' | 'yo' | 'ig' | 'pcm' | 'mixed'
export type SSEEventType = 'initial' | 'new_alert' | 'case_update' | 'sighting'

// ---- API Response Types ----
export interface AlertCard {
  case_id: string
  person_name: string
  age_estimate: number | null
  gender: string
  last_seen_location: string
  last_seen_time: string | null
  alert_tier: AlertTier
  photo_url: string | null
  sightings_count: number
  /** Optional coordinates for map pins (present on some payloads). */
  last_seen_coords?: { lat: number; lng: number } | null
}

export interface ActiveAlertsResponse {
  alerts: AlertCard[]
  total: number
  geofenced: boolean
}

export interface CaseDetailResponse {
  case_id: string
  person_name: string
  age_estimate: number | null
  gender: string
  last_seen_location: string | null
  last_seen_time: string | null
  photo_url: string | null
  status: CaseStatus
  alert_tier: AlertTier | null
  circumstance: Circumstance
  sightings_count: number
  created_at: string
  last_seen_coords?: { lat: number; lng: number } | null
}

export interface ReportResponse {
  case_id: string
  status: 'received'
  eta_seconds: number
}

export interface SightingResponse {
  sighting_id: string
  status: 'received'
}

export interface SubscriberResponse {
  subscriber_id: string
  confirmation: 'subscribed'
}

export interface SSEEvent {
  type: SSEEventType
  payload: unknown
}

export interface ApiError {
  error: string
  code: string
  details?: unknown
}

// ---- Request Types ----
export interface CreateReportRequest {
  channel: 'pwa'
  reporter_phone?: string
  person_name: string
  age?: number
  gender?: Gender
  last_seen_location: string
  last_seen_time?: string
  description?: string
  media_urls?: string[]
}

export interface CreateSightingRequest {
  case_id: string
  description: string
  sighting_location?: string
  sighting_time?: string
  reporter_phone?: string
  photo_url?: string
}

export interface CreateSubscriberRequest {
  lga?: string
  state?: string
  coords?: { lat: number; lng: number }
  whatsapp?: boolean
  push_token?: string
}

// ---- Form Types ----
export interface ReportFormData {
  reportType: 'missing' | 'abduction' | 'sighting'
  person_name: string
  age?: number
  gender?: Gender
  description: string
  photo?: File
  last_seen_location: string
  last_seen_time?: string
  extra?: string
  reporter_phone?: string
  anonymous: boolean
  coordinates?: { lat: number; lng: number }
}

// ---- Offline queue ----
export interface QueuedReport {
  id: string
  data: CreateReportRequest
  createdAt: number
}

// ---- Evidence Desk DTOs (mirrors packages/shared) ----
export interface EvidenceItemResponse {
  id: string
  kind: 'report' | 'sighting' | 'osint'
  source_name: string
  captured_at: string
  language: string
  confidence: number
  summary: string
  claims: { key: string; label: string; value: string }[]
}

export interface EvidenceReadResponse {
  case: CaseDetailResponse
  evidence: EvidenceItemResponse[]
  unanswered_questions: string[]
}

export interface EvidenceBriefResponse {
  case_id: string
  generated_at: string
  model: string
  operator_summary: string
  corroborated_facts: { statement: string; source_ids: string[] }[]
  conflicts: { topic: string; values: string[]; source_ids: string[] }[]
  unanswered_questions: string[]
  recommended_verification_steps: string[]
  operator_decision: 'ready_for_human_review' | 'hold_for_more_evidence'
  decision_reason: string
  human_approval_required: true
}
