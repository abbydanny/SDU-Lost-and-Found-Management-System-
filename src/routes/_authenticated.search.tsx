import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemRow } from "@/components/ItemCard";
import { SearchIcon } from "@/components/Icons";

const CATEGORIES = ["All", "Electronics", "ID Card", "Wallet", "Books", "Keys", "Clothing", "Other"];
const TYPES = ["All", "found", "lost"] as const;

export const Route = createFileRoute("/_authenticated/search")({
  component: SearchPage,
});

function SearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof TYPES)[number]>("All");
  const [cat, setCat] = useState("All");
  const [loc, setLoc] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["items", "search", q, type, cat, loc],
    queryFn: async () => {
      let query = supabase.from("items").select("*").order("created_at", { ascending: false }).limit(100);
      if (type !== "All") query = query.eq("type", type);
      if (cat !== "All") query = query.eq("category", cat as "Electronics" | "ID Card" | "Wallet" | "Books" | "Keys" | "Clothing" | "Other");
      if (q.trim()) query = query.ilike("title", `%${q.trim()}%`);
      if (loc.trim()) query = query.ilike("location", `%${loc.trim()}%`);
      const { data, error } = await query;
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  return (
    <div className="space-y-4">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" width={18} height={18} />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by title (e.g. blue wallet)"
          className="w-full rounded-md border border-input bg-background py-2.5 pl-10 pr-3 text-sm"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <select value={type} onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
          className="rounded-md border border-input bg-background px-2 py-2 text-sm">
          {TYPES.map((t) => <option key={t} value={t}>{t === "All" ? "All types" : t === "found" ? "Found" : "Lost"}</option>)}
        </select>
        <select value={cat} onChange={(e) => setCat(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c === "All" ? "All categories" : c}</option>)}
        </select>
      </div>

      <input
        value={loc}
        onChange={(e) => setLoc(e.target.value)}
        placeholder="Filter by location (optional)"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Searching…</p>
      ) : !data?.length ? (
        <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No items match your filters.
        </p>
      ) : (
        <div className="space-y-2">
          {data.map((i) => <ItemCard key={i.id} item={i} />)}
        </div>
      )}
    </div>
  );
}