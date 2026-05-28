import { X, MapPin, Calendar, Tag, User as UserIcon, Mail, IdCard, Check, GraduationCap } from "lucide-react";
import { ClaimTimeline } from "./ClaimTimeline";

export type ClaimDetail = {
  id: string;
  item_id: string;
  status: "pending" | "approved" | "rejected" | string;
  proof_details: string;
  created_at: string;
  items?: {
    id: string;
    title: string;
    status: string;
    location: string;
    category: string;
    description?: string | null;
    item_date?: string | null;
    image_urls?: string[] | null;
  } | null;
  claimant?: {
    full_name?: string | null;
    matric_no?: string | null;
    email?: string | null;
    department?: string | null;
  } | null;
};

export function ClaimDetailModal({
  claim,
  onClose,
  onApprove,
  onReject,
}: {
  claim: ClaimDetail;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const item = claim.items;
  const photo = item?.image_urls?.[0];
  const isPending = claim.status === "pending";

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/40 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-card shadow-2xl sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-2 border-b border-border bg-primary px-4 py-3 text-primary-foreground">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-primary-foreground/70">Claim Review</p>
            <h2 className="text-base font-semibold">{item?.title ?? "Item"}</h2>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-white/15" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {photo && (
            <div className="overflow-hidden rounded-lg border border-border">
              <img src={photo} alt={item?.title} className="aspect-[4/3] w-full object-cover" />
            </div>
          )}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Item Details</h3>
            <div className="space-y-1.5 rounded-lg border border-border bg-muted/40 p-3 text-sm">
              <Row icon={<Tag size={14} />} label="Category" value={item?.category ?? "—"} />
              <Row icon={<MapPin size={14} />} label="Location" value={item?.location ?? "—"} />
              {item?.item_date && <Row icon={<Calendar size={14} />} label="Date" value={item.item_date} />}
              {item?.description && (
                <div className="pt-1">
                  <p className="text-[11px] font-medium text-muted-foreground">Description</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm">{item.description}</p>
                </div>
              )}
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Claimant</h3>
            <div className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
              <div className="grid h-10 w-10 place-items-center rounded-full bg-primary/10 text-primary font-semibold">
                {(claim.claimant?.full_name ?? "?").slice(0, 1).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1 text-sm">
                <p className="truncate font-semibold">{claim.claimant?.full_name ?? "Unknown"}</p>
                <div className="mt-0.5 grid gap-0.5 text-[11px] text-muted-foreground">
                  {claim.claimant?.matric_no && (
                    <span className="flex items-center gap-1"><IdCard size={11} /> {claim.claimant.matric_no}</span>
                  )}
                  {claim.claimant?.department && (
                    <span className="flex items-center gap-1"><GraduationCap size={11} /> {claim.claimant.department}</span>
                  )}
                  {claim.claimant?.email && (
                    <span className="flex items-center gap-1"><Mail size={11} /> {claim.claimant.email}</span>
                  )}
                </div>
              </div>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proof of Ownership</h3>
            <div className="rounded-lg border-2 border-dashed border-primary/20 bg-primary/5 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{claim.proof_details}</p>
            </div>
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status Timeline</h3>
            <ClaimTimeline
              status={(claim.status as "pending" | "approved" | "rejected")}
              itemStatus={item?.status}
              submittedAt={claim.created_at}
            />
          </section>
        </div>

        {isPending && (
          <footer className="grid grid-cols-2 gap-2 border-t border-border bg-background p-3">
            <button
              onClick={onReject}
              className="inline-flex items-center justify-center gap-1.5 rounded-md border border-border bg-background px-3 py-2.5 text-sm font-semibold hover:bg-muted"
            >
              <X size={16} /> Reject
            </button>
            <button
              onClick={onApprove}
              className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-3 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              <Check size={16} /> Approve
            </button>
          </footer>
        )}
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <span className="text-[11px] text-muted-foreground w-20">{label}</span>
      <span className="flex-1 text-sm font-medium">{value}</span>
    </div>
  );
}

// Unused import safeguard (lint)
export const _icons = UserIcon;