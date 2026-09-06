/**
 * Asynchronous IndexedDB Draft Storage
 * 
 * Provides non-blocking, asynchronous offline draft persistence for application essays.
 * Prevents main-thread UI stutter during typing and falls back gracefully to localStorage.
 */

const DB_NAME = "gdg_recruitment_portal_db";
const STORE_NAME = "application_drafts";
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not available"));
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraftAsync(key, data) {
  if (typeof window === "undefined") return;

  const record = {
    ...data,
    updatedAt: (data && data.updatedAt) || Date.now(),
  };

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.put(record, key);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => reject(transaction.error);
      transaction.onabort = () => reject(transaction.error || new Error("Transaction aborted"));
    });
  } catch {
    // Graceful fallback to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(record));
    } catch {
      // Storage unavailable or full
    }
  }
}

export async function loadDraftAsync(key) {
  if (typeof window === "undefined") return null;

  let idbRecord = null;
  try {
    const db = await openDB();
    idbRecord = await new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
      transaction.onerror = () => reject(transaction.error);
    });
  } catch {
    idbRecord = null;
  }

  let localRecord = null;
  try {
    const local = localStorage.getItem(key);
    localRecord = local ? JSON.parse(local) : null;
  } catch {
    localRecord = null;
  }

  // If both records exist, return whichever is newest based on updatedAt
  if (idbRecord && localRecord) {
    const idbTime = idbRecord.updatedAt || 0;
    const localTime = localRecord.updatedAt || 0;
    return localTime > idbTime ? localRecord : idbRecord;
  }

  return idbRecord || localRecord || null;
}

export async function removeDraftAsync(key) {
  if (typeof window === "undefined") return;

  try {
    const db = await openDB();
    await new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);

      transaction.oncomplete = () => resolve(true);
      transaction.onerror = () => resolve(false);
      transaction.onabort = () => resolve(false);
    });
  } catch {
    // DB error, continue to ensure localStorage item is removed
  } finally {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
