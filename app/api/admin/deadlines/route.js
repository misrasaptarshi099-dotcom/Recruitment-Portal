import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

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

    const db = await connect();
    const docSnap = await db.collection("recruitment_config").doc("deadlines").get();
    const data = docSnap.exists ? docSnap.data() : {};

    return NextResponse.json({
      success: true,
      data: {
        round1Deadline: data.round1Deadline || "",
        round2Deadline: data.round2Deadline || "",
        round2Deadlines: data.round2Deadlines || {},
        updatedAt: data.updatedAt || null,
        updatedBy: data.updatedBy || null,
      },
    });
  } catch (error) {
    console.error("Error fetching deadlines:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to fetch deadlines" },
      { status: 500 }
    );
  }
}

export async function PATCH(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`admin_deadlines_${clientIp}`, {
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
    const { round1Deadline, round2Deadline, round2Deadlines } = body;

    const db = await connect();
    const updatePayload = {
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.email,
    };

    if (round1Deadline !== undefined) {
      updatePayload.round1Deadline = round1Deadline ? String(round1Deadline).trim() : null;
    }
    if (round2Deadline !== undefined) {
      updatePayload.round2Deadline = round2Deadline ? String(round2Deadline).trim() : null;
    }
    if (round2Deadlines && typeof round2Deadlines === "object") {
      updatePayload.round2Deadlines = round2Deadlines;
    }

    await db.collection("recruitment_config").doc("deadlines").set(updatePayload, { merge: true });

    return NextResponse.json({
      success: true,
      message: "Recruitment deadlines updated successfully",
      data: updatePayload,
    });
  } catch (error) {
    console.error("Error updating deadlines:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to update deadlines" },
      { status: 500 }
    );
  }
}
