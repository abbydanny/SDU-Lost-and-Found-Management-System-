import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Clock, ImageIcon, CheckCircle2, MessageCircle, Tag, Calendar } from "lucide-react";
import { toast } from "sonner";
import { ClaimTimeline } from "@/components/ClaimTimeline";

export const Route = createFileRoute("/_authenticated/items/$itemId")({
  component: ItemDetail,
});

function ItemDetail() {
  const { itemId } = Route.useParams();
  const router = useRouter();
  const [idx, setIdx] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["item", itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*, profiles:reporter_id(full_name, department)")
        .eq("id", itemId).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: myClaim } = useQuery({
    queryKey: ["my-claim", itemId],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase
        .from("claims").select("id,status,created_at")
        .eq("item_id", itemId).eq("claimant_id", u.user.id)
        .order("created_at", { ascending: false }).maybeSingle();
      return data;
    },
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (!data) return <p className="text-sm text-muted-foreground">Item not found.</p>;

  const photos: string[] = data.image_urls ?? [];
  const photo = photos[idx];

  async function markReturned() {
    const { error } = await supabase.from("items").update({ status: "returned" }).eq("id", itemId);
    if (error) toast.error(error.message);
    else { toast.success("Marked as returned"); router.invalidate(); }
  }

  return (
    <div className="space-y-4">
      <button onClick={() => router.history.back()} className="inline-flex items-center gap-1 text-sm text-muted-foreground">
        <ArrowLeft size={16} /> Back
      </button>

      <div className="overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
        {photo ? (
          <img src={photo} alt={data.title} className="aspect-[4/3] w-full object-cover" />
        ) : (
          <div className="flex aspect-[4/3] items-center justify-center text-muted-foreground">
            <ImageIcon size={48} />
          </div>
        )}
      </div>
      {photos.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {photos.map((p, i) => (
            <button key={p} onClick={() => setIdx(i)}
              className={`h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 ${idx === i ? "border-primary ring-2 ring-primary/20" : "border-border"}`}>
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-lg font-bold text-foreground">{data.title}</h1>
          <p className="text-xs text-muted-foreground flex items-center gap-1"><Tag size={12} /> {data.category}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
          data.type === "found" ? "bg-primary text-primary-foreground" : "border border-primary text-primary bg-white"
        }`}>{data.type}</span>
      </div>

      <div className="grid gap-2 rounded-xl border border-border bg-card p-3 text-sm shadow-sm">
        <p className="flex items-center gap-2 text-muted-foreground"><MapPin size={15} className="text-primary" /> {data.location}</p>
        <p className="flex items-center gap-2 text-muted-foreground"><Calendar size={15} className="text-primary" /> {data.item_date}</p>
        <p className="flex items-center gap-2 text-muted-foreground"><Clock size={15} className="text-primary" /> Reported {new Date(data.created_at).toLocaleString()}</p>
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground text-xs uppercase tracking-wide">Status</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase ${
            data.status === "returned" ? "border-primary bg-primary text-primary-foreground"
            : data.status === "claimed" ? "border-primary/30 bg-primary/10 text-primary"
            : "border-border bg-muted text-muted-foreground"
          }`}>{data.status}</span>
        </div>
      </div>

      <div>
        <h2 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h2>
        <p className="whitespace-pre-wrap rounded-xl border border-border bg-card p-3 text-sm text-foreground shadow-sm">{data.description}</p>
      </div>

      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
          {((data as { profiles?: { full_name?: string } }).profiles?.full_name ?? "S").slice(0,1).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Reported by</p>
          <p className="truncate text-sm font-semibold">{(data as { profiles?: { full_name?: string } }).profiles?.full_name ?? "Student"}</p>
          {(data as { profiles?: { department?: string } }).profiles?.department && (
            <p className="truncate text-xs text-muted-foreground">{(data as { profiles?: { department?: string } }).profiles?.department}</p>
          )}
        </div>
      </div>

      {myClaim && (
        <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Your Claim Progress</h2>
          <ClaimTimeline
            status={myClaim.status as "pending" | "approved" | "rejected"}
            itemStatus={data.status}
            submittedAt={myClaim.created_at}
          />
        </div>
      )}

      {data.type === "found" && data.status === "open" && !myClaim && (
        <Link to="/items/$itemId/claim" params={{ itemId }}
          className="block w-full rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 active:scale-[0.99] transition">
          Claim This Item
        </Link>
      )}

      <Link to="/messages"
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary/30 bg-primary/5 px-4 py-3 text-sm font-semibold text-primary hover:bg-primary/10">
        <MessageCircle size={16} /> Message admin about this item
      </Link>

      {data.status === "open" && (
        <button onClick={markReturned}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
          <CheckCircle2 size={16} /> Mark as Returned
        </button>
      )}
    </div>
  );
}