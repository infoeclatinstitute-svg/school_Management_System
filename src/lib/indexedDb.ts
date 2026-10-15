// ============================================================
// Global College — Enterprise IndexedDB Offline Storage Engine
// High-capacity (Gigabytes), non-blocking, offline-first client storage
// With connection pooling, auto-reconnect & fast-timeout failover
// ============================================================

const DB_NAME = 'GlobalCollegeSIMS'
const DB_VERSION = 1
const STORE_NAME = 'school_store'

let dbInstance: IDBDatabase | null = null
let dbPromise: Promise<IDBDatabase> | null = null

function openDatabase(): Promise<IDBDatabase> {
  if (dbInstance) {
    try {
      // Test if instance is still healthy
      dbInstance.transaction(STORE_NAME, 'readonly')
      return Promise.resolve(dbInstance)
    } catch {
      dbInstance = null
    }
  }

  if (dbPromise) {
    return dbPromise
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return reject(new Error('IndexedDB is not available in this environment'))
    }

    // Fast 2.5s timeout prevents hanging on sluggish or blocked devices
    const timeoutTimer = setTimeout(() => {
      reject(new Error('IndexedDB connection timeout'))
    }, 2500)

    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION)

      request.onblocked = () => {
        clearTimeout(timeoutTimer)
        reject(new Error('IndexedDB is blocked by another tab'))
      }

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }

      request.onsuccess = () => {
        clearTimeout(timeoutTimer)
        dbInstance = request.result

        dbInstance.onversionchange = () => {
          dbInstance?.close()
          dbInstance = null
          dbPromise = null
        }

        dbInstance.onerror = () => {
          dbInstance = null
          dbPromise = null
        }

        resolve(dbInstance)
      }

      request.onerror = () => {
        clearTimeout(timeoutTimer)
        reject(request.error)
      }
    } catch (err) {
      clearTimeout(timeoutTimer)
      reject(err)
    }
  }).catch((err) => {
    dbPromise = null
    throw err
  })

  return dbPromise
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
