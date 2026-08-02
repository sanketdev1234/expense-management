
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { detectAnomaly } from "@/lib/ml"; 
export async function POST(request) {
  try {
  
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

   
    const { expense, history } = await request.json();

    if (!expense || !history) {
   
      return NextResponse.json({
        is_anomaly: false,
        severity:   "none",
        reason:     "Missing expense or history data",
      });
    }

  
    const result = await detectAnomaly(expense, history);


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