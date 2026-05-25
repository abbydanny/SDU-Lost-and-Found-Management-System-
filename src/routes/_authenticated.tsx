import { createFileRoute, Outlet, redirect, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/BottomNav";
import { BellIcon, ShieldIcon } from "@/components/Icons";

export const Route = createFileRoute("/_authenticated")({
  component: AuthLayout,
});

function AuthLayout() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);
  const [unread, setUnread] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      if (!data.session) {
        router.navigate({ to: "/login", search: { redirect: window.location.pathname } });
        return;
      }
      setChecked(true);
      void refreshBadges(data.session.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => {
      if (!s) router.navigate({ to: "/login", search: { redirect: "/" } });
      else void refreshBadges(s.user.id);
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
      <header className="sticky top-0 z-30 border-b border-border bg-background">
        <div className="mx-auto flex max-w-screen-md items-center justify-between px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold text-sm">SDU</div>
            <span className="text-sm font-semibold text-foreground">SDU Find</span>
          </Link>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link to="/admin" className="text-muted-foreground hover:text-primary" aria-label="Admin">
                <ShieldIcon />
              </Link>
            )}
            <Link to="/notifications" className="relative text-muted-foreground hover:text-primary" aria-label="Notifications">
              <BellIcon />
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