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
        .order("created_at", { ascending: false }).limit(10);
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  return (
    <div className="space-y-8 pb-20">
      {/* Header Section */}
      <section className="space-y-6 pt-6">
        <div>
          <h1 className="text-4xl font-bold text-foreground">Lost</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Southern Delta University Lost and Found Management System
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <Link
            to="/report"
            className="flex-1 rounded-lg bg-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Report Lost Item
          </Link>
          <Link
            to="/search"
            className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-center text-sm font-semibold text-foreground transition-colors hover:bg-accent"
          >
            Browse Found Items
          </Link>
        </div>
      </section>

      {/* Recently Reported Lost Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold text-foreground">Recently Reported Lost</h2>
          {lost && lost.length > 0 && (
            <Link to="/search" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          )}
        </div>

        {l2 ? (
          <div className="flex justify-center py-8">
            <div className="text-sm text-muted-foreground">Loading items...</div>
          </div>
        ) : !lost?.length ? (
          <div className="rounded-lg border border-dashed border-border bg-muted/30 py-12 px-4 text-center">
            <div className="mb-2 text-2xl text-muted-foreground">📋</div>
            <p className="text-sm font-medium text-foreground">No items reported lost yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Be the first to report a lost item
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {lost.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
