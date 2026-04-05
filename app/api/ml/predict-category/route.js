// app/api/ml/predict-category/route.js
//
// Bridge: Next.js → Python ML service
// Called from the expense form when user types a title.
// Uses lib/ml.js for the actual HTTP call to Python.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { predictCategory } from "@/lib/ml"; // ← lib/ml.js handles HTTP + errors

export async function POST(request) {
  try {
    // ── Auth check ────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Read request body ─────────────────────────────────────────────────
    const { title } = await request.json();

    if (!title || title.trim().length < 2) {
      return NextResponse.json({ error: "Title too short" }, { status: 400 });
    }

    // ── Call ML service via lib/ml.js ─────────────────────────────────────
    // predictCategory() calls mlFetch() which:
    //   - POSTs to /api/ml/predict-category
    //   - Returns null if ML service is down (graceful degradation)
    const result = await predictCategory(title);

    // ── Graceful degradation if ML is down ────────────────────────────────
    // lib/ml.js returns null when ML service is unavailable
    // We return a safe fallback instead of crashing
    if (!result) {
      return NextResponse.json({
        category:   null,
        confidence: 0,
        fallback:   true,
        message:    "ML service unavailable — please select category manually",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("predict-category route error:", error);
    return NextResponse.json(
      { error: "Failed to predict category" },
      { status: 500 }
    );
  }
}