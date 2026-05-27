import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemRow } from "@/components/ItemCard";
import { Search, PlusCircle, Inbox, PackageSearch } from "lucide-react";

export const Route = createFileRoute("/_authenticated/")({
  component: HomePage,
});

function HomePage() {
  const { data: stats } = useQuery({
    queryKey: ["items", "stats"],
    queryFn: async () => {
      const [open, returned] = await Promise.all([
        supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("items").select("id", { count: "exact", head: true }).eq("status", "returned"),
      ]);
      return { open: open.count ?? 0, returned: returned.count ?? 0 };
    },
  });

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

  const { data: found } = useQuery({
    queryKey: ["items", "recent-found"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items").select("*").eq("type", "found").eq("status", "open")
        .order("created_at", { ascending: false }).limit(6);
      if (error) throw error;
      return data as ItemRow[];
    },
  });

  return (
    <div className="space-y-7 pb-6">
      {/* Hero */}
      <section className="-mx-4 -mt-4 rounded-b-2xl bg-gradient-to-br from-primary to-primary/80 px-5 pb-6 pt-6 text-primary-foreground shadow-sm">
        <p className="text-[11px] uppercase tracking-wider text-primary-foreground/70">SDU Find · Ozoro</p>
        <h1 className="mt-1 text-2xl font-bold leading-tight">Lost something on campus?</h1>
        <p className="mt-1 text-sm text-primary-foreground/85">
          Report it, search what others found, and get it back.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <Link
            to="/report"
            className="inline-flex items-center justify-center gap-1.5 rounded-md bg-white/95 px-3 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-white"
          >
            <PlusCircle size={16} /> Report Item
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-1.5 rounded-md border border-white/30 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/20"
          >
            <Search size={16} /> Browse
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <PackageSearch size={14} /> Active reports
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">{stats?.open ?? "—"}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-3">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Inbox size={14} /> Returned
          </div>
          <p className="mt-1 text-xl font-semibold text-foreground">{stats?.returned ?? "—"}</p>
        </div>
      </section>

      {/* Recent Found */}
      <Section title="Recently Found" linkLabel="See more" linkTo="/search">
        {!found?.length ? (
          <EmptyState label="No found items yet" />
        ) : (
          <div className="space-y-2.5">
            {found.slice(0, 4).map((i) => <ItemCard key={i.id} item={i} />)}
          </div>
        )}
      </Section>

      {/* Recent Lost */}
      <Section title="Recently Reported Lost" linkLabel="View all" linkTo="/search">
        {l2 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>
        ) : !lost?.length ? (
          <EmptyState label="No lost items reported yet" />
        ) : (
          <div className="space-y-2.5">
            {lost.map((item) => <ItemCard key={item.id} item={item} />)}
          </div>
        )}
      </Section>
    </div>
  );
}

function Section({ title, linkLabel, linkTo, children }: { title: string; linkLabel: string; linkTo: "/search"; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-[15px] font-semibold text-foreground">{title}</h2>
        <Link to={linkTo} className="text-xs font-medium text-primary hover:underline">{linkLabel}</Link>
      </div>
      {children}
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-muted/30 p-6 text-center">
      <Inbox size={20} className="mx-auto text-muted-foreground" />
      <p className="mt-2 text-sm text-foreground">{label}</p>
    </div>
  );
}
