import { Link, useLocation } from "@tanstack/react-router";
import { HomeIcon, SearchIcon, PlusIcon, UserIcon, BellIcon } from "./Icons";

const items = [
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/report", label: "Report", icon: PlusIcon },
  { to: "/notifications", label: "Alerts", icon: BellIcon },
  { to: "/profile", label: "Profile", icon: UserIcon },
] as const;

export function BottomNav() {
  const { pathname } = useLocation();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-background">
      <ul className="mx-auto flex max-w-screen-md items-stretch justify-around">
        {items.map(({ to, label, icon: Icon }) => {
          const active = pathname === to || (to !== "/" && pathname.startsWith(to));
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center gap-1 py-2.5 text-[11px] ${
                  active ? "text-primary font-medium" : "text-muted-foreground"
                }`}
              >
                <Icon width={22} height={22} />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}