import { connect, serializeFirestoreData } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    // 1. Rate Limiting (30 requests / min per IP)
    const clientIp = getClientIp(req);
    const limit = rateLimit(`admin_applicants_${clientIp}`, {
      maxRequests: 30,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Too many requests." },
        {
          status: 429,
          headers: {
            "Retry-After": limit.retryAfter.toString(),
            "X-RateLimit-Limit": limit.limit.toString(),
            "X-RateLimit-Remaining": limit.remaining.toString(),
            "X-RateLimit-Reset": limit.reset.toString(),
          },
        }
      );
    }

    // 2. Authentication & RBAC Guard (OWASP A01 Defense)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Authentication required to access candidate records" },
        { status: 401 }
      );
    }

    if (!isUserAdmin(session.user)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator role required" },
        { status: 403 }
      );
    }

    // 3. Authorized Data Retrieval
    const db = await connect();
    const snapshot = await db.collection("formData").get();
    const applicants = snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...serializeFirestoreData(doc.data()),
    }));

    return NextResponse.json(
      { applicants },
      {
        headers: {
          "X-RateLimit-Remaining": limit.remaining.toString(),
        },
      }
    );
  } catch (error) {
    console.error("Error fetching applicants:", error);
    return NextResponse.json(
      { error: "Failed to fetch applicants" },
      { status: 500 }
    );
  }
}
