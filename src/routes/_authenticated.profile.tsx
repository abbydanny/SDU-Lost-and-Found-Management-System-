import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemRow } from "@/components/ItemCard";
import { LogOut, Mail, Phone, GraduationCap, IdCard } from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const router = useRouter();
  const { data: profile } = useQuery({
    queryKey: ["profile", "me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data } = await supabase.from("profiles").select("*").eq("id", u.user.id).single();
      return data;
    },
  });
  const { data: myItems } = useQuery({
    queryKey: ["items", "mine"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return [];
      const { data } = await supabase.from("items").select("*").eq("reporter_id", u.user.id).order("created_at", { ascending: false });
      return (data ?? []) as ItemRow[];
    },
  });

  async function signOut() {
    await supabase.auth.signOut();
    router.navigate({ to: "/login", search: { redirect: "/" } });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
            {(profile?.full_name ?? "S").slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{profile?.full_name ?? "Student"}</h1>
            <p className="truncate text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </div>
        <dl className="mt-4 space-y-2 text-xs">
          <Info icon={<IdCard size={14} />} value={profile?.matric_no ?? "—"} />
          <Info icon={<GraduationCap size={14} />} value={profile?.department ?? "—"} />
          <Info icon={<Mail size={14} />} value={profile?.email ?? "—"} />
          {profile?.phone && <Info icon={<Phone size={14} />} value={profile.phone} />}
        </dl>
        <button onClick={signOut} className="mt-4 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm hover:bg-muted">
          <LogOut size={16} /> Sign out
        </button>
      </div>
      <div>
        <h2 className="mb-2 text-sm font-semibold">My Reported Items</h2>
        {!myItems?.length ? (
          <p className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">You haven't reported any items yet.</p>
        ) : (
          <div className="space-y-2">{myItems.map((i) => <ItemCard key={i.id} item={i} />)}</div>
        )}
      </div>
    </div>
  );
}

function Info({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 text-muted-foreground">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-foreground">{value}</span>
    </div>
  );
}