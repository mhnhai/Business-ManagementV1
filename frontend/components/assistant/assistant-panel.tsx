"use client";

import { Bot, Loader2, Send, Sparkles } from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { assistantApi, type AssistantChatMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

const SUGGESTIONS = [
  "Doanh số 7 ngày gần đây thế nào?",
  "Công nợ khách hàng nào đang cao?",
  "Tồn kho các sản phẩm hiện tại?",
  "Cách duyệt khách hàng mới?",
];

type UiMessage = AssistantChatMessage & {
  citations?: { title?: string; snippet?: string }[];
};

export function AssistantPanel() {
  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [healthHint, setHealthHint] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      try {
        const h = await assistantApi.health();
        if (!h.configured) {
          setHealthHint(
            "Chưa cấu hình GEMINI_API_KEY trên server. Trợ lý AI sẽ không trả lời được.",
          );
        } else {
          setHealthHint(null);
        }
      } catch {
        setHealthHint("Không kiểm tra được trạng thái Trợ lý AI.");
      }
    })();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function syncKnowledge() {
    setSyncing(true);
    setError(null);
    try {
      const res = await assistantApi.syncKnowledge();
      setHealthHint(
        `Đã đồng bộ ${res.uploaded.length} tài liệu lên File Search (${res.storeName}).`,
      );
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Đồng bộ tài liệu thất bại",
      );
    } finally {
      setSyncing(false);
    }
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || loading) return;

    setError(null);
    const nextHistory: UiMessage[] = [
      ...messages,
      { role: "user", content },
    ];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);

    try {
      const payload: AssistantChatMessage[] = nextHistory.map(
        ({ role, content: c }) => ({ role, content: c }),
      );
      const res = await assistantApi.chat(payload);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          citations: res.citations,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không gửi được tin nhắn");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void send(input);
  }

  return (
    <div className="mx-auto flex h-[min(720px,calc(100vh-10rem))] w-full max-w-3xl flex-col border border-border bg-card">
      <div className="flex items-start gap-3 border-b border-border px-4 py-3">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2 text-primary">
          <Bot className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold tracking-tight">Trợ lý AI</h3>
          <p className="text-sm text-muted-foreground">
            Hỏi về doanh số, khách hàng, tồn kho, đơn hàng hoặc hướng dẫn sử
            dụng. Không hỗ trợ lương hay tài khoản ngân hàng.
          </p>
          {healthHint ? (
            <p className="mt-1 text-xs text-amber-700">{healthHint}</p>
          ) : null}
          <div className="mt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={syncing || loading}
              onClick={() => void syncKnowledge()}
            >
              {syncing ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : null}
              Đồng bộ tài liệu RAG
            </Button>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !loading ? (
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-center gap-2 font-medium text-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Gợi ý câu hỏi
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-left text-xs hover:bg-muted"
                  onClick={() => void send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, idx) => (
          <div
            key={`${m.role}-${idx}`}
            className={cn(
              "flex",
              m.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            <div
              className={cn(
                "max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 text-sm",
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground",
              )}
            >
              {m.content}
              {m.citations && m.citations.length > 0 ? (
                <ul className="mt-2 space-y-1 border-t border-border/40 pt-2 text-xs opacity-80">
                  {m.citations.map((c, i) => (
                    <li key={i}>
                      Nguồn: {c.title || "tài liệu"}
                      {c.snippet ? ` — ${c.snippet}` : ""}
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        ))}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Đang suy nghĩ…
          </div>
        ) : null}
        <div ref={bottomRef} />
      </div>

      {error ? (
        <p className="border-t border-border px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="flex gap-2 border-t border-border p-3"
      >
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Nhập câu hỏi…"
          disabled={loading}
          className="flex-1"
        />
        <Button type="submit" disabled={loading || !input.trim()}>
          <Send className="h-4 w-4" />
          Gửi
        </Button>
      </form>
    </div>
  );
}
