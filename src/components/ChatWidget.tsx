import { useEffect, useRef, useState } from "react";
import { MessageCircle, Send, X, WifiOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, flushQueue, getQueued, initAutoFlush, type QueuedMessage } from "@/lib/offline-queue";

type Msg = {
  id: string;
  body: string;
  from_admin: boolean;
  created_at: string;
  pending?: boolean;
};

export function ChatWidget({ userId, isAdmin }: { userId: string; isAdmin: boolean }) {
  const [open, setOpen] = useState(false);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  // online/offline + queue flush
  useEffect(() => {
    const off = initAutoFlush();
    const on = () => setOnline(true);
    const offline = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", offline);
    return () => {
      off();
      window.removeEventListener("online", on);
      window.removeEventListener("offline", offline);
    };
  }, []);

  // Don't show widget for admins (admins use /messages page)
  if (isAdmin) return null;

  // load history when opened
  useEffect(() => {
    if (!open) return;
    void (async () => {
      const { data } = await supabase
        .from("messages")
        .select("id, body, from_admin, created_at")
        .eq("user_id", userId)
        .order("created_at", { ascending: true })
        .limit(100);
      const queued: Msg[] = getQueued(userId).map((q) => ({
        id: q.id, body: q.body, from_admin: false, created_at: q.created_at, pending: true,
      }));
      setMessages([...(data ?? []), ...queued]);
      setTimeout(() => listRef.current?.scrollTo({ top: 9e6 }), 50);
    })();
  }, [open, userId]);

  // realtime subscription
  useEffect(() => {
    if (!open) return;
    const ch = supabase
      .channel(`messages-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${userId}` },
        (payload) => {
          const m = payload.new as Msg;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          setTimeout(() => listRef.current?.scrollTo({ top: 9e6 }), 30);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [open, userId]);

  // re-flush queued whenever back online
  useEffect(() => {
    if (online) {
      void flushQueue().then(() => {
        setMessages((prev) => prev.filter((m) => !m.pending));
      });
    }
  }, [online]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const optimistic: Msg = {
      id: crypto.randomUUID(), body, from_admin: false,
      created_at: new Date().toISOString(), pending: !online,
    };
    setMessages((p) => [...p, optimistic]);
    setTimeout(() => listRef.current?.scrollTo({ top: 9e6 }), 30);

    if (!online) {
      const q: QueuedMessage = {
        id: optimistic.id, user_id: userId, sender_id: userId,
        body, item_id: null, created_at: optimistic.created_at,
      };
      enqueue(q);
      return;
    }
    const { error } = await supabase.from("messages").insert({
      user_id: userId, sender_id: userId, body, from_admin: false,
    });
    if (error) {
      // queue if it failed
      const q: QueuedMessage = {
        id: optimistic.id, user_id: userId, sender_id: userId,
        body, item_id: null, created_at: optimistic.created_at,
      };
      enqueue(q);
      setMessages((p) => p.map((m) => m.id === optimistic.id ? { ...m, pending: true } : m));
    }
  }

  return (
    <>
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-24 right-4 z-50 grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg ring-4 ring-primary/15 hover:bg-primary/90 active:scale-95 transition-all"
          aria-label="Message admin"
        >
          <MessageCircle size={22} />
        </button>
      )}

      {open && (
        <div className="fixed inset-x-2 bottom-20 z-50 mx-auto flex h-[70vh] max-h-[560px] max-w-md flex-col overflow-hidden rounded-xl border border-border bg-card shadow-2xl">
          <header className="flex items-center justify-between gap-2 border-b border-border bg-primary px-3 py-2.5 text-primary-foreground">
            <div className="flex items-center gap-2">
              <div className="grid h-8 w-8 place-items-center rounded-full bg-white/15">
                <ShieldCheck size={16} />
              </div>
              <div className="leading-tight">
                <p className="text-sm font-semibold">SDU Find Admin</p>
                <p className="text-[10px] text-primary-foreground/80 flex items-center gap-1">
                  {online ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online</> : <><WifiOff size={10} /> Offline — messages will send later</>}
                </p>
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Close">
              <X size={18} />
            </button>
          </header>

          <div ref={listRef} className="flex-1 space-y-2 overflow-y-auto bg-muted/30 px-3 py-3">
            {messages.length === 0 ? (
              <p className="mx-auto mt-10 max-w-[260px] text-center text-xs text-muted-foreground">
                Start a conversation with an admin. Use this for claim questions or item disputes.
              </p>
            ) : messages.map((m) => (
              <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                  m.from_admin
                    ? "rounded-bl-sm bg-white text-foreground border border-border"
                    : "rounded-br-sm bg-primary text-primary-foreground"
                }`}>
                  <p className="whitespace-pre-wrap break-words">{m.body}</p>
                  <p className={`mt-0.5 text-[10px] ${m.from_admin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                    {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    {m.pending && " · queued"}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-background px-2 py-2">
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={online ? "Type a message…" : "Offline — will send when online"}
              className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <button
              type="submit"
              disabled={!text.trim()}
              className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
}