const { rateLimit } = require("../lib/rate-limit");
const { isInstitutionalEmail, isAdminEmail, isUserAdmin, sanitizeText, isSuperAdmin, getUserAdminRole, canAccessDepartment } = require("../lib/security");

async function runSecurityTests() {
  console.log("=== Running Phase 2 Security & Rate Limiting Test Suite ===");

  // Test 1: Institutional Domain Enforcement
  console.log("Test 1: Validating Institutional Domain Lock...");
  if (!isInstitutionalEmail("25bce5612@vitstudent.ac.in")) {
    throw new Error("Valid institutional email was rejected!");
  }
  if (isInstitutionalEmail("attacker@gmail.com")) {
    throw new Error("External Gmail address was improperly permitted!");
  }
  if (isInstitutionalEmail("malicious@vitstudent.ac.in.attacker.org")) {
    throw new Error("Subdomain spoofing was improperly permitted!");
  }
  console.log("  ✓ Institutional Domain Lock verified.");

  // Test 2: Role-Based Access Control (OWASP A01 Defense)
  console.log("Test 2: Verifying RBAC, Admin Guards & Department Scoping...");
  if (isUserAdmin(null)) throw new Error("Null user should not be admin!");
  if (isUserAdmin({ role: "user", email: "student@vitstudent.ac.in" })) {
    throw new Error("Standard student role was improperly granted admin privileges!");
  }
  if (!isUserAdmin({ role: "admin", email: "organizer@gdg.org" })) {
    throw new Error("Admin role user was denied admin access!");
  }
  if (!isUserAdmin({ role: "user", email: "misrasaptarshi99@gmail.com" })) {
    throw new Error("Allowlisted admin email misrasaptarshi99@gmail.com was denied admin access!");
  }
  if (!isUserAdmin({ role: "user", email: "misrasaptarshi999@gmail.com" })) {
    throw new Error("Allowlisted admin email was denied admin access!");
  }

  // Test 2B: Super Admin vs Dept Manager Scoping with dynamic roleConfig
  const mockRoleConfig = {
    assignments: {
      "super@example.com": { role: "super_admin", departments: [] },
      "web_lead@example.com": { role: "dept_manager", departments: ["Web Dev"] },
      "multi_lead@example.com": { role: "dept_manager", departments: ["Web Dev", "App Dev"] }
    }
  };

  const superUser = { email: "super@example.com", role: "user" };
  const envSuperUser = { email: "misrasaptarshi99@gmail.com", role: "user" };
  const webLead = { email: "web_lead@example.com", role: "user" };
  const multiLead = { email: "multi_lead@example.com", role: "user" };
  const outsider = { email: "stranger@vitstudent.ac.in", role: "user" };

  // isSuperAdmin tests
  if (!isSuperAdmin(superUser, mockRoleConfig)) throw new Error("super@example.com should be super admin via roleConfig!");
  if (!isSuperAdmin(envSuperUser, mockRoleConfig)) throw new Error("misrasaptarshi99@gmail.com should be super admin via allowlist!");
  if (isSuperAdmin(webLead, mockRoleConfig)) throw new Error("webLead should NOT be super admin!");

  // getUserAdminRole tests
  const superRole = getUserAdminRole(superUser, mockRoleConfig);
  if (!superRole.isAuthorized || superRole.role !== "super_admin") throw new Error("superUser role resolution failed!");

  const webRole = getUserAdminRole(webLead, mockRoleConfig);
  if (!webRole.isAuthorized || webRole.role !== "dept_manager" || !webRole.departments.includes("Web Dev")) {
    throw new Error("webLead role resolution failed!");
  }

  const outsiderRole = getUserAdminRole(outsider, mockRoleConfig);
  if (outsiderRole.isAuthorized) throw new Error("outsider should not be authorized!");

  // Allowlisted email explicitly scoped to dept_manager in roleConfig must be dept_manager, NOT super_admin
  const scopedAdminUser = { email: "misrasaptarshi999@gmail.com", role: "user" };
  const scopedRoleConfig = {
    assignments: {
      "misrasaptarshi999@gmail.com": { role: "dept_manager", departments: ["Data Science"] }
    }
  };
  if (isSuperAdmin(scopedAdminUser, scopedRoleConfig)) {
    throw new Error("misrasaptarshi999@gmail.com should NOT be super admin when explicitly assigned as dept_manager!");
  }
  const scopedRole = getUserAdminRole(scopedAdminUser, scopedRoleConfig);
  if (!scopedRole.isAuthorized || scopedRole.role !== "dept_manager" || !scopedRole.departments.includes("Data Science")) {
    throw new Error("Scoped admin user role resolution failed!");
  }

  // canAccessDepartment tests
  if (!canAccessDepartment(superUser, "Web Dev", mockRoleConfig) || !canAccessDepartment(superUser, "Design", mockRoleConfig)) {
    throw new Error("Super admin should have access to all departments!");
  }
  if (!canAccessDepartment(webLead, "Web Dev", mockRoleConfig)) {
    throw new Error("webLead should have access to Web Dev!");
  }
  if (canAccessDepartment(webLead, "Design", mockRoleConfig)) {
    throw new Error("webLead should NOT have access to Design!");
  }
  if (!canAccessDepartment(multiLead, "Web Dev", mockRoleConfig) || !canAccessDepartment(multiLead, "App Dev", mockRoleConfig)) {
    throw new Error("multiLead should have access to both Web Dev and App Dev!");
  }
  if (canAccessDepartment(multiLead, "AI / ML", mockRoleConfig)) {
    throw new Error("multiLead should NOT have access to AI / ML!");
  }
  if (canAccessDepartment(outsider, "Web Dev", mockRoleConfig)) {
    throw new Error("outsider should NOT have access to Web Dev!");
  }

  // Backward compatibility in isUserAdmin with roleConfig
  if (!isUserAdmin(webLead, mockRoleConfig)) {
    throw new Error("webLead should be recognized as admin in isUserAdmin with roleConfig!");
  }

  // Department Admin Role Management Scoping Validation
  console.log("  Validating Department Admin role management scoping...");
  const managerA = { email: "lead_ds@vitstudent.ac.in", role: "user" };
  const testRoles = {
    assignments: {
      "lead_ds@vitstudent.ac.in": { role: "dept_manager", departments: ["Data Science", "Management"] },
      "sub_lead@vitstudent.ac.in": { role: "dept_manager", departments: ["Data Science", "Web Dev"] },
      "root_super@gdg.org": { role: "super_admin", departments: [] },
    }
  };

  const managerInfo = getUserAdminRole(managerA, testRoles);
  if (!managerInfo.isAuthorized || managerInfo.role !== "dept_manager") {
    throw new Error("Department manager role resolution failed!");
  }

  // Permitted department assignment check
  const requestedDeptsAllowed = ["Data Science"];
  const isAllowedToAssign = requestedDeptsAllowed.every(d => managerInfo.departments.includes(d));
  if (!isAllowedToAssign) throw new Error("Manager should be allowed to assign Data Science!");

  // Unpermitted department assignment check (Web Dev is outside manager's jurisdiction)
  const requestedDeptsForbidden = ["Data Science", "Web Dev"];
  const isForbiddenToAssign = requestedDeptsForbidden.some(d => !managerInfo.departments.includes(d));
  if (!isForbiddenToAssign) throw new Error("Manager should NOT be allowed to assign Web Dev!");

  // Revoke scoping check: revoking Data Science preserves Web Dev for sub_lead
  const subLeadEntry = testRoles.assignments["sub_lead@vitstudent.ac.in"];
  const remainingAfterRevoke = subLeadEntry.departments.filter(d => !managerInfo.departments.includes(d));
  if (remainingAfterRevoke.length !== 1 || remainingAfterRevoke[0] !== "Web Dev") {
    throw new Error("Revoking Data Science should preserve Web Dev for sub_lead!");
  }

  console.log("  ✓ RBAC validation, department scoping & manager role delegation verified.");

  // Test 3: XSS Input Sanitization
  console.log("Test 3: Validating XSS Sanitization Filter...");
  const maliciousPayload = "<script>alert('pwned')</script><b>Candidate</b> essay response <img src=x onerror=alert(1)>";
  const sanitized = sanitizeText(maliciousPayload);
  if (sanitized.includes("<script>") || sanitized.includes("alert(1)") || sanitized.includes("<img")) {
    throw new Error(`Sanitization failed: script or tags escaped! Output: ${sanitized}`);
  }
  if (!sanitized.includes("Candidate essay response")) {
    throw new Error(`Sanitization corrupted legitimate text content! Output: ${sanitized}`);
  }
  console.log("  ✓ XSS sanitization verified: Cleaned output:", JSON.stringify(sanitized));

  // Test 4: Sliding-Window Rate Limiter
  console.log("Test 4: Verifying Sliding-Window Rate Limiter...");
  const testIp = `test_ip_${Date.now()}`;
  const opts = { maxRequests: 3, windowSeconds: 2 };

  // First 3 requests should pass
  const r1 = rateLimit(testIp, opts);
  const r2 = rateLimit(testIp, opts);
  const r3 = rateLimit(testIp, opts);
  if (!r1.success || !r2.success || !r3.success) {
    throw new Error("Initial requests within quota were prematurely rejected!");
  }
  if (r3.remaining !== 0) {
    throw new Error("Remaining quota count mismatch!");
  }

  // 4th request must be throttled
  const r4 = rateLimit(testIp, opts);
  if (r4.success) {
    throw new Error("4th request should have been rate limited (HTTP 429)!");
  }
  if (r4.retryAfter <= 0) {
    throw new Error("Retry-After header calculation failed!");
  }
  console.log(`  ✓ Rate limiter throttled as expected: 429 Too Many Requests (Retry-After: ${r4.retryAfter}s)`);

  // Test 5: Non-Institutional Account Revocation & Database Purge
  console.log("Test 5: Validating Non-Institutional Account Revocation & Purge...");
  const { purgeRevokedNonInstitutionalUser } = require("../lib/admin-auth");

  // In-memory mock Firestore
  const mockUserStore = new Map();
  const mockSessionStore = new Map();
  const mockAccountStore = new Map();
  const mockConfigStore = new Map();

  const mockDb = {
    collection: (name) => {
      if (name === "recruitment_config") {
        return {
          doc: (docId) => ({
            get: async () => ({
              exists: mockConfigStore.has(docId),
              data: () => mockConfigStore.get(docId),
            }),
            set: async (val) => {
              mockConfigStore.set(docId, val);
            },
          }),
        };
      }
      if (name === "user") {
        return {
          doc: (docId) => ({
            delete: async () => {
              mockUserStore.delete(docId);
            },
          }),
          where: (field, op, val) => ({
            get: async () => {
              const docs = [];
              for (const [id, user] of mockUserStore.entries()) {
                if (user[field] === val) {
                  docs.push({
                    id,
                    ref: {
                      delete: async () => {
                        mockUserStore.delete(id);
                      },
                    },
                  });
                }
              }
              return { docs };
            },
          }),
        };
      }
      if (name === "session") {
        return {
          where: (field, op, val) => ({
            get: async () => {
              const docs = [];
              for (const [id, session] of mockSessionStore.entries()) {
                if (session[field] === val) {
                  docs.push({
                    id,
                    ref: {
                      delete: async () => {
                        mockSessionStore.delete(id);
                      },
                    },
                  });
                }
              }
              return { docs };
            },
          }),
        };
      }
      if (name === "account") {
        return {
          where: (field, op, val) => ({
            get: async () => {
              const docs = [];
              for (const [id, account] of mockAccountStore.entries()) {
                if (account[field] === val) {
                  docs.push({
                    id,
                    ref: {
                      delete: async () => {
                        mockAccountStore.delete(id);
                      },
                    },
                  });
                }
              }
              return { docs };
            },
          }),
        };
      }
      return {};
    },
  };

  // Seed active admin in mock config
  mockConfigStore.set("admin_roles", {
    assignments: {
      "active_manager@gmail.com": { role: "dept_manager", departments: ["Web Dev"] },
    },
  });

  // 1. Institutional account is never purged
  const p1 = await purgeRevokedNonInstitutionalUser(mockDb, "student@vitstudent.ac.in");
  if (p1.purged) throw new Error("Institutional account was mistakenly purged!");

  // 2. Static allowlisted admin is never purged
  const p2 = await purgeRevokedNonInstitutionalUser(mockDb, "misrasaptarshi99@gmail.com");
  if (p2.purged) throw new Error("Static admin was mistakenly purged!");

  // 3. Active dynamic manager is not purged
  const p3 = await purgeRevokedNonInstitutionalUser(mockDb, "active_manager@gmail.com");
  if (p3.purged) throw new Error("Active dynamic admin was mistakenly purged!");

  // 4. Revoked non-institutional account (was previously manager, now role revoked)
  // Seed user, sessions, and accounts in database
  const revokedEmail = "former_lead@gmail.com";
  const testUserId = "user_former_123";
  mockUserStore.set(testUserId, { id: testUserId, email: revokedEmail, name: "Former Lead" });
  mockSessionStore.set("sess_1", { id: "sess_1", userId: testUserId, token: "token_123" });
  mockSessionStore.set("sess_2", { id: "sess_2", userId: testUserId, token: "token_456" });
  mockAccountStore.set("acc_1", { id: "acc_1", userId: testUserId, providerId: "google" });

  const p4 = await purgeRevokedNonInstitutionalUser(mockDb, revokedEmail);
  if (!p4.purged) throw new Error("Revoked non-institutional account was not purged!");

  // Verify records were deleted from all tables
  if (mockUserStore.has(testUserId)) throw new Error("Revoked user record was not deleted!");
  if (mockSessionStore.has("sess_1") || mockSessionStore.has("sess_2")) {
    throw new Error("Revoked user sessions were not deleted!");
  }
  if (mockAccountStore.has("acc_1")) throw new Error("Revoked user OAuth accounts were not deleted!");

  console.log("  ✓ Non-institutional account purge & session invalidation verified.");

  console.log("\n>>> ALL PHASE 2 SECURITY & RATE LIMITING TESTS PASSED! <<<");
}

runSecurityTests().catch((err) => {
  console.error("Security tests failed:", err);
  process.exit(1);
});
