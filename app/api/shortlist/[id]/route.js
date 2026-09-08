import { NextResponse } from "next/server";
import { connect, serializeFirestoreData } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { loadRoleConfig, getApplicantDepartment, authorizeDepartmentAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try {
    // 1. Rate Limiting (60 updates / min)
    const clientIp = getClientIp(req);
    const limit = rateLimit(`shortlist_${clientIp}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded" },
        {
          status: 429,
          headers: { "Retry-After": limit.retryAfter.toString() },
        }
      );
    }

    // 2. RBAC Guard (Admin Only)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Administrator privileges required" },
        { status: 403 }
      );
    }

    // 3. ID Parameter Sanitization
    const { id } = params;
    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid application ID format" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const shortlisted = Boolean(body.shortlisted);

    const docRef = db.collection("formData").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, message: "Applicant not found" },
        { status: 404 }
      );
    }

    // Department scoping guard
    const docData = snapshot.data() || {};
    const applicantDept = docData.Department || docData.department || "";
    const deptAuth = authorizeDepartmentAccess(session.user, applicantDept, roleConfig);
    if (!deptAuth.authorized) {
      return NextResponse.json(
        { success: false, message: deptAuth.reason },
        { status: 403 }
      );
    }

    const currentData = docData;
    let appData = {};
    try {
      const appSnap = await db.collection("applications").doc(id).get();
      if (appSnap.exists) {
        appData = appSnap.data() || {};
      }
    } catch {
      // ignore
    }

    const isRound1MailSent = Boolean(currentData.round1MailSent || appData.round1MailSent);

    // Decision state lock: Once send mail is pressed, decision state cannot be changed
    if (isRound1MailSent) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot modify Round 1 decision: Decision email has already been sent to this candidate.",
        },
        { status: 409 }
      );
    }

    // 4. Atomic Dual-Update to legacy formData and BCNF applications
    await docRef.update({
      shortlisted,
      Shortlisted: shortlisted,
    });

    // If BCNF application exists with same id or candidateEmail, synchronize it
    try {
      const appRef = db.collection("applications").doc(id);
      const appSnap = await appRef.get();
      if (appSnap.exists) {
        await appRef.update({
          shortlisted,
          status: shortlisted ? "shortlisted" : "pending",
        });
      }
    } catch (bcnfErr) {
      console.warn("Could not sync BCNF application shortlist status:", bcnfErr);
    }

    const updatedSnap = await docRef.get();
    const applicant = {
      id: updatedSnap.id,
      _id: updatedSnap.id,
      ...serializeFirestoreData(updatedSnap.data()),
    };

    return NextResponse.json({ success: true, data: applicant });
  } catch (error) {
    console.error("Error updating applicant shortlist status:", error.message);
    return NextResponse.json(
      { success: false, message: error.message },
      { status: 500 }
    );
  }
}
