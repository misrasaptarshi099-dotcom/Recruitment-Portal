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
  adminList.push("misrasaptarshi099@gmail.com");
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

/**
 * Check if user is a super admin.
 * Explicit roleConfig assignments take top priority (e.g. if an allowlisted email is scoped to dept_manager).
 * Otherwise, falls back to ADMIN_EMAILS allowlist / admin role.
 * @param {object} user  - { email, role }
 * @param {object} [roleConfig] - Firestore admin_roles document data: { assignments: { [email]: { role, departments } } }
 */
export function isSuperAdmin(user, roleConfig) {
  if (!user) return false;
  const emailLower = user.email?.trim().toLowerCase();

  // 1. Explicit assignment in roleConfig takes top precedence
  if (roleConfig?.assignments && emailLower && roleConfig.assignments[emailLower]) {
    return roleConfig.assignments[emailLower].role === "super_admin";
  }

  // 2. Default allowlist fallback
  if (isAdminEmail(user?.email)) return true;
  if (user.role === "admin") return true;

  return false;
}

/**
 * Resolve user's admin role and department assignments.
 * Explicit assignments in roleConfig take first priority over default allowlists.
 * @returns {{ isAuthorized: boolean, role: "super_admin"|"dept_manager"|null, departments: string[] }}
 */
export function getUserAdminRole(user, roleConfig) {
  if (!user) return { isAuthorized: false, role: null, departments: [] };
  const emailLower = user.email?.trim().toLowerCase();

  // 1. Explicit assignment in roleConfig takes top priority
  if (roleConfig?.assignments && emailLower && roleConfig.assignments[emailLower]) {
    const entry = roleConfig.assignments[emailLower];
    if (entry.role === "dept_manager") {
      return {
        isAuthorized: true,
        role: "dept_manager",
        departments: Array.isArray(entry.departments) ? entry.departments : [],
      };
    }
    if (entry.role === "super_admin") {
      return {
        isAuthorized: true,
        role: "super_admin",
        departments: [],
      };
    }
  }

  // 2. Default fallback: check if user is super admin via allowlist/role
  if (isSuperAdmin(user, roleConfig)) {
    return { isAuthorized: true, role: "super_admin", departments: [] };
  }

  return { isAuthorized: false, role: null, departments: [] };
}

/**
 * Check if user can access a specific department.
 * Super admins can access all departments. Dept managers only their assigned ones.
 */
export function canAccessDepartment(user, departmentName, roleConfig) {
  if (!user || !departmentName) return false;
  const { isAuthorized, role, departments } = getUserAdminRole(user, roleConfig);
  if (!isAuthorized) return false;
  if (role === "super_admin") return true;
  return departments.includes(departmentName);
}

/**
 * Legacy-compatible admin check. Returns true if user is super_admin OR dept_manager.
 * Accepts optional roleConfig for dynamic role resolution (dept_manager support).
 */
export function isUserAdmin(user, roleConfig) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.email && isAdminEmail(user.email)) return true;
  // Check dynamic role assignments
  if (roleConfig?.assignments) {
    const entry = roleConfig.assignments[user.email?.trim().toLowerCase()];
    if (entry?.role === "super_admin" || entry?.role === "dept_manager") return true;
  }
  return false;
}

export function sanitizeText(input) {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function isValidHttpUrl(string) {
  try {
    const newUrl = new URL(string);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch {
    return false;
  }
}

export function calculateDinoRank(highScore = 0) {
  if (highScore >= 1200) {
    return {
      title: "CHROME T-REX",
      tier: "APEX",
      level: 4,
      badgeColor: "text-emerald-400 border-emerald-500 bg-emerald-500/10 shadow-[2px_2px_0px_#10B981]",
      icon: "🦖",
      description: "Apex predator of the pixel desert. Elite reaction times.",
    };
  }
  if (highScore >= 600) {
    return {
      title: "VELOCIRAPTOR",
      tier: "VETERAN",
      level: 3,
      badgeColor: "text-cyan-400 border-cyan-500 bg-cyan-500/10 shadow-[2px_2px_0px_#06B6D4]",
      icon: "⚡",
      description: "Agile speedrunner. Navigates cacti clusters with ease.",
    };
  }
  if (highScore >= 250) {
    return {
      title: "DESERT RUNNER",
      tier: "SCOUT",
      level: 2,
      badgeColor: "text-amber-400 border-amber-500 bg-amber-500/10 shadow-[2px_2px_0px_#F59E0B]",
      icon: "🌵",
      description: "Solid endurance. Regular visitor to night mode.",
    };
  }
  return {
    title: "PIXEL CADET",
    tier: "ROOKIE",
    level: 1,
    badgeColor: "text-blue-400 border-blue-500 bg-blue-500/10 shadow-[2px_2px_0px_#3B82F6]",
    icon: "🥚",
    description: "Beginner runner. Warming up on the desert runway.",
  };
}
