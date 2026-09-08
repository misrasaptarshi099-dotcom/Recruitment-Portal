import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { connect } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { sanitizeText, isValidHttpUrl } from "@/lib/security";

export const dynamic = "force-dynamic";

export { isValidHttpUrl };

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

    // Server-Side Deadline Enforcement
    const department = (appData.department || appData.Department || "").trim();
    const deptSlug = (appData.departmentSlug || department.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_")).trim();

    try {
      const dSnap = await db.collection("recruitment_config").doc("deadlines").get();
      if (dSnap.exists) {
        const dData = dSnap.data() || {};
        let r2Deadline = null;

        if (dData.departments && typeof dData.departments === "object") {
          for (const [dName, dCfg] of Object.entries(dData.departments)) {
            const normalizedCfgName = dName.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
            if (
              dName.toLowerCase().trim() === department.toLowerCase().trim() ||
              normalizedCfgName === deptSlug
            ) {
              r2Deadline = dCfg?.round2Deadline;
              break;
            }
          }
        }

        r2Deadline =
          r2Deadline ||
          dData.round2Deadlines?.[deptSlug] ||
          dData.round2Deadlines?.[department] ||
          dData.round2Deadline;

        if (!r2Deadline && appData.round2Task?.deadline && !isNaN(Date.parse(appData.round2Task.deadline))) {
          r2Deadline = appData.round2Task.deadline;
        }

        if (r2Deadline) {
          const deadlineTime = new Date(r2Deadline).getTime();
          if (!isNaN(deadlineTime) && Date.now() > deadlineTime) {
            return NextResponse.json(
              {
                error: `Submission rejected: The deadline for ${department || "this department"} Round 2 task was ${new Date(r2Deadline).toLocaleString()}. Submissions are now closed.`,
                deadline: r2Deadline,
                expired: true,
              },
              { status: 403 }
            );
          }
        }
      }
    } catch (deadlineErr) {
      console.warn("Could not verify Round 2 task deadline:", deadlineErr?.message || deadlineErr);
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
