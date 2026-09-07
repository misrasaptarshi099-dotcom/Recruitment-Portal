import { betterAuth } from "better-auth";
import { firestoreAdapter } from "better-auth-firestore";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { nextCookies } from "better-auth/next-js";
import { admin } from "better-auth/plugins";
import { APIError, createAuthMiddleware } from "better-auth/api";
import { isInstitutionalEmail, isAdminEmail } from "./security.js";
import { purgeRevokedNonInstitutionalUser } from "./admin-auth.js";

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
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
  onAPIError: {
    errorURL: `${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/auth/signin`,
  },
  database: firestoreAdapter({
    firestore,
  }),
  databaseHooks: {
    user: {
      create: {
        before: async (user) => {
          let isAllowed = isInstitutionalEmail(user?.email);
          let isDynamicAdmin = false;
          if (user?.email) {
            try {
              const snap = await firestore.collection("recruitment_config").doc("admin_roles").get();
              if (snap.exists) {
                const config = snap.data();
                const emailLower = user.email.trim().toLowerCase();
                if (config?.assignments && config.assignments[emailLower]) {
                  isAllowed = true;
                  isDynamicAdmin = true;
                }
              }
            } catch (e) {
              console.warn("Could not check dynamic admin roles on create:", e);
            }
          }

          if (!isAllowed) {
            await purgeRevokedNonInstitutionalUser(firestore, user?.email);
            const isPersonalEmail = user?.email && !user.email.toLowerCase().endsWith("@vitstudent.ac.in");
            const rejectionMsg = isPersonalEmail
              ? "Access Denied: Only @vitstudent.ac.in accounts are permitted. Personal Gmail accounts cannot register as candidates."
              : "Access Denied: Only authorized @vitstudent.ac.in accounts are permitted.";
            throw new APIError("FORBIDDEN", {
              message: rejectionMsg,
            });
          }
          if (user?.email && (isAdminEmail(user.email) || isDynamicAdmin)) {
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
            prompt: "select_account",
          },
        }
      : {}),
  },
  // Server-side domain enforcement (rules.md §3.1)
  // Rejects unauthorized non-institutional accounts while granting full access to allowlisted admins
  hooks: {
    after: createAuthMiddleware(async (ctx) => {
      // 1. Enforce on OAuth callback
      if (ctx.path?.startsWith("/callback")) {
        const newSession = ctx.context?.newSession;
        if (newSession?.user?.email) {
          let isAllowed = isInstitutionalEmail(newSession.user.email);
          let isDynamicAdmin = false;
          try {
            const snap = await firestore.collection("recruitment_config").doc("admin_roles").get();
            if (snap.exists) {
              const config = snap.data();
              const emailLower = newSession.user.email.trim().toLowerCase();
              if (config?.assignments && config.assignments[emailLower]) {
                isAllowed = true;
                isDynamicAdmin = true;
              }
            }
          } catch (e) {
            console.warn("Could not check dynamic admin roles on callback:", e);
          }

          if (!isAllowed) {
            await purgeRevokedNonInstitutionalUser(firestore, newSession.user.email);

            if (newSession.session) {
              delete newSession.session;
            }
            if (typeof ctx.setCookie === "function") {
              ctx.setCookie("better-auth.session_token", "", { maxAge: 0, path: "/" });
            }
            if (ctx.responseCookies?.delete) {
              ctx.responseCookies.delete("better-auth.session_token");
            } else if (ctx.responseCookies?.set) {
              ctx.responseCookies.set("better-auth.session_token", "", { maxAge: 0, path: "/" });
            }

            const emailLower = newSession.user.email.trim().toLowerCase();
            const isPersonalEmail = !emailLower.endsWith("@vitstudent.ac.in");
            const rejectionMsg = isPersonalEmail
              ? "Access Denied: Your administrative privileges were revoked. Because candidates must use an institutional (@vitstudent.ac.in) email, this personal Gmail account has been permanently deleted from the system."
              : "Access Denied: Only @vitstudent.ac.in accounts are allowed.";

            const redirectUrl = new URL(`${process.env.BETTER_AUTH_URL || 'http://localhost:3000'}/auth/signin`);
            redirectUrl.searchParams.set("error", "FORBIDDEN");
            redirectUrl.searchParams.set("reason", rejectionMsg);
            redirectUrl.searchParams.set("error_description", rejectionMsg);
            throw ctx.redirect(redirectUrl.toString());
          }
          if (isAdminEmail(newSession.user.email) || isDynamicAdmin) {
            newSession.user.role = "admin";
            try {
              await firestore
                .collection("users")
                .doc(newSession.user.id)
                .set({ role: "admin" }, { merge: true });
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

      // 2. Enforce on active session check (/get-session)
      // If a non-institutional email had its admin role revoked, purge the account and terminate session
      if (ctx.path?.startsWith("/get-session")) {
        const sessionData = ctx.context?.session;
        if (sessionData?.user?.email) {
          const emailLower = sessionData.user.email.trim().toLowerCase();
          if (!emailLower.endsWith("@vitstudent.ac.in") && !isAdminEmail(emailLower)) {
            let hasActiveRole = false;
            try {
              const snap = await firestore.collection("recruitment_config").doc("admin_roles").get();
              if (snap.exists) {
                const config = snap.data();
                if (config?.assignments && config.assignments[emailLower]) {
                  const assignment = config.assignments[emailLower];
                  if (
                    assignment.role === "super_admin" ||
                    (assignment.role === "dept_manager" && Array.isArray(assignment.departments) && assignment.departments.length > 0)
                  ) {
                    hasActiveRole = true;
                  }
                }
              }
            } catch (e) {
              console.warn("Error verifying session admin clearance:", e);
            }

            if (!hasActiveRole) {
              await purgeRevokedNonInstitutionalUser(firestore, emailLower);
              if (sessionData.session) {
                delete sessionData.session;
              }
              if (typeof ctx.setCookie === "function") {
                ctx.setCookie("better-auth.session_token", "", { maxAge: 0, path: "/" });
              }
              if (ctx.responseCookies?.delete) {
                ctx.responseCookies.delete("better-auth.session_token");
              } else if (ctx.responseCookies?.set) {
                ctx.responseCookies.set("better-auth.session_token", "", { maxAge: 0, path: "/" });
              }
              throw new APIError("FORBIDDEN", {
                message: "Access Denied: Administrative privileges were revoked. Non-institutional accounts are deleted from the system.",
              });
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