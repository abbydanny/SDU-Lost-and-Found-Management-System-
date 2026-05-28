import { CheckCircle2, Circle, XCircle, PackageCheck, Clock } from "lucide-react";

export type ClaimTimelineProps = {
  status: "pending" | "approved" | "rejected";
  itemStatus?: "open" | "claimed" | "returned" | string;
  submittedAt: string;
  decidedAt?: string | null;
  returnedAt?: string | null;
};

function fmt(d?: string | null) {
  if (!d) return "";
  return new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function ClaimTimeline({ status, itemStatus, submittedAt, decidedAt, returnedAt }: ClaimTimelineProps) {
  const isApproved = status === "approved";
  const isRejected = status === "rejected";
  const isReturned = itemStatus === "returned";

  const steps = [
    {
      label: "Claim Submitted",
      desc: fmt(submittedAt) || "Awaiting review",
      done: true,
      icon: CheckCircle2,
    },
    {
      label: isRejected ? "Rejected" : "Approved",
      desc: isApproved || isRejected ? fmt(decidedAt) || "Decided" : "Awaiting admin decision",
      done: isApproved || isRejected,
      pending: !isApproved && !isRejected,
      icon: isRejected ? XCircle : isApproved ? CheckCircle2 : Clock,
      tone: isRejected ? "danger" as const : "primary" as const,
    },
    {
      label: "Item Returned",
      desc: isReturned ? fmt(returnedAt) || "Handed back to owner" : isRejected ? "Not applicable" : "Pending pickup",
      done: isReturned,
      pending: !isReturned && !isRejected,
      disabled: isRejected,
      icon: isReturned ? PackageCheck : Circle,
    },
  ];

  return (
    <ol className="relative ml-2 space-y-4 border-l-2 border-primary/15 pl-5">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const dotClass = s.disabled
          ? "bg-muted text-muted-foreground border-border"
          : s.tone === "danger"
          ? "bg-destructive text-destructive-foreground border-destructive"
          : s.done
          ? "bg-primary text-primary-foreground border-primary"
          : "bg-background text-primary border-primary/30";
        return (
          <li key={i} className="relative">
            <span className={`absolute -left-[31px] grid h-6 w-6 place-items-center rounded-full border-2 ${dotClass}`}>
              <Icon size={13} />
            </span>
            <p className={`text-sm font-semibold ${s.disabled ? "text-muted-foreground" : "text-foreground"}`}>{s.label}</p>
            <p className="text-xs text-muted-foreground">{s.desc}</p>
          </li>
        );
      })}
    </ol>
  );
}