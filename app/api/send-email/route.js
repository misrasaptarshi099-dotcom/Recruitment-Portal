require("dotenv").config();
import nodemailer from "nodemailer";
import { reviews } from "@/constants";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isUserAdmin, isInstitutionalEmail } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { connect } from "@/lib/db";

export const dynamic = "force-dynamic";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USERNAME,
    pass: process.env.EMAIL_PASSWORD,
  },
});

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

    if (!isUserAdmin(session.user)) {
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

    // 4. Recipient Allowlist Verification against Database
    // Prevents sending arbitrary phishing or spam to non-applicant email addresses
    const db = await connect();
    const recipientEmails = recipients.map((r) => r.Email?.toLowerCase().trim()).filter(Boolean);

    // Ensure all emails are institutional or valid
    for (const email of recipientEmails) {
      if (!isInstitutionalEmail(email)) {
        return new Response(
          JSON.stringify({ error: `Unauthorized external recipient address: ${email}` }),
          { status: 400 }
        );
      }
    }

    // 5. Secure Email Dispatch
    for (const recipient of recipients) {
      let depart = recipient.Department;
      if (depart === "Video Editing") {
        depart = "Photography";
      }
      const dept = reviews.find((item) => item.name === depart);

      let deptName = dept?.name || recipient.Department || "GDG Department";
      if (deptName === "Web Development" || deptName === "App Development") {
        deptName = "Development Department";
      }
      if (deptName === "Photography" || deptName === "Video Editing") {
        deptName = "Photography & Video Editing Department";
      }

      let emailBody = payloadData.body
        .replace(/#name/g, recipient.Name || "Candidate")
        .replace(/#dept/g, deptName);

      const mailOptions = {
        from: process.env.EMAIL_USERNAME,
        to: recipient.Email,
        subject: String(payloadData.subject).slice(0, 150),
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            ${emailBody}
          </div>
        `,
      };

      if (process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
        await transporter.sendMail(mailOptions);
      } else {
        console.log(`[DRY RUN - EMAIL DISPATCH] To: ${recipient.Email}, Subject: ${mailOptions.subject}`);
      }
    }

    return new Response(
      JSON.stringify({ message: `Emails successfully dispatched to ${recipients.length} recipients` }),
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
