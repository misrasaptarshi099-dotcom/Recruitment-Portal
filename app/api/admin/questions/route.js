import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, isSuperAdmin, canAccessDepartment, getUserAdminRole } from "@/lib/security";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { loadRoleConfig } from "@/lib/admin-auth";
import { departmentsData, QuestionnaireData } from "@/constants/departments-data";
import { redis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const normalizeDeptSlug = (deptName) => {
  if (!deptName) return "general";
  return deptName
    .trim()
    .toLowerCase()
    .replace(/\s*\/\s*/g, "_")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_");
};

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

    const isSuper = isSuperAdmin(session.user, roleConfig);
    const roleInfo = getUserAdminRole(session.user, roleConfig);
    const allDeptNames = departmentsData.map((d) => d.name);
    const allowedDepartments = isSuper ? allDeptNames : roleInfo.departments;

    // Fetch custom questionnaires configured in Firestore
    let customQuestionnaires = {};
    try {
      const docSnap = await db.collection("recruitment_config").doc("questionnaires").get();
      if (docSnap.exists) {
        customQuestionnaires = docSnap.data()?.departments || {};
      }
    } catch (err) {
      console.warn("Notice reading recruitment_config/questionnaires:", err?.message || err);
    }

    // Build consolidated list: merge custom over QuestionnaireData defaults
    const consolidated = allDeptNames.map((deptName) => {
      const slug = normalizeDeptSlug(deptName);
      const custom = customQuestionnaires[slug] || customQuestionnaires[deptName];

      const defaultEntry = QuestionnaireData.find(
        (qd) => qd.department.toLowerCase() === deptName.toLowerCase()
      );

      const defaultQuestions = (defaultEntry?.questions || []).map((q, idx) => ({
        id: `def_${idx + 1}`,
        name: typeof q === "string" ? q : q.name || "",
        type: typeof q === "object" && q.type ? q.type : "generic",
        placeholder: typeof q === "object" && q.placeholder ? q.placeholder : "Your response...",
      }));

      return {
        department: deptName,
        departmentSlug: slug,
        isCustomized: Boolean(custom?.questions?.length),
        updatedAt: custom?.updatedAt || null,
        updatedBy: custom?.updatedBy || null,
        questions: custom?.questions?.length ? custom.questions : defaultQuestions,
        defaultQuestions,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        questionnaires: consolidated,
      },
      allowedDepartments,
      isSuperAdmin: isSuper,
    });
  } catch (error) {
    console.error("Error fetching admin questionnaires:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch questionnaires" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = await rateLimitAsync(`admin_questions_${clientIp}`, {
      maxRequests: 40,
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
    const { department, questions } = body;

    if (!department || typeof department !== "string") {
      return NextResponse.json(
        { success: false, message: "Department name is required" },
        { status: 400 }
      );
    }

    if (!canAccessDepartment(session.user, department, roleConfig)) {
      return NextResponse.json(
        {
          success: false,
          message: `Forbidden: You do not have permission to configure questions for the "${department}" department`,
        },
        { status: 403 }
      );
    }

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { success: false, message: "Department must have at least one question" },
        { status: 400 }
      );
    }

    // Validate and clean each question
    const sanitizedQuestions = questions.map((q, idx) => {
      const name = String(q.name || q.question || "").trim();
      if (!name) {
        throw new Error(`Question #${idx + 1} cannot have empty text`);
      }
      return {
        id: q.id || `q_${idx + 1}_${Date.now()}`,
        name,
        type: ["generic", "short-text", "long-text"].includes(q.type) ? q.type : "generic",
        placeholder: String(q.placeholder || "Your answer...").trim(),
      };
    });

    const slug = normalizeDeptSlug(department);
    const nowIso = new Date().toISOString();

    const deptPayload = {
      department,
      departmentSlug: slug,
      questions: sanitizedQuestions,
      updatedAt: nowIso,
      updatedBy: session.user.email,
    };

    // Store in recruitment_config/questionnaires under departments[slug]
    await db
      .collection("recruitment_config")
      .doc("questionnaires")
      .set(
        {
          departments: {
            [slug]: deptPayload,
          },
          updatedAt: nowIso,
          updatedBy: session.user.email,
        },
        { merge: true }
      );

    // Invalidate Redis cache
    await redis.del("recruitment_config:questionnaires");

    return NextResponse.json({
      success: true,
      message: `Questions for "${department}" updated successfully`,
      data: deptPayload,
    });
  } catch (error) {
    console.error("Error updating admin questionnaires:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update questions" },
      { status: 400 }
    );
  }
}
