import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageIcon, X, ClipboardList, MapPin, Camera, PackageSearch, PackageOpen } from "lucide-react";

const CATEGORIES = ["Electronics", "ID Card", "Wallet", "Books", "Keys", "Clothing", "Other"] as const;

export const Route = createFileRoute("/_authenticated/report")({
  component: ReportPage,
});

function ReportPage() {
  const router = useRouter();
  const [type, setType] = useState<"lost" | "found">("found");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>("Electronics");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [itemDate, setItemDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function addFiles(list: FileList | null) {
    if (!list) return;
    const incoming = Array.from(list);
    setFiles((prev) => [...prev, ...incoming].slice(0, 3));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !location.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const { data: sess } = await supabase.auth.getUser();
      const uid = sess.user?.id;
      if (!uid) throw new Error("Not signed in");

      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "jpg";
        const path = `${uid}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        const { error: upErr } = await supabase.storage.from("item-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });
        if (upErr) throw upErr;
        const { data: pub } = supabase.storage.from("item-images").getPublicUrl(path);
        urls.push(pub.publicUrl);
      }

      const { error } = await supabase.from("items").insert({
        reporter_id: uid,
        type,
        category,
        title: title.trim(),
        description: description.trim(),
        location: location.trim(),
        item_date: itemDate,
        image_urls: urls,
      });
      if (error) throw error;
      toast.success("Item reported");
      router.navigate({ to: "/" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 pb-6">
      <header className="rounded-2xl border border-border bg-gradient-to-br from-primary to-[#001f5c] p-5 text-primary-foreground shadow-sm">
        <h1 className="text-lg font-bold">Report an item</h1>
        <p className="mt-0.5 text-xs text-primary-foreground/80">
          Share a few details — the right person will find it.
        </p>
      </header>

      <Section icon={ClipboardList} title="What happened?">
        <div className="grid grid-cols-2 gap-2">
          {(["found", "lost"] as const).map((t) => {
            const active = type === t;
            const Icon = t === "found" ? PackageOpen : PackageSearch;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={`flex flex-col items-start gap-1.5 rounded-xl border p-3 text-left text-sm transition ${
                  active
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <Icon size={18} className={active ? "text-primary-foreground" : "text-primary"} />
                <span className="font-semibold">{t === "found" ? "I found it" : "I lost it"}</span>
                <span className={`text-[11px] ${active ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                  {t === "found" ? "Someone can claim" : "Help me find it"}
                </span>
              </button>
            );
          })}
        </div>

        <Field label="Category">
          <select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm">
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>
      </Section>

      <Section icon={ClipboardList} title="Item details">
        <Field label="Title" hint="A short name (e.g. Black HP laptop bag)">
          <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
            placeholder="Short title"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
        </Field>

        <Field label="Description" hint="Color, brand, distinguishing marks">
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4}
            placeholder="Describe the item clearly so the right person can identify it"
            className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
        </Field>
      </Section>

      <Section icon={MapPin} title="Where & when">
        <Field label="Location">
          <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120}
            placeholder="e.g. Faculty of Engineering, Hall 2"
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
        </Field>

        <Field label="Date">
          <input type="date" value={itemDate} onChange={(e) => setItemDate(e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm" />
        </Field>
      </Section>

      <Section icon={Camera} title="Photos" subtitle="Optional · up to 3">
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-lg border border-border bg-muted">
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setFiles((p) => p.filter((_, i) => i !== idx))}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground border border-border">
                <X size={14} />
              </button>
            </div>
          ))}
          {files.length < 3 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border text-xs text-muted-foreground hover:border-primary/40 hover:text-primary">
              <ImageIcon size={20} />
              <span>Add photo</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </Section>

      <button type="submit" disabled={submitting}
        className="w-full rounded-xl bg-primary px-4 py-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:opacity-60">
        {submitting ? "Submitting…" : "Submit report"}
      </button>
    </form>
  );
}

function Section({
  icon: Icon, title, subtitle, children,
}: { icon: typeof ClipboardList; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-full bg-primary/10 text-primary">
            <Icon size={14} />
          </span>
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {subtitle && <span className="text-[11px] text-muted-foreground">{subtitle}</span>}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}