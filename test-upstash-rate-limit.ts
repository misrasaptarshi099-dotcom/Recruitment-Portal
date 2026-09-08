import { redis } from "./lib/redis";
import { rateLimitAsync } from "./lib/rate-limit";

async function runUpstashRateLimitTest() {
  console.log("==================================================");
  console.log("🔍 TESTING UPSTASH REDIS RATE LIMIT INTEGRATION");
  console.log("==================================================");

  // 1. Verify Configuration
  console.log("\n[1] Checking Upstash Redis Configuration...");
  const isConfigured = redis.isConfigured();
  console.log(`    isConfigured: ${isConfigured}`);
  if (!isConfigured) {
    console.error("❌ ERROR: Upstash Redis is not configured in .env.local!");
    process.exit(1);
  }
  console.log("    ✅ Upstash URL & Token detected in environment.");

  // 2. Direct Raw Pipeline Test to Upstash
  console.log("\n[2] Testing Direct REST Connection & Pipeline to Upstash...");
  const pingKey = `test_ping_${Date.now()}`;
  try {
    const pipeRes = await redis.pipeline([
      ["SET", pingKey, "upstash_healthy", "EX", 15],
      ["GET", pingKey],
      ["TTL", pingKey],
      ["DEL", pingKey]
    ]);
    console.log("    Pipeline raw response:", JSON.stringify(pipeRes));
    if (Array.isArray(pipeRes) && pipeRes[1] === "upstash_healthy") {
      console.log("    ✅ Upstash Redis read/write/pipeline verified successfully!");
    } else {
      console.error("    ❌ Unexpected response from Upstash pipeline:", pipeRes);
      process.exit(1);
    }
  } catch (err: any) {
    console.error("    ❌ Failed to reach Upstash Redis:", err?.message || err);
    process.exit(1);
  }

  // 3. Testing rateLimitAsync with maxRequests = 3, windowSeconds = 10
  console.log("\n[3] Testing rateLimitAsync Sliding Window Enforcement...");
  const testId = `test_runner_${Date.now()}`;
  const options = { maxRequests: 3, windowSeconds: 10 };

  console.log(`    Test Identifier: ${testId}`);
  console.log(`    Limits: maxRequests=${options.maxRequests}, windowSeconds=${options.windowSeconds}s`);

  // Request 1
  const req1 = await rateLimitAsync(testId, options);
  console.log(`    Request 1 -> Success: ${req1.success}, Remaining: ${req1.remaining}, Reset: ${req1.reset}s, Retry-After: ${req1.retryAfter}`);
  if (!req1.success || req1.remaining !== 2) {
    throw new Error(`Request 1 failed expectation: ${JSON.stringify(req1)}`);
  }

  // Request 2
  const req2 = await rateLimitAsync(testId, options);
  console.log(`    Request 2 -> Success: ${req2.success}, Remaining: ${req2.remaining}, Reset: ${req2.reset}s, Retry-After: ${req2.retryAfter}`);
  if (!req2.success || req2.remaining !== 1) {
    throw new Error(`Request 2 failed expectation: ${JSON.stringify(req2)}`);
  }

  // Request 3
  const req3 = await rateLimitAsync(testId, options);
  console.log(`    Request 3 -> Success: ${req3.success}, Remaining: ${req3.remaining}, Reset: ${req3.reset}s, Retry-After: ${req3.retryAfter}`);
  if (!req3.success || req3.remaining !== 0) {
    throw new Error(`Request 3 failed expectation: ${JSON.stringify(req3)}`);
  }

  // Request 4 (Should be BLOCKED with 429 logic!)
  const req4 = await rateLimitAsync(testId, options);
  console.log(`    Request 4 (Exceeded) -> Success: ${req4.success}, Remaining: ${req4.remaining}, Reset: ${req4.reset}s, Retry-After: ${req4.retryAfter}`);
  if (req4.success !== false || req4.retryAfter <= 0) {
    throw new Error(`Request 4 was NOT blocked as expected: ${JSON.stringify(req4)}`);
  }
  console.log("    ✅ rateLimitAsync strictly throttled excess request (4th request blocked)!");

  // 4. Verify Key Persistence and TTL directly inside Upstash Redis
  console.log("\n[4] Inspecting Key Directly in Upstash Redis...");
  const rawKey = `rl:${testId}`;
  const [val, ttl] = await Promise.all([
    redis.get<number>(rawKey),
    redis.ttl(rawKey)
  ]);
  console.log(`    Key "${rawKey}" in Upstash -> Value: ${val}, TTL: ${ttl}s`);
  if (Number(val) < 4 || Number(ttl) <= 0) {
    throw new Error(`Key was not recorded in Upstash Redis properly! Val: ${val}, TTL: ${ttl}`);
  }
  console.log("    ✅ Key confirmed directly in remote Upstash database with active TTL!");

  // 5. Cleanup Test Key
  await redis.del(rawKey);
  console.log("    🧹 Cleaned up test key from Upstash Redis.");

  // 6. Test Live Server HTTP Endpoint 429 Throttling
  console.log("\n[5] Testing Live HTTP Endpoint 429 Throttling on Port 3000...");
  const simulatedIp = `203.0.113.${Math.floor(Math.random() * 200) + 10}`;
  console.log(`    Simulating client IP: ${simulatedIp} against /api/send-email (limit: 5 req/10min)...`);

  let hit429 = false;
  let retryAfterHeader = null;
  let blockedAtRequest = -1;

  for (let i = 1; i <= 8; i++) {
    const res = await fetch("http://localhost:3000/api/send-email", {
      method: "POST",
      headers: {
        "x-forwarded-for": simulatedIp,
        "content-type": "application/json",
      },
      body: JSON.stringify({}),
    });
    console.log(`    Req #${i}: status=${res.status}`);

    if (res.status === 429) {
      hit429 = true;
      blockedAtRequest = i;
      retryAfterHeader = res.headers.get("retry-after");
      const json = await res.json().catch(() => ({}));
      console.log(`    Request #${i} -> 🛑 HTTP 429 Rate Limit Exceeded!`);
      console.log(`    Status: ${res.status} Too Many Requests`);
      console.log(`    Retry-After Header: ${retryAfterHeader}s`);
      console.log(`    Response Body:`, JSON.stringify(json));
      break;
    }
  }

  // Clean up the IP rate limit key from Upstash
  await redis.del(`rl:send_email_${simulatedIp}`);

  if (!hit429) {
    throw new Error("HTTP 429 was not triggered within 8 requests!");
  }
  console.log(`    ✅ Live API route strictly enforced Upstash rate limit at request #${blockedAtRequest}!`);

  console.log("\n==================================================");
  console.log("🎉 ALL UPSTASH REDIS RATE LIMIT CHECKS PASSED!");
  console.log("==================================================");
}

runUpstashRateLimitTest().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
