import { submitApplicationTransaction } from "@/lib/bcnf";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isInstitutionalEmail, sanitizeText } from "@/lib/security";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // 1. Authentication Guard
    const session = await auth.api.getSession({
      headers: await headers(),
    });
    if (!session?.user) {
      return new Response(
        JSON.stringify({ message: "Authentication required" }),
        { status: 401 }
      );
    }

    const user = session.user;
    const userEmail = user.email;

    // 2. Institutional Domain Lock (@vitstudent.ac.in)
    if (!isInstitutionalEmail(userEmail)) {
      return new Response(
        JSON.stringify({
          message: "Institutional lock: You must use your university email address (@vitstudent.ac.in)",
        }),
        { status: 403 }
      );
    }

    // 3. Sliding-Window Rate Limiting (5 submissions per 10 minutes per IP / user)
    const clientIp = getClientIp(req);
    const limitKey = `submit_${clientIp}_${userEmail}`;
    const limit = await rateLimitAsync(limitKey, {
      maxRequests: 5,
      windowSeconds: 600,
    });

    if (!limit.success) {
      return new Response(
        JSON.stringify({
          message: `Too many submissions. Please wait ${limit.retryAfter} seconds before trying again.`,
        }),
        {
          status: 429,
          headers: {
            "Retry-After": limit.retryAfter.toString(),
            "X-RateLimit-Limit": limit.limit.toString(),
            "X-RateLimit-Remaining": limit.remaining.toString(),
          },
        }
      );
    }

    // 4. Server-Side Deadline Enforcement
    const deadlineStr = process.env.RECRUITMENT_DEADLINE || "2026-12-31T23:59:59+05:30";
    const deadline = new Date(deadlineStr);
    if (new Date() > deadline) {
      return new Response(
        JSON.stringify({
          message: "The submission deadline has passed",
        }),
        { status: 403 }
      );
    }

    // 5. Parse & Validate Payload
    const data = await req.json();
    const { Department, Questions, ...formFields } = data;

    if (!Department) {
      return new Response(
        JSON.stringify({ message: "Department is required" }),
        { status: 400 }
      );
    }

    // Dynamic Departmental Round 1 Deadline Enforcement
    try {
      const { connect } = await import("@/lib/db");
      const db = await connect();
      const dSnap = await db.collection("recruitment_config").doc("deadlines").get();
      if (dSnap.exists) {
        const dData = dSnap.data() || {};
        let r1Deadline = null;
        const deptSlug = (Department || "").toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");

        if (dData.departments && typeof dData.departments === "object") {
          for (const [dName, dCfg] of Object.entries(dData.departments)) {
            const normalizedCfgName = dName.toLowerCase().trim().replace(/[^a-z0-9_]/g, "_").replace(/_+/g, "_");
            if (
              dName.toLowerCase().trim() === (Department || "").toLowerCase().trim() ||
              normalizedCfgName === deptSlug
            ) {
              r1Deadline = dCfg?.round1Deadline;
              break;
            }
          }
        }

        r1Deadline = r1Deadline || dData.round1Deadline;

        if (r1Deadline) {
          const r1Time = new Date(r1Deadline).getTime();
          if (!isNaN(r1Time) && Date.now() > r1Time) {
            return new Response(
              JSON.stringify({
                message: `The submission deadline for ${Department} has passed (${new Date(r1Deadline).toLocaleString()}). Applications are closed.`,
                expired: true,
              }),
              { status: 403 }
            );
          }
        }
      }
    } catch (dErr) {
      console.error("Could not check dynamic Round 1 deadline:", dErr?.message || dErr);
      return new Response(
        JSON.stringify({
          message: "Service temporarily unavailable. Unable to verify submission deadline. Please try again.",
        }),
        { status: 503 }
      );
    }

    const regNo = sanitizeText(formFields.RegistrationNumber || "").toUpperCase();
    const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/;
    if (regNo && !regNoRegex.test(regNo)) {
      return new Response(
        JSON.stringify({
          message: "Registration number must be 2 numbers, 3 uppercase letters, and 4 numbers (e.g. 25BCE5612)",
        }),
        { status: 400 }
      );
    }

    if (formFields.Phone && !/^\d{10}$/.test(formFields.Phone)) {
      return new Response(
        JSON.stringify({ message: "Phone number must be exactly 10 digits" }),
        { status: 400 }
      );
    }

    // 6. XSS Sanitization of form fields & essay answers
    const sanitizedName = sanitizeText(formFields.Name || user.name || "");
    const sanitizedGender = sanitizeText(formFields.Gender || "");
    const sanitizedYear = sanitizeText(formFields["Year of Study"] || "");

    let sanitizedQuestions = {};
    if (Questions && typeof Questions === "object") {
      for (const [qKey, qVal] of Object.entries(Questions)) {
        sanitizedQuestions[qKey] = typeof qVal === "string" ? sanitizeText(qVal) : qVal;
      }
    }

    // 7. Atomic BCNF Transactional Execution
    const result = await submitApplicationTransaction({
      ...formFields,
      Name: sanitizedName,
      RegistrationNumber: regNo,
      Email: userEmail,
      Gender: sanitizedGender,
      "Year of Study": sanitizedYear,
      Department,
      Questions: sanitizedQuestions,
    });

    return new Response(
      JSON.stringify({
        message: result.message || "Form submitted successfully!",
        applicationId: result.applicationId,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error("Form submission error:", error);
    const status = error.statusCode || (error.message?.includes("already submitted") || error.message?.includes("upto 2") ? 400 : 500);
    return new Response(
      JSON.stringify({ message: error.message || "Error submitting form" }),
      { status }
    );
  }
}
