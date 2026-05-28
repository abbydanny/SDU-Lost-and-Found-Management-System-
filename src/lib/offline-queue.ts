import { supabase } from "@/integrations/supabase/client";

const KEY = "sdu_msg_queue_v1";

export type QueuedMessage = {
  id: string;
  user_id: string;
  sender_id: string;
  body: string;
  item_id?: string | null;
  created_at: string;
};

function read(): QueuedMessage[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

function write(items: QueuedMessage[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function enqueue(msg: QueuedMessage) {
  const items = read();
  items.push(msg);
  write(items);
}

export function getQueued(userId: string): QueuedMessage[] {
  return read().filter((m) => m.user_id === userId);
}

export async function flushQueue(): Promise<number> {
  if (typeof navigator !== "undefined" && !navigator.onLine) return 0;
  const items = read();
  if (!items.length) return 0;
  const remaining: QueuedMessage[] = [];
  let sent = 0;
  for (const m of items) {
    const { error } = await supabase.from("messages").insert({
      user_id: m.user_id,
      sender_id: m.sender_id,
      body: m.body,
      item_id: m.item_id ?? null,
      from_admin: false,
    });
    if (error) remaining.push(m);
    else sent++;
  }
  write(remaining);
  return sent;
}

export function initAutoFlush() {
  if (typeof window === "undefined") return () => {};
  const handler = () => { void flushQueue(); };
  window.addEventListener("online", handler);
  // Try flush on mount as well
  void flushQueue();
  return () => window.removeEventListener("online", handler);
}