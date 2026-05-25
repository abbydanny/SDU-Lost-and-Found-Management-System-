import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ItemCard, type ItemRow } from "@/components/ItemCard";
import { LogoutIcon } from "@/components/Icons";

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
      <div className="rounded-md border border-border bg-card p-4">
        <h1 className="text-base font-semibold">{profile?.full_name ?? "Student"}</h1>
        <p className="text-xs text-muted-foreground">{profile?.matric_no ?? "—"} · {profile?.department ?? "—"}</p>
        <p className="mt-1 text-xs text-muted-foreground">{profile?.email}</p>
        {profile?.phone && <p className="text-xs text-muted-foreground">{profile.phone}</p>}
        <button onClick={signOut} className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <LogoutIcon width={16} height={16} /> Sign out
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