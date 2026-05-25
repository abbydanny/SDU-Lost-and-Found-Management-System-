import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(100);
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      await supabase.from("notifications").update({ read: true }).eq("user_id", u.user.id).eq("read", false);
      qc.invalidateQueries({ queryKey: ["notifications"] });
    })();
  }, [qc]);

  return (
    <div className="space-y-2">
      <h1 className="text-base font-semibold">Notifications</h1>
      {!data?.length ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
      ) : data.map((n) => (
        <Link key={n.id} to={n.link ?? "/"} className="block rounded-md border border-border bg-card p-3">
          <p className="text-sm font-medium">{n.title}</p>
          {n.body && <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p>}
          <p className="mt-1 text-[11px] text-muted-foreground">{new Date(n.created_at).toLocaleString()}</p>
        </Link>
      ))}
    </div>
  );
}