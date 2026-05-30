import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

export const Route = createFileRoute("/signup")({
  component: SignupPage,
});

function SignupPage() {
  const router = useRouter();
  const [matric, setMatric] = useState("");
  const [fullName, setFullName] = useState("");
  const [department, setDepartment] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters");
    if (password !== confirmPassword) return toast.error("Passwords do not match");
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { matric_no: matric, full_name: fullName, department, phone },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created");
    router.navigate({ to: "/" });
  }

  return (
    <div className="mx-auto max-w-sm px-5 py-8">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-xl bg-primary text-primary-foreground font-bold text-xl shadow-md ring-1 ring-primary/20">SDU</div>
        <p className="text-sm text-foreground">Lost &amp; Found Management System</p>
      </div>
      <form onSubmit={onSubmit} className="space-y-3">
        <Row label="Matric Number"><input required value={matric} onChange={(e) => setMatric(e.target.value)} placeholder="e.g. FOC/22/002026" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Row>
        <Row label="Full Name"><input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Row>
        <Row label="Department"><input required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="e.g. Computer Science" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Row>
        <Row label="Email"><input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Row>
        <Row label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Optional" className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></Row>
        
        <Row label="Password">
          <div className="relative">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              minLength={8} 
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Row>

        <Row label="Confirm Password">
          <div className="relative">
            <input 
              type={showConfirmPassword ? "text" : "password"} 
              required 
              value={confirmPassword} 
              onChange={(e) => setConfirmPassword(e.target.value)} 
              minLength={8} 
              className="w-full rounded-md border border-input bg-background px-3 py-2 pr-10 text-sm" 
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </Row>

        <button type="submit" disabled={loading} className="w-full rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Creating…" : "Create Account"}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted-foreground">
        Have an account? <Link to="/login" search={{ redirect: "/" }} className="text-primary font-medium">Sign in</Link>
      </p>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium">{label}</label>{children}</div>;
}
