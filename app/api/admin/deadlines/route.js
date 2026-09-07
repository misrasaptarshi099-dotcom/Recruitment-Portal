import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, isSuperAdmin, canAccessDepartment, getUserAdminRole } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { loadRoleConfig } from "@/lib/admin-auth";
import { departmentsData } from "@/constants/departments-data";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!session?.user || !isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const docSnap = await db.collection("recruitment_config").doc("deadlines").get();
    const data = docSnap.exists ? docSnap.data() : {};

    const isSuper = isSuperAdmin(session.user, roleConfig);
    const roleInfo = getUserAdminRole(session.user, roleConfig);

    // Provide the departments the caller is permitted to view/manage
    const allDeptNames = departmentsData.map((d) => d.name);
    const allowedDepartments = isSuper ? allDeptNames : roleInfo.departments;

    return NextResponse.json({
      success: true,
      data: {
        departments: data.departments || {},
        // Legacy fallbacks
        round1Deadline: data.round1Deadline || "",
        round2Deadline: data.round2Deadline || "",
        round2Deadlines: data.round2Deadlines || {},
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
      },
      allowedDepartments,
      isSuperAdmin: isSuper,
    });
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch deadlines" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`admin_deadlines_${clientIp}`, {
      maxRequests: 30,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        { status: 429, headers: { "Retry-After": limit.retryAfter.toString() } }
      );
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!session?.user || !isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Administrator privileges required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { department, round1Deadline, round2Deadline } = body;

    if (!department || typeof department !== "string") {
      return NextResponse.json(
        { success: false, message: "Department name is required" },
        { status: 400 }
      );
    }

    // Authorization: Department managers can only modify deadlines for their assigned departments
    if (!canAccessDepartment(session.user, department, roleConfig)) {
      return NextResponse.json(
        {
          success: false,
          message: `Forbidden: You do not have permission to configure deadlines for the "${department}" department`,
        },
        { status: 403 }
      );
    }

    const nowIso = new Date().toISOString();
    const deptDeadlinePayload = {
      round1Deadline: round1Deadline ? String(round1Deadline).trim() : null,
      round2Deadline: round2Deadline ? String(round2Deadline).trim() : null,
      updatedAt: nowIso,
      updatedBy: session.user.email,
    };

    // Save under departments[department] in recruitment_config/deadlines
    await db
      .collection("recruitment_config")
      .doc("deadlines")
      .set(
        {
          departments: {
            [department]: deptDeadlinePayload,
          },
          updatedAt: nowIso,
          updatedBy: session.user.email,
        },
        { merge: true }
      );

    return NextResponse.json({
      success: true,
      message: `Deadlines for "${department}" updated successfully`,
      data: deptDeadlinePayload,
    });
  } catch (error) {
    console.error("Error updating deadlines:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update deadlines" },
      { status: 500 }
    );
  }
}
