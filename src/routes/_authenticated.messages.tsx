import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, ShieldCheck, WifiOff, Inbox, ArrowLeft, User as UserIcon } from "lucide-react";
import { enqueue, flushQueue, getQueued, initAutoFlush, type QueuedMessage } from "@/lib/offline-queue";

export const Route = createFileRoute("/_authenticated/messages")({
  component: MessagesPage,
});

type Msg = {
  id: string;
  user_id: string;
  body: string;
  from_admin: boolean;
  created_at: string;
  pending?: boolean;
};

function MessagesPage() {
  const [me, setMe] = useState<{ id: string; isAdmin: boolean } | null>(null);
  const [online, setOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: r } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setMe({ id: u.user.id, isAdmin: !!r });
    })();
  }, []);

  useEffect(() => {
    const off = initAutoFlush();
    const onOn = () => setOnline(true);
    const onOff = () => setOnline(false);
    window.addEventListener("online", onOn);
    window.addEventListener("offline", onOff);
    return () => { off(); window.removeEventListener("online", onOn); window.removeEventListener("offline", onOff); };
  }, []);

  if (!me) return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;

  return me.isAdmin
    ? <AdminInbox myId={me.id} online={online} />
    : <UserThread userId={me.id} online={online} />;
}

function StatusPill({ online }: { online: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-medium text-primary-foreground">
      {online ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online</> : <><WifiOff size={10} /> Offline</>}
    </span>
  );
}

function UserThread({ userId, online }: { userId: string; online: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("messages").select("id,user_id,body,from_admin,created_at")
        .eq("user_id", userId).order("created_at", { ascending: true }).limit(200);
      const queued: Msg[] = getQueued(userId).map((q) => ({
        id: q.id, user_id: q.user_id, body: q.body, from_admin: false, created_at: q.created_at, pending: true,
      }));
      setMsgs([...(data ?? []), ...queued]);
      setTimeout(() => ref.current?.scrollTo({ top: 9e6 }), 30);
    })();
    const ch = supabase.channel(`u-msgs-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `user_id=eq.${userId}` },
        (p) => setMsgs((prev) => prev.some((x) => x.id === (p.new as Msg).id) ? prev : [...prev, p.new as Msg]))
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
  }, [userId]);

  useEffect(() => {
    if (online) void flushQueue().then(() => setMsgs((p) => p.filter((m) => !m.pending)));
  }, [online]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body) return;
    setText("");
    const m: Msg = { id: crypto.randomUUID(), user_id: userId, body, from_admin: false, created_at: new Date().toISOString(), pending: !online };
    setMsgs((p) => [...p, m]);
    setTimeout(() => ref.current?.scrollTo({ top: 9e6 }), 30);
    if (!online) {
      const q: QueuedMessage = { id: m.id, user_id: userId, sender_id: userId, body, item_id: null, created_at: m.created_at };
      enqueue(q); return;
    }
    const { error } = await supabase.from("messages").insert({ user_id: userId, sender_id: userId, body, from_admin: false });
    if (error) {
      enqueue({ id: m.id, user_id: userId, sender_id: userId, body, item_id: null, created_at: m.created_at });
      setMsgs((p) => p.map((x) => x.id === m.id ? { ...x, pending: true } : x));
    }
  }

  return (
    <div className="-mx-4 -mt-4 flex h-[calc(100vh-9rem)] flex-col">
      <header className="flex items-center justify-between gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><ShieldCheck size={18} /></div>
          <div>
            <p className="text-sm font-semibold">SDU Lost & Found Admin</p>
            <StatusPill online={online} />
          </div>
        </div>
      </header>
      <div ref={ref} className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-3">
        {!msgs.length ? (
          <p className="mx-auto mt-12 max-w-[280px] text-center text-xs text-muted-foreground">
            Reach out to an admin if you have questions about a claim or want to discuss an item.
          </p>
        ) : msgs.map((m) => (
          <div key={m.id} className={`flex ${m.from_admin ? "justify-start" : "justify-end"}`}>
            <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
              m.from_admin ? "rounded-bl-sm bg-white text-foreground border border-border" : "rounded-br-sm bg-primary text-primary-foreground"
            }`}>
              <p className="whitespace-pre-wrap break-words">{m.body}</p>
              <p className={`mt-0.5 text-[10px] ${m.from_admin ? "text-muted-foreground" : "text-primary-foreground/70"}`}>
                {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}{m.pending && " · queued"}
              </p>
            </div>
          </div>
        ))}
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-background p-2">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder={online ? "Type a message…" : "Offline — will send later"}
          className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        <button type="submit" disabled={!text.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}

function AdminInbox({ myId, online }: { myId: string; online: boolean }) {
  const [threads, setThreads] = useState<{ user_id: string; full_name: string | null; last: string; created_at: string }[]>([]);
  const [active, setActive] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  async function loadThreads() {
    const { data } = await supabase
      .from("messages").select("user_id,body,created_at").order("created_at", { ascending: false }).limit(300);
    if (!data) return;
    const map = new Map<string, { user_id: string; last: string; created_at: string }>();
    for (const m of data) {
      if (!map.has(m.user_id)) map.set(m.user_id, { user_id: m.user_id, last: m.body, created_at: m.created_at });
    }
    const userIds = Array.from(map.keys());
    if (!userIds.length) { setThreads([]); return; }
    const { data: profs } = await supabase.from("profiles").select("id,full_name").in("id", userIds);
    const names = new Map((profs ?? []).map((p) => [p.id, p.full_name]));
    setThreads(userIds.map((uid) => ({ ...map.get(uid)!, full_name: names.get(uid) ?? "Student" })));
  }

  useEffect(() => { void loadThreads(); }, []);

  useEffect(() => {
    const ch = supabase.channel("admin-msgs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        void loadThreads();
        if (active) void loadActive(active);
      })
      .subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  async function loadActive(uid: string) {
    const { data } = await supabase.from("messages").select("id,user_id,body,from_admin,created_at")
      .eq("user_id", uid).order("created_at", { ascending: true }).limit(200);
    setMsgs(data ?? []);
    setTimeout(() => ref.current?.scrollTo({ top: 9e6 }), 30);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const body = text.trim(); if (!body || !active) return;
    setText("");
    const optimistic: Msg = { id: crypto.randomUUID(), user_id: active, body, from_admin: true, created_at: new Date().toISOString() };
    setMsgs((p) => [...p, optimistic]);
    const { error } = await supabase.from("messages").insert({ user_id: active, sender_id: myId, body, from_admin: true });
    if (error) setMsgs((p) => p.filter((m) => m.id !== optimistic.id));
  }

  if (active) {
    const t = threads.find((x) => x.user_id === active);
    return (
      <div className="-mx-4 -mt-4 flex h-[calc(100vh-9rem)] flex-col">
        <header className="flex items-center gap-2 border-b border-border bg-primary px-3 py-3 text-primary-foreground">
          <button onClick={() => { setActive(null); setMsgs([]); }} className="rounded-full p-1 hover:bg-white/15"><ArrowLeft size={18} /></button>
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/15"><UserIcon size={16} /></div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{t?.full_name ?? "Student"}</p>
            <StatusPill online={online} />
          </div>
        </header>
        <div ref={ref} className="flex-1 space-y-2 overflow-y-auto bg-muted/30 p-3">
          {msgs.map((m) => (
            <div key={m.id} className={`flex ${m.from_admin ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm ${
                m.from_admin ? "rounded-br-sm bg-primary text-primary-foreground" : "rounded-bl-sm bg-white text-foreground border border-border"
              }`}>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
                <p className={`mt-0.5 text-[10px] ${m.from_admin ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                  {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
        </div>
        <form onSubmit={send} className="flex items-center gap-2 border-t border-border bg-background p-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Reply to student…"
            className="flex-1 rounded-full border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
          <button type="submit" disabled={!text.trim()} className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50">
            <Send size={16} />
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <header className="rounded-lg bg-primary p-4 text-primary-foreground">
        <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70">Admin Inbox</p>
        <h1 className="mt-0.5 text-lg font-bold">Student Conversations</h1>
        <p className="mt-1 text-xs text-primary-foreground/80">Reply to students about claims and found items.</p>
      </header>
      {!threads.length ? (
        <div className="rounded-md border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          <Inbox size={22} className="mx-auto mb-2 opacity-60" />
          No conversations yet.
        </div>
      ) : (
        <ul className="space-y-2">
          {threads.map((t) => (
            <li key={t.user_id}>
              <button onClick={() => { setActive(t.user_id); void loadActive(t.user_id); }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-all hover:border-primary/40 hover:shadow-sm">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                  {(t.full_name ?? "?").slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{t.full_name}</p>
                  <p className="truncate text-xs text-muted-foreground">{t.last}</p>
                </div>
                <span className="text-[10px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString()}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}