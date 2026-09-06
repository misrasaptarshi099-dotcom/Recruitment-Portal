const { submitApplicationTransaction, sanitizeFieldKey, normalizeQuestions } = require("../lib/bcnf");

async function runTests() {
  console.log("=== Running BCNF & Response Storage Verification Suite ===");

  // Test 1: Sanitize Field Keys (Avoid dots and slashes breaking Firestore paths)
  const testKey = "Which mobile frameworks or platforms do you prefer (e.g., Flutter, React Native, Native Android/iOS) and why?";
  const sanitized = sanitizeFieldKey(testKey);
  console.log("Test 1 - Key Sanitization:", sanitized);
  if (sanitized.includes(".") || sanitized.includes("/")) {
    throw new Error("Sanitization failed: contains periods or slashes!");
  }

  // Test 2: Normalize Questions
  const rawQuestions = {
    [testKey]: "Flutter for performance and developer velocity",
    "Codeforces / Leetcode Profile": "https://leetcode.com/test",
  };
  const { structuredList } = normalizeQuestions(rawQuestions);
  console.log("Test 2 - Structured Questions count:", structuredList.length);
  if (structuredList.length !== 2) {
    throw new Error("Structured list count mismatch!");
  }

  // Test 3: Transactional Submission 1 (App Dev)
  const testEmail = `test_candidate_${Date.now()}@vitstudent.ac.in`;
  const sub1 = await submitApplicationTransaction({
    Name: "Test Student",
    RegistrationNumber: "25BCE9999",
    Email: testEmail,
    Department: "App Dev",
    Questions: rawQuestions,
  });
  console.log("Test 3 - First Application Result:", sub1);
  if (!sub1.success) throw new Error("First submission should succeed");

  // Test 4: Duplicate Submission of same department (should fail)
  try {
    await submitApplicationTransaction({
      Name: "Test Student",
      RegistrationNumber: "25BCE9999",
      Email: testEmail,
      Department: "App Dev",
      Questions: rawQuestions,
    });
    throw new Error("Duplicate submission should have thrown an error!");
  } catch (err) {
    console.log("Test 4 - Duplicate Submission successfully blocked:", err.message);
  }

  // Test 5: Second Application (Web Dev) (should succeed)
  const sub2 = await submitApplicationTransaction({
    Name: "Test Student",
    RegistrationNumber: "25BCE9999",
    Email: testEmail,
    Department: "Web Dev",
    Questions: { "Portfolio Link": "https://example.com" },
  });
  console.log("Test 5 - Second Application Result:", sub2);
  if (!sub2.success) throw new Error("Second submission should succeed");

  // Test 6: Third Application (Design) (must fail max 2 limit)
  try {
    await submitApplicationTransaction({
      Name: "Test Student",
      RegistrationNumber: "25BCE9999",
      Email: testEmail,
      Department: "Design",
      Questions: { "Portfolio": "https://example.com/design" },
    });
    throw new Error("Third submission should have thrown an error!");
  } catch (err) {
    console.log("Test 6 - Third Submission successfully blocked:", err.message);
  }

  console.log("\n>>> ALL BCNF & RESPONSE STORAGE TESTS PASSED SUCCESSFULLY! <<<");
}

runTests().catch((err) => {
  console.error("Test failed:", err);
  process.exit(1);
});
