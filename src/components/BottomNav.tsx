import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, PlusCircle, User, Bell } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/report", label: "Report", icon: PlusCircle },
  { to: "/notifications", label: "Alerts", icon: Bell },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <ul className="mx-auto flex max-w-screen-md items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`relative flex flex-col items-center gap-1 py-2.5 text-[11px] transition-colors ${
                  active ? "text-primary font-semibold" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {active && (
                  <span className="absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full bg-primary" />
                )}
                <Icon size={20} strokeWidth={active ? 2.25 : 1.8} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}