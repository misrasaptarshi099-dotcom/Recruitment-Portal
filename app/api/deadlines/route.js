import { NextResponse } from "next/server";
import { connect } from "@/lib/db";
import { redis } from "@/lib/redis";
import { departmentsData } from "@/constants/departments-data";
import { checkIsDeadlinePassed, resolveDepartmentDeadline } from "@/lib/round-status";
import { rateLimitAsync, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = await rateLimitAsync(`deadlines_pub_${clientIp}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again in a few moments." },
        {
          status: 429,
          headers: { "Retry-After": limit.retryAfter.toString() },
        }
      );
    }

    let deadlinesConfig = null;
    const cacheKey = "recruitment_config:deadlines";

    try {
      deadlinesConfig = await redis.get(cacheKey);
    } catch {
      // Redis fallback continues to Firestore
    }

    if (!deadlinesConfig || typeof deadlinesConfig !== "object") {
      try {
        const db = await connect();
        const dSnap = await db.collection("recruitment_config").doc("deadlines").get();
        if (dSnap.exists) {
          deadlinesConfig = dSnap.data() || {};
          await redis.set(cacheKey, deadlinesConfig, { ex: 300 });
        } else {
          deadlinesConfig = {};
          await redis.set(cacheKey, {}, { ex: 60 });
        }
      } catch (err) {
        console.warn("Notice reading recruitment deadlines config from Firestore:", err?.message || err);
        deadlinesConfig = {};
      }
    }

    const departmentsMap = {};
    const closedDepartments = [];

    // Evaluate for every department
    for (const dept of departmentsData) {
      const { round1Deadline, round2Deadline } = resolveDepartmentDeadline(deadlinesConfig, dept.name);
      const isRound1Closed = checkIsDeadlinePassed(round1Deadline);
      const isRound2Closed = checkIsDeadlinePassed(round2Deadline);

      departmentsMap[dept.name] = {
        round1Deadline,
        round2Deadline,
        isRound1Closed,
        isRound2Closed,
      };

      if (isRound1Closed) {
        closedDepartments.push(dept.name);
      }
    }

    const globalR1 = deadlinesConfig.round1Deadline || null;
    const globalR2 = deadlinesConfig.round2Deadline || null;

    return NextResponse.json({
      success: true,
      departments: departmentsMap,
      closedDepartments,
      global: {
        round1Deadline: globalR1,
        round2Deadline: globalR2,
        isRound1Closed: checkIsDeadlinePassed(globalR1),
        isRound2Closed: checkIsDeadlinePassed(globalR2),
      },
    });
  } catch (error) {
    console.error("Error retrieving public recruitment deadlines:", error);
    return NextResponse.json(
      { success: false, message: "Failed to retrieve recruitment deadlines" },
      { status: 500 }
    );
  }
}
