import { Link } from "@tanstack/react-router";
import { MapPinIcon, ClockIcon, ImageIcon } from "./Icons";

export type ItemRow = {
  id: string;
  type: "lost" | "found";
  category: string;
  title: string;
  location: string;
  image_urls: string[];
  created_at: string;
  status: string;
};

function timeAgo(iso: string) {
  const d = new Date(iso).getTime();
  const s = Math.max(1, Math.floor((Date.now() - d) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}

export function ItemCard({ item }: { item: ItemRow }) {
  const photo = item.image_urls?.[0];
  return (
    <Link
      to="/items/$itemId"
      params={{ itemId: item.id }}
      className="flex gap-3 rounded-md border border-border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-colors hover:bg-muted/40"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-md bg-muted flex items-center justify-center text-muted-foreground">
        {photo ? (
          <img src={photo} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <ImageIcon />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
          <span
            className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide ${
              item.type === "found"
                ? "bg-accent text-accent-foreground"
                : "bg-primary text-primary-foreground"
            }`}
          >
            {item.type}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.category}</p>
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPinIcon width={14} height={14} /> <span className="truncate">{item.location}</span>
          </span>
          <span className="flex items-center gap-1">
            <ClockIcon width={14} height={14} /> {timeAgo(item.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}