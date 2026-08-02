
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";

export async function POST(request) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { message, user_context, previous_interaction_id } = await request.json();

  const mlResponse = await fetch(
    `${process.env.ML_SERVICE_URL}/api/ml/chat`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message,
        user_context,
        previous_interaction_id: previous_interaction_id || null,
      }),
    }
  );

  return new Response(mlResponse.body, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection":    "keep-alive",
    },
  });
}