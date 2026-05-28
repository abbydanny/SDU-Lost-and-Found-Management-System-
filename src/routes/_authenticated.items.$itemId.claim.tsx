import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Send } from "lucide-react";
import { ClaimTimeline } from "@/components/ClaimTimeline";

export const Route = createFileRoute("/_authenticated/items/$itemId/claim")({
  component: ClaimPage,
});

function ClaimPage() {
  const { itemId } = Route.useParams();
  const router = useRouter();
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [existing, setExisting] = useState<{ id: string; status: string; created_at: string } | null>(null);
  const [itemStatus, setItemStatus] = useState<string | undefined>();

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("claims").select("id,status,created_at")
        .eq("item_id", itemId).eq("claimant_id", u.user.id)
        .order("created_at", { ascending: false }).maybeSingle();
      setExisting(data ?? null);
      const { data: it } = await supabase.from("items").select("status").eq("id", itemId).single();
      setItemStatus(it?.status);
    })();
  }, [itemId]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (proof.trim().length < 20) { toast.error("Please provide detailed proof (at least 20 characters)"); return; }
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { data: inserted, error } = await supabase.from("claims").insert({
      item_id: itemId, claimant_id: u.user!.id, proof_details: proof.trim(),
    }).select("id,status,created_at").single();
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim submitted. The reporter will review it.");
    setExisting(inserted ?? null);
  }

  if (existing) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck size={18} />
            <h1 className="text-base font-semibold">Claim Submitted</h1>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            An admin will review your proof. You'll get a notification once a decision is made.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</h2>
          <ClaimTimeline
            status={existing.status as "pending" | "approved" | "rejected"}
            itemStatus={itemStatus}
            submittedAt={existing.created_at}
          />
        </div>

        <button onClick={() => router.navigate({ to: "/messages" })}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10">
          <Send size={16} /> Message admin
        </button>
        <button onClick={() => router.navigate({ to: "/items/$itemId", params: { itemId } })}
          className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium hover:bg-muted">
          Back to item
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <header className="rounded-xl bg-primary p-4 text-primary-foreground">
        <p className="text-[11px] uppercase tracking-wider text-primary-foreground/75">Step 1 of 1</p>
        <h1 className="mt-0.5 text-lg font-bold">Claim This Item</h1>
        <p className="mt-1 text-xs text-primary-foreground/85">
          Prove ownership with details only the real owner could know.
        </p>
      </header>
      <div className="rounded-xl border border-border bg-card p-4 shadow-sm space-y-3">
        <label className="block text-sm font-semibold">Proof of ownership</label>
        <textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={6} maxLength={2000}
          placeholder="e.g. The wallet has a torn corner on the back and contains my Access Bank card ending in 4521. There's a sticker of my dog on the inside."
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:border-primary focus:outline-none" />
        <p className="text-[11px] text-muted-foreground">
          {proof.trim().length}/20 minimum characters
        </p>
      </div>
      <button type="submit" disabled={submitting}
        className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground shadow-sm disabled:opacity-60">
        {submitting ? "Submitting…" : "Submit Claim"}
      </button>
    </form>
  );
}