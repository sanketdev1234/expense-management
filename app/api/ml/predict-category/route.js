// app/api/ml/predict-category/route.js
//
// Next.js route that forwards to Python ML service
// Called from the expense form when user types a title

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { predictCategory } from "@/lib/ml";

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title } = await request.json();

    if (!title || title.trim().length < 2) {
      return NextResponse.json({ error: "Title too short" }, { status: 400 });
    }

    const result = await predictCategory(title);

    if (!result) {
      // ML service down — return graceful fallback
      return NextResponse.json({
        category: null,
        confidence: 0,
        fallback: true,
        message: "ML service unavailable"
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("predict-category route error:", error);
    return NextResponse.json({ error: "Failed to predict category" }, { status: 500 });
  }
}
