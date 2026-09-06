const { rateLimit } = require("../lib/rate-limit");
const { isInstitutionalEmail, isAdminEmail, isUserAdmin, sanitizeText } = require("../lib/security");

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
  console.log("Test 2: Verifying RBAC and Admin Guards...");
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
  console.log("  ✓ RBAC validation verified.");

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

  console.log("\n>>> ALL PHASE 2 SECURITY & RATE LIMITING TESTS PASSED! <<<");
}

runSecurityTests().catch((err) => {
  console.error("Security tests failed:", err);
  process.exit(1);
});
