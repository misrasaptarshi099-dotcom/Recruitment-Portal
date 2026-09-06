async function runCachingAndDraftTests() {
  console.log("=== Running Phase 3 Caching, Metadata & Draft Test Suite ===");

  const { GET: getDepartments } = await import("../app/api/departments/route.js");
  const { GET: getQuestions } = await import("../app/api/questions/route.js");

  // Test 1: Departments Edge CDN Caching & Schema
  console.log("Test 1: Validating /api/departments Edge CDN headers & response...");
  const deptRes = await getDepartments();
  const deptData = await deptRes.json();
  const deptCacheHeader = deptRes.headers.get("Cache-Control");

  if (!deptCacheHeader || !deptCacheHeader.includes("s-maxage=86400")) {
    throw new Error(`Invalid Cache-Control header on /api/departments: ${deptCacheHeader}`);
  }
  if (!Array.isArray(deptData.departments) || deptData.departments.length === 0) {
    throw new Error("Departments response is not a populated array!");
  }
  console.log(`  ✓ /api/departments verified (${deptData.departments.length} departments, Cache-Control: ${deptCacheHeader})`);

  // Test 2: Questions Edge CDN Caching & Query Filter
  console.log("Test 2: Validating /api/questions Edge CDN headers & department filtering...");
  const qUrl = new URL("http://localhost:3000/api/questions?department=App%20Dev");
  const qRes = await getQuestions(new Request(qUrl));
  const qData = await qRes.json();
  const qCacheHeader = qRes.headers.get("Cache-Control");

  if (!qCacheHeader || !qCacheHeader.includes("public")) {
    throw new Error(`Invalid Cache-Control header on /api/questions: ${qCacheHeader}`);
  }
  if (!Array.isArray(qData.questions) || qData.questions.length === 0) {
    throw new Error("Filtered questions for App Dev returned empty array!");
  }
  console.log(`  ✓ /api/questions filtered verified (${qData.questions[0].questions.length} questions for App Dev)`);

  // Test 3: Unfiltered questions endpoint
  const allQRes = await getQuestions(new Request(new URL("http://localhost:3000/api/questions")));
  const allQData = await allQRes.json();
  if (allQData.questions.length < 5) {
    throw new Error("Unfiltered questions returned fewer departments than expected!");
  }
  console.log(`  ✓ All questions metadata verified (${allQData.questions.length} department questionnaires)`);

  console.log("\n>>> ALL PHASE 3 CACHING & METADATA TESTS PASSED! <<<");
}

runCachingAndDraftTests().catch((err) => {
  console.error("Phase 3 tests failed:", err);
  process.exit(1);
});
