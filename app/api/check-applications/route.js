import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = await rateLimitAsync(`check_apps_${clientIp}`, {
      maxRequests: 30,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { message: "Rate limit exceeded. Please wait a moment." },
        {
          status: 429,
          headers: { "Retry-After": limit.retryAfter.toString() },
        }
      );
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return NextResponse.json(
        { message: "Authentication required" },
        { status: 401 }
      );
    }

    const user = session.user;
    const userEmail = user.email;

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");

    if (!email) {
      return NextResponse.json(
        { message: "Email is required" },
        { status: 400 }
      );
    }

    if (email !== userEmail) {
      return NextResponse.json(
        { message: "You can only check your own applications" },
        { status: 403 }
      );
    }

    const db = await connect();
    const snapshot = await db
      .collection("formData")
      .where("Email", "==", email)
      .select("Department")
      .get();
    const submittedDepartments = snapshot.docs.map((doc) => doc.data().Department).filter(Boolean);

    return NextResponse.json({ count: snapshot.size, submittedDepartments }, { status: 200 });
  } catch (error) {
    console.error("Error checking applications:", error);
    return NextResponse.json(
      {
        message: "Internal server error inside check-applications dir",
      },
      { status: 500 }
    );
  }
}
