
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { connectDB } from "@/lib/mongodb";
import Expense from "@/models/Expense";
import { subMonths } from "date-fns";
import { recommendBudget } from "@/lib/ml"; // ← lib/ml.js handles HTTP + errors
import { getCurrentMonth } from "@/lib/utils";

export async function GET(request) {
  try {
    
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectDB();
    const userId = session.user.id;

    const twelveMonthsAgo  = subMonths(new Date(), 12);
    const expenses = await Expense.find({
      userId,
      date: { $gte: twelveMonthsAgo },
    }).lean();



    
    if (expenses.length < 3) {
      return NextResponse.json({
        monthly_limit:    0,
        category_limits:  {},
        insights:         ["Add at least 3 expenses to get budget recommendations."],
        months_analyzed:  0,
      });
    }

    const monthlyMap = {};
    expenses.forEach((e) => {
      const month = new Date(e.date).toISOString().slice(0, 7); 
      const key   = `${month}__${e.category}`;                  

      if (!monthlyMap[key]) {
        monthlyMap[key] = { month, category: e.category, total: 0 };
      }
      monthlyMap[key].total += e.amount;
    });

    
    const expensesForML = Object.values(monthlyMap);
  

    const currentMonth=getCurrentMonth();
    const filterexpenses=expensesForML.filter((e)=>{
      return e.month!==currentMonth
    })
   
    const result = await recommendBudget(filterexpenses, 10);

    
    if (!result) {
      return NextResponse.json({
        monthly_limit:   0,
        category_limits: {},
        insights:        ["AI recommendations temporarily unavailable."],
        months_analyzed: 0,
      });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("recommend-budget route error:", error);
    return NextResponse.json(
      { error: "Failed to get recommendations" },
      { status: 500 }
    );
  }
}