"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient, AUTH_ENABLED } from "@/lib/supabase";
import { cn } from "@/lib/utils";

export function SupportWidget() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [hasSession, setHasSession] = useState(false);
  const [log, setLog] = useState<Array<{ role: "user" | "system"; text: string; ts: number }>>([]);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadUser() {
      if (!AUTH_ENABLED) return;
      try {
        const supabase = getSupabaseBrowserClient();
        const { data } = await supabase.auth.getUser();
        setEmail((data?.user?.email as string) || null);
      } catch {}
    }
    loadUser();
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [log, open]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    const ts = Date.now();
    setLog((l) => [...l, { role: "user", text, ts }]);
    setSending(true);
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, email: email ?? undefined, newSession: hasSession ? undefined : true }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j?.error || "Failed to send");
      const note = j?.note as string | undefined;
      if (note) setLog((l) => [...l, { role: "system", text: note, ts: Date.now() }]);
      if (text === "!clear") {
        setLog((l) => [...l, { role: "system", text: "This thread was closed.", ts: Date.now() }]);
        setHasSession(false);
      } else {
        setHasSession(true);
      }
    } catch (e: any) {
      setLog((l) => [...l, { role: "system", text: e?.message || "Failed to send", ts: Date.now() }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <button
        aria-label="Support"
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-5 right-5 z-[60] rounded-full bg-accent text-accent-foreground shadow-lg hover:bg-accent/90 px-4 h-11 font-semibold"
      >
        {open ? "Close" : "Support"}
      </button>
      <div
        className={cn(
          "fixed z-[59] bottom-20 right-5 w-[340px] sm:w-[420px] rounded-xl border bg-background shadow-xl overflow-hidden",
          open ? "block" : "hidden"
        )}
      >
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="font-semibold">Contact Support</div>
          <div className="text-xs text-muted-foreground">{email ?? "Anonymous user"}</div>
        </div>
        <div ref={listRef} className="h-72 overflow-auto p-3 space-y-2">
          {log.map((m) => (
            <div key={m.ts} className={m.role === "user" ? "text-right" : "text-left"}>
              <div
                className={cn(
                  "inline-block rounded-lg px-3 py-2 text-sm",
                  m.role === "user" ? "bg-accent text-accent-foreground" : "bg-muted"
                )}
              >
                {m.text}
              </div>
            </div>
          ))}
          {!log.length && (
            <div className="text-sm text-muted-foreground">
              Send us a message here. Type <code>!clear</code> to close the thread.
            </div>
          )}
        </div>
        <div className="p-3 border-t flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") send();
            }}
            placeholder="Type your message..."
            className="flex-1 h-10 rounded-md border bg-background px-3 text-sm"
          />
          <button
            onClick={send}
            disabled={sending || !input.trim()}
            className="h-10 px-3 rounded-md bg-foreground text-background disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </>
  );
}
