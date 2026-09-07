import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { connect } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText } from "@/lib/security";

export const dynamic = "force-dynamic";

function isValidHttpUrl(string) {
  try {
    const newUrl = new URL(string);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`submit_task_${clientIp}`, {
      maxRequests: 20,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Too many submission attempts. Please try again shortly." },
        { status: 429 }
      );
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();
    const body = await req.json().catch(() => ({}));
    const { applicationId, submissionUrl, notes } = body;

    if (!applicationId || typeof applicationId !== "string") {
      return NextResponse.json({ error: "Invalid or missing applicationId" }, { status: 400 });
    }

    const rawUrl = (submissionUrl || "").trim();
    if (!rawUrl || !isValidHttpUrl(rawUrl)) {
      return NextResponse.json(
        { error: "Please provide a valid deliverable URL (e.g. GitHub, Figma, Google Drive)" },
        { status: 400 }
      );
    }

    const sanitizedNotes = notes ? sanitizeText(String(notes)).slice(0, 1000) : "";
    const db = await connect();

    // Check ownership in applications or formData
    const appRef = db.collection("applications").doc(applicationId);
    const appSnap = await appRef.get();
    let appData = appSnap.exists ? appSnap.data() : null;

    const formRef = db.collection("formData").doc(applicationId);
    let formSnap = null;

    if (!appData) {
      formSnap = await formRef.get();
      if (formSnap.exists) {
        appData = formSnap.data();
      }
    }

    if (!appData) {
      return NextResponse.json({ error: "Application not found" }, { status: 404 });
    }

    const candidateEmail = (appData.candidateEmail || appData.Email || "").toLowerCase().trim();
    if (candidateEmail !== email) {
      return NextResponse.json({ error: "Forbidden: You can only submit tasks for your own applications" }, { status: 403 });
    }

    const isShortlisted = Boolean(appData.shortlisted || appData.Shortlisted || appData.status === "shortlisted");
    if (!isShortlisted) {
      return NextResponse.json(
        { error: "Cannot submit task: Round 1 has not been cleared yet" },
        { status: 400 }
      );
    }

    const taskPayload = {
      submissionUrl: rawUrl,
      submittedAt: new Date().toISOString(),
      notes: sanitizedNotes,
      status: "submitted",
    };

    // Dual-write update to ensure both normalized and legacy collections stay in sync
    await Promise.all([
      appRef.set({ round2Task: taskPayload }, { merge: true }),
      formRef.set({ round2Task: taskPayload }, { merge: true }),
    ]);

    return NextResponse.json({
      success: true,
      message: "Round 2 Task deliverable submitted successfully!",
      round2Task: taskPayload,
    });
  } catch (error) {
    console.error("Error submitting Round 2 task:", error);
    return NextResponse.json({ error: "Failed to submit task deliverable" }, { status: 500 });
  }
}
