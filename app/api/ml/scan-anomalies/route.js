// app/api/ml/scan-anomalies/route.js
// FIXED: accepts single expense + history, calls detect-anomaly endpoint

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { expense, history } = await request.json();

    if (!expense || !history) {
      return NextResponse.json({ is_anomaly: false, severity: "none", reason: "Missing data" });
    }

    const mlRes = await fetch(`${ML_URL}/api/ml/detect-anomaly`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expense, history }),
    });

    if (!mlRes.ok) {
      return NextResponse.json({ is_anomaly: false, severity: "none", reason: "ML service unavailable" });
    }

    const data = await mlRes.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("scan-anomalies error:", error);
    return NextResponse.json({ is_anomaly: false, severity: "none", reason: "Error" });
  }
}