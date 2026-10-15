// =============================================================================
// RAVENCRY — Shared TypeScript Types
// Single source of truth for all domain models across the monorepo.
// Mirrors the PostgreSQL schema: db/migrations/002_enums.sql through 010_operators.sql
// =============================================================================

// ---- Enums (mirror PostgreSQL enum types) ----

export type CaseStatus =
  | 'pending_triage'
  | 'in_triage'
  | 'pending_review'
  | 'active'
  | 'broadcast_complete'
  | 'cold'
  | 'resolved'
  | 'false_report';

export type AlertTier = 'FLASH' | 'PRIORITY' | 'ROUTINE';

export type AlertStatus = 'pending' | 'approved' | 'suppressed' | 'broadcast';

export type InputChannel =
  | 'whatsapp'
  | 'telegram'
  | 'ussd'
  | 'sms'
  | 'pwa'
  | 'osint'
  | 'manual';

export type LanguageCode = 'en' | 'ha' | 'yo' | 'ig' | 'pcm' | 'mixed';

export type Gender = 'male' | 'female' | 'unknown';

export type Circumstance =
  | 'abduction'
  | 'missing'
  | 'witnessed_kidnapping'
  | 'unknown';

export type SightingStatus =
  | 'unprocessed'
  | 'under_review'
  | 'confirmed'
  | 'rejected';

export type OperatorRole =
  | 'moderator'
  | 'senior_moderator'
  | 'admin'
  | 'investigator';

// ---- Domain Models ----

export interface Person {
  id: string;
  full_name: string;
  age_estimate: number | null;
  gender: Gender;
  clothing_desc: string | null;
  distinguishing: string | null;
  photo_s3_key: string | null;
  created_at: string;
  updated_at: string;
}

export interface Case {
  id: string; // NR-YYYY-NNNNNN
  person_id: string | null;
  status: CaseStatus;
  alert_tier: AlertTier | null;
  circumstance: Circumstance;
  last_seen_location: string | null;
  last_seen_lga: string | null;
  last_seen_state: string | null;
  last_seen_coords: { lat: number; lng: number } | null;
  last_seen_time: string | null;
  input_channel: InputChannel;
  reporter_phone: string | null;
  language: LanguageCode;
  raw_report: string | null;
  qwen_confidence: number | null;
  qwen_severity_reason: string | null;
  trust_score: number | null;
  antifake_verdict: string | null;
  broadcast_at: string | null;
  broadcast_channels: string[] | null;
  sms_recipients_count: number;
  naptip_notified: boolean;
  resolved_at: string | null;
  resolution_notes: string | null;
  operator_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  case_id: string;
  tier: AlertTier;
  status: AlertStatus;
  approved_by: string | null;
  approved_at: string | null;
  suppressed_by: string | null;
  suppression_reason: string | null;
  channels: string[] | null;
  sms_count: number;
  telegram_sent: boolean;
  whatsapp_sent: boolean;
  naptip_sent: boolean;
  push_sent: number;
  created_at: string;
  broadcast_at: string | null;
}

export interface Sighting {
  id: string;
  case_id: string;
  status: SightingStatus;
  description: string;
  sighting_time: string | null;
  sighting_location: string | null;
  sighting_coords: { lat: number; lng: number } | null;
  photo_s3_key: string | null;
  reporter_phone: string | null;
  input_channel: InputChannel;
  trust_score: number | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
}

export interface Subscriber {
  id: string;
  phone_hash: string;
  lga: string | null;
  state: string | null;
  location: { lat: number; lng: number } | null;
  whatsapp_opted_in: boolean;
  active: boolean;
  subscribed_at: string;
  last_active_at: string | null;
}

export interface PushSubscription {
  id: string;
  subscriber_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  user_agent: string | null;
  created_at: string;
}

export interface Operator {
  id: string;
  email: string;
  full_name: string;
  role: OperatorRole;
  active: boolean;
  created_at: string;
  last_login_at: string | null;
}

// ---- API Request Bodies ----

export interface CreateReportRequest {
  channel: InputChannel;
  reporter_phone?: string;
  person_name: string;
  age?: number;
  gender?: Gender;
  last_seen_location: string;
  last_seen_time?: string;
  description?: string;
  media_urls?: string[];
}

export interface CreateSightingRequest {
  case_id: string;
  description: string;
  sighting_location?: string;
  sighting_time?: string;
  reporter_phone?: string;
  photo_url?: string;
}

export interface CreateSubscriberRequest {
  lga?: string;
  state?: string;
  coords?: { lat: number; lng: number };
  whatsapp?: boolean;
  push_token?: string;
}

export interface ApproveAlertRequest {
  notes?: string;
}

export interface SuppressAlertRequest {
  reason: string;
}

export interface UpdateCaseRequest {
  status?: CaseStatus;
  resolution_notes?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

// ---- API Response Payloads ----

export interface ReportResponse {
  case_id: string;
  status: 'received';
  eta_seconds: number;
}

export interface SightingResponse {
  sighting_id: string;
  status: 'received';
}

export interface AlertCard {
  case_id: string;
  person_name: string;
  age_estimate: number | null;
  gender: string;
  last_seen_location: string;
  last_seen_time: string | null;
  alert_tier: AlertTier;
  photo_url: string | null;
  sightings_count: number;
}

export interface ActiveAlertsResponse {
  alerts: AlertCard[];
  total: number;
  geofenced: boolean;
}

export interface CaseDetailResponse {
  case_id: string;
  person_name: string;
  age_estimate: number | null;
  gender: string;
  last_seen_location: string | null;
  last_seen_time: string | null;
  photo_url: string | null;
  status: CaseStatus;
  alert_tier: AlertTier | null;
  circumstance: Circumstance;
  sightings_count: number;
  created_at: string;
}

export interface SubscriberResponse {
  subscriber_id: string;
  confirmation: 'subscribed';
}

export interface ApproveAlertResponse {
  status: 'broadcast_initiated';
  broadcast_eta_seconds: number;
}

export interface SuppressAlertResponse {
  status: 'suppressed';
}

export interface OpsQueueResponse {
  cases: CaseDetailResponse[];
  total: number;
  page: number;
}

export interface LoginResponse {
  token: string;
  operator: {
    id: string;
    name: string;
    role: OperatorRole;
  };
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  uptime_seconds: number;
  services: Record<string, 'healthy' | 'degraded' | 'down'>;
  timestamp: string;
}

// ---- SSE Events ----

export type SSEEventType = 'initial' | 'new_alert' | 'case_update' | 'sighting';

// ---- Evidence Desk DTOs ----

export interface EvidenceItemResponse {
  id: string;
  kind: 'report' | 'sighting' | 'osint';
  source_name: string;
  captured_at: string;
  language: string;
  confidence: number;
  summary: string;
  claims: { key: string; label: string; value: string }[];
}

export interface EvidenceReadResponse {
  case: CaseDetailResponse;
  evidence: EvidenceItemResponse[];
  unanswered_questions: string[];
}

export interface EvidenceBriefResponse {
  case_id: string;
  generated_at: string;
  model: string;
  operator_summary: string;
  corroborated_facts: Array<{ statement: string; source_ids: string[] }>;
  conflicts: Array<{ topic: string; values: string[]; source_ids: string[] }>;
  unanswered_questions: string[];
  recommended_verification_steps: string[];
  operator_decision: 'ready_for_human_review' | 'hold_for_more_evidence';
  decision_reason: string;
  human_approval_required: true;
}

export interface SSEEvent {
  type: SSEEventType;
  payload: unknown;
}

// ---- Consistent Error (NFR-012) ----

export interface ApiError {
  error: string; // snake_case machine-readable code
  code: string; // ERR_ prefix, uppercase
  details?: unknown; // optional human-readable or field-level info
}
