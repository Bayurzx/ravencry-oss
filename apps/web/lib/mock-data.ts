import type {
  ActiveAlertsResponse,
  AlertCard,
  CaseDetailResponse,
} from '@/types'

/**
 * Seed data mirroring the backend's 4 test cases (spec §13).
 * Used as a graceful fallback when NEXT_PUBLIC_API_URL is not reachable,
 * so the PWA stays demonstrable offline / without the Express API.
 */
const now = Date.now()
const hoursAgo = (h: number) => new Date(now - h * 3600_000).toISOString()

export const MOCK_ALERTS: AlertCard[] = [
  {
    case_id: 'NR-2026-000001',
    person_name: 'Fatima Bello',
    age_estimate: 7,
    gender: 'female',
    last_seen_location: 'Sabon Gari Market, Kano',
    last_seen_time: hoursAgo(3),
    alert_tier: 'FLASH',
    photo_url: null,
    sightings_count: 4,
    last_seen_coords: { lat: 12.0022, lng: 8.5919 },
  },
  {
    case_id: 'NR-2026-000002',
    person_name: 'Yusuf Ibrahim',
    age_estimate: 9,
    gender: 'male',
    last_seen_location: 'Kaduna Central Mosque, Kaduna',
    last_seen_time: hoursAgo(8),
    alert_tier: 'FLASH',
    photo_url: null,
    sightings_count: 1,
    last_seen_coords: { lat: 10.5167, lng: 7.4333 },
  },
  {
    case_id: 'NR-2026-000003',
    person_name: 'Chioma Okoye',
    age_estimate: 6,
    gender: 'female',
    last_seen_location: 'Lekki Conservation Centre, Lagos',
    last_seen_time: hoursAgo(26),
    alert_tier: 'PRIORITY',
    photo_url: null,
    sightings_count: 0,
    last_seen_coords: { lat: 6.4413, lng: 3.5396 },
  },
]

export const MOCK_CASES: Record<string, CaseDetailResponse> = {
  'NR-2026-000001': {
    case_id: 'NR-2026-000001',
    person_name: 'Fatima Bello',
    age_estimate: 7,
    gender: 'female',
    last_seen_location: 'Sabon Gari Market, Kano',
    last_seen_time: hoursAgo(3),
    photo_url: null,
    status: 'broadcast_complete',
    alert_tier: 'FLASH',
    circumstance: 'missing',
    sightings_count: 4,
    created_at: hoursAgo(3),
    last_seen_coords: { lat: 12.0022, lng: 8.5919 },
  },
  'NR-2026-000002': {
    case_id: 'NR-2026-000002',
    person_name: 'Yusuf Ibrahim',
    age_estimate: 9,
    gender: 'male',
    last_seen_location: 'Kaduna Central Mosque, Kaduna',
    last_seen_time: hoursAgo(8),
    photo_url: null,
    status: 'broadcast_complete',
    alert_tier: 'FLASH',
    circumstance: 'abduction',
    sightings_count: 1,
    created_at: hoursAgo(8),
    last_seen_coords: { lat: 10.5167, lng: 7.4333 },
  },
  'NR-2026-000003': {
    case_id: 'NR-2026-000003',
    person_name: 'Chioma Okoye',
    age_estimate: 6,
    gender: 'female',
    last_seen_location: 'Lekki Conservation Centre, Lagos',
    last_seen_time: hoursAgo(26),
    photo_url: null,
    status: 'active',
    alert_tier: 'PRIORITY',
    circumstance: 'missing',
    sightings_count: 0,
    created_at: hoursAgo(26),
    last_seen_coords: { lat: 6.4413, lng: 3.5396 },
  },
  'NR-2026-000004': {
    case_id: 'NR-2026-000004',
    person_name: 'Babajide Adeniran',
    age_estimate: 12,
    gender: 'male',
    last_seen_location: 'Berger Bus Stop, Lagos',
    last_seen_time: hoursAgo(72),
    photo_url: null,
    status: 'resolved',
    alert_tier: 'ROUTINE',
    circumstance: 'missing',
    sightings_count: 6,
    created_at: hoursAgo(72),
    last_seen_coords: { lat: 6.5833, lng: 3.3833 },
  },
}

export const MOCK_ALERTS_RESPONSE: ActiveAlertsResponse = {
  alerts: MOCK_ALERTS,
  total: MOCK_ALERTS.length,
  geofenced: false,
}
