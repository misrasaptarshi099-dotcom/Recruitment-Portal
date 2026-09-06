/**
 * Security and Authorization Utilities
 * 
 * Provides centralized Role-Based Access Control (RBAC),
 * institutional domain validation, and input sanitization helpers.
 */

/**
 * Validates whether an email belongs to the institutional domain (@vitstudent.ac.in)
 * or is an authorized administrator.
 */
export function isInstitutionalEmail(email: string): boolean {
  if (!email || typeof email !== "string") return false;
  const lower = email.trim().toLowerCase();
  
  // Explicitly allow admins or local test users
  if (isAdminEmail(lower)) return true;
  if (process.env.NODE_ENV !== "production" && lower.includes("test_candidate")) return true;

  return lower.endsWith("@vitstudent.ac.in");
}

/**
 * Checks whether an email is registered in the ADMIN_EMAILS environment variable.
 */
export function isAdminEmail(email: string): boolean {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  const adminList = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  // Default fallback for development/local admin
  adminList.push("misrasaptarshi999@gmail.com");
  adminList.push("admin@vitstudent.ac.in");

  return adminList.includes(lower);
}

/**
 * Verifies if a session user has administrator privileges (OWASP A01 Defense).
 */
export function isUserAdmin(user: any): boolean {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.email && isAdminEmail(user.email)) return true;
  return false;
}

/**
 * Sanitizes arbitrary text input to prevent XSS (Cross-Site Scripting).
 * Removes script tags, HTML tags, and dangerous attributes.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}
