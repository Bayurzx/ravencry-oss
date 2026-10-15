import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { AlertCard, CreateReportRequest, QueuedReport } from '@/types'

interface RavencryDB extends DBSchema {
  'report-queue': {
    key: string
    value: QueuedReport
  }
  'alert-cache': {
    key: string
    value: { key: string; alerts: AlertCard[]; updatedAt: number }
  }
}

const DB_NAME = 'ravencry'
const DB_VERSION = 1

let dbPromise: Promise<IDBPDatabase<RavencryDB>> | null = null

function getDB(): Promise<IDBPDatabase<RavencryDB>> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }
  if (!dbPromise) {
    dbPromise = openDB<RavencryDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('report-queue')) {
          db.createObjectStore('report-queue', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('alert-cache')) {
          db.createObjectStore('alert-cache', { keyPath: 'key' })
        }
      },
    })
  }
  return dbPromise
}

// ---- Report queue ----
export async function addToQueue(
  data: CreateReportRequest,
): Promise<QueuedReport> {
  const item: QueuedReport = {
    id: crypto.randomUUID(),
    data,
    createdAt: Date.now(),
  }
  const db = await getDB()
  await db.put('report-queue', item)
  return item
}

export async function getQueue(): Promise<QueuedReport[]> {
  try {
    const db = await getDB()
    const all = await db.getAll('report-queue')
    return all.sort((a, b) => a.createdAt - b.createdAt)
  } catch {
    return []
  }
}

export async function removeFromQueue(id: string): Promise<void> {
  const db = await getDB()
  await db.delete('report-queue', id)
}

export async function clearQueue(): Promise<void> {
  const db = await getDB()
  await db.clear('report-queue')
}

// ---- Alert cache (last N alerts) ----
const CACHE_KEY = 'cached-alerts'

export async function cacheAlerts(alerts: AlertCard[]): Promise<void> {
  try {
    const db = await getDB()
    await db.put('alert-cache', {
      key: CACHE_KEY,
      alerts: alerts.slice(0, 10),
      updatedAt: Date.now(),
    })
  } catch {
    // cache is best-effort
  }
}

export async function getCachedAlerts(): Promise<AlertCard[]> {
  try {
    const db = await getDB()
    const entry = await db.get('alert-cache', CACHE_KEY)
    return entry?.alerts ?? []
  } catch {
    return []
  }
}
