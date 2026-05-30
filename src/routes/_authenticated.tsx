import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { Bell, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [, setUid] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.navigate({ to: "/login", search: { redirect: window.location.pathname } });
        return;
      }
      setChecked(true);
      setUid(data.session.user.id);
      void refreshBadges(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.navigate({ to: "/login", search: { redirect: "/" } });
      else { setUid(s.user.id); void refreshBadges(s.user.id); }
    });
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function refreshBadges(uid: string) {
    const [n, r] = await Promise.all([
      supabase.from("notifications").select("id", { count: "exact", head: true }).eq("user_id", uid).eq("read", false),
      supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle(),
    ]);
    setUnread(n.count ?? 0);
    setIsAdmin(!!r.data);
  }

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-foreground font-extrabold text-[13px] tracking-tight shadow-sm ring-1 ring-primary/20">SDU</div>
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-primary">SDU Lost &amp; Found</p>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Management System</p>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
                aria-label="Admin"
              >
                <ShieldCheck size={14} /> Admin
              </Link>
            )}
            <Link to="/notifications" className="relative rounded-full p-1.5 text-muted-foreground hover:bg-muted hover:text-primary" aria-label="Notifications">
              <Bell size={20} />
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
                  {unread}
                </span>
              )}
            </Link>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-screen-md px-4 py-4">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

// helpful re-export so child routes can throw redirect from beforeLoad if needed
export { redirect };