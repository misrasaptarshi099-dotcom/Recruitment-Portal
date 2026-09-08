import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin } from "@/lib/security";
import { connect } from "@/lib/db";
import { loadRoleConfig } from "@/lib/admin-auth";
import { verifySmtpConnection } from "@/lib/mailer";

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

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!isUserAdmin(session.user, roleConfig)) {
      return NextResponse.json(
        { success: false, message: "Forbidden: Administrator role required" },
        { status: 403 }
      );
    }

    const status = await verifySmtpConnection();
    return NextResponse.json(status);
  } catch (error) {
    console.error("Error verifying SMTP status:", error);
    return NextResponse.json(
      { success: false, message: error.message || "Failed to check SMTP connection" },
      { status: 500 }
    );
  }
}
