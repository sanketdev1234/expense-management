# ml-service/routers/chat.py
## Uses the NEW GA Interactions API
# Package: google-genai >= 2.3.0

from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Dict, Optional
from google import genai
import os
import json

router = APIRouter()


client = genai.Client()

class ChatRequest(BaseModel):
    message: str
    # Server-side state pointer: Frontend passes this back to resume thread history
    previous_interaction_id: Optional[str] = None
    user_context: Dict

@router.post("/chat")
async def financial_chat(req: ChatRequest):
    ctx = req.user_context

    # ── Build RAG Context ───────────────────────────────────────────────────
    monthly_history = ctx.get('monthly_totals', [])
    context_string = f"""USER'S COMPLETE FINANCIAL PROFILE:
Current month ({ctx.get('month', 'this month')}):
  Spent so far:     ₹{ctx.get('total_spent', 0):,.0f}
  Transactions:     {ctx.get('expense_count', 0)}
  Budget limit:     ₹{ctx.get('budget_limit', 'not set')}
  Budget used:      {ctx.get('budget_percent', 0) or 0}%

Historical monthly totals (last 6 months):
{chr(10).join([f"  - {m['month']}: ₹{m['total']:,.0f}" for m in monthly_history]) if monthly_history else "  No historical data yet"}

6-month average: ₹{ctx.get('monthly_avg', 0):,.0f}/month

This month by category:
{chr(10).join([f"  - {c['name']}: ₹{c['value']:,.0f}" for c in ctx.get('category_breakdown', [])]) or "  No category data"}

Recent 8 transactions:
{chr(10).join([f"  - {e['title']} ({e['category']}): ₹{e['amount']:,.0f} on {e['date']}" for e in ctx.get('recent_expenses', [])]) or "  No recent transactions"}

Spending pattern type: {ctx.get('pattern_type', 'Unknown')}
Weekend vs weekday spending: {ctx.get('weekend_ratio', 1.0):.1f}x higher on weekends"""

    # ── System Prompt (Interaction-Scoped) ──────────────────────────────────
    system_prompt = f"""You are FinBot — a friendly, smart personal financial advisor
built into the user's SpendWise AI expense tracking app.

You have access to the user's REAL spending data below. Always reference it.
Be specific with actual rupee amounts from the data.
Be conversational and concise (3-5 sentences per response).
Give actionable, encouraging advice. Never make up numbers.

{context_string}

Rules:
- Only answer finance-related questions
- Always cite actual figures from the data above
- If asked something unrelated: "I can only help with your finances!"
- Use ₹ symbol for all amounts"""

    # ── Async SSE Stream Generator ──────────────────────────────────────────
    # ── Async SSE Stream Generator ──────────────────────────────────────────
    async def generate():
        interaction_id = None
        try:
            # Build payload map for stateful tracking matching GA specifications
            params = {
                "model": "gemini-3.5-flash",
                "input": req.message,
                "system_instruction": system_prompt, # specified each turn as it is interaction-scoped
                "stream": True, # Triggers streaming event updates
                "generation_config": {
                    "max_output_tokens": 1024,
                    "temperature": 0.7,
                }
            }

            # If an interaction ID pointer exists, use server-side state tracking context
            if req.previous_interaction_id:
                params["previous_interaction_id"] = req.previous_interaction_id

            # FIX: Call the correct async endpoint mapping: client.aio.interactions.create
            stream = await client.aio.interactions.create(**params)

            # Asynchronously iterate through the interaction stream events
            async for event in stream:
                # 1. Capture the unique session ID pointer from the stream metadata
                if hasattr(event, 'id') and event.id:
                    interaction_id = event.id

                # 2. Extract textual token updates out of incremental step deltas
                if event.event_type == "step.delta":
                    if hasattr(event, 'delta') and event.delta.type == "text" and event.delta.text:
                        yield f"data: {json.dumps({'text': event.delta.text})}\n\n"

        except Exception as e:
            yield f"data: {json.dumps({'text': f'Sorry, I encountered an error: {str(e)}'})}\n\n"

        # Send target session interaction_id at the end so the frontend caches it
        if interaction_id:
            yield f"data: {json.dumps({'interaction_id': interaction_id})}\n\n"

        yield "data: [DONE]\n\n"
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        }
    )