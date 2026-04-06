import type { OpenF1Interval } from '../api/openf1'

const DB_NAME = 'pitwall-data-cache'
const DB_VERSION = 1
const STORE_NAME = 'interval-history'

interface IntervalHistoryRecord {
  sessionKey: number
  updatedAt: number
  points: OpenF1Interval[]
}

let dbPromise: Promise<IDBDatabase> | null = null

function hasIndexedDb(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'
}

function openIntervalDb(): Promise<IDBDatabase> {
  if (!hasIndexedDb()) {
    return Promise.reject(new Error('IndexedDB unavailable'))
  }

  if (dbPromise) return dbPromise

  dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'sessionKey' })
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open interval cache DB'))
  })

  return dbPromise
}

function readRecord(sessionKey: number): Promise<IntervalHistoryRecord | null> {
  return openIntervalDb().then(
    (db) => new Promise<IntervalHistoryRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly')
      const store = tx.objectStore(STORE_NAME)
      const request = store.get(sessionKey)

      request.onsuccess = () => resolve((request.result as IntervalHistoryRecord | undefined) ?? null)
      request.onerror = () => reject(request.error ?? new Error('Failed reading interval cache record'))
    })
  )
}

function writeRecord(record: IntervalHistoryRecord): Promise<void> {
  return openIntervalDb().then(
    (db) => new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite')
      const store = tx.objectStore(STORE_NAME)

      tx.oncomplete = () => resolve()
      tx.onerror = () => reject(tx.error ?? new Error('Failed writing interval cache record'))

      store.put(record)
    })
  )
}

function dedupeIntervals(points: OpenF1Interval[]): OpenF1Interval[] {
  const byKey = new Map<string, OpenF1Interval>()
  for (const point of points) {
    byKey.set(`${point.driver_number}:${point.date}`, point)
  }
  return Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date))
}

export function mergeIntervalHistory(
  existing: OpenF1Interval[] | null,
  incoming: OpenF1Interval[]
): OpenF1Interval[] {
  if (!existing || existing.length === 0) return dedupeIntervals(incoming)
  if (incoming.length === 0) return dedupeIntervals(existing)
  return dedupeIntervals([...existing, ...incoming])
}

export async function readIntervalHistory(sessionKey: number): Promise<OpenF1Interval[] | null> {
  if (!hasIndexedDb()) return null
  try {
    const record = await readRecord(sessionKey)
    return record ? record.points : null
  } catch {
    return null
  }
}

export async function upsertIntervalHistory(
  sessionKey: number,
  incoming: OpenF1Interval[]
): Promise<OpenF1Interval[]> {
  const existing = await readIntervalHistory(sessionKey)
  const merged = mergeIntervalHistory(existing, incoming)

  if (!hasIndexedDb()) return merged

  try {
    await writeRecord({
      sessionKey,
      updatedAt: Date.now(),
      points: merged,
    })
  } catch {
    // Cache write failures should never block the UI data path.
  }

  return merged
}