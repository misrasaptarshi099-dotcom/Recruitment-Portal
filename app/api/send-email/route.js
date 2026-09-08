import { reviews } from "@/constants";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, isInstitutionalEmail } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { connect } from "@/lib/db";
import { loadRoleConfig } from "@/lib/admin-auth";
import { sendBatchAnnouncementEmail } from "@/lib/mailer";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // 1. Rate Limiting (5 batch requests / 10 min)
    const clientIp = getClientIp(req);
    const limit = rateLimit(`send_email_${clientIp}`, {
      maxRequests: 5,
      windowSeconds: 600,
    });

    if (!limit.success) {
      return new Response(
        JSON.stringify({ error: "Rate limit exceeded. Email dispatch is throttled." }),
        {
          status: 429,
          headers: { "Retry-After": limit.retryAfter.toString() },
        }
      );
    }

    // 2. RBAC Guard: Strictly Admin Only (Closes Open Mail Relay Vulnerability)
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user) {
      return new Response(
        JSON.stringify({ error: "Authentication required to dispatch emails" }),
        { status: 401 }
      );
    }

    const db = await connect();
    const roleConfig = await loadRoleConfig(db);

    if (!isUserAdmin(session.user, roleConfig)) {
      return new Response(
        JSON.stringify({ error: "Forbidden: Only administrators can dispatch recruitment emails" }),
        { status: 403 }
      );
    }

    // 3. Payload Validation & Sanitization
    const { recipients, payloadData } = await req.json();

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: "No recipients provided" }),
        { status: 400 }
      );
    }

    if (recipients.length > 100) {
      return new Response(
        JSON.stringify({ error: "Batch size exceeds maximum limit of 100 recipients" }),
        { status: 400 }
      );
    }

    if (!payloadData?.subject || !payloadData?.body) {
      return new Response(
        JSON.stringify({ error: "Email subject and body are required" }),
        { status: 400 }
      );
    }

    // 4. Recipient Normalization & Allowlist Verification
    const normalizedRecipients = recipients.map((r) => {
      const email = (r.Email || r.email || "").toLowerCase().trim();
      return {
        ...r,
        Email: email,
      };
    });

    for (const r of normalizedRecipients) {
      if (!r.Email || !isInstitutionalEmail(r.Email)) {
        return new Response(
          JSON.stringify({ error: `Unauthorized external recipient address: ${r.Email || "missing"}` }),
          { status: 400 }
        );
      }
    }

    // 5. Secure Email Dispatch via central mailer
    const result = await sendBatchAnnouncementEmail({
      recipients: normalizedRecipients,
      subject: String(payloadData.subject).slice(0, 150),
      bodyTemplate: payloadData.body,
    });

    if (result.simulated) {
      return new Response(
        JSON.stringify({
          message: `Emails successfully simulated for ${normalizedRecipients.length} recipients (Dry Run)`,
          ...result,
        }),
        { status: 200 }
      );
    }

    if (!result.success) {
      const status = result.successCount > 0 ? 207 : 500;
      return new Response(
        JSON.stringify({
          error: `Email delivery failed for ${result.failCount} recipient(s)${result.successCount > 0 ? ` (${result.successCount} succeeded)` : ""}`,
          ...result,
        }),
        { status }
      );
    }

    return new Response(
      JSON.stringify({
        message: `Emails successfully dispatched to ${result.successCount} recipients`,
        ...result,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in /api/send-email:", error);
    return new Response(
      JSON.stringify({ error: "Internal error processing email dispatch" }),
      { status: 500 }
    );
  }
}

