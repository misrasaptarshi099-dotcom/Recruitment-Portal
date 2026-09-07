import { NextResponse } from "next/server";
import { connect, serializeFirestoreData } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function PATCH(req, { params }) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`admin_r2_${clientIp}`, {
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

    if (!isUserAdmin(session.user)) {
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
    const { round2Cleared, status, evaluationNotes } = body;

    const db = await connect();
    const docRef = db.collection("formData").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, message: "Applicant not found" },
        { status: 404 }
      );
    }

    const currentData = snapshot.data() || {};
    let appData = {};
    try {
      const appSnap = await db.collection("applications").doc(id).get();
      if (appSnap.exists) {
        appData = appSnap.data() || {};
      }
    } catch {
      // ignore
    }

    const isRound2MailSent = Boolean(currentData.round2MailSent || appData.round2MailSent);

    // Decision state lock: Once send mail is pressed, decision state cannot be changed
    if (isRound2MailSent) {
      return NextResponse.json(
        {
          success: false,
          message: "Cannot modify Round 2 decision: Decision email has already been sent to this candidate.",
        },
        { status: 409 }
      );
    }

    const updatePayload = {};
    if (typeof round2Cleared === "boolean") {
      updatePayload.round2Cleared = round2Cleared;
      if (round2Cleared) {
        updatePayload.status = "round2_cleared";
      } else if (!status) {
        const currentData = snapshot.data() || {};
        updatePayload.status = currentData.round2Task?.submissionUrl ? "submitted" : "shortlisted";
      }
    }
    if (status && ["pending", "shortlisted", "submitted", "round2_cleared", "accepted", "rejected"].includes(status)) {
      updatePayload.status = status;
    }
    if (evaluationNotes !== undefined) {
      updatePayload["round2Task.evaluationNotes"] = String(evaluationNotes).slice(0, 1000);
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields provided to update" },
        { status: 400 }
      );
    }

    // Atomic dual-write to formData and applications
    await docRef.update(updatePayload);

    try {
      const appRef = db.collection("applications").doc(id);
      const appSnap = await appRef.get();
      if (appSnap.exists) {
        await appRef.update(updatePayload);
      }
    } catch (err) {
      console.warn("Could not sync BCNF application round2 status:", err?.message || err);
    }

    const updatedSnap = await docRef.get();
    const applicant = {
      id: updatedSnap.id,
      _id: updatedSnap.id,
      ...serializeFirestoreData(updatedSnap.data()),
    };

    return NextResponse.json({ success: true, data: applicant });
  } catch (error) {
    console.error("Error updating Round 2 status:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update Round 2 status" },
      { status: 500 }
    );
  }
}
