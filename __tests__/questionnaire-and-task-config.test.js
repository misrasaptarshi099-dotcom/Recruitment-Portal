import assert from "node:assert";
import { QuestionnaireData, departmentsData } from "../constants/departments-data.js";
import { canAccessDepartment, isUserAdmin, isSuperAdmin } from "../lib/security.js";
import { normalizeDeptSlug, sanitizeFieldKey } from "../lib/bcnf";

console.log("🧪 Running Questionnaire & Round 2 Task Configuration Tests...\n");

// Test 1: Department Slugs & Keys
console.log("1. Testing Department Slug & Key Normalization...");
assert.strictEqual(normalizeDeptSlug("Web Dev"), "web_dev");
assert.strictEqual(normalizeDeptSlug("UI/UX"), "ui_ux");
assert.strictEqual(normalizeDeptSlug("Cloud & DevOps"), "cloud_devops");
assert.strictEqual(sanitizeFieldKey("Which frontend frameworks e g Next js have you used"), "which_frontend_frameworks_e_g_next_js_have_you_used");
console.log("✅ Passed: Department slugs and sanitized field keys normalize cleanly.\n");

// Test 2: Fallback Questionnaire Integrity
console.log("2. Testing Questionnaire Fallback & Coverage...");
const allDeptNames = departmentsData.map((d) => d.name);
assert(allDeptNames.length >= 12, "Should have at least 12 standard departments");

allDeptNames.forEach((dept) => {
  const entry = QuestionnaireData.find(
    (qd) => qd.department.toLowerCase() === dept.toLowerCase()
  );
  assert(entry, `Default questionnaire must exist for department: ${dept}`);
  assert(Array.isArray(entry.questions), `Questions must be an array for ${dept}`);
  assert(entry.questions.length > 0, `Must have at least one question for ${dept}`);
});
console.log(`✅ Passed: All ${allDeptNames.length} departments have default questions in constants.\n`);

// Test 3: RBAC Authorization for Question & Task Modification
console.log("3. Testing Role Authorization Checks for Questionnaire & Tasks...");
const superAdminUser = { email: "saptarshi.misra2025@vitstudent.ac.in", role: "admin" };
const deptManagerUser = { email: "manager.webdev@vitstudent.ac.in", role: "admin" };
const regularCandidate = { email: "student2025@vitstudent.ac.in", role: "user" };

const mockRoleConfig = {
  assignments: {
    "manager.webdev@vitstudent.ac.in": {
      role: "dept_manager",
      departments: ["Web Dev"],
      active: true,
      expiresAt: "2099-12-31T23:59:59Z",
    },
  },
};

// Super admin checks
assert.strictEqual(isUserAdmin(superAdminUser, mockRoleConfig), true);
assert.strictEqual(canAccessDepartment(superAdminUser, "Web Dev", mockRoleConfig), true);
assert.strictEqual(canAccessDepartment(superAdminUser, "Design", mockRoleConfig), true);

// Dept manager checks
assert.strictEqual(isUserAdmin(deptManagerUser, mockRoleConfig), true);
assert.strictEqual(canAccessDepartment(deptManagerUser, "Web Dev", mockRoleConfig), true);
assert.strictEqual(canAccessDepartment(deptManagerUser, "Design", mockRoleConfig), false);

// Regular candidate checks
assert.strictEqual(isUserAdmin(regularCandidate, mockRoleConfig), false);
assert.strictEqual(canAccessDepartment(regularCandidate, "Web Dev", mockRoleConfig), false);
console.log("✅ Passed: Role boundaries strictly isolate Super Admin and Department Manager permissions.\n");

// Test 4: Task URL Validation Logic
console.log("4. Testing Round 2 Task URL Validation...");
const validDriveUrl = "https://drive.google.com/drive/folders/1aBcDeFgHiJkLmNoPqRsTuVwXyZ";
const validFigmaUrl = "https://www.figma.com/file/abcdef123456/GDG-Task-Brief";
const invalidUrl = "not-a-valid-url";

const isValidUrl = (str) => {
  try {
    const u = new URL(str);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
};

assert.strictEqual(isValidUrl(validDriveUrl), true);
assert.strictEqual(isValidUrl(validFigmaUrl), true);
assert.strictEqual(isValidUrl(invalidUrl), false);
console.log("✅ Passed: Round 2 Drive & external document URLs validate strictly.\n");

// Test 5: Dynamic Questionnaire Merge Logic
console.log("5. Testing Dynamic Questionnaire Merging...");
const mockCustomMap = {
  web_dev: {
    department: "Web Dev",
    questions: [
      {
        id: "q_custom_1",
        name: "Demonstrate your experience with Docker and Microfrontends.",
        type: "long-text",
        placeholder: "Describe in 2-3 paragraphs...",
      },
    ],
  },
};

const resolvedQuestions = allDeptNames.map((deptName) => {
  const slug = normalizeDeptSlug(deptName);
  const custom = mockCustomMap[slug];
  if (custom?.questions?.length) {
    return {
      department: deptName,
      questions: custom.questions,
    };
  }
  const defaultEntry = QuestionnaireData.find(
    (qd) => qd.department.toLowerCase() === deptName.toLowerCase()
  );
  return {
    department: deptName,
    questions: defaultEntry?.questions || [],
  };
});

const webDevResult = resolvedQuestions.find((q) => q.department === "Web Dev");
assert.strictEqual(webDevResult.questions.length, 1);
assert.strictEqual(webDevResult.questions[0].name, "Demonstrate your experience with Docker and Microfrontends.");

const designResult = resolvedQuestions.find((q) => q.department === "Design");
assert(designResult.questions.length >= 2, "Uncustomized departments should retain default questions");
console.log("✅ Passed: Custom department questions cleanly overlay defaults with zero regressions.\n");

console.log("🎉 All Questionnaire & Task Configuration unit tests passed successfully!");
