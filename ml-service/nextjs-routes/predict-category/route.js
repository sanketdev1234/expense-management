/**
 * app/api/ml/predict-category/route.js
 *
 * Bridge: Next.js → Python ML service
 * Called by the expense form when user types a title.
 * Returns predicted category + confidence score.
 */

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5000";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await request.json();
    if (!title) {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }

    const res = await fetch(`${ML_URL}/api/ml/predict-category`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("ML predict-category error:", error);
    // Fail gracefully — don't break the expense form
    return NextResponse.json({ success: false, error: "ML service unavailable" }, { status: 503 });
  }
}
