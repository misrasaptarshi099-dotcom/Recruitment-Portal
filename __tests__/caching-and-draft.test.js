async function runCachingAndDraftTests() {
  console.log("=== Running Phase 3 Caching, Metadata & Draft Test Suite ===");

  const deptMod = await import("../app/api/departments/route.js");
  const getDepartments = deptMod.GET || deptMod.default?.GET;

  const qMod = await import("../app/api/questions/route.js");
  const getQuestions = qMod.GET || qMod.default?.GET;

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

  // Test 4: Draft Store Offline Persistence & Revision Conflict Resolution
  console.log("Test 4: Validating Draft Store offline persistence & revision resolution...");
  const mockStorage = new Map();
  global.window = {
    localStorage: {
      getItem: (k) => mockStorage.get(k) || null,
      setItem: (k, v) => mockStorage.set(k, v),
      removeItem: (k) => mockStorage.delete(k),
    },
  };
  global.localStorage = global.window.localStorage;

  const draftStoreMod = await import("../lib/draft-store.js");
  const saveDraftAsync = draftStoreMod.saveDraftAsync || draftStoreMod.default?.saveDraftAsync;
  const loadDraftAsync = draftStoreMod.loadDraftAsync || draftStoreMod.default?.loadDraftAsync;
  const removeDraftAsync = draftStoreMod.removeDraftAsync || draftStoreMod.default?.removeDraftAsync;
  const createDraftQueue = draftStoreMod.createDraftQueue || draftStoreMod.default?.createDraftQueue;
  const testKey = "test_user_draft";

  await saveDraftAsync(testKey, { values: { Name: "Initial Name" }, updatedAt: 1000 });
  const draft1 = await loadDraftAsync(testKey);
  if (draft1?.values?.Name !== "Initial Name" || !draft1?.updatedAt) {
    throw new Error("Draft 1 was not saved or loaded properly!");
  }

  await saveDraftAsync(testKey, { values: { Name: "Updated Name" }, updatedAt: 2000 });
  const draft2 = await loadDraftAsync(testKey);
  if (draft2?.values?.Name !== "Updated Name" || draft2?.updatedAt !== 2000) {
    throw new Error("Draft 2 (newer revision) was not loaded properly!");
  }

  await removeDraftAsync(testKey);
  const draft3 = await loadDraftAsync(testKey);
  if (draft3 !== null) {
    throw new Error("Draft was not properly removed!");
  }

  // Test 5: Production Chained Draft Queue, Newest Values, and Final Cleanup
  console.log("Test 5: Validating production createDraftQueue chained writes, newest values, and final cleanup...");
  const draftQueue = createDraftQueue(saveDraftAsync);

  // Queue an older write with 30ms delay, followed immediately by a newer write with 10ms delay
  draftQueue.enqueue("chain_test_key", { values: { Name: "Write 1 (older)" }, updatedAt: 100 }, 30);
  draftQueue.enqueue("chain_test_key", { values: { Name: "Write 2 (newest)" }, updatedAt: 200 }, 10);

  await draftQueue.wait();

  const resultDraft = await loadDraftAsync("chain_test_key");
  if (resultDraft?.values?.Name !== "Write 2 (newest)") {
    throw new Error(`Expected newest draft value 'Write 2 (newest)', got: ${JSON.stringify(resultDraft)}`);
  }

  // Simulate submission: cancel queue, attempt post-submit write, await wait(), remove draft
  draftQueue.cancel();
  draftQueue.enqueue("chain_test_key", { values: { Name: "Write 3 (should be aborted)" }, updatedAt: 300 }, 10);
  await draftQueue.wait();
  await removeDraftAsync("chain_test_key");

  const finalDraft = await loadDraftAsync("chain_test_key");
  if (finalDraft !== null) {
    throw new Error("Draft was recreated after submission cleanup!");
  }
  console.log("  ✓ Production createDraftQueue chained writes, newest value retention & final cleanup verified.");

  delete global.window;
  delete global.localStorage;
  console.log("  ✓ Draft Store offline persistence, timestamp tracking & removal verified.");

  // Test 6: Concurrent Dino Score Atomic Transactions (using isolated localDb/emulator)
  console.log("Test 6: Validating concurrent dino-score transactions & high-score retention...");
  let localStoreMod;
  try {
    localStoreMod = await import("../lib/local-store.js");
  } catch {
    localStoreMod = await import("../lib/local-store");
  }
  const isolatedDb = localStoreMod.localDb || localStoreMod.default?.localDb;
  const db = isolatedDb;

  const testDinoUser = `dino_concurrency_${Date.now()}`;
  const scoreRef = db.collection("dinoScores").doc(testDinoUser);

  try {
    const simulatePostScore = async (score) => {
      return await db.runTransaction(async (transaction) => {
        const doc = await transaction.get(scoreRef);
        const data = doc.exists ? (doc.data() || {}) : {};
        const currentHigh = data.highScore || 0;
        const gamesCount = (data.gamesPlayed || 0) + 1;
        const newHigh = Math.max(currentHigh, score);

        transaction.set(
          scoreRef,
          {
            highScore: newHigh,
            lastScore: score,
            gamesPlayed: gamesCount,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );

        return { newHigh, gamesPlayed: gamesCount };
      });
    };

    // Launch 5 concurrent transactions with different scores
    await Promise.all([
      simulatePostScore(450),
      simulatePostScore(980),
      simulatePostScore(120),
      simulatePostScore(670),
      simulatePostScore(310),
    ]);

    const finalScoreDoc = await scoreRef.get();
    const finalScoreData = finalScoreDoc.data();

    if (finalScoreData.gamesPlayed !== 5) {
      throw new Error(`Expected exactly 5 gamesPlayed under concurrency, got: ${finalScoreData.gamesPlayed}`);
    }
    if (finalScoreData.highScore !== 980) {
      throw new Error(`Expected highest highScore 980, got: ${finalScoreData.highScore}`);
    }
    console.log(`  ✓ Concurrent score atomic transactions verified (gamesPlayed: ${finalScoreData.gamesPlayed}, highScore: ${finalScoreData.highScore})`);
  } finally {
    if (scoreRef) {
      await scoreRef.delete().catch(() => {});
    }
  }

  console.log("\n>>> ALL PHASE 3 CACHING & METADATA TESTS PASSED! <<<");
}

runCachingAndDraftTests().catch((err) => {
  console.error("Phase 3 tests failed:", err);
  process.exit(1);
});
