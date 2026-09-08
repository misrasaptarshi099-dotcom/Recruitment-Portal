import { NextResponse } from "next/server";
import { connect, serializeFirestoreData } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { loadRoleConfig, authorizeDepartmentAccess } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try {
    const clientIp = getClientIp(req);
    const limit = await rateLimitAsync(`admin_r3_${clientIp}`, {
      maxRequests: 60,
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

    const { id } = params;
    if (!id || typeof id !== "string" || !/^[a-zA-Z0-9_-]+$/.test(id)) {
      return NextResponse.json(
        { success: false, message: "Invalid application ID format" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { slotTime, venue, meetLink, status } = body;

    const docRef = db.collection("formData").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, message: "Applicant not found" },
        { status: 404 }
      );
    }

    const existingData = snapshot.data() || {};
    // Department scoping guard
    const applicantDept = (existingData.Department) || "";
    const deptAuth = authorizeDepartmentAccess(session.user, applicantDept, roleConfig);
    if (!deptAuth.authorized) {
      return NextResponse.json(
        { success: false, message: deptAuth.reason },
        { status: 403 }
      );
    }

    const existingR3 = existingData.round3Interview || {};

    let appData = {};
    try {
      const appSnap = await db.collection("applications").doc(id).get();
      if (appSnap.exists) {
        appData = appSnap.data() || {};
      }
    } catch {
      // ignore
    }

    const isRound3MailSent = Boolean(existingData.round3MailSent || appData.round3MailSent);

    // Decision state lock: Once send mail is pressed, decision state cannot be changed
    const willChangeStatus = Boolean(status || slotTime !== undefined);
    if (isRound3MailSent && willChangeStatus) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot modify Round 3 decision: Decision email has already been sent to this candidate.",
        },
        { status: 409 }
      );
    }

    const updatePayload = {};

    // If updating interview details:
    if (slotTime !== undefined || venue !== undefined || meetLink !== undefined) {
      updatePayload.round3Interview = {
        ...existingR3,
        slotTime: slotTime !== undefined ? String(slotTime).trim() : existingR3.slotTime || "",
        venue: venue !== undefined ? String(venue).trim() : existingR3.venue || "",
        meetLink: meetLink !== undefined ? String(meetLink).trim() : existingR3.meetLink || "",
        updatedAt: new Date().toISOString(),
      };
      // If interview is scheduled and not already accepted/rejected, mark as scheduled
      if (!status && updatePayload.round3Interview.slotTime) {
        updatePayload.status = "scheduled";
      }
    }

    // If setting final decision status (accepted / rejected / scheduled / round2_cleared):
    if (status && ["accepted", "rejected", "scheduled", "pending", "round2_cleared"].includes(status)) {
      updatePayload.status = status;
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    await docRef.update(updatePayload);

    try {
      const appRef = db.collection("applications").doc(id);
      const appSnap = await appRef.get();
      if (appSnap.exists) {
        await appRef.update(updatePayload);
      }
    } catch (err) {
      console.warn("Could not sync BCNF application round3 status:", err?.message || err);
    }

    const updatedSnap = await docRef.get();
    const applicant = {
      id: updatedSnap.id,
      _id: updatedSnap.id,
      ...serializeFirestoreData(updatedSnap.data()),
    };

    return NextResponse.json({ success: true, data: applicant });
  } catch (error) {
    console.error("Error updating Round 3 interview status:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update Round 3 status" },
      { status: 500 }
    );
  }
}
