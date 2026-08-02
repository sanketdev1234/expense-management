

"use client";

import { useState, useRef, useEffect } from "react";
import { Brain, Send, User, Trash2, RefreshCw } from "lucide-react";

const SUGGESTED = [
  "Why am I spending so much this month?",
  "Which category should I cut down?",
  "Am I on track with my budget?",
  "How does my spending compare to last month?",
  "What are my biggest expenses recently?",
];

export default function ChatPage() {
  const [messages,             setMessages]             = useState([]);
  const [input,                setInput]                = useState("");
  const [streaming,            setStreaming]            = useState(false);

  // ── Key fix: context fetched ONCE, stored in state ──────────────────────────
  const [userContext,          setUserContext]          = useState(null);
  const [contextLoading,       setContextLoading]       = useState(true);
  const [contextError,         setContextError]         = useState(false);

  // Server-side conversation memory — no history re-sent
  const [previousInteractionId, setPreviousInteractionId] = useState(null);

  const bottomRef = useRef(null);

  
  useEffect(() => {
    async function loadContext() {
      try {
        setContextLoading(true);
        const res  = await fetch("/api/ai/context");
        if (!res.ok) throw new Error("Failed");
        const data = await res.json();
        setUserContext(data);
      } catch {
        setContextError(true);
      } finally {
        setContextLoading(false);
      }
    }
    loadContext();
  }, []); 

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(text) {
    const userMessage = text || input.trim();
    if (!userMessage || streaming || !userContext) return;
    setInput("");

    const newMessages = [...messages, { role: "user", content: userMessage }];
    setMessages(newMessages);
    setStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    let capturedInteractionId = null;

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,

   
          user_context: userContext,


          previous_interaction_id: previousInteractionId,
        }),
      });

      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);

            // Append text token to last message
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role:    "assistant",
                  content: updated[updated.length - 1].content + parsed.text,
                };
                return updated;
              });
            }

            // Capture interaction ID — store for next message
            if (parsed.interaction_id) {
              capturedInteractionId = parsed.interaction_id;
            }
          } catch {}
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role:    "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again.",
        };
        return updated;
      });
    } finally {
      // Store interaction ID for next message
      if (capturedInteractionId) {
        setPreviousInteractionId(capturedInteractionId);
      }
      setStreaming(false);
    }
  }

  //  Refresh context manually (user can trigger) 
  async function refreshContext() {
    setContextLoading(true);
    try {
      const res  = await fetch("/api/ai/context");
      const data = await res.json();
      setUserContext(data);
    } catch {}
    setContextLoading(false);
  }

  //  Loading state while context fetches 
  if (contextLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-3">
        <div className="w-10 h-10 border-2 border-purple-400 border-t-transparent
                        rounded-full animate-spin" />
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Loading your financial data...
        </p>
      </div>
    );
  }

  if (contextError) {
    return (
      <div className="flex items-center justify-center h-[60vh] flex-col gap-3">
        <p className="text-sm" style={{ color: "#ef4444" }}>
          Failed to load financial data
        </p>
        <button onClick={refreshContext} className="btn-primary px-4 py-2 rounded-xl text-sm">
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] page-enter">

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
            <Brain size={18} color="white" />
          </div>
          <div>
            <h1 className="font-bold text-lg" style={{ color: "var(--text-primary)" }}>
              FinBot
            </h1>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Powered by Gemini · Knows your finances · {userContext?.expense_count} transactions loaded
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Refresh context button */}
          <button
            onClick={refreshContext}
            disabled={contextLoading}
            className="p-2 rounded-lg transition hover:opacity-70"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            title="Refresh financial data"
          >
            <RefreshCw size={14} className={contextLoading ? "animate-spin" : ""} />
          </button>
          {messages.length > 0 && (
            <button
              onClick={() => { setMessages([]); setPreviousInteractionId(null); }}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
              style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}
            >
              <Trash2 size={12} /> Clear
            </button>
          )}
        </div>
      </div>

      {/* Context summary bar */}
      {userContext && (
        <div className="flex gap-3 mb-3 text-xs flex-wrap">
          {[
            { label: "Spent", value: `₹${userContext.total_spent?.toLocaleString("en-IN")}` },
            { label: "Budget", value: userContext.budget_limit ? `₹${userContext.budget_limit?.toLocaleString("en-IN")}` : "Not set" },
            { label: "Avg/month", value: `₹${userContext.monthly_avg?.toLocaleString("en-IN")}` },
            { label: "Data", value: `${userContext.monthly_totals?.length || 0} months` },
          ].map((item) => (
            <div key={item.label} className="px-3 py-1.5 rounded-full"
              style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
              <span style={{ color: "var(--text-muted)" }}>{item.label}: </span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-6">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
                <Brain size={32} color="white" />
              </div>
              <h2 className="font-bold text-xl mb-2" style={{ color: "var(--text-primary)" }}>
                Ask me about your finances
              </h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                I know your actual spending — not generic advice
              </p>
            </div>
            <div className="w-full max-w-lg space-y-2">
              {SUGGESTED.map((q) => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="w-full text-left px-4 py-3 rounded-xl text-sm transition hover:opacity-80"
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border)",
                    color: "var(--text-muted)"
                  }}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
                <Brain size={14} color="white" />
              </div>
            )}
            <div className="max-w-[80%] px-4 py-3 text-sm leading-relaxed"
              style={{
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                  : "var(--bg-card)",
                color:  msg.role === "user" ? "white" : "var(--text-primary)",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                borderRadius: msg.role === "user"
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
              }}>
              {msg.content || (
                <div className="flex gap-1 py-1">
                  {[0, 1, 2].map((j) => (
                    <div key={j} className="w-2 h-2 rounded-full animate-bounce"
                      style={{ background: "#64748b", animationDelay: `${j * 0.15}s` }} />
                  ))}
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: "var(--bg-input)" }}>
                <User size={14} style={{ color: "var(--text-muted)" }} />
              </div>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="mt-4">
        <div className="flex gap-3 items-end p-3 rounded-2xl"
          style={{ background: "var(--bg-card)", border: "1px solid var(--border)" }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder={userContext ? "Ask about your spending..." : "Loading data..."}
            disabled={!userContext || streaming}
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm"
            style={{ color: "var(--text-primary)", maxHeight: "120px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming || !userContext}
            className="p-2.5 rounded-xl transition flex-shrink-0"
            style={{
              background: input.trim() && !streaming && userContext
                ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                : "var(--bg-input)",
            }}>
            <Send size={16}
              color={input.trim() && !streaming && userContext ? "white" : "#64748b"} />
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
          Gemini 3.5 Flash · Data loaded once · Updated with refresh button
        </p>
      </div>
    </div>
  );
}