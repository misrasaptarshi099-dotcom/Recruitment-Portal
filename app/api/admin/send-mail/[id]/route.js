import { NextResponse } from "next/server";
import { connect, serializeFirestoreData } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { loadRoleConfig, authorizeDepartmentAccess } from "@/lib/admin-auth";
import { sendDecisionEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req, { params }) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`admin_sendmail_${clientIp}`, {
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
    const { round } = body;

    if (!["round1", "round2", "round3"].includes(round)) {
      return NextResponse.json(
        { success: false, message: "Invalid round identifier. Must be round1, round2, or round3." },
        { status: 400 }
      );
    }

    const docRef = db.collection("formData").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, message: "Applicant not found" },
        { status: 404 }
      );
    }

    const applicantData = snapshot.data() || {};
    const applicantDept = applicantData.Department || applicantData.department || "";

    // Department scoping guard
    const deptAuth = authorizeDepartmentAccess(session.user, applicantDept, roleConfig);
    if (!deptAuth.authorized) {
      return NextResponse.json(
        { success: false, message: deptAuth.reason },
        { status: 403 }
      );
    }

    const applicantEmail = (applicantData.Email || applicantData.email || "").trim();
    const candidateName = applicantData.FullName || applicantData.fullName || applicantData.Name || applicantData.name || "Candidate";

    if (!applicantEmail) {
      return NextResponse.json(
        { success: false, message: "Applicant has no registered email address" },
        { status: 400 }
      );
    }

    // Determine specific round outcome
    let decision = "rejected";
    if (round === "round1") {
      const isShortlisted = Boolean(applicantData.shortlisted || applicantData.Shortlisted);
      decision = isShortlisted ? "shortlisted" : "rejected";
    } else if (round === "round2") {
      const isCleared = Boolean(applicantData.round2Cleared || applicantData.status === "round2_cleared" || applicantData.status === "accepted");
      decision = isCleared ? "cleared" : "rejected";
    } else if (round === "round3") {
      const isSelected = Boolean(applicantData.status === "accepted" || applicantData.status === "selected" || applicantData.round3Cleared);
      decision = isSelected ? "selected" : "rejected";
    }

    // Dispatch real email via central mailer
    const mailResult = await sendDecisionEmail({
      to: applicantEmail,
      candidateName,
      department: applicantDept,
      round,
      decision,
    });

    if (!mailResult.success && !mailResult.simulated) {
      return NextResponse.json(
        { success: false, message: mailResult.message || "Failed to deliver email to candidate" },
        { status: 500 }
      );
    }

    const fieldName = `${round}MailSent`;
    const fieldTimestamp = `${round}MailSentAt`;
    const fieldMessageId = `${round}MailMessageId`;
    const updatePayload = {
      [fieldName]: true,
      [fieldTimestamp]: new Date().toISOString(),
      [fieldMessageId]: mailResult.messageId || (mailResult.simulated ? "simulated" : "sent"),
    };

    await docRef.update(updatePayload);

    try {
      const appRef = db.collection("applications").doc(id);
      const appSnap = await appRef.get();
      if (appSnap.exists) {
        await appRef.update(updatePayload);
      }
    } catch (err) {
      console.warn("Could not sync BCNF application send-mail status:", err?.message || err);
    }

    const updatedSnap = await docRef.get();
    const applicant = {
      id: updatedSnap.id,
      _id: updatedSnap.id,
      ...serializeFirestoreData(updatedSnap.data()),
    };

    const statusBadge = mailResult.simulated ? "Simulated" : "Delivered";
    return NextResponse.json({
      success: true,
      message: `Decision notification for ${round} dispatched (${statusBadge} to ${applicantEmail}). Decision is permanently locked.`,
      data: applicant,
    });
  } catch (error) {
    console.error("Error sending decision notification:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to send decision email" },
      { status: 500 }
    );
  }
}

