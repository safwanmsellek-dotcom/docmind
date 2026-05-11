"use client";
import { useState, useCallback, useRef } from "react";
import { chatApi } from "@/lib/api";
import { useDocMindStore } from "@/lib/store";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: Date;
  streaming?: boolean;
}

export function useChat(docId: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Bonjour ! J'ai analysé ce document en détail. Posez-moi vos questions — obligations, dates, montants, risques, clauses spécifiques...",
      createdAt: new Date(),
    },
  ]);
  const [isStreaming, setIsStreaming] = useState(false);
  const { chatSessionIds, setChatSession } = useDocMindStore();
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || isStreaming) return;

      const userMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: text,
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const assistantId = crypto.randomUUID();
      setMessages((prev) => [
        ...prev,
        { id: assistantId, role: "assistant", content: "", createdAt: new Date(), streaming: true },
      ]);
      setIsStreaming(true);

      try {
        // SSE streaming
        abortRef.current = new AbortController();
        const response = await fetch(chatApi.streamUrl(docId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            session_id: chatSessionIds[docId] || null,
          }),
          signal: abortRef.current.signal,
        });

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let fullContent = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            try {
              const data = JSON.parse(line.slice(6));

              if (data.session_id && !chatSessionIds[docId]) {
                setChatSession(docId, data.session_id);
              }

              if (data.token) {
                const token = data.token.replace(/\\n/g, "\n").replace(/\\"/g, '"');
                fullContent += token;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: fullContent } : m
                  )
                );
              }

              if (data.done) {
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, streaming: false } : m
                  )
                );
              }
            } catch {
              // Ignore malformed SSE
            }
          }
        }
      } catch (err: any) {
        if (err.name !== "AbortError") {
          // Fallback non-streamé
          try {
            const res = await chatApi.sendMessage(
              docId,
              text,
              chatSessionIds[docId]
            );
            if (!chatSessionIds[docId]) setChatSession(docId, res.session_id);
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: res.message, streaming: false }
                  : m
              )
            );
          } catch {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantId
                  ? { ...m, content: "Erreur de connexion. Réessayez.", streaming: false }
                  : m
              )
            );
          }
        }
      } finally {
        setIsStreaming(false);
      }
    },
    [docId, isStreaming, chatSessionIds, setChatSession]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setMessages((prev) =>
      prev.map((m) => (m.streaming ? { ...m, streaming: false } : m))
    );
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Session réinitialisée. Comment puis-je vous aider avec ce document ?",
        createdAt: new Date(),
      },
    ]);
  }, []);

  return { messages, sendMessage, isStreaming, stopStreaming, clearMessages };
}
