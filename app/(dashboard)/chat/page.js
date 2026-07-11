"use client";

import { useState, useRef, useEffect } from "react";
import { Brain, Send, User, Trash2 } from "lucide-react";

const SUGGESTED = [
  "Why am I spending so much this month?",
  "Which category should I reduce?",
  "Am I on track with my budget?",
  "How does my spending compare to last month?",
  "What are my biggest expenses recently?",
];

export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  // Track the server-side session id for modern Interaction API tracking
  const [currentInteractionId, setCurrentInteractionId] = useState(null);
  const bottomRef = useRef(null);

  // Auto-scroll to bottom
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Clean application workspace state values completely
  const handleClearChat = () => {
    setMessages([]);
    setCurrentInteractionId(null);
  };

  async function sendMessage(text) {
    const userMessage = text || input.trim();
    if (!userMessage || streaming) return;
    setInput("");

    // Add user message to UI state layout
    const newMessages = [
      ...messages,
      { role: "user", content: userMessage }
    ];
    setMessages(newMessages);
    setStreaming(true);

    // Add empty assistant message — will be filled by stream
    setMessages((prev) => [
      ...prev,
      { role: "assistant", content: "" }
    ]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userMessage,
          // Pass the tracking token ID to tie current query into conversational cache context
          previous_interaction_id: currentInteractionId, 
        }),
      });

      if (!res.ok) throw new Error("Network response error");

      // Read stream
      const reader  = res.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text  = decoder.decode(value);
        const lines = text.split("\n");

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trim();
            if (data === "[DONE]") break;

            try {
              const parsed = JSON.parse(data);
              
              // 1. Check if this is the text generation chunk update
              if (parsed.text) {
                setMessages((prev) => {
                  const updated = [...prev];
                  const lastIndex = updated.length - 1;
                  updated[lastIndex] = {
                    role: "assistant",
                    content: updated[lastIndex].content + parsed.text,
                  };
                  return updated;
                });
              }
              
              // 2. Catch the session interaction ID metadata packet sent right before conclusion
              if (parsed.interaction_id) {
                setCurrentInteractionId(parsed.interaction_id);
              }
            } catch {}
          }
        }
      }
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "Sorry, I'm having trouble connecting. Please try again.",
        };
        return updated;
      });
    } finally {
      setStreaming(false);
    }
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
              Powered by Gemini 3.5 Flash · Knows your finances
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={handleClearChat}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg"
            style={{ color: "var(--text-muted)", border: "1px solid var(--border)" }}>
            <Trash2 size={12} /> Clear
          </button>
        )}
      </div>

      {/* Messages View Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1">

        {/* Welcome state */}
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

            {/* Suggested questions */}
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

        {/* Message bubbles */}
        {messages.map((msg, i) => (
          <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>

            {/* Bot avatar */}
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-1"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #3b82f6)" }}>
                <Brain size={14} color="white" />
              </div>
            )}

            {/* Message bubble */}
            <div className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed`}
              style={{
                background: msg.role === "user"
                  ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                  : "var(--bg-card)",
                color: msg.role === "user" ? "white" : "var(--text-primary)",
                border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
                borderRadius: msg.role === "user"
                  ? "18px 18px 4px 18px"
                  : "18px 18px 18px 4px",
              }}>
              {msg.content || (
                // Typing indicator
                <div className="flex gap-1 py-1">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                      style={{
                        background: "#64748b",
                        animationDelay: `${i * 0.15}s`
                      }} />
                  ))}
                </div>
              )}
            </div>

            {/* User avatar */}
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

      {/* Input Form Box */}
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
            placeholder="Ask about your spending..."
            rows={1}
            className="flex-1 bg-transparent outline-none resize-none text-sm"
            style={{ color: "var(--text-primary)", maxHeight: "120px" }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || streaming}
            className="p-2.5 rounded-xl transition flex-shrink-0"
            style={{
              background: input.trim() && !streaming
                ? "linear-gradient(135deg, #3b82f6, #8b5cf6)"
                : "var(--bg-input)",
            }}>
            <Send size={16}
              color={input.trim() && !streaming ? "white" : "#64748b"} />
          </button>
        </div>
        <p className="text-xs text-center mt-2" style={{ color: "var(--text-muted)" }}>
          Gemini 3.5 Flash · Your data stays private
        </p>
      </div>
    </div>
  );
}