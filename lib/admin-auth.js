/**
 * Shared helpers for admin API routes to load role configuration
 * and perform department-scoped authorization checks.
 */
import { connect } from "./db";
import { getUserAdminRole, canAccessDepartment, isAdminEmail, isActiveAssignment } from "./security";

/**
 * Load the admin_roles config document from Firestore.
 * Caches the database connection via the singleton in lib/db.
 */
export async function loadRoleConfig(db) {
  if (!db) db = await connect();
  const docSnap = await db.collection("recruitment_config").doc("admin_roles").get();
  return docSnap.exists ? docSnap.data() : { assignments: {} };
}

/**
 * Look up the department of an applicant by their ID.
 * Checks both formData and applications collections.
 */
export async function getApplicantDepartment(db, applicantId) {
  const formSnap = await db.collection("formData").doc(applicantId).get();
  if (formSnap.exists) {
    const d = formSnap.data();
    return d.Department || d.department || "";
  }
  const appSnap = await db.collection("applications").doc(applicantId).get();
  if (appSnap.exists) {
    const d = appSnap.data();
    return d.Department || d.department || "";
  }
  return "";
}

/**
 * Checks if the current admin session is authorized to view or mutate
 * candidate records for the specified department.
 *
 * @param {object} sessionUser - session.user object
 * @param {string} departmentName - Department name to check
 * @param {object} [roleConfig] - Optional pre-loaded roleConfig
 * @returns {{ authorized: boolean, reason?: string }}
 */
export function authorizeDepartmentAccess(sessionUser, departmentName, roleConfig) {
  if (!sessionUser) {
    return { authorized: false, reason: "Authentication required" };
  }

  const userRole = getUserAdminRole(sessionUser, roleConfig);
  if (!userRole.isAuthorized) {
    return { authorized: false, reason: "Administrator privileges required" };
  }

  // Super admins have access to all departments
  if (userRole.role === "super_admin") {
    return { authorized: true };
  }

  // Dept managers must be assigned to this department
  if (userRole.role === "dept_manager") {
    if (canAccessDepartment(sessionUser, departmentName, roleConfig)) {
      return { authorized: true };
    }
    return {
      authorized: false,
      reason: `Access Denied: You do not have management privileges for the "${departmentName}" department`,
    };
  }

  return { authorized: false, reason: "Unauthorized admin role" };
}

/**
 * Purges a non-institutional account (and all active sessions) if its admin role
 * has been revoked. Institutional accounts (@vitstudent.ac.in) and static allowlisted
 * admins are NEVER purged.
 *
 * @param {object} db - Firestore instance
 * @param {string} email - Email to check and potentially purge
 * @returns {Promise<{ purged: boolean, reason: string }>}
 */
export async function purgeRevokedNonInstitutionalUser(db, email) {
  if (!email || typeof email !== "string") {
    return { purged: false, reason: "invalid_email" };
  }
  const lower = email.trim().toLowerCase();

  // 1. Institutional accounts are never purged (they are valid students/candidates)
  if (lower.endsWith("@vitstudent.ac.in")) {
    return { purged: false, reason: "institutional_account" };
  }

  // 2. Static allowlisted admins from ADMIN_EMAILS are never purged
  if (isAdminEmail(lower)) {
    return { purged: false, reason: "static_allowlisted_admin" };
  }

  // 3. Check if the user currently holds an active role assignment in Firestore
  try {
    const roleConfig = await loadRoleConfig(db);
    if (roleConfig?.assignments && roleConfig.assignments[lower]) {
      const assignment = roleConfig.assignments[lower];
      // If assignment has an active role (super_admin or dept_manager with at least 1 dept), don't purge
      if (isActiveAssignment(assignment)) {
        return { purged: false, reason: "active_dynamic_admin" };
      }
    }
  } catch (err) {
    console.warn("Could not check roleConfig before purging user:", err);
  }

  // 4. Non-institutional email with NO active admin privileges: PURGE
  try {
    const userCollections = ["users", "user"];
    const sessionCollections = ["sessions", "session"];
    const accountCollections = ["accounts", "account"];
    const deletedUserIds = new Set();
    let hasDeletedDocs = false;

    for (const col of userCollections) {
      const colRef = db.collection(col);
      if (!colRef || typeof colRef.where !== "function") continue;
      const userSnaps = await colRef.where("email", "==", lower).get();
      for (const uDoc of userSnaps.docs) {
        deletedUserIds.add(uDoc.id);
        await uDoc.ref.delete();
        hasDeletedDocs = true;
      }
      // Also clean up by direct ID if doc ID happens to be the email
      if (typeof colRef.doc === "function") {
        deletedUserIds.add(lower);
        try {
          if (typeof colRef.doc(lower).get === "function") {
            const directSnap = await colRef.doc(lower).get();
            if (directSnap?.exists) {
              await colRef.doc(lower).delete();
              hasDeletedDocs = true;
            }
          } else {
            await colRef.doc(lower).delete();
          }
        } catch {
          await colRef.doc(lower).delete().catch(() => {});
        }
      }
    }

    // Clean up all sessions and linked accounts for all deleted user IDs
    for (const uid of deletedUserIds) {
      for (const col of sessionCollections) {
        const colRef = db.collection(col);
        if (!colRef || typeof colRef.where !== "function") continue;
        const sessSnaps = await colRef.where("userId", "==", uid).get();
        for (const s of sessSnaps.docs) {
          await s.ref.delete();
          hasDeletedDocs = true;
        }
        const sessSnapsSnake = await colRef.where("user_id", "==", uid).get();
        for (const s of sessSnapsSnake.docs) {
          await s.ref.delete();
          hasDeletedDocs = true;
        }
      }

      for (const col of accountCollections) {
        const colRef = db.collection(col);
        if (!colRef || typeof colRef.where !== "function") continue;
        const accSnaps = await colRef.where("userId", "==", uid).get();
        for (const a of accSnaps.docs) {
          await a.ref.delete();
          hasDeletedDocs = true;
        }
        const accSnapsSnake = await colRef.where("user_id", "==", uid).get();
        for (const a of accSnapsSnake.docs) {
          await a.ref.delete();
          hasDeletedDocs = true;
        }
      }
    }

    return { purged: Boolean(hasDeletedDocs), reason: "revoked_non_institutional" };
  } catch (err) {
    console.error(`[Security Purge] Error purging account ${lower}:`, err);
    return { purged: false, reason: err.message };
  }
}

/**
 * Sweep user collections and delete any non-institutional accounts
 * that lack active administrator privileges.
 *
 * @param {object} db - Firestore instance
 * @returns {Promise<{ purgedCount: number, purgedEmails: string[] }>}
 */
export async function purgeAllRevokedNonInstitutionalUsers(db) {
  if (!db) db = await connect();
  const roleConfig = await loadRoleConfig(db);
  const assignments = roleConfig.assignments || {};
  const purgedEmails = [];

  const userCollections = ["users", "user"];
  for (const col of userCollections) {
    try {
      const colRef = db.collection(col);
      if (!colRef || typeof colRef.get !== "function") continue;
      const snaps = await colRef.get();
      for (const doc of snaps.docs) {
        const data = doc.data() || {};
        const email = (data.email || doc.id || "").trim().toLowerCase();
        if (!email || !email.includes("@")) continue;

        // Skip legitimate institutional accounts
        if (email.endsWith("@vitstudent.ac.in")) continue;

        // Skip static admins
        if (isAdminEmail(email)) continue;

        // Check active role
        const assignment = assignments[email];
        const hasActiveRole =
          assignment &&
          (assignment.role === "super_admin" ||
            (assignment.role === "dept_manager" &&
              Array.isArray(assignment.departments) &&
              assignment.departments.length > 0));

        if (!hasActiveRole) {
          const res = await purgeRevokedNonInstitutionalUser(db, email);
          if (res.purged) {
            purgedEmails.push(email);
          }
        }
      }
    } catch (err) {
      console.warn(`Error sweeping ${col} for revoked accounts:`, err);
    }
  }

  return {
    purgedCount: purgedEmails.length,
    purgedEmails: Array.from(new Set(purgedEmails)),
  };
}

