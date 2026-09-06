import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { connect } from "@/lib/db";
import { rateLimit, getClientIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ highScore: 0, gamesPlayed: 0 });
    }

    const email = session.user.email.toLowerCase().trim();
    const emailKey = email.replace(/[^a-z0-9]/g, "_");

    const db = await connect();
    const scoreDoc = await db.collection("dinoScores").doc(emailKey).get();

    if (!scoreDoc.exists) {
      return NextResponse.json({ highScore: 0, gamesPlayed: 0 });
    }

    const data = scoreDoc.data() || {};
    return NextResponse.json({
      highScore: data.highScore || 0,
      gamesPlayed: data.gamesPlayed || 0,
      lastPlayed: data.updatedAt || null,
    });
  } catch (error) {
    console.error("Error fetching dino score:", error);
    return NextResponse.json({ error: "Failed to fetch score" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const clientIp = getClientIp(req);
    const limit = rateLimit(`dino_score_${clientIp}`, {
      maxRequests: 60,
      windowSeconds: 60,
    });

    if (!limit.success) {
      return NextResponse.json({ error: "Too many score sync requests" }, { status: 429 });
    }

    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session?.user?.email) {
      return NextResponse.json({ message: "Guest mode (stored locally)" });
    }

    const body = await req.json();
    const score = Math.max(0, Math.floor(Number(body?.score) || 0));

    // Cap realistic max score to prevent spoofing
    if (score > 100000) {
      return NextResponse.json({ error: "Invalid score payload" }, { status: 400 });
    }

    const email = session.user.email.toLowerCase().trim();
    const emailKey = email.replace(/[^a-z0-9]/g, "_");
    const now = new Date().toISOString();

    const db = await connect();
    const scoreRef = db.collection("dinoScores").doc(emailKey);
    const scoreDoc = await scoreRef.get();

    let currentHigh = 0;
    let gamesPlayed = 0;

    if (scoreDoc.exists) {
      const data = scoreDoc.data() || {};
      currentHigh = data.highScore || 0;
      gamesPlayed = (data.gamesPlayed || 0) + 1;
    } else {
      gamesPlayed = 1;
    }

    const newHigh = Math.max(currentHigh, score);

    await scoreRef.set(
      {
        email,
        candidateName: session.user.name || "Candidate",
        highScore: newHigh,
        lastScore: score,
        gamesPlayed,
        updatedAt: now,
      },
      { merge: true }
    );

    return NextResponse.json({
      success: true,
      highScore: newHigh,
      gamesPlayed,
    });
  } catch (error) {
    console.error("Error updating dino score:", error);
    return NextResponse.json({ error: "Failed to record score" }, { status: 500 });
  }
}
