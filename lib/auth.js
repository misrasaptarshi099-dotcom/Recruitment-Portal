import { betterAuth } from "better-auth";
import { firestoreAdapter } from "better-auth-firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { isInstitutionalEmail, isAdminEmail } from "./security.js";

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID || "recruitment-portal-214d7";
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

if (firebaseClientEmail && firebasePrivateKey) {
  delete process.env.FIRESTORE_EMULATOR_HOST;
} else if (process.env.NODE_ENV !== "production") {
  process.env.METADATA_SERVER_DETECTION = process.env.METADATA_SERVER_DETECTION || "none";
  if (!process.env.FIREBASE_CLIENT_EMAIL && !process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8080";
  }
}

const appOptions = { projectId: firebaseProjectId };
if (firebaseClientEmail && firebasePrivateKey) {
  appOptions.credential = cert({
    projectId: firebaseProjectId,
    clientEmail: firebaseClientEmail,
    privateKey: firebasePrivateKey,
  });
}

const AUTH_APP_NAME = "auth-admin-live";
const existingAuthApp = getApps().find((a) => a.name === AUTH_APP_NAME);
const app = existingAuthApp || initializeApp(appOptions, AUTH_APP_NAME);
const firestore = getFirestore(app);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  database: firestoreAdapter({
    firestore,
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          if (user?.email && !isInstitutionalEmail(user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "Only @vitstudent.ac.in accounts are allowed.",
            });
          }
          if (user?.email && isAdminEmail(user.email)) {
            return {
              data: {
                ...user,
                role: "admin",
              },
            };
          }
        },
      },
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days (reduces re-login and session creation writes)
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24, // 1 day
    },
    updateAge: 60 * 60 * 24, // 1 day (prevent frequent session writes)
  },
  emailAndPassword: {
    enabled: false,
  },
  socialProviders: {
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
            authorization: {
              params: {
                prompt: "select_account",
              },
            },
          },
        }
      : {}),
  },
  // Server-side domain enforcement (rules.md §3.1)
  // Rejects unauthorized non-institutional accounts while granting full access to allowlisted admins
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      if (ctx.path?.startsWith("/callback")) {
        const newSession = ctx.context?.newSession;
        if (newSession?.user?.email) {
          if (!isInstitutionalEmail(newSession.user.email)) {
            throw new APIError("FORBIDDEN", {
              message: "Only @vitstudent.ac.in accounts are allowed.",
            });
          }
          if (isAdminEmail(newSession.user.email)) {
            newSession.user.role = "admin";
            try {
              await firestore
                .collection("user")
                .doc(newSession.user.id)
                .set({ role: "admin" }, { merge: true });
            } catch (e) {
              console.warn("Could not persist admin role to firestore user:", e);
            }
          }
        }
      }
    }),
  },
  plugins: [
    admin({
      defaultRole: "user",
      adminRoles: ["admin"],
    }),
    nextCookies(),
  ],
});