"use client";
import { useRef, useEffect, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Square, RotateCcw } from "lucide-react";
import { useChat, ChatMessage } from "@/hooks/useChat";
import { clsx } from "clsx";

const QUICK_QUESTIONS = [
  "Quelles sont les obligations principales ?",
  "Résume les clauses de rupture",
  "Quelles dates importantes ?",
  "Y a-t-il des risques juridiques ?",
  "Montants et pénalités",
];

interface Props {
  docId: string;
}

export function ChatPanel({ docId }: Props) {
  const { messages, sendMessage, isStreaming, stopStreaming, clearMessages } = useChat(docId);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    sendMessage(input);
    setInput("");
  };

  const handleKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={clsx("flex gap-3 max-w-full", msg.role === "user" && "flex-row-reverse")}
            >
              <div className={clsx(
                "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center text-xs font-semibold",
                msg.role === "user" ? "bg-accent/30 text-accent-3" : "bg-docmind-teal/15 text-docmind-teal"
              )}>
                {msg.role === "user" ? "V" : "✦"}
              </div>
              <div className="max-w-[calc(100%-48px)]">
                <div className={clsx(
                  "px-3.5 py-2.5 text-sm leading-relaxed",
                  msg.role === "user"
                    ? "bg-accent/15 border border-accent/25 text-white rounded-xl rounded-tr-sm"
                    : "bg-bg-3 border border-border text-white/70 rounded-xl rounded-tl-sm"
                )}>
                  {msg.streaming ? (
                    <StreamingText content={msg.content} />
                  ) : (
                    <FormattedContent content={msg.content} />
                  )}
                </div>
                <div className="text-[11px] text-white/25 mt-1 font-mono px-1">
                  {msg.createdAt.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {isStreaming && messages[messages.length - 1]?.content === "" && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-lg bg-docmind-teal/15 flex items-center justify-center text-docmind-teal text-xs">✦</div>
            <div className="bg-bg-3 border border-border rounded-xl rounded-tl-sm px-3.5 py-3 flex gap-1.5 items-center">
              {[0, 1, 2].map((i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/30 animate-pulse-dot" style={{ animationDelay: `${i * 0.2}s` }} />
              ))}
              <span className="text-xs text-white/30 ml-1">Analyse en cours...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t border-border bg-bg-2 p-4">
        <div className="text-[11px] text-white/30 mb-2 font-medium tracking-wide uppercase">Questions rapides</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {QUICK_QUESTIONS.map((q) => (
            <button
              key={q}
              onClick={() => { sendMessage(q); }}
              disabled={isStreaming}
              className="px-3 py-1.5 bg-bg-3 border border-border rounded-full text-xs text-white/50 hover:bg-accent/10 hover:border-accent/40 hover:text-accent-3 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {q}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Posez une question sur ce document..."
            rows={1}
            disabled={isStreaming}
            className="flex-1 bg-bg-3 border border-border-2 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/25 outline-none focus:border-accent/50 resize-none transition-colors disabled:opacity-50"
          />
          <button
            onClick={isStreaming ? stopStreaming : handleSend}
            disabled={!isStreaming && !input.trim()}
            className={clsx(
              "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-all",
              isStreaming
                ? "bg-red-500/80 hover:bg-red-500"
                : "bg-accent hover:bg-accent-2 disabled:opacity-40 disabled:cursor-not-allowed"
            )}
          >
            {isStreaming ? <Square className="w-4 h-4 text-white" /> : <Send className="w-4 h-4 text-white" />}
          </button>
          <button
            onClick={clearMessages}
            className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-bg-3 transition-colors"
            title="Nouvelle conversation"
          >
            <RotateCcw className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StreamingText({ content }: { content: string }) {
  return (
    <span>
      <FormattedContent content={content} />
      <span className="inline-block w-0.5 h-3.5 bg-accent ml-0.5 animate-pulse" />
    </span>
  );
}

function FormattedContent({ content }: { content: string }) {
  // Convertit le markdown simple en JSX
  const lines = content.split("\n");
  return (
    <>
      {lines.map((line, i) => {
        const boldLine = line.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
        return (
          <span key={i}>
            <span dangerouslySetInnerHTML={{ __html: boldLine }} />
            {i < lines.length - 1 && <br />}
          </span>
        );
      })}
    </>
  );
}
