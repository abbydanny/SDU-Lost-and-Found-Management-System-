import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemRow } from "@/components/ItemCard";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  const { data: lost, isLoading: l2 } = useQuery({
    queryKey: ["items", "recent-lost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items").select("*").eq("type", "lost").eq("status", "open")
        .order("created_at", { ascending: false }).limit(5);
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  return (
    <div className="space-y-6">
      <section className="rounded-md border border-border bg-card p-4">
        <h1 className="text-2xl font-bold text-foreground">Lost</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Southern Delta University Lost and Found Management System
        </p>
        <div className="mt-3 flex gap-2">
          <Link
            to="/report"
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground"
          >
            Report Item
          </Link>
          <Link
            to="/search"
            className="rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground"
          >
            Browse Items
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-foreground">Recently Reported Lost</h2>
        {l2 ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : !lost?.length ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing reported lost recently.
          </p>
        ) : (
          <div className="space-y-2">
            {lost.map((i) => <ItemCard key={i.id} item={i} />)}
          </div>
        )}
      </section>
    </div>
  );
}
