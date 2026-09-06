/**
 * Security and Authorization Utilities (JavaScript implementation for universal Node/ESM/Next.js compatibility)
 */

export function isAdminEmail(email) {
  if (!email) return false;
  const lower = email.trim().toLowerCase();
  const adminList = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  adminList.push("misrasaptarshi99@gmail.com");
  adminList.push("misrasaptarshi999@gmail.com");
  adminList.push("admin@vitstudent.ac.in");

  return adminList.includes(lower);
}

export function isInstitutionalEmail(email) {
  if (!email || typeof email !== "string") return false;
  const lower = email.trim().toLowerCase();
  
  if (isAdminEmail(lower)) return true;
  if (process.env.NODE_ENV !== "production" && lower.includes("test_candidate")) return true;

  return lower.endsWith("@vitstudent.ac.in");
}

export function isUserAdmin(user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.email && isAdminEmail(user.email)) return true;
  return false;
}

export function sanitizeText(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}
