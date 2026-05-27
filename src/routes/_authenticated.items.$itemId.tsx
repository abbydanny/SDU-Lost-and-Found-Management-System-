import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, MapPin, Clock, ImageIcon, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

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

      <div className="overflow-hidden rounded-lg border border-border bg-muted shadow-sm">
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
              className={`h-16 w-16 shrink-0 overflow-hidden rounded border ${idx === i ? "border-primary" : "border-border"}`}>
              <img src={p} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <div className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold">{data.title}</h1>
          <p className="text-xs text-muted-foreground">{data.category}</p>
        </div>
        <span className={`rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
          data.type === "found" ? "bg-accent text-accent-foreground" : "bg-primary text-primary-foreground"
        }`}>{data.type}</span>
      </div>

      <div className="space-y-1 text-sm">
        <p className="flex items-center gap-2 text-muted-foreground"><MapPin size={16} /> {data.location}</p>
        <p className="flex items-center gap-2 text-muted-foreground"><Clock size={16} /> Reported {new Date(data.created_at).toLocaleString()}</p>
        <p className="text-muted-foreground">Date: {data.item_date}</p>
        <p className="text-muted-foreground">Status: <span className="font-medium text-foreground">{data.status}</span></p>
      </div>

      <div>
        <h2 className="mb-1 text-sm font-semibold">Description</h2>
        <p className="whitespace-pre-wrap text-sm text-foreground">{data.description}</p>
      </div>

      <div className="rounded-md border border-border bg-card p-3 text-sm">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">Reported by</p>
        <p className="font-medium">{(data as { profiles?: { full_name?: string } }).profiles?.full_name ?? "Student"}</p>
        {(data as { profiles?: { department?: string } }).profiles?.department && (
          <p className="text-xs text-muted-foreground">{(data as { profiles?: { department?: string } }).profiles?.department}</p>
        )}
      </div>

      {data.type === "found" && data.status === "open" && (
        <Link to="/items/$itemId/claim" params={{ itemId }}
          className="block w-full rounded-md bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground">
          Claim This Item
        </Link>
      )}

      {data.status === "open" && (
        <button onClick={markReturned}
          className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-border bg-background px-4 py-3 text-sm font-medium text-foreground hover:bg-muted">
          <CheckCircle2 size={16} /> Mark as Returned
        </button>
      )}
    </div>
  );
}