import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { sendInterviewConfirmationEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return NextResponse.json(
        { success: false, message: "Authentication required" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");

    if (!department) {
      return NextResponse.json(
        { success: false, message: "Department query parameter is required" },
        { status: 400 }
      );
    }

    const deptSlug = department.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
    const db = await connect();

    const snap = await db
      .collection("interview_slots")
      .where("departmentSlug", "==", deptSlug)
      .get();

    const userEmailLower = (session.user.email || "").trim().toLowerCase();
    const slots = (snap?.docs || []).map((doc) => {
      const d = doc.data();
      const isBookedByMe = (d.bookedBy || "").trim().toLowerCase() === userEmailLower;
      return {
        id: doc.id,
        slotId: d.slotId || doc.id,
        date: d.date,
        startTime: d.startTime,
        endTime: d.endTime,
        slotLabel: d.slotLabel,
        meetingLink: isBookedByMe ? d.meetingLink : undefined,
        status: d.status || "available",
        isAvailable: d.status === "available" || isBookedByMe,
        isBookedByMe,
      };
    });

    // Sort chronologically by date and start time
    slots.sort((a, b) => {
      const dateCmp = (a.date || "").localeCompare(b.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    return NextResponse.json({ success: true, data: slots });
  } catch (error) {
    console.error("Error fetching candidate interview slots:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch interview slots" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = await rateLimitAsync(`user_book_slot_${clientIp}`, {
      maxRequests: 20,
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

    const body = await req.json().catch(() => ({}));
    const { applicationId, slotId } = body;

    if (!applicationId || !slotId) {
      return NextResponse.json(
        { success: false, message: "applicationId and slotId are required" },
        { status: 400 }
      );
    }

    const email = session.user.email.trim().toLowerCase();
    const db = await connect();

    // Run atomic transaction to guarantee no double-booking race condition
    const result = await db.runTransaction(async (t) => {
      const slotRef = db.collection("interview_slots").doc(slotId);
      const formRef = db.collection("formData").doc(applicationId);
      const appRef = db.collection("applications").doc(applicationId);

      const [slotSnap, formSnap, appSnap] = await Promise.all([
        t.get(slotRef),
        t.get(formRef),
        t.get(appRef),
      ]);

      if (!slotSnap.exists) {
        throw new Error("Selected interview slot does not exist");
      }

      if (!formSnap.exists) {
        throw new Error("Application not found");
      }

      const slotData = slotSnap.data();

      // Check if slot is already booked by another user
      if (slotData.status === "booked" && slotData.bookedBy && slotData.bookedBy.toLowerCase() !== email) {
        throw new Error("This 15-minute slot has already been reserved by another candidate. Please select another slot.");
      }

      const formData = formSnap.data();
      const applicantEmail = (formData.Email || "").trim().toLowerCase();

      if (applicantEmail !== email && session.user.email !== formData.Email) {
        throw new Error("Forbidden: You do not have permission to modify this application");
      }

      // Verify applicant is cleared for Round 2
      const isCleared = Boolean(
        formData.round2Cleared ||
        formData.status === "round2_cleared" ||
        formData.status === "accepted" ||
        formData.round3Interview?.slotTime
      );

      if (!isCleared) {
        throw new Error("You must be cleared for Round 2 before reserving an interview slot.");
      }

      // If user had a previously booked different slot, read it before any writes
      let oldSlotRef = null;
      let oldSlotSnap = null;
      if (formData.round3Interview?.slotId && formData.round3Interview.slotId !== slotId) {
        oldSlotRef = db.collection("interview_slots").doc(formData.round3Interview.slotId);
        oldSlotSnap = await t.get(oldSlotRef);
      }

      // Release previously booked slot if document exists
      if (oldSlotRef && oldSlotSnap?.exists) {
        t.update(oldSlotRef, {
          status: "available",
          bookedBy: null,
          candidateName: null,
          applicationId: null,
          bookedAt: null,
        });
      }

      const bookedAt = new Date().toISOString();

      // Mark the selected slot as booked
      t.update(slotRef, {
        status: "booked",
        bookedBy: email,
        candidateName: session.user.name || "Candidate",
        applicationId,
        bookedAt,
      });

      // Update application document with round3Interview details
      const interviewDetails = {
        slotId,
        date: slotData.date,
        slotTime: slotData.slotLabel,
        startTime: slotData.startTime,
        endTime: slotData.endTime,
        durationMinutes: 15,
        venue: "Virtual Interview (Google Meet)",
        meetingLink: slotData.meetingLink || "",
        meetLink: slotData.meetingLink || "",
        bookedAt,
      };

      t.update(formRef, {
        round3Interview: interviewDetails,
        status: formData.status === "accepted" ? "accepted" : "round3_scheduled",
      });

      // Also update applications collection if exists
      if (appSnap.exists) {
        t.update(appRef, {
          round3Interview: interviewDetails,
          status: formData.status === "accepted" ? "accepted" : "round3_scheduled",
        });
      }

      return {
        interviewDetails,
        department: formData.Department || formData.department || "GDG Department",
        candidateName: formData.FullName || formData.fullName || session.user.name || "Candidate",
      };
    });

    // Automatically dispatch booking confirmation email with meeting link to candidate
    try {
      await sendInterviewConfirmationEmail({
        to: email,
        candidateName: result.candidateName,
        department: result.department,
        slotDetails: result.interviewDetails,
      });
    } catch (mailErr) {
      console.warn("Could not dispatch interview confirmation email:", mailErr?.message || mailErr);
    }

    return NextResponse.json({
      success: true,
      message: "Interview slot reserved successfully! Meeting details and confirmation have been sent to your email.",
      data: result.interviewDetails,
    });
  } catch (error) {
    console.error("Error reserving interview slot:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to reserve interview slot" },
      { status: error.message?.includes("Forbidden") ? 403 : 400 }
    );
  }
}
