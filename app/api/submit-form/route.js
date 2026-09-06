import { submitApplicationTransaction } from "@/lib/bcnf";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { isInstitutionalEmail, sanitizeText } from "@/lib/security";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

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
    const limit = rateLimit(limitKey, {
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
