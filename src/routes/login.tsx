import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Eye, EyeOff, Timer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { login } from "@/lib/auth";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — Cadence Scheduler" },
      { name: "description", content: "Sign in to manage your scheduled jobs." },
      { property: "og:title", content: "Sign in — Cadence Scheduler" },
      { property: "og:description", content: "Sign in to manage your scheduled jobs." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [fails, setFails] = useState(0);
  const [captcha, setCaptcha] = useState("");
  const challenge = useMemo(() => ({ a: 3 + fails, b: 4 }), [fails]);
  const needCaptcha = fails >= 3;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (needCaptcha && Number(captcha) !== challenge.a + challenge.b) {
      setError("CAPTCHA answer is incorrect.");
      return;
    }
    if (login(user, pw, remember)) {
      toast.success(`Welcome back, ${user}`);
      navigate({ to: "/dashboard" });
    } else {
      setFails((f) => f + 1);
      setCaptcha("");
      setError("Invalid credentials.");
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-sidebar p-10 text-sidebar-foreground">
        <div className="flex items-center gap-2 font-semibold"><Timer className="h-5 w-5 text-sidebar-primary" /> Cadence</div>
        <div>
          <p className="font-mono text-sm text-sidebar-primary">0 2 * * *</p>
          <h2 className="mt-3 text-4xl font-semibold leading-tight tracking-tight">Every job,<br />on time.</h2>
          <p className="mt-4 max-w-sm text-sidebar-foreground/70">Schedule Python, SQL and Shell tasks, watch them run, and act fast when something breaks.</p>
        </div>
        <p className="text-xs text-sidebar-foreground/50">Demo build · sample data</p>
      </div>
      <div className="flex items-center justify-center p-6">
        <form onSubmit={submit} className="w-full max-w-sm space-y-5" aria-label="Login form">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground"><Timer className="h-6 w-6" /></div>
            <h1 className="text-2xl font-semibold tracking-tight">Scheduler Login</h1>
            <p className="text-sm text-muted-foreground">Demo: any username, password <span className="font-mono">demo123</span></p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="user">Username / Email</Label>
            <Input id="user" required value={user} onChange={(e) => setUser(e.target.value)} autoComplete="username" />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="pw">Password</Label>
              <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => toast("Password reset link would be emailed to you.")}>Forgot password?</button>
            </div>
            <div className="relative">
              <Input id="pw" type={show ? "text" : "password"} required value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" className="pr-10" />
              <button type="button" aria-label={show ? "Hide password" : "Show password"} onClick={() => setShow((s) => !s)} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          {needCaptcha && (
            <div className="space-y-2 rounded-md border bg-muted/50 p-3">
              <Label htmlFor="captcha">Security check: what is {challenge.a} + {challenge.b}?</Label>
              <Input id="captcha" inputMode="numeric" value={captcha} onChange={(e) => setCaptcha(e.target.value)} />
            </div>
          )}
          <div className="flex items-center gap-2">
            <Checkbox id="remember" checked={remember} onCheckedChange={(v) => setRemember(!!v)} />
            <Label htmlFor="remember" className="font-normal">Remember me</Label>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" className="w-full" disabled={!user || !pw || (needCaptcha && !captcha)}>Login</Button>
          <div className="relative text-center text-xs text-muted-foreground"><span className="bg-background px-2">or continue with</span></div>
          <div className="grid grid-cols-3 gap-2">
            {["Google", "Azure AD", "LDAP"].map((p) => (
              <Button key={p} type="button" variant="outline" size="sm" onClick={() => toast(`${p} sign-in isn't connected in this demo.`)}>{p}</Button>
            ))}
          </div>
        </form>
      </div>
    </div>
  );
}
