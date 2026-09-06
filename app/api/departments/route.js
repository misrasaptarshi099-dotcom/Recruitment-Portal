import { NextResponse } from "next/server";
import { departmentsData } from "../../../constants/departments-data";

// Edge runtime / CDN cache headers
export const dynamic = "force-static";
export const revalidate = 86400; // 24 hours

export async function GET() {
  const departments = departmentsData.map((dept) => ({
    id: dept.id,
    name: dept.name,
    tone: dept.tone,
    description: dept.description,
  }));

  return NextResponse.json(
    { departments },
    {
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
        "CDN-Cache-Control": "public, s-maxage=86400",
      },
    }
  );
}
