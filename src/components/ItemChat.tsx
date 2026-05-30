import { useEffect, useRef, useState } from "react";
import { Send, MessagesSquare, WifiOff, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { enqueue, flushQueue, getQueued, initAutoFlush, type QueuedMessage } from "@/lib/offline-queue";

type Msg = {
  id: string;
  body: string;
  from_admin: boolean;
  created_at: string;
  user_id: string;
  pending?: boolean;
};

/**
 * Item-scoped chat. Renders inside item details so a student and an admin
 * can discuss this specific item. Messages are filtered by item_id so each
 * conversation stays anchored to the item that triggered it.
 */
export function ItemChat({
  itemId,
  itemTitle,
  currentUserId,
  isAdmin,
  reporterId,
}: {
  itemId: string;
  itemTitle: string;
  currentUserId: string;
  isAdmin: boolean;
  reporterId: string;
}) {
  // For students, the thread "owner" is themselves. For admins viewing an
  // item, the thread owner is the item's reporter (the student side).
  const threadUserId = isAdmin ? reporterId : currentUserId;

  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const off = initAutoFlush();
    const on = () => setOnline(true);
    const offl = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", offl);
    return () => { off(); window.removeEventListener("online", on); window.removeEventListener("offline", offl); };
  }, []);

  useEffect(() => {
    let cancel = false;
    void (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("messages")
        .select("id, body, from_admin, created_at, user_id")
        .eq("item_id", itemId)
        .eq("user_id", threadUserId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (cancel) return;
      const queued: Msg[] = isAdmin ? [] : getQueued(currentUserId)
        .filter((q) => q.item_id === itemId)
        .map((q) => ({ id: q.id, body: q.body, from_admin: false, created_at: q.created_at, user_id: q.user_id, pending: true }));
      setMsgs([...(data ?? []), ...queued]);
      setLoading(false);
      setTimeout(() => listRef.current?.scrollTo({ top: 9e6 }), 30);
    })();
    return () => { cancel = true; };
  }, [itemId, threadUserId, isAdmin, currentUserId]);

  useEffect(() => {
    const ch = supabase
      .channel(`item-chat-${itemId}-${threadUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${threadUserId}` },
        (payload) => {
          const m = payload.new as Msg & { item_id?: string };
          if (m.item_id !== itemId) return;
          setMsgs((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          setTimeout(() => listRef.current?.scrollTo({ top: 9e6 }), 30);
        }
      )
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [itemId, threadUserId]);

  useEffect(() => {
    if (online) void flushQueue().then(() => setMsgs((p) => p.filter((m) => !m.pending)));
  }, [online]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    const optimistic: Msg = {
      id: crypto.randomUUID(),
      body,
      from_admin: isAdmin,
      created_at: new Date().toISOString(),
      user_id: threadUserId,
      pending: !online && !isAdmin,
    };
    setMsgs((p) => [...p, optimistic]);
    setTimeout(() => listRef.current?.scrollTo({ top: 9e6 }), 30);

    if (!online && !isAdmin) {
      const q: QueuedMessage = {
        id: optimistic.id, user_id: threadUserId, sender_id: currentUserId,
        body, item_id: itemId, created_at: optimistic.created_at,
      };
      enqueue(q);
      return;
    }
    const { error } = await supabase.from("messages").insert({
      user_id: threadUserId,
      sender_id: currentUserId,
      body,
      item_id: itemId,
      from_admin: isAdmin,
    });
    if (error) {
      if (!isAdmin) {
        enqueue({
          id: optimistic.id, user_id: threadUserId, sender_id: currentUserId,
          body, item_id: itemId, created_at: optimistic.created_at,
        });
        setMsgs((p) => p.map((m) => m.id === optimistic.id ? { ...m, pending: true } : m));
      }
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-primary px-3.5 py-2.5 text-primary-foreground">
        <div className="flex items-center gap-2 min-w-0">
          <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/15">
            {isAdmin ? <MessagesSquare size={15} /> : <ShieldCheck size={15} />}
          </div>
          <div className="leading-tight min-w-0">
            <p className="text-sm font-semibold truncate">
              {isAdmin ? "Conversation with reporter" : "Chat with an admin"}
            </p>
            <p className="text-[10px] text-primary-foreground/80 truncate">
              About: {itemTitle}
            </p>
          </div>
        </div>
        <span className="shrink-0 text-[10px] text-primary-foreground/80 flex items-center gap-1">
          {online ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online</> : <><WifiOff size={10} /> Offline</>}
        </span>
      </header>

      <div ref={listRef} className="max-h-80 min-h-[12rem] space-y-2 overflow-y-auto bg-muted/30 px-3 py-3">
        {loading ? (
          <p className="py-6 text-center text-xs text-muted-foreground">Loading conversation…</p>
        ) : msgs.length === 0 ? (
          <p className="mx-auto mt-6 max-w-[260px] text-center text-xs text-muted-foreground">
            {isAdmin
              ? "No messages yet from the reporter about this item."
              : "Have a question about this item? Send an admin a message — they'll see it's about this exact item."}
          </p>
        ) : msgs.map((m) => {
          const mine = m.from_admin === isAdmin;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                mine ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm border border-border bg-white text-foreground"
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {!mine && (m.from_admin ? "Admin · " : "Reporter · ")}
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  {m.pending && " · queued"}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-background px-2.5 py-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={online ? "Type a message about this item…" : "Offline — message will send later"}
          className="flex-1 rounded-full border border-input bg-background px-3.5 py-2 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="grid h-9 w-9 place-items-center rounded-full bg-primary text-primary-foreground shadow-sm disabled:opacity-50"
          aria-label="Send message"
        >
          <Send size={15} />
        </button>
      </form>
    </section>
  );
}