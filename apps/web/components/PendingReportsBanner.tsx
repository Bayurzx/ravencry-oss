'use client'

import { useCallback, useEffect, useState } from 'react'
import { submitReport as apiSubmitReport, RavencryApiError } from '@/lib/api'
import { getQueue, removeFromQueue } from '@/lib/offline-queue'

type SyncState = 'idle' | 'syncing' | 'done'

export default function PendingReportsBanner() {
  const [queueLength, setQueueLength] = useState(0)
  const [syncState, setSyncState] = useState<SyncState>('idle')

  const retryAll = useCallback(async () => {
    setSyncState('syncing')
    const queue = await getQueue()
    for (const item of queue) {
      try {
        await apiSubmitReport(item.data)
        await removeFromQueue(item.id)
      } catch (err) {
        // 4xx → drop (won't succeed on retry). 5xx / network → keep.
        if (err instanceof RavencryApiError && err.status >= 400 && err.status < 500) {
          await removeFromQueue(item.id)
        } else {
          setSyncState('idle')
          await refresh()
          return
        }
      }
    }
    await refresh()
    setSyncState('done')
    setTimeout(() => setSyncState('idle'), 2000)
  }, [])

  const refresh = useCallback(async () => {
    try {
      const q = await getQueue()
      setQueueLength(q.length)
    } catch {
      setQueueLength(0)
    }
  }, [])

  useEffect(() => {
    refresh()
    // Auto-sync when coming back online
    const onOnline = () => { retryAll() }
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [refresh, retryAll])

  if (queueLength === 0 && syncState === 'idle') return null

  return (
    <div
      role="status"
      className="z-50 bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white"
    >
      {syncState === 'syncing' ? (
        '⏳ Syncing reports…'
      ) : syncState === 'done' ? (
        '✅ All reports synced'
      ) : (
        <>
          📤 {queueLength} report{queueLength !== 1 ? 's' : ''} pending
          {typeof navigator !== 'undefined' && navigator.onLine ? (
            <button
              type="button"
              onClick={retryAll}
              className="ml-2 rounded bg-white/20 px-2 py-0.5 text-xs font-bold hover:bg-white/30"
            >
              Sync now
            </button>
          ) : (
            ' — will sync when online'
          )}
        </>
      )}
    </div>
  )
}
