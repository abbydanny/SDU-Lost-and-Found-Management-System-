import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemRow } from "@/components/ItemCard";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  const { data: recentFound, isLoading: foundLoading } = useQuery({
    queryKey: ["items", "recent-found"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", "found")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  const { data: recentLost, isLoading: lostLoading } = useQuery({
    queryKey: ["items", "recent-lost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items")
        .select("*")
        .eq("type", "lost")
        .eq("status", "open")
        .order("created_at", { ascending: false })
        .limit(6);
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="bg-primary px-6 pt-8 pb-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">SDU Find</h1>
            <p className="text-blue-100 mt-1">Southern Delta University, Ozoro</p>
          </div>
          <div className="text-right">
            <p className="text-sm opacity-90">Welcome back 👋</p>
            <p className="font-medium">Student</p>
          </div>
        </div>
      </div>

      <div className="px-5 pt-6 space-y-8">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <Link
            to="/report"
            className="flex flex-col items-center justify-center rounded-2xl bg-primary py-6 text-white shadow-sm active:scale-95 transition-transform"
          >
            <span className="text-2xl mb-1">📍</span>
            <span className="font-semibold">Report Lost Item</span>
          </Link>

          <Link
            to="/report?type=found"
            className="flex flex-col items-center justify-center rounded-2xl border-2 border-primary bg-white py-6 text-primary shadow-sm active:scale-95 transition-transform"
          >
            <span className="text-2xl mb-1">🔍</span>
            <span className="font-semibold">Report Found Item</span>
          </Link>
        </div>

        {/* Recently Found */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recently Found</h2>
            <Link to="/search" className="text-primary text-sm font-medium">
              See all
            </Link>
          </div>

          {foundLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading found items...</p>
          ) : !recentFound?.length ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No items found recently
            </p>
          ) : (
            <div className="space-y-3">
              {recentFound.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>

        {/* Recently Lost */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Recently Reported Lost</h2>
            <Link to="/search" className="text-primary text-sm font-medium">
              See all
            </Link>
          </div>

          {lostLoading ? (
            <p className="text-center py-8 text-muted-foreground">Loading...</p>
          ) : !recentLost?.length ? (
            <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
              No lost items reported recently
            </p>
          ) : (
            <div className="space-y-3">
              {recentLost.map((item) => (
                <ItemCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}