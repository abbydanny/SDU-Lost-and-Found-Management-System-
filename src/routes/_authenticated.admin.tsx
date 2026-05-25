import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ok, setOk] = useState<boolean | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.navigate({ to: "/login", search: { redirect: "/admin" } }); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setOk(!!data);
    })();
  }, [router]);

  const { data: claims } = useQuery({
    queryKey: ["admin", "claims"],
    enabled: ok === true,
    queryFn: async () => {
      const { data, error } = await supabase.from("claims").select("*, items(title, status)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  async function decide(claimId: string, status: "approved" | "rejected", itemId: string) {
    const { error } = await supabase.from("claims").update({ status }).eq("id", claimId);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      await supabase.from("items").update({ status: "claimed" }).eq("id", itemId);
    }
    toast.success("Claim updated");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  if (ok === null) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!ok) return <p className="text-sm text-muted-foreground">Admin access required.</p>;

  return (
    <div className="space-y-3">
      <h1 className="text-base font-semibold">Admin · Claim Reviews</h1>
      {!claims?.length ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No claims yet.</p>
      ) : claims.map((c) => (
        <div key={c.id} className="rounded-md border border-border bg-card p-3 text-sm">
          <p className="font-medium">{(c as { items?: { title?: string } }).items?.title ?? "Item"}</p>
          <p className="mt-1 whitespace-pre-wrap text-xs text-muted-foreground">{c.proof_details}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Status: {c.status} · {new Date(c.created_at).toLocaleString()}</p>
          {c.status === "pending" && (
            <div className="mt-2 flex gap-2">
              <button onClick={() => decide(c.id, "approved", c.item_id)} className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground">Approve</button>
              <button onClick={() => decide(c.id, "rejected", c.item_id)} className="rounded-md border border-border bg-background px-3 py-1.5 text-xs font-medium">Reject</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}