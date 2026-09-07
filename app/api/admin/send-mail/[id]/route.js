import { NextResponse } from "next/server";
import { connect, serializeFirestoreData } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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
    const { round } = body;

    if (!["round1", "round2", "round3"].includes(round)) {
      return NextResponse.json(
        { success: false, message: "Invalid round identifier. Must be round1, round2, or round3." },
        { status: 400 }
      );
    }

    const db = await connect();
    const docRef = db.collection("formData").doc(id);
    const snapshot = await docRef.get();

    if (!snapshot.exists) {
      return NextResponse.json(
        { success: false, message: "Applicant not found" },
        { status: 404 }
      );
    }

    const fieldName = `${round}MailSent`;
    const fieldTimestamp = `${round}MailSentAt`;
    const updatePayload = {
      [fieldName]: true,
      [fieldTimestamp]: new Date().toISOString(),
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

    return NextResponse.json({
      success: true,
      message: `Decision notification for ${round} marked as sent (Simulated). Decision is permanently locked.`,
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
