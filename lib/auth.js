import { betterAuth } from "better-auth";
import { firestoreAdapter } from "better-auth-firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";

if (process.env.NODE_ENV !== "production") {
  process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || "none";
  if (!process.env.FIREBASE_CLIENT_EMAIL && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  }
}

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "dwasfw-vitc-rec-portal";
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

const appOptions = { projectId: firebaseProjectId };
if (firebaseClientEmail && firebasePrivateKey) {
  appOptions.credential = cert({
    projectId: firebaseProjectId,
    clientEmail: firebaseClientEmail,
    privateKey: firebasePrivateKey,
  });
}

const app = getApps().length > 0 ? getApps()[0] : initializeApp(appOptions);
const firestore = getFirestore(app);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: firestoreAdapter({
    firestore,
  }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (reduces re-login and session creation writes)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24, // 1 day
    },
    updateAge: 60 * 60 * 24, // 1 day (prevent frequent session writes)
  },
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        }
      : {}),
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(), // This must be the last plugin in the array
  ],
});