import { connect, serializeFirestoreData } from "@/lib/db";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, getUserAdminRole } from "@/lib/security";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { loadRoleConfig } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    // 1. Rate Limiting (30 requests / min per IP)
    const clientIp = getClientIp(req);
    const limit = await rateLimitAsync(`admin_applicants_${clientIp}`, {
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

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { error: "Forbidden: Administrator role required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const requestedLimit = parseInt(searchParams.get("limit") || "0", 10);
    const cursor = searchParams.get("cursor");
    const requestedDept = searchParams.get("department");

    // 3. Department scoping for dept_managers
    const { role, departments } = getUserAdminRole(session.user, roleConfig);
    const isDeptManager = role === "dept_manager";

    let query = db.collection("formData");

    if (requestedDept) {
      if (isDeptManager && !departments.includes(requestedDept)) {
        return NextResponse.json(
          { error: "Forbidden: You do not have access to this department" },
          { status: 403 }
        );
      }
      query = query.where("Department", "==", requestedDept);
    } else if (isDeptManager) {
      if (departments.length === 0) {
        query = query.where("Department", "==", "__NONE__");
      } else if (departments.length === 1) {
        query = query.where("Department", "==", departments[0]);
      } else {
        query = query.where("Department", "in", departments);
      }
    }

    // Apply cursor-based pagination if limit is requested
    let hasMore = false;
    let nextCursor = null;

    if (requestedLimit > 0) {
      const pageLimit = Math.min(Math.max(requestedLimit, 1), 200);
      let pagedQuery = query.orderBy("__name__").limit(pageLimit + 1);

      if (cursor) {
        const cursorDoc = await db.collection("formData").doc(cursor).get();
        if (cursorDoc.exists) {
          pagedQuery = pagedQuery.startAfter(cursorDoc);
        }
      }

      const snapshot = await pagedQuery.get();
      const docs = snapshot.docs;
      hasMore = docs.length > pageLimit;
      const returnDocs = hasMore ? docs.slice(0, pageLimit) : docs;

      let applicants = returnDocs.map((doc) => ({
        id: doc.id,
        _id: doc.id,
        ...serializeFirestoreData(doc.data()),
      }));



      if (returnDocs.length > 0) {
        nextCursor = returnDocs[returnDocs.length - 1].id;
      }

      return NextResponse.json(
        {
          applicants,
          hasMore,
          nextCursor: hasMore ? nextCursor : null,
          totalCount: applicants.length,
        },
        {
          headers: {
            "X-RateLimit-Remaining": limit.remaining.toString(),
          },
        }
      );
    }

    // Default full fetch
    const snapshot = await query.get();
    let applicants = snapshot.docs.map((doc) => ({
      id: doc.id,
      _id: doc.id,
      ...serializeFirestoreData(doc.data()),
    }));



    return NextResponse.json(
      { applicants, totalCount: applicants.length },
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
