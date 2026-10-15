'use client'

import { useCallback, useEffect, useState } from 'react'
import { submitReport as apiSubmitReport, RavencryApiError } from '@/lib/api'
import {
  addToQueue,
  getQueue,
  removeFromQueue,
} from '@/lib/offline-queue'
import type { CreateReportRequest } from '@/types'

interface SubmitResult {
  case_id?: string
  queued?: boolean
}

interface UseOfflineQueue {
  submitReport: (data: CreateReportRequest) => Promise<SubmitResult>
  retryAll: () => Promise<void>
  isPending: boolean
  queueLength: number
}

export function useOfflineQueue(): UseOfflineQueue {
  const [isPending, setIsPending] = useState(false)
  const [queueLength, setQueueLength] = useState(0)

  const refreshLength = useCallback(async () => {
    const q = await getQueue()
    setQueueLength(q.length)
  }, [])

  const retryAll = useCallback(async () => {
    const queue = await getQueue()
    for (const item of queue) {
      try {
        await apiSubmitReport(item.data)
        await removeFromQueue(item.id)
      } catch (err) {
        // 4xx → won't succeed on retry, drop it. Network error → keep.
        if (err instanceof RavencryApiError && err.status >= 400 && err.status < 500) {
          await removeFromQueue(item.id)
        } else {
          break // stop on first network failure, stay queued
        }
      }
    }
    await refreshLength()
  }, [refreshLength])

  const submitReport = useCallback(
    async (data: CreateReportRequest): Promise<SubmitResult> => {
      setIsPending(true)
      try {
        if (typeof navigator !== 'undefined' && !navigator.onLine) {
          await addToQueue(data)
          await refreshLength()
          return { queued: true }
        }
        try {
          const res = await apiSubmitReport(data)
          return { case_id: res.case_id }
        } catch (err) {
          if (err instanceof RavencryApiError) {
            // Server rejected (validation etc.) — surface the error
            throw err
          }
          // Network error → queue for later
          await addToQueue(data)
          await refreshLength()
          return { queued: true }
        }
      } finally {
        setIsPending(false)
      }
    },
    [refreshLength],
  )

  useEffect(() => {
    void refreshLength()
    const onOnline = () => void retryAll()
    window.addEventListener('online', onOnline)
    return () => window.removeEventListener('online', onOnline)
  }, [refreshLength, retryAll])

  return { submitReport, retryAll, isPending, queueLength }
}
