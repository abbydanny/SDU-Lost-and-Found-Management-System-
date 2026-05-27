import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ImageIcon, X } from "lucide-react";

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
    <form onSubmit={onSubmit} className="space-y-5">
      <h1 className="text-base font-semibold">Report an Item</h1>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Type</label>
        <div className="grid grid-cols-2 overflow-hidden rounded-md border border-border">
          {(["found", "lost"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`px-3 py-2.5 text-sm font-medium ${
                type === t ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
              }`}
            >
              {t === "found" ? "I found something" : "I lost something"}
            </button>
          ))}
        </div>
      </div>

      <Field label="Category">
        <select value={category} onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Field>

      <Field label="Title" hint="A short name for the item">
        <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120}
          placeholder="e.g. Black HP laptop bag"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </Field>

      <Field label="Description" hint="Include color, brand, distinguishing marks">
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} rows={4}
          placeholder="Describe the item clearly so the right person can identify it"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </Field>

      <Field label="Location" hint="Where it was lost or found">
        <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120}
          placeholder="e.g. Faculty of Engineering, Lecture Hall 2"
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </Field>

      <Field label="Date">
        <input type="date" value={itemDate} onChange={(e) => setItemDate(e.target.value)}
          max={new Date().toISOString().slice(0, 10)}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
      </Field>

      <div>
        <label className="mb-1.5 block text-sm font-medium">Photos (up to 3)</label>
        <div className="grid grid-cols-3 gap-2">
          {files.map((f, idx) => (
            <div key={idx} className="relative aspect-square overflow-hidden rounded-md border border-border bg-muted">
              <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
              <button type="button" onClick={() => setFiles((p) => p.filter((_, i) => i !== idx))}
                className="absolute right-1 top-1 grid h-6 w-6 place-items-center rounded-full bg-background/90 text-foreground border border-border">
                <X size={14} />
              </button>
            </div>
          ))}
          {files.length < 3 && (
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-xs text-muted-foreground">
              <ImageIcon size={22} />
              <span>Add photo</span>
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} />
            </label>
          )}
        </div>
      </div>

      <button type="submit" disabled={submitting}
        className="w-full rounded-md bg-primary px-4 py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
        {submitting ? "Submitting…" : "Submit Report"}
      </button>
    </form>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}