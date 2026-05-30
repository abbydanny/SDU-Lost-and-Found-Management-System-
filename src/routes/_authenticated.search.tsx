import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemRow } from "@/components/ItemCard";
import { Search as SearchIcon, SlidersHorizontal, X } from "lucide-react";

const CATEGORIES = ["All", "Electronics", "ID Card", "Wallet", "Books", "Keys", "Clothing", "Other"];
const TYPES = [
  { value: "All", label: "All" },
  { value: "found", label: "Found" },
  { value: "lost", label: "Lost" },
] as const;

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<"All" | "found" | "lost">("All");
  const [cat, setCat] = useState("All");

  const { data, isLoading } = useQuery({
    queryKey: ["items", "search", q, type, cat],
    queryFn: async () => {
      let query = supabase.from("items").select("*").order("created_at", { ascending: false }).limit(100);
      if (type !== "All") query = query.eq("type", type);
      if (cat !== "All") query = query.eq("category", cat as "Electronics" | "ID Card" | "Wallet" | "Books" | "Keys" | "Clothing" | "Other");
      const term = q.trim();
      if (term) query = query.or(`title.ilike.%${term}%,location.ilike.%${term}%,description.ilike.%${term}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  const activeFilters = (type !== "All" ? 1 : 0) + (cat !== "All" ? 1 : 0);

  return (
    <div className="space-y-5">
      <header className="rounded-2xl border border-border bg-gradient-to-br from-primary to-[#001f5c] p-5 text-primary-foreground shadow-sm">
        <h1 className="text-lg font-bold">Find an item</h1>
        <p className="mt-0.5 text-xs text-primary-foreground/80">
          Search by title, location, brand or any keyword.
        </p>
        <div className="relative mt-4">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="e.g. blue wallet, Engineering block"
            className="w-full rounded-xl border border-transparent bg-white py-3 pl-10 pr-9 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              className="absolute right-2 top-1/2 grid -translate-y-1/2 place-items-center rounded-full p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
      </header>

      <section className="rounded-xl border border-border bg-card p-3.5 shadow-sm">
        <div className="mb-2 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          <SlidersHorizontal size={13} className="text-primary" /> Filters
          {activeFilters > 0 && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-bold text-primary">
              {activeFilters} active
            </span>
          )}
        </div>
        <div className="mb-3">
          <p className="mb-1.5 text-[11px] text-muted-foreground">Type</p>
          <div className="inline-flex w-full overflow-hidden rounded-lg border border-border">
            {TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={`flex-1 px-2 py-2 text-xs font-medium transition ${
                  type === t.value ? "bg-primary text-primary-foreground" : "bg-background text-foreground hover:bg-muted"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-[11px] text-muted-foreground">Category</p>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCat(c)}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition ${
                  cat === c
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </section>

      <div className="flex items-center justify-between px-1">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {isLoading ? "Searching…" : `${data?.length ?? 0} result${(data?.length ?? 0) === 1 ? "" : "s"}`}
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl border border-border bg-muted/40" />
          ))}
        </div>
      ) : !data?.length ? (
        <div className="rounded-xl border border-dashed border-border bg-card p-8 text-center shadow-sm">
          <div className="mx-auto mb-2 grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary">
            <SearchIcon size={18} />
          </div>
          <p className="text-sm font-semibold text-foreground">No matches</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Try a different keyword or clear the filters.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {data.map((i) => <ItemCard key={i.id} item={i} />)}
        </div>
      )}
    </div>
  );
}