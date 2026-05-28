import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, Check, X, PackageCheck, UserPlus, Loader2, Eye } from "lucide-react";
import { ClaimDetailModal, type ClaimDetail } from "@/components/ClaimDetailModal";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
});

type Tab = "pending" | "items" | "promote";

function AdminPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [ok, setOk] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("pending");

  useEffect(() => {
    void (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { router.navigate({ to: "/login", search: { redirect: "/admin" } }); return; }
      const { data } = await supabase
        .from("user_roles").select("role")
        .eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
      setOk(!!data);
    })();
  }, [router]);

  if (ok === null) {
    return (
      <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Loader2 size={16} className="animate-spin" /> Checking access…
      </div>
    );
  }

  if (!ok) {
    return (
      <div className="space-y-4">
        <header className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center gap-2 text-primary">
            <ShieldCheck size={18} /> <h1 className="text-base font-semibold">Admin Console</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            You don't have admin access yet. If you're the first staff member, you can claim the admin role
            using your own email below.
          </p>
        </header>
        <PromoteForm onDone={() => router.navigate({ to: "/admin" })} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <header className="rounded-lg border border-border bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-2 text-primary">
          <ShieldCheck size={18} />
          <h1 className="text-base font-semibold">Admin Console</h1>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Review claims, manage items, and promote staff.</p>
      </header>

      <nav className="flex gap-1 rounded-md border border-border bg-card p-1 text-xs font-medium">
        <TabBtn active={tab === "pending"} onClick={() => setTab("pending")}>Pending Claims</TabBtn>
        <TabBtn active={tab === "items"} onClick={() => setTab("items")}>Open Items</TabBtn>
        <TabBtn active={tab === "promote"} onClick={() => setTab("promote")}>Promote</TabBtn>
      </nav>

      {tab === "pending" && <PendingClaims qc={qc} />}
      {tab === "items" && <OpenItems qc={qc} />}
      {tab === "promote" && <PromoteForm />}
    </div>
  );
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex-1 rounded px-2 py-1.5 transition-colors ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
    >
      {children}
    </button>
  );
}

function PendingClaims({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "claims"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("claims")
        .select("*, items(id,title,status,location,category,description,item_date,image_urls), claimant:profiles!claims_claimant_id_fkey(full_name,matric_no,email,department)")
        .order("created_at", { ascending: false });
      if (error) {
        // Fallback without nested profile if FK alias unavailable
        const { data: d2, error: e2 } = await supabase
          .from("claims").select("*, items(id,title,status,location,category,description,item_date,image_urls)")
          .order("created_at", { ascending: false });
        if (e2) throw e2;
        return d2;
      }
      return data;
    },
  });

  async function decide(claimId: string, status: "approved" | "rejected", itemId: string) {
    const { error } = await supabase.from("claims").update({ status }).eq("id", claimId);
    if (error) return toast.error(error.message);
    if (status === "approved") {
      const { error: e2 } = await supabase.from("items").update({ status: "claimed" }).eq("id", itemId);
      if (e2) return toast.error(e2.message);
    }
    toast.success(`Claim ${status}`);
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["items"] });
  }

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-muted-foreground">Loading claims…</p>;
  }

  const pending = (data ?? []).filter((c) => c.status === "pending");
  const others = (data ?? []).filter((c) => c.status !== "pending");
  const openClaim = (data ?? []).find((c) => c.id === openId) as ClaimDetail | undefined;

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Pending ({pending.length})
        </h2>
        {!pending.length ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No pending claims.
          </p>
        ) : pending.map((c) => (
          <ClaimCard key={c.id} c={c} onDecide={decide} onView={() => setOpenId(c.id)} />
        ))}
      </section>

      {others.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            History ({others.length})
          </h2>
          {others.slice(0, 20).map((c) => (
            <ClaimCard key={c.id} c={c} onDecide={decide} onView={() => setOpenId(c.id)} />
          ))}
        </section>
      )}

      {openClaim && (
        <ClaimDetailModal
          claim={openClaim}
          onClose={() => setOpenId(null)}
          onApprove={async () => { await decide(openClaim.id, "approved", openClaim.item_id); setOpenId(null); }}
          onReject={async () => { await decide(openClaim.id, "rejected", openClaim.item_id); setOpenId(null); }}
        />
      )}
    </div>
  );
}

type ClaimRow = {
  id: string;
  item_id: string;
  status: string;
  proof_details: string;
  created_at: string;
  items?: { id: string; title: string; status: string; location: string; category: string } | null;
  claimant?: { full_name?: string; matric_no?: string; email?: string } | null;
};

function ClaimCard({ c, onDecide, onView }: { c: ClaimRow; onDecide: (id: string, s: "approved" | "rejected", itemId: string) => void; onView: () => void }) {
  const tone =
    c.status === "approved" ? "bg-primary text-primary-foreground border-primary"
    : c.status === "rejected" ? "bg-destructive text-destructive-foreground border-destructive"
    : "bg-primary/10 text-primary border-primary/30";
  return (
    <div className="rounded-xl border border-border bg-card p-3 shadow-sm transition-all hover:border-primary/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{c.items?.title ?? "Item"}</p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {c.items?.category}{c.items?.location ? ` · ${c.items.location}` : ""}
          </p>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${tone}`}>
          {c.status}
        </span>
      </div>
      {c.claimant && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Claimant: <span className="text-foreground">{c.claimant.full_name ?? c.claimant.email ?? "—"}</span>
          {c.claimant.matric_no ? ` · ${c.claimant.matric_no}` : ""}
        </p>
      )}
      <p className="mt-2 line-clamp-2 whitespace-pre-wrap rounded-md bg-muted/50 p-2 text-xs text-foreground">{c.proof_details}</p>
      <p className="mt-1 text-[11px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</p>
      <div className="mt-3 flex gap-2">
        <button
          onClick={onView}
          className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
        >
          <Eye size={14} /> View Details
        </button>
        {c.status === "pending" && (
          <>
            <button
              onClick={() => onDecide(c.id, "approved", c.item_id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Check size={14} /> Approve
            </button>
            <button
              onClick={() => onDecide(c.id, "rejected", c.item_id)}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground hover:bg-muted"
            >
              <X size={14} /> Reject
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function OpenItems({ qc }: { qc: ReturnType<typeof useQueryClient> }) {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "items", "open"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("items").select("id,title,type,category,location,status,created_at")
        .in("status", ["open", "claimed"])
        .order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  async function markReturned(id: string) {
    const { error } = await supabase.from("items").update({ status: "returned" }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Marked as returned");
    qc.invalidateQueries({ queryKey: ["admin"] });
    qc.invalidateQueries({ queryKey: ["items"] });
  }

  if (isLoading) return <p className="py-6 text-center text-sm text-muted-foreground">Loading…</p>;
  if (!data?.length) return <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">No open items.</p>;

  return (
    <div className="space-y-2">
      {data.map((i) => (
        <div key={i.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{i.title}</p>
            <p className="text-[11px] text-muted-foreground">{i.type} · {i.category} · {i.status}</p>
          </div>
          <button
            onClick={() => markReturned(i.id)}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-background px-2.5 py-1.5 text-[11px] font-medium hover:bg-muted"
          >
            <PackageCheck size={14} /> Returned
          </button>
        </div>
      ))}
    </div>
  );
}

function PromoteForm({ onDone }: { onDone?: () => void } = {}) {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setBusy(true);
    const { error } = await supabase.rpc("promote_to_admin", { _email: email.trim() });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success(`Promoted ${email} to admin`);
    setEmail("");
    onDone?.();
  }

  return (
    <form onSubmit={submit} className="space-y-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2 text-primary">
        <UserPlus size={16} /> <h2 className="text-sm font-semibold">Promote user to admin</h2>
      </div>
      <p className="text-xs text-muted-foreground">
        Enter the email of an existing account. The user must have signed up first.
      </p>
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="user@example.com"
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      />
      <button
        type="submit"
        disabled={busy}
        className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
        Grant admin role
      </button>
    </form>
  );
}