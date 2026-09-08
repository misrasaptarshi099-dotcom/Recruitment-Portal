import { NextResponse } from "next/server";
import { QuestionnaireData, departmentsData } from "../../../constants/departments-data";
import { connect } from "../../../lib/db";

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
  const { searchParams } = new URL(req.url);
  const requestedDept = searchParams.get("department");

  let customMap = {};
  try {
    const db = await connect();
    const docSnap = await db.collection("recruitment_config").doc("questionnaires").get();
    if (docSnap.exists) {
      customMap = docSnap.data()?.departments || {};
    }
  } catch (err) {
    console.warn("Notice reading questionnaires config from Firestore:", err?.message || err);
  }

  // Merge custom questions on top of QuestionnaireData defaults
  const allDeptNames = departmentsData.map((d) => d.name);
  const consolidated = allDeptNames.map((deptName) => {
    const slug = normalizeDeptSlug(deptName);
    const custom = customMap[slug] || customMap[deptName];

    if (custom?.questions?.length) {
      return {
        department: deptName,
        questions: custom.questions.map((q) => ({
          name: q.name || q.question,
          type: q.type || "generic",
          placeholder: q.placeholder || "Your answer...",
        })),
      };
    }

    const defaultEntry = QuestionnaireData.find(
      (qd) => qd.department.toLowerCase() === deptName.toLowerCase()
    );

    return {
      department: deptName,
      questions: (defaultEntry?.questions || []).map((q) =>
        typeof q === "string" ? { name: q, type: "generic", placeholder: "Your answer..." } : q
      ),
    };
  });

  let questions = consolidated;
  if (requestedDept) {
    const targetSlug = normalizeDeptSlug(requestedDept);
    questions = consolidated.filter(
      (q) =>
        normalizeDeptSlug(q.department) === targetSlug ||
        q.department.toLowerCase() === requestedDept.toLowerCase()
    );
  }

  return NextResponse.json(
    { questions },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=120",
      },
    }
  );
}
