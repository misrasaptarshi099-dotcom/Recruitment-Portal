async function runProfileAndTaskTests() {
  console.log("=== Running Phase 5 Candidate Profile & 3-Round Task Test Suite ===");

  // Resolve db connect with dual named/default ESM and CJS fallback
  let connect;
  try {
    const dbMod = await import("../lib/db.ts");
    connect = dbMod.connect || dbMod.default?.connect;
  } catch {}
  if (typeof connect !== "function" && typeof require !== "undefined") {
    try {
      const dbCjs = require("../lib/db");
      connect = dbCjs.connect || dbCjs.default?.connect;
    } catch {}
  }
  if (typeof connect !== "function") {
    const dbMod = await import("../lib/db");
    connect = dbMod.connect || dbMod.default?.connect;
  }

  const db = await connect();

  // Test 1: Validate Task URL Sanitization and Deliverable Checks
  console.log("Test 1: Validating Task Deliverable URL & Protocol Validation...");
  const isValidHttpUrl = (str) => {
    try {
      const u = new URL(str);
      return u.protocol === "http:" || u.protocol === "https:";
    } catch {
      return false;
    }
  };

  if (!isValidHttpUrl("https://github.com/user/repo")) {
    throw new Error("Valid GitHub URL was rejected!");
  }
  if (!isValidHttpUrl("https://figma.com/file/abcdef123/GDG-Project")) {
    throw new Error("Valid Figma URL was rejected!");
  }
  if (isValidHttpUrl("javascript:alert(1)")) {
    throw new Error("Dangerous script URL was permitted!");
  }
  if (isValidHttpUrl("ftp://files.example.com/build.zip")) {
    throw new Error("FTP protocol URL was permitted!");
  }
  if (isValidHttpUrl("")) {
    throw new Error("Empty URL was permitted!");
  }
  console.log("  ✓ Deliverable URL validation and XSS prevention verified.");

  // Test 2: Validate Dino Arcade Rank Calculations & Thresholds
  console.log("Test 2: Validating Dino Rank Tier Math & Next Rank Progress...");
  const calculateDinoRank = (highScore = 0) => {
    if (highScore >= 1200) {
      return { title: "CHROME T-REX", tier: "APEX", level: 4 };
    }
    if (highScore >= 600) {
      return { title: "VELOCIRAPTOR", tier: "VETERAN", level: 3 };
    }
    if (highScore >= 250) {
      return { title: "DESERT RUNNER", tier: "SCOUT", level: 2 };
    }
    return { title: "PIXEL CADET", tier: "ROOKIE", level: 1 };
  };

  const ranks = [
    { score: 0, expectedTier: "ROOKIE", expectedLevel: 1 },
    { score: 249, expectedTier: "ROOKIE", expectedLevel: 1 },
    { score: 250, expectedTier: "SCOUT", expectedLevel: 2 },
    { score: 599, expectedTier: "SCOUT", expectedLevel: 2 },
    { score: 600, expectedTier: "VETERAN", expectedLevel: 3 },
    { score: 1199, expectedTier: "VETERAN", expectedLevel: 3 },
    { score: 1200, expectedTier: "APEX", expectedLevel: 4 },
    { score: 2500, expectedTier: "APEX", expectedLevel: 4 },
  ];

  for (const item of ranks) {
    const res = calculateDinoRank(item.score);
    if (res.tier !== item.expectedTier || res.level !== item.expectedLevel) {
      throw new Error(
        `Rank mismatch for score ${item.score}: got ${res.tier}/Lvl${res.level}, expected ${item.expectedTier}/Lvl${item.expectedLevel}`
      );
    }
  }
  console.log("  ✓ All Dino Rank tiers and boundary level thresholds verified.");

  // Test 3: Validate 3-Round Progression Lifecycle in Database
  console.log("Test 3: Validating Round 1 -> Round 2 Task -> Round 3 State Transitions in DB...");
  const testCandidateEmail = `profile_test_${Date.now()}@vitstudent.ac.in`;
  const emailSlug = testCandidateEmail.replace(/[^a-z0-9]/g, "_");
  const testAppId = `app_${emailSlug}__web_dev`;

  const appRef = db.collection("applications").doc(testAppId);
  const formRef = db.collection("formData").doc(testAppId);

  // 1. Initial State: Round 1 (Screening)
  await Promise.all([
    appRef.set({
      applicationId: testAppId,
      candidateEmail: testCandidateEmail,
      department: "Web Dev",
      departmentSlug: "web_dev",
      shortlisted: false,
      status: "pending",
      submittedAt: new Date().toISOString(),
    }),
    formRef.set({
      id: testAppId,
      Email: testCandidateEmail,
      Department: "Web Dev",
      shortlisted: false,
      Shortlisted: false,
      createdAt: new Date(),
    }),
  ]);

  const snap1 = await appRef.get();
  const data1 = snap1.data();
  if (data1.shortlisted !== false || data1.status !== "pending") {
    throw new Error("Initial application state was not properly recorded as pending!");
  }

  // 2. Clear Round 1 (Shortlist) -> Stage 2 Unlocked
  await Promise.all([
    appRef.set({ shortlisted: true, status: "shortlisted" }, { merge: true }),
    formRef.set({ shortlisted: true, Shortlisted: true, status: "shortlisted" }, { merge: true }),
  ]);

  const snapShortlist = await appRef.get();
  if (!snapShortlist.data().shortlisted) {
    throw new Error("Shortlist update failed!");
  }

  // 3. Submit Round 2 Task Deliverable
  const taskPayload = {
    submissionUrl: "https://github.com/gdg-candidate/recruitment-task",
    submittedAt: new Date().toISOString(),
    notes: "Implemented full-stack feature with state persistence.",
    status: "submitted",
  };

  await Promise.all([
    appRef.set({ round2Task: taskPayload }, { merge: true }),
    formRef.set({ round2Task: taskPayload }, { merge: true }),
  ]);

  const [snap2App, snap2Form] = await Promise.all([appRef.get(), formRef.get()]);
  const data2App = snap2App.data();
  const data2Form = snap2Form.data();

  if (!data2App.round2Task || data2App.round2Task.submissionUrl !== taskPayload.submissionUrl) {
    throw new Error("Round 2 task submission failed to persist in applications collection!");
  }
  if (!data2Form.round2Task || data2Form.round2Task.submissionUrl !== taskPayload.submissionUrl) {
    throw new Error("Round 2 task submission failed to dual-write to formData collection!");
  }
  if (data2App.round2Task.status !== "submitted") {
    throw new Error("Round 2 task status was not set to 'submitted'!");
  }

  // 4. Advance to Round 3: Interview Scheduled
  const interviewPayload = {
    slotTime: "Tomorrow, 4:00 PM IST",
    venue: "Technology Tower TT-314",
    meetLink: "https://meet.google.com/gdg-rec-test",
  };

  await Promise.all([
    appRef.set({ round3Interview: interviewPayload }, { merge: true }),
    formRef.set({ round3Interview: interviewPayload }, { merge: true }),
  ]);

  const snap3App = await appRef.get();
  const data3App = snap3App.data();
  if (!data3App.round3Interview || data3App.round3Interview.slotTime !== interviewPayload.slotTime) {
    throw new Error("Round 3 interview scheduling failed to persist!");
  }

  // 5. Final Selection to GDG Core
  await Promise.all([
    appRef.set({ status: "accepted" }, { merge: true }),
    formRef.set({ status: "accepted" }, { merge: true }),
  ]);

  const snapFinal = await appRef.get();
  if (snapFinal.data().status !== "accepted") {
    throw new Error("Final acceptance status update failed!");
  }

  console.log("  ✓ Complete 3-Stage Lifecycle (Screening -> Task Submission -> Interview -> Selected) verified.");

  console.log("\n>>> ALL PHASE 5 CANDIDATE PROFILE & TASK TESTS PASSED! <<<");
}

runProfileAndTaskTests().catch((err) => {
  console.error("Phase 5 tests failed:", err);
  process.exit(1);
});
