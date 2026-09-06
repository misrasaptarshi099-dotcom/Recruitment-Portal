import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import net from "net";
import { localDb } from "./local-store";

if (process.env.NODE_ENV !== "production") {
  process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || "none";
  if (!process.env.FIREBASE_CLIENT_EMAIL && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  }
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "dwasfw-vitc-rec-portal";
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL;
const FIREBASE_PRIVATE_KEY = process.env.FIREBASE_PRIVATE_KEY?.replace(
  /\\n/g,
  "\n",
);
const GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_CREDENTIALS;

const hasServiceAccount = Boolean(
  FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY
);
const hasGoogleCreds = hasServiceAccount || Boolean(GOOGLE_APPLICATION_CREDENTIALS);

// Non-blocking fast socket probe to check if a port is actively open without hanging
const isPortListening = (host: string, port: number, timeoutMs = 150): Promise<boolean> => {
  return new Promise((resolve) => {
    const socket = new net.Socket();
    let isSettled = false;

    socket.setTimeout(timeoutMs);
    socket.once("connect", () => {
      isSettled = true;
      socket.destroy();
      resolve(true);
    });
    socket.once("timeout", () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });
    socket.once("error", () => {
      if (!isSettled) {
        isSettled = true;
        socket.destroy();
        resolve(false);
      }
    });

    socket.connect(port, host);
  });
};

let cached: any = (global as any).firestore;

if (!cached) {
  cached = (global as any).firestore = {
    db: null,
    isEmulator: false,
  };
}

// Timeout helper to ensure database calls never freeze the server
const withTimeout = <T>(promise: Promise<T>, ms: number, fallback: () => Promise<T>): Promise<T> => {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<T>((resolve) => {
    timer = setTimeout(async () => {
      console.warn(`Firestore operation timed out after ${ms}ms, failing over to Local Store`);
      resolve(await fallback());
    }, ms);
  });

  return Promise.race([
    promise.then((res) => {
      clearTimeout(timer);
      return res;
    }),
    timeoutPromise,
  ]);
};

// Resilient wrapper that fails over to localDb if Firestore emulator or connection hangs
function createResilientDb(targetDb: any): any {
  return {
    ...targetDb,
    runTransaction: async (updateFunction: (transaction: any) => Promise<any>) => {
      if (typeof targetDb.runTransaction === "function") {
        return withTimeout(
          targetDb.runTransaction(updateFunction),
          4000,
          () => localDb.runTransaction(updateFunction)
        );
      }
      return localDb.runTransaction(updateFunction);
    },
    collection: (name: string) => {
      const col = targetDb.collection(name);
      return {
        ...col,
        get: () => withTimeout(col.get(), 1500, () => localDb.collection(name).get()),
        add: (data: any) => withTimeout(col.add(data), 1500, () => localDb.collection(name).add(data)),
        doc: (id: string) => {
          const docRef = col.doc(id);
          return {
            ...docRef,
            get: () => withTimeout(docRef.get(), 1500, () => localDb.collection(name).doc(id).get()),
            update: (patch: any) => withTimeout(docRef.update(patch), 1500, () => localDb.collection(name).doc(id).update(patch)),
            set: (data: any, opts: any) => withTimeout(docRef.set(data, opts), 1500, () => localDb.collection(name).doc(id).set(data, opts)),
          };
        },
        select: (...fields: string[]) => {
          try {
            return col.select ? col.select(...fields) : localDb.collection(name).select(...fields);
          } catch {
            return localDb.collection(name).select(...fields);
          }
        },
        where: (field: string, op: string, val: any) => {
          try {
            const query = col.where(field, op, val);
            return {
              ...query,
              select: (...fields: string[]) => {
                try {
                  return query.select ? query.select(...fields) : localDb.collection(name).where(field, op, val).select(...fields);
                } catch {
                  return localDb.collection(name).where(field, op, val);
                }
              },
              get: () => withTimeout(query.get(), 1500, () => localDb.collection(name).where(field, op, val).get()),
              where: (f2: string, o2: string, v2: any) => {
                const q2 = query.where(f2, o2, v2);
                return {
                  ...q2,
                  select: (...fields: string[]) => {
                    try {
                      return q2.select ? q2.select(...fields) : localDb.collection(name).where(field, op, val).where(f2, o2, v2).select(...fields);
                    } catch {
                      return localDb.collection(name).where(field, op, val).where(f2, o2, v2);
                    }
                  },
                  get: () => withTimeout(q2.get(), 1500, () => localDb.collection(name).where(field, op, val).where(f2, o2, v2).get()),
                };
              },
            };
          } catch {
            return localDb.collection(name).where(field, op, val);
          }
        },
      };
    },
  };
}

export const connect = async (): Promise<any> => {
  // If not using explicit cloud service account credentials, verify emulator is alive before reusing cache
  if (cached.db && !hasGoogleCreds) {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
    const [host, portStr] = emulatorHost.split(":");
    const port = parseInt(portStr || "8080", 10);
    const alive = await isPortListening(host || "127.0.0.1", port, 80);
    if (!alive) {
      cached.db = localDb;
      cached.isEmulator = false;
      return cached.db;
    }
  }

  if (cached.db) return cached.db;

  // 1. If explicit Cloud Service Account credentials are provided, use Google Cloud Firestore
  if (hasGoogleCreds) {
    const appOptions: any = { projectId: FIREBASE_PROJECT_ID };
    if (FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY) {
      appOptions.credential = cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: FIREBASE_CLIENT_EMAIL,
        privateKey: FIREBASE_PRIVATE_KEY,
      });
    }

    const app = getApps()[0] || initializeApp(appOptions);
    cached.db = getFirestore(app);
    cached.isEmulator = false;
    console.log("Connected to Google Cloud Firestore via service account");
    return cached.db;
  }

  // 2. Check if Firestore Emulator is running
  const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  const [host, portStr] = emulatorHost.split(":");
  const port = parseInt(portStr || "8080", 10);
  const emulatorReady = await isPortListening(host || "127.0.0.1", port, 150);

  if (emulatorReady) {
    process.env.FIRESTORE_EMULATOR_HOST = emulatorHost;
    const app = getApps()[0] || initializeApp({ projectId: FIREBASE_PROJECT_ID });
    const rawDb = getFirestore(app);
    cached.db = createResilientDb(rawDb);
    cached.isEmulator = true;
    console.log(`Connected to Firestore Emulator at ${emulatorHost}`);
    return cached.db;
  }

  // 3. In development or CI without cloud credentials or running emulator: use fast local store
  if (process.env.CI || process.env.NODE_ENV !== "production" || process.env.BUILDING) {
    console.log("Using High-Speed Local Dev Store (Instant response, zero timeouts)");
    cached.db = localDb;
    cached.isEmulator = false;
    return cached.db;
  }

  throw new Error(
    "Please define GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in environment variables."
  );
};

export const serializeFirestoreData = (value: any): any => {
  if (value === null || value === undefined) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value?.toDate === "function") {
    return value.toDate().toISOString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => serializeFirestoreData(item));
  }

  if (typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        serializeFirestoreData(item),
      ]),
    );
  }

  return value;
};
