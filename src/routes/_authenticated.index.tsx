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
      <section className="-mx-4 -mt-4 relative overflow-hidden rounded-b-3xl bg-primary px-5 pb-7 pt-7 text-primary-foreground shadow-md">
        {/* subtle decorative rings */}
        <span aria-hidden className="absolute -right-16 -top-16 h-48 w-48 rounded-full border border-white/10" />
        <span aria-hidden className="absolute -right-6 -bottom-10 h-32 w-32 rounded-full border border-white/10" />
        <p className="text-[11px] uppercase tracking-[0.18em] text-primary-foreground/75">
          SDU Lost &amp; Found Management System
        </p>
        <h1 className="mt-2 text-[22px] font-bold leading-tight">Lost something on campus?</h1>
        <p className="mt-2 max-w-[28ch] text-sm text-primary-foreground/85">
          Report it, search what others found, and get it back fast.
        </p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <Link
            to="/report"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-white px-3 py-2.5 text-sm font-semibold text-primary shadow-sm hover:bg-white/95 active:scale-[0.98] transition-all"
          >
            <PlusCircle size={16} /> Report Item
          </Link>
          <Link
            to="/search"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-white/30 bg-white/10 px-3 py-2.5 text-sm font-semibold text-white hover:bg-white/20 active:scale-[0.98] transition-all"
          >
            <Search size={16} /> Browse
          </Link>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3">
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <PackageSearch size={14} className="text-primary" /> Active
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">{stats?.open ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground">reports open</p>
        </div>
        <div className="relative overflow-hidden rounded-xl border border-border bg-card p-4 shadow-sm">
          <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <Inbox size={14} className="text-primary" /> Returned
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">{stats?.returned ?? "—"}</p>
          <p className="text-[11px] text-muted-foreground">items recovered</p>
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
    <div className="rounded-xl border border-dashed border-primary/25 bg-primary/5 p-7 text-center">
      <Inbox size={22} className="mx-auto text-primary/60" />
      <p className="mt-2 text-sm font-medium text-foreground">{label}</p>
    </div>
  );
}
