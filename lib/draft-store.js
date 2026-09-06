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

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(data, key);

      request.onsuccess = () => resolve(true);
      request.onerror = () => reject(request.error);
    });
  } catch {
    // Graceful fallback to localStorage
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch {
      // Storage unavailable or full
    }
  }
}

export async function loadDraftAsync(key) {
  if (typeof window === "undefined") return null;

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_NAME, "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        if (request.result) {
          resolve(request.result);
        } else {
          // Check fallback localStorage
          try {
            const local = localStorage.getItem(key);
            resolve(local ? JSON.parse(local) : null);
          } catch {
            resolve(null);
          }
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch {
    try {
      const local = localStorage.getItem(key);
      return local ? JSON.parse(local) : null;
    } catch {
      return null;
    }
  }
}

export async function removeDraftAsync(key) {
  if (typeof window === "undefined") return;

  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const transaction = db.transaction(STORE_NAME, "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      store.delete(key);
      transaction.oncomplete = () => {
        try {
          localStorage.removeItem(key);
        } catch {}
        resolve(true);
      };
    });
  } catch {
    try {
      localStorage.removeItem(key);
    } catch {}
  }
}
