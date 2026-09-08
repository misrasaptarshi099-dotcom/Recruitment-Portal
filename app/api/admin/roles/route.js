import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, isSuperAdmin, getUserAdminRole } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { departmentsData } from "@/constants/departments-data";
import { purgeRevokedNonInstitutionalUser } from "@/lib/admin-auth";
import { FieldValue, FieldPath } from "firebase-admin/firestore";

export const dynamic = "force-dynamic";

const VALID_DEPARTMENT_NAMES = departmentsData.map((d) => d.name);

/**
 * Fetch the admin_roles config document from Firestore.
 */
async function getRoleConfig(db) {
  const docSnap = await db.collection("recruitment_config").doc("admin_roles").get();
  return docSnap.exists ? docSnap.data() : { assignments: {} };
}

/**
 * GET — List role assignments.
 * - Super Admins see all assignments.
 * - Department Managers see assignments within their assigned department(s).
 */
export async function GET(req) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const db = await connect();
    const roleConfig = await getRoleConfig(db);

    if (!isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required" },
        { status: 403 }
      );
    }

    const isSuper = isSuperAdmin(session.user, roleConfig);
    const roleInfo = getUserAdminRole(session.user, roleConfig);
    const assignments = roleConfig.assignments || {};

    if (isSuper) {
      return NextResponse.json({
        success: true,
        data: assignments,
        validDepartments: VALID_DEPARTMENT_NAMES,
        allowedDepartments: VALID_DEPARTMENT_NAMES,
        isSuperAdmin: true,
      });
    }

    // Department manager view: filter to assignments sharing at least one assigned department
    const managerDepts = roleInfo.departments || [];
    const filteredAssignments = {};

    for (const [email, entry] of Object.entries(assignments)) {
      if (
        entry.role === "dept_manager" &&
        Array.isArray(entry.departments) &&
        entry.departments.some((d) => managerDepts.includes(d))
      ) {
        filteredAssignments[email] = entry;
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredAssignments,
      validDepartments: managerDepts,
      allowedDepartments: managerDepts,
      isSuperAdmin: false,
    });
  } catch (error) {
    console.error("Error fetching admin roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch role assignments" },
      { status: 500 }
    );
  }
}

/**
 * POST — Assign or update a manager's role and departments.
 * - Super Admins can assign any role and any department.
 * - Department Managers can ONLY assign 'dept_manager' within their own department(s).
 */
export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`admin_roles_${clientIp}`, {
      maxRequests: 30,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": limit.retryAfter.toString() } }
      );
    }

    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const db = await connect();
    const roleConfig = await getRoleConfig(db);

    if (!isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required" },
        { status: 403 }
      );
    }

    const isSuper = isSuperAdmin(session.user, roleConfig);
    const roleInfo = getUserAdminRole(session.user, roleConfig);

    const body = await req.json().catch(() => ({}));
    const { email, role, departments } = body;

    // Validate email
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Valid email address is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingEntry = roleConfig.assignments?.[normalizedEmail];
    let finalRole = role;
    let finalDepartments = departments;

    if (!isSuper) {
      const managerDepts = roleInfo.departments || [];

      // Department managers can only grant 'dept_manager'
      if (role !== "dept_manager") {
        return NextResponse.json(
          { error: "Forbidden: Department managers can only assign Department Manager privileges" },
          { status: 403 }
        );
      }

      // Department managers cannot modify Super Admins
      if (existingEntry?.role === "super_admin") {
        return NextResponse.json(
          { error: "Forbidden: Department managers cannot modify Super Admin accounts" },
          { status: 403 }
        );
      }

      // Validate departments: must be non-empty and subset of managerDepts
      if (!Array.isArray(departments) || departments.length === 0) {
        return NextResponse.json(
          { error: "Select at least one department to assign" },
          { status: 400 }
        );
      }

      const unauthorizedDepts = departments.filter((d) => !managerDepts.includes(d));
      if (unauthorizedDepts.length > 0) {
        return NextResponse.json(
          {
            error: `Forbidden: You can only grant admin privileges for your assigned department(s): ${managerDepts.join(", ")}`,
          },
          { status: 403 }
        );
      }

      finalRole = "dept_manager";

      // If target user already has departments in areas outside acting manager's jurisdiction, preserve them!
      const unmanagedExisting = (existingEntry?.departments || []).filter(
        (d) => !managerDepts.includes(d)
      );
      finalDepartments = Array.from(new Set([...unmanagedExisting, ...departments]));
    } else {
      // Super Admin validation
      if (!["dept_manager", "super_admin"].includes(role)) {
        return NextResponse.json(
          { error: "Role must be 'dept_manager' or 'super_admin'" },
          { status: 400 }
        );
      }

      if (role === "dept_manager") {
        if (!Array.isArray(departments) || departments.length === 0) {
          return NextResponse.json(
            { error: "Department managers must be assigned at least one department" },
            { status: 400 }
          );
        }
        const invalidDepts = departments.filter((d) => !VALID_DEPARTMENT_NAMES.includes(d));
        if (invalidDepts.length > 0) {
          return NextResponse.json(
            { error: `Invalid department(s): ${invalidDepts.join(", ")}` },
            { status: 400 }
          );
        }
        finalDepartments = departments;
      } else {
        finalDepartments = [];
      }
    }

    const updatedAssignments = {
      ...(roleConfig.assignments || {}),
      [normalizedEmail]: {
        role: finalRole,
        departments: finalDepartments,
        updatedAt: new Date().toISOString(),
        updatedBy: session.user.email,
      },
    };

    await db.collection("recruitment_config").doc("admin_roles").set(
      { assignments: updatedAssignments },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      message: `Role assignment updated for ${normalizedEmail}`,
      data: updatedAssignments[normalizedEmail],
    });
  } catch (error) {
    console.error("Error updating admin role:", error);
    return NextResponse.json(
      { error: "Failed to update role assignment" },
      { status: 500 }
    );
  }
}

/**
 * DELETE — Revoke a manager's role assignment.
 * - Super Admins can revoke any role assignment.
 * - Department Managers can ONLY revoke access for their own department(s).
 */
export async function DELETE(req) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const db = await connect();
    const roleConfig = await getRoleConfig(db);

    if (!isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required" },
        { status: 403 }
      );
    }

    const isSuper = isSuperAdmin(session.user, roleConfig);
    const roleInfo = getUserAdminRole(session.user, roleConfig);

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { error: "Email query parameter is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const assignments = { ...(roleConfig.assignments || {}) };
    const target = assignments[normalizedEmail];

    if (!target) {
      return NextResponse.json(
        { error: `No role assignment found for ${normalizedEmail}` },
        { status: 404 }
      );
    }

    let successMessage = `Role assignment revoked for ${normalizedEmail}`;

    if (!isSuper) {
      const managerDepts = roleInfo.departments || [];

      // Cannot revoke Super Admin accounts
      if (target.role === "super_admin") {
        return NextResponse.json(
          { error: "Forbidden: Department managers cannot revoke Super Admin privileges" },
          { status: 403 }
        );
      }

      const targetDepts = target.departments || [];
      const managedOverlap = targetDepts.filter((d) => managerDepts.includes(d));

      if (managedOverlap.length === 0) {
        return NextResponse.json(
          { error: "Forbidden: You do not manage any of the departments assigned to this user" },
          { status: 403 }
        );
      }

      // Check if target still has other departments outside acting manager's jurisdiction
      const remainingDepts = targetDepts.filter((d) => !managerDepts.includes(d));

      if (remainingDepts.length > 0) {
        // Strip only the acting manager's departments, leaving the others intact
        assignments[normalizedEmail] = {
          ...target,
          departments: remainingDepts,
          updatedAt: new Date().toISOString(),
          updatedBy: session.user.email,
        };
        successMessage = `Revoked privileges for [${managedOverlap.join(", ")}] from ${normalizedEmail}`;
      } else {
        // Remove assignment entirely
        delete assignments[normalizedEmail];
      }
    } else {
      // Super admin deletes entirely
      delete assignments[normalizedEmail];
    }

    const roleDocRef = db.collection("recruitment_config").doc("admin_roles");
    const assignmentFieldPath = new FieldPath("assignments", normalizedEmail);

    if (assignments[normalizedEmail]) {
      await roleDocRef.update(assignmentFieldPath, assignments[normalizedEmail]);
    } else {
      await roleDocRef.update(assignmentFieldPath, FieldValue.delete());
    }

    // If role assignment was completely deleted, purge non-institutional account if applicable
    if (!assignments[normalizedEmail]) {
      const purgeResult = await purgeRevokedNonInstitutionalUser(db, normalizedEmail);
      if (purgeResult.purged) {
        successMessage += " (non-institutional account deleted from system)";
      }
    }

    return NextResponse.json({
      success: true,
      message: successMessage,
    });
  } catch (error) {
    console.error("Error deleting admin role:", error);
    return NextResponse.json(
      { error: "Failed to revoke role assignment" },
      { status: 500 }
    );
  }
}
