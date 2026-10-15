// ============================================================
// Global College — Enterprise IndexedDB Offline Storage Engine
// High-capacity (Gigabytes), non-blocking, offline-first client storage
// ============================================================

const DB_NAME = 'GlobalCollegeSIMS'
const DB_VERSION = 1
const STORE_NAME = 'school_store'

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB is not available in this environment'))
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION)

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }

    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export const idbStorage = {
  async get<T>(key: string): Promise<T | null> {
    try {
      const db = await openDatabase()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readonly')
        const store = tx.objectStore(STORE_NAME)
        const req = store.get(key)
        req.onsuccess = () => resolve((req.result as T) ?? null)
        req.onerror = () => resolve(null)
      })
    } catch {
      return null
    }
  },

  async set<T>(key: string, value: T): Promise<void> {
    try {
      const db = await openDatabase()
      return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.put(value, key)
        req.onsuccess = () => resolve()
        req.onerror = () => reject(req.error)
      })
    } catch {
      // Fallback silently if write fails
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const db = await openDatabase()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.delete(key)
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
      })
    } catch {}
  },

  async clear(): Promise<void> {
    try {
      const db = await openDatabase()
      return new Promise((resolve) => {
        const tx = db.transaction(STORE_NAME, 'readwrite')
        const store = tx.objectStore(STORE_NAME)
        const req = store.clear()
        req.onsuccess = () => resolve()
        req.onerror = () => resolve()
      })
    } catch {}
  },
}
