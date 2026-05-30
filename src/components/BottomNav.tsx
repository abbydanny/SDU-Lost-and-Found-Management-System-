import { Link, useLocation } from "@tanstack/react-router";
import { Home, Search, PlusCircle, User } from "lucide-react";

const items = [
  { to: "/", label: "Home", icon: Home },
  { to: "/search", label: "Search", icon: Search },
  { to: "/report", label: "Report", icon: PlusCircle, primary: true },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/85">
      <ul className="mx-auto flex max-w-screen-md items-stretch justify-around px-1">
        {items.map((it) => {
          const { to, label, icon: Icon } = it;
          const isPrimary = "primary" in it && it.primary;
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          if (isPrimary) {
            return (
              <li key={to} className="flex-1">
                <Link to={to} className="flex flex-col items-center -mt-5 gap-1 py-1.5 text-[11px]">
                  <span className={`grid h-12 w-12 place-items-center rounded-full border-4 border-background bg-primary text-primary-foreground shadow-md ${
                    active ? "ring-2 ring-primary/40" : ""
                  }`}>
                    <Icon size={22} strokeWidth={2.2} />
                  </span>
                  <span className={active ? "text-primary font-semibold" : "text-muted-foreground"}>{label}</span>
                </Link>
              </li>
            );
          }
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