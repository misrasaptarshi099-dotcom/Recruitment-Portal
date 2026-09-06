import { NextResponse } from "next/server";
import { QuestionnaireData } from "../../../constants/departments-data";

export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const requestedDept = searchParams.get("department");

  let questions = QuestionnaireData;
  if (requestedDept) {
    questions = QuestionnaireData.filter(
      (q) => q.department.toLowerCase() === requestedDept.toLowerCase()
    );
  }

  return NextResponse.json(
    { questions },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "CDN-Cache-Control": "public, s-maxage=86400",
      },
    }
  );
}
