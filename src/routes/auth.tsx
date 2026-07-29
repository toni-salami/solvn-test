import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole, homePathForRole } from "@/lib/user-role";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in · Solvn" },
      { name: "description", content: "Sign in or create your Solvn account as a seller or buyer." },
      { property: "og:title", content: "Sign in · Solvn" },
      { property: "og:description", content: "Sign in or create your Solvn account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup";
type Role = "seller" | "buyer";
type LocationType = "domestic" | "diaspora";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("signin");
  const [role, setRole] = useState<Role>("buyer");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [locationType, setLocationType] = useState<LocationType>("domestic");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already signed in, bounce to the role home.
  useEffect(() => {
    void (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      const r = await fetchUserRole(data.user.id);
      navigate({ to: homePathForRole(r), replace: true });
    })();
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        if (role === "seller" && !businessName.trim()) {
          throw new Error("Business name is required.");
        }
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpErr) throw signUpErr;
        const userId = data.user?.id;
        if (!userId) throw new Error("Signup succeeded but no user was returned.");

        // Ensure a session exists so RLS insert policies pass.
        if (!data.session) {
          const { error: siErr } = await supabase.auth.signInWithPassword({ email, password });
          if (siErr) throw siErr;
        }

        if (role === "seller") {
          const slug = `${businessName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${userId.slice(0, 6)}`;
          const { error: insErr } = await supabase.from("sellers").insert({
            user_id: userId,
            business_name: businessName.trim(),
            location_type: locationType,
            storefront_slug: slug,
          });
          if (insErr) throw insErr;
        } else {
          const { error: insErr } = await supabase.from("buyers").insert({ user_id: userId });
          if (insErr) throw insErr;
        }

        navigate({ to: homePathForRole(role), replace: true });
      } else {
        const { data, error: siErr } = await supabase.auth.signInWithPassword({ email, password });
        if (siErr) throw siErr;
        const userId = data.user?.id;
        if (!userId) throw new Error("Sign-in returned no user.");
        const r = await fetchUserRole(userId);
        if (!r) {
          setError("This account has no seller or buyer profile. Contact support.");
          await supabase.auth.signOut();
          return;
        }
        navigate({ to: homePathForRole(r), replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <div className="mb-6 flex gap-2">
          <button
            type="button"
            onClick={() => setMode("signin")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === "signin" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode("signup")}
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${mode === "signup" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Create account
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium">I'm a…</label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("buyer")}
                  className={`rounded-md border px-3 py-2 text-sm ${role === "buyer" ? "border-primary bg-primary/10" : "border-input"}`}
                >
                  Buyer
                </button>
                <button
                  type="button"
                  onClick={() => setRole("seller")}
                  className={`rounded-md border px-3 py-2 text-sm ${role === "seller" ? "border-primary bg-primary/10" : "border-input"}`}
                >
                  Seller
                </button>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="email" className="text-sm font-medium">Email</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label htmlFor="password" className="text-sm font-medium">Password</label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>

          {mode === "signup" && role === "seller" && (
            <>
              <div>
                <label htmlFor="business" className="text-sm font-medium">Business name</label>
                <input
                  id="business"
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Where are you based?</label>
                <div className="mt-2 grid grid-cols-1 gap-2">
                  <label className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${locationType === "domestic" ? "border-primary bg-primary/10" : "border-input"}`}>
                    <input
                      type="radio"
                      name="loc"
                      checked={locationType === "domestic"}
                      onChange={() => setLocationType("domestic")}
                    />
                    I'm based in Nigeria
                  </label>
                  <label className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm ${locationType === "diaspora" ? "border-primary bg-primary/10" : "border-input"}`}>
                    <input
                      type="radio"
                      name="loc"
                      checked={locationType === "diaspora"}
                      onChange={() => setLocationType("diaspora")}
                    />
                    I'm based outside Nigeria
                  </label>
                </div>
              </div>
            </>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Link to="/" className="hover:underline">← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
