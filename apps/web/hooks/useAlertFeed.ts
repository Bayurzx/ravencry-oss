'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { getActiveAlerts, BASE_URL } from '@/lib/api'
import { cacheAlerts, getCachedAlerts } from '@/lib/offline-queue'
import type { ActiveAlertsResponse, AlertCard, SSEEvent } from '@/types'

interface UseAlertFeed {
  alerts: AlertCard[]
  isLoading: boolean
  isError: boolean
  isOffline: boolean
  mutate: () => void
}

const fetcher = ([, lat, lng]: [string, number | null, number | null]) =>
  getActiveAlerts(lat ?? undefined, lng ?? undefined)

export function useAlertFeed(
  lat: number | null,
  lng: number | null,
): UseAlertFeed {
  const [isOffline, setIsOffline] = useState(false)
  const [cached, setCached] = useState<AlertCard[]>([])
  const esRef = useRef<EventSource | null>(null)
  const retryRef = useRef(0)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { data, error, isLoading, mutate } = useSWR<ActiveAlertsResponse>(
    ['alerts', lat, lng],
    fetcher,
    { revalidateOnFocus: true, dedupingInterval: 5_000 },
  )

  // Track online/offline + seed cached alerts
  useEffect(() => {
    const update = () => setIsOffline(!navigator.onLine)
    update()
    void getCachedAlerts().then(setCached)
    window.addEventListener('online', update)
    window.addEventListener('offline', update)
    return () => {
      window.removeEventListener('online', update)
      window.removeEventListener('offline', update)
    }
  }, [])

  // Persist last 10 alerts on every successful update
  useEffect(() => {
    if (data?.alerts?.length) {
      void cacheAlerts(data.alerts)
      setCached(data.alerts)
    }
  }, [data])

  // SSE live updates with exponential backoff reconnect
  useEffect(() => {
    let cancelled = false

    const connect = () => {
      if (cancelled) return
      let es: EventSource
      try {
        es = new EventSource(`${BASE_URL}/events`)
      } catch {
        return
      }
      esRef.current = es

      es.onopen = () => {
        retryRef.current = 0
      }

      es.onmessage = (e: MessageEvent) => {
        let evt: SSEEvent
        try {
          evt = JSON.parse(e.data) as SSEEvent
        } catch {
          return
        }
        if (evt.type === 'new_alert') {
          const incoming = evt.payload as AlertCard
          void mutate((current) => {
            const existing = current?.alerts ?? []
            if (existing.some((a) => a.case_id === incoming.case_id)) {
              return current
            }
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(200)
            }
            const alerts = [incoming, ...existing]
            return {
              alerts,
              total: alerts.length,
              geofenced: current?.geofenced ?? false,
            }
          }, false)
        } else if (evt.type === 'case_update' || evt.type === 'sighting') {
          const update = evt.payload as Partial<AlertCard> & {
            case_id: string
          }
          void mutate((current) => {
            if (!current) return current
            const alerts = current.alerts.map((a) =>
              a.case_id === update.case_id ? { ...a, ...update } : a,
            )
            return { ...current, alerts }
          }, false)
        }
      }

      es.onerror = () => {
        es.close()
        esRef.current = null
        if (cancelled) return
        const delay = Math.min(1000 * 2 ** retryRef.current, 30_000)
        retryRef.current += 1
        reconnectTimer.current = setTimeout(connect, delay)
      }
    }

    connect()

    return () => {
      cancelled = true
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      esRef.current?.close()
      esRef.current = null
    }
  }, [mutate])

  const showOffline = isOffline || (!!error && !data)
  const alerts = data?.alerts ?? (showOffline ? cached : [])

  return {
    alerts,
    isLoading: isLoading && !showOffline,
    isError: !!error && !data && !cached.length,
    isOffline: showOffline,
    mutate: () => void mutate(),
  }
}
