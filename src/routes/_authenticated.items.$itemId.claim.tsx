import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/items/$itemId/claim")({
  component: ClaimPage,
});

function ClaimPage() {
  const { itemId } = Route.useParams();
  const router = useRouter();
  const [proof, setProof] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (proof.trim().length < 20) { toast.error("Please provide detailed proof (at least 20 characters)"); return; }
    setSubmitting(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("claims").insert({
      item_id: itemId, claimant_id: u.user!.id, proof_details: proof.trim(),
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Claim submitted. The reporter will review it.");
    router.navigate({ to: "/items/$itemId", params: { itemId } });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-base font-semibold">Claim Item</h1>
      <p className="text-sm text-muted-foreground">
        Prove ownership by describing unique features only the real owner would know
        (serial number, scratches, stickers, contents, etc.).
      </p>
      <textarea value={proof} onChange={(e) => setProof(e.target.value)} rows={6} maxLength={2000}
        placeholder="e.g. The wallet has a torn corner on the back, and contains my Access Bank card ending in 4521…"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      <button type="submit" disabled={submitting}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
        {submitting ? "Submitting…" : "Submit Claim"}
      </button>
    </form>
  );
}