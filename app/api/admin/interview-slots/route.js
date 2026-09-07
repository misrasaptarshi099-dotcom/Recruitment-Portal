import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

function pad(n) {
  return String(n).padStart(2, "0");
}

function format12h(time24) {
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  h = h ? h : 12;
  return `${pad(h)}:${pad(m)} ${ampm}`;
}

export async function GET(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isUserAdmin(session.user)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const department = searchParams.get("department");
    const date = searchParams.get("date");

    const db = await connect();
    let query = db.collection("interview_slots");

    if (department && department !== "All") {
      const slug = department.toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
      query = query.where("departmentSlug", "==", slug);
    }

    if (date) {
      query = query.where("date", "==", date);
    }

    const snap = await query.get();
    const slots = (snap?.docs || []).map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Sort chronologically by date and start time
    slots.sort((a, b) => {
      const dateCmp = (a.date || "").localeCompare(b.date || "");
      if (dateCmp !== 0) return dateCmp;
      return (a.startTime || "").localeCompare(b.startTime || "");
    });

    return NextResponse.json({ success: true, data: slots });
  } catch (error) {
    console.error("Error fetching interview slots:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch interview slots" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`admin_gen_slots_${clientIp}`, {
      maxRequests: 30,
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

    if (!session?.user || !isUserAdmin(session.user)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { department, date, startTime, endTime, meetingLink } = body;

    if (!department || !date || !startTime || !endTime) {
      return NextResponse.json(
        { success: false, message: "Department, date, start time, and end time are required" },
        { status: 400 }
      );
    }

    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);

    if (isNaN(startH) || isNaN(startM) || isNaN(endH) || isNaN(endM)) {
      return NextResponse.json(
        { success: false, message: "Invalid time format. Use HH:mm (24-hour)" },
        { status: 400 }
      );
    }

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    if (endMinutes <= startMinutes) {
      return NextResponse.json(
        { success: false, message: "End time must be after start time" },
        { status: 400 }
      );
    }

    const durationMinutes = endMinutes - startMinutes;
    if (durationMinutes < 15) {
      return NextResponse.json(
        { success: false, message: "Time range must be at least 15 minutes" },
        { status: 400 }
      );
    }

    const deptSlug = department.trim().toLowerCase().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
    const db = await connect();
    const batch = db.batch();
    const generatedSlots = [];

    // Read existing slots for the date and department to preserve existing candidate bookings
    const existingSnap = await db
      .collection("interview_slots")
      .where("departmentSlug", "==", deptSlug)
      .where("date", "==", date.trim())
      .get();
    const existingMap = new Map();
    (existingSnap?.docs || []).forEach((doc) => {
      existingMap.set(doc.id, doc.data());
    });

    // Break cumulative time range [n, m] into 15-minute meeting slots
    for (let cur = startMinutes; cur + 15 <= endMinutes; cur += 15) {
      const sH = Math.floor(cur / 60);
      const sM = cur % 60;
      const eH = Math.floor((cur + 15) / 60);
      const eM = (cur + 15) % 60;

      const slotStart = `${pad(sH)}:${pad(sM)}`;
      const slotEnd = `${pad(eH)}:${pad(eM)}`;
      const slotLabel = `${format12h(slotStart)} - ${format12h(slotEnd)}`;
      const slotId = `slot_${deptSlug}_${date.replace(/[^a-zA-Z0-9]/g, "")}_${pad(sH)}${pad(sM)}`;

      const existing = existingMap.get(slotId);
      const isAlreadyBooked = Boolean(existing && (existing.status === "booked" || existing.bookedBy));

      const slotDoc = {
        slotId,
        department: department.trim(),
        departmentSlug: deptSlug,
        date: date.trim(),
        startTime: slotStart,
        endTime: slotEnd,
        durationMinutes: 15,
        slotLabel,
        meetingLink: meetingLink ? String(meetingLink).trim() : (existing?.meetingLink || ""),
        status: isAlreadyBooked ? existing.status : "available",
        bookedBy: isAlreadyBooked ? existing.bookedBy : null,
        candidateName: isAlreadyBooked ? existing.candidateName : null,
        applicationId: isAlreadyBooked ? existing.applicationId : null,
        bookedAt: isAlreadyBooked ? existing.bookedAt : null,
        createdAt: existing?.createdAt || new Date().toISOString(),
        createdBy: session.user.email,
      };

      const docRef = db.collection("interview_slots").doc(slotId);
      // Preserve existing booking fields when slot already exists
      batch.set(docRef, slotDoc, { merge: true });
      generatedSlots.push(slotDoc);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      message: `Successfully generated ${generatedSlots.length} 15-minute interview slots for ${department}`,
      count: generatedSlots.length,
      slots: generatedSlots,
    });
  } catch (error) {
    console.error("Error generating interview slots:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to generate interview slots" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user || !isUserAdmin(session.user)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Admin privileges required" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const slotId = searchParams.get("slotId");

    if (!slotId) {
      return NextResponse.json(
        { success: false, message: "slotId is required" },
        { status: 400 }
      );
    }

    const db = await connect();
    const docRef = db.collection("interview_slots").doc(slotId);
    const snap = await docRef.get();

    if (!snap.exists) {
      return NextResponse.json(
        { success: false, message: "Slot not found" },
        { status: 404 }
      );
    }

    const slotData = snap.data() || {};
    if (slotData.status === "booked" || slotData.bookedBy) {
      return NextResponse.json(
        { success: false, message: "Cannot delete an interview slot that is already booked by an applicant" },
        { status: 409 }
      );
    }

    await docRef.delete();
    return NextResponse.json({ success: true, message: "Slot deleted successfully" });
  } catch (error) {
    console.error("Error deleting slot:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to delete slot" },
      { status: 500 }
    );
  }
}
