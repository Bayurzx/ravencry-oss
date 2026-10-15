import type {
  ActiveAlertsResponse,
  ApiError,
  CaseDetailResponse,
  CreateReportRequest,
  CreateSightingRequest,
  CreateSubscriberRequest,
  ReportResponse,
  SightingResponse,
  SubscriberResponse,
} from '@/types'
import {
  MOCK_ALERTS_RESPONSE,
  MOCK_CASES,
} from '@/lib/mock-data'

export const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3003'

/** When true, network failures fall back to seed data so the demo stays alive. */
const MOCK_FALLBACK = process.env.NEXT_PUBLIC_DISABLE_MOCK !== 'true'

export class RavencryApiError extends Error {
  code: string
  details?: unknown
  status: number
  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message)
    this.name = 'RavencryApiError'
    this.code = code
    this.status = status
    this.details = details
  }
}

function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError
}

async function fetchAPI<T>(
  path: string,
  options?: RequestInit & { next?: { revalidate?: number } },
): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  })
  if (!res.ok) {
    let parsed: ApiError | null = null
    try {
      parsed = (await res.json()) as ApiError
    } catch {
      parsed = null
    }
    throw new RavencryApiError(
      parsed?.error || `HTTP ${res.status}`,
      parsed?.code || `ERR_HTTP_${res.status}`,
      res.status,
      parsed?.details,
    )
  }
  // 204 No Content
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

// ---- Reads ----
export async function getActiveAlerts(
  lat?: number,
  lng?: number,
  radiusKm = 160,
  limit = 10,
): Promise<ActiveAlertsResponse> {
  const params = new URLSearchParams()
  if (lat != null && lng != null) {
    params.set('lat', String(lat))
    params.set('lng', String(lng))
    params.set('radius_km', String(radiusKm))
  }
  params.set('limit', String(limit))
  try {
    return await fetchAPI<ActiveAlertsResponse>(
      `/api/alerts/active?${params.toString()}`,
    )
  } catch (err) {
    if (MOCK_FALLBACK && isNetworkError(err)) {
      return {
        ...MOCK_ALERTS_RESPONSE,
        geofenced: lat != null && lng != null,
      }
    }
    throw err
  }
}

export async function getCaseDetail(
  caseId: string,
  opts?: { revalidate?: number },
): Promise<CaseDetailResponse> {
  try {
    return await fetchAPI<CaseDetailResponse>(`/api/cases/${caseId}`, {
      next: opts?.revalidate != null ? { revalidate: opts.revalidate } : undefined,
    })
  } catch (err) {
    if (MOCK_FALLBACK && isNetworkError(err) && MOCK_CASES[caseId]) {
      return MOCK_CASES[caseId]
    }
    throw err
  }
}

// ---- Mutations ----
export async function submitReport(
  data: CreateReportRequest,
): Promise<ReportResponse> {
  try {
    return await fetchAPI<ReportResponse>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  } catch (err) {
    if (MOCK_FALLBACK && isNetworkError(err)) {
      const n = String(Math.floor(Math.random() * 900000) + 100000)
      return {
        case_id: `NR-2026-${n}`,
        status: 'received',
        eta_seconds: 30,
      }
    }
    throw err
  }
}

export async function submitSighting(
  data: CreateSightingRequest,
): Promise<SightingResponse> {
  try {
    return await fetchAPI<SightingResponse>('/api/sightings', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  } catch (err) {
    if (MOCK_FALLBACK && isNetworkError(err)) {
      return { sighting_id: crypto.randomUUID(), status: 'received' }
    }
    throw err
  }
}

export async function subscribeToAlerts(
  data: CreateSubscriberRequest,
  phoneHeader: string,
): Promise<SubscriberResponse> {
  try {
    return await fetchAPI<SubscriberResponse>('/api/subscribe', {
      method: 'POST',
      headers: { 'X-RAVENCRY-Phone': phoneHeader },
      body: JSON.stringify(data),
    })
  } catch (err) {
    if (MOCK_FALLBACK && isNetworkError(err)) {
      return { subscriber_id: crypto.randomUUID(), confirmation: 'subscribed' }
    }
    throw err
  }
}

export async function unsubscribeFromAlerts(
  phoneHeader: string,
): Promise<void> {
  try {
    await fetchAPI<void>('/api/subscribe', {
      method: 'DELETE',
      headers: { 'X-RAVENCRY-Phone': phoneHeader },
    })
  } catch (err) {
    if (MOCK_FALLBACK && isNetworkError(err)) return
    throw err
  }
}
