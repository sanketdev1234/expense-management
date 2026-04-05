// app/api/ml/scan-anomalies/route.js
//
// Bridge: Next.js → Python ML service
// Receives a single expense + history from frontend,
// forwards to Python detect-anomaly endpoint via lib/ml.js.
// Uses lib/ml.js for the actual HTTP call to Python.

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { detectAnomaly } from "@/lib/ml"; // ← lib/ml.js handles HTTP + errors

export async function POST(request) {
  try {
    // ── Auth check ────────────────────────────────────────────────────────
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ── Read request body ─────────────────────────────────────────────────
    // expense = the new expense being checked
    // history = past expenses for the same user (sent by frontend)
    const { expense, history } = await request.json();

    if (!expense || !history) {
      // Missing data — return safe non-anomaly response
      return NextResponse.json({
        is_anomaly: false,
        severity:   "none",
        reason:     "Missing expense or history data",
      });
    }

    // ── Call ML service via lib/ml.js ─────────────────────────────────────
    // detectAnomaly() calls mlFetch() which:
    //   - POSTs { expense, history } to /api/ml/detect-anomaly
    //   - Returns null if ML service is down (graceful degradation)
    const result = await detectAnomaly(expense, history);

    // ── Graceful degradation if ML is down ────────────────────────────────
    // lib/ml.js returns null when ML service is unavailable
    // We return a safe non-anomaly fallback — don't block the user
    if (!result) {
      return NextResponse.json({
        is_anomaly: false,
        severity:   "none",
        reason:     "ML service unavailable — anomaly check skipped",
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("scan-anomalies route error:", error);
    return NextResponse.json(
      { is_anomaly: false, severity: "none", reason: "Error" },
      { status: 500 }
    );
  }
}