import { Link } from "@tanstack/react-router";
import { MapPin, Clock, ImageIcon } from "lucide-react";

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
  const statusTone =
    item.status === "returned"
      ? "bg-primary text-primary-foreground border-primary"
      : item.status === "claimed"
      ? "bg-primary/10 text-primary border-primary/30"
      : "bg-muted text-muted-foreground border-border";
  return (
    <Link
      to="/items/$itemId"
      params={{ itemId: item.id }}
      className="group flex gap-3 rounded-xl border border-border bg-card p-3 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all hover:border-primary/40 hover:shadow-md active:scale-[0.99]"
    >
      <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-muted flex items-center justify-center text-muted-foreground ring-1 ring-border/60">
        {photo ? (
          <img src={photo} alt={item.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" loading="lazy" />
        ) : (
          <ImageIcon size={22} />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <h3 className="truncate text-sm font-semibold text-foreground">{item.title}</h3>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
              item.type === "found"
                ? "bg-primary text-primary-foreground"
                : "border border-primary text-primary bg-white"
            }`}
          >
            {item.type}
          </span>
        </div>
        <div className="mt-0.5 flex items-center gap-1.5">
          <p className="text-xs text-muted-foreground">{item.category}</p>
          {item.status !== "open" && (
            <span className={`rounded-full border px-1.5 py-px text-[10px] font-medium ${statusTone}`}>
              {item.status}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center gap-3 pt-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin size={13} /> <span className="truncate">{item.location}</span>
          </span>
          <span className="flex items-center gap-1">
            <Clock size={13} /> {timeAgo(item.created_at)}
          </span>
        </div>
      </div>
    </Link>
  );
}