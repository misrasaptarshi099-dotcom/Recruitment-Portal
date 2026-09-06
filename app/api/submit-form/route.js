import { submitApplicationTransaction } from "@/lib/bcnf";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
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

    const data = await req.json();
    const { Department, Questions, ...formFields } = data;

    if (!Department) {
      return new Response(
        JSON.stringify({ message: "Department is required" }),
        { status: 400 }
      );
    }

    const regNoRegex = /^\d{2}[A-Z]{3}\d{4}$/;
    if (formFields.RegistrationNumber && !regNoRegex.test(formFields.RegistrationNumber)) {
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

    // Atomic BCNF Transactional Execution
    const result = await submitApplicationTransaction({
      ...formFields,
      Name: formFields.Name || user.name || "",
      Email: userEmail,
      Department,
      Questions,
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
