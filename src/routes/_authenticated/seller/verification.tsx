import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";

export const Route = createFileRoute("/_authenticated/seller/verification")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Seller verification · Solvn" },
      { name: "description", content: "Submit your business details to get verified on Solvn." },
      { property: "og:title", content: "Seller verification · Solvn" },
      { property: "og:description", content: "Submit your business details to get verified on Solvn." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const role = await fetchUserRole(data.user.id);
    if (role !== "seller") throw redirect({ to: "/auth" });
  },
  component: VerificationPage,
});

type Seller = {
  id: string;
  business_name: string;
  phone: string | null;
  email: string | null;
  verification_status: string;
};

type DocRow = {
  id: string;
  doc_type: string;
  status: string;
  file_path: string | null;
  created_at: string;
};

function VerificationPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [docType, setDocType] = useState<"NIN" | "CAC">("NIN");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: s } = await supabase
        .from("sellers")
        .select("id, business_name, phone, email, verification_status")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (cancelled || !s) {
        setLoading(false);
        return;
      }
      setSeller(s);
      setBusinessName(s.business_name ?? "");
      setPhone(s.phone ?? "");
      setEmail(s.email ?? auth.user.email ?? "");
      const { data: d } = await supabase
        .from("verification_documents")
        .select("id, doc_type, status, file_path, created_at")
        .eq("seller_id", s.id)
        .order("created_at", { ascending: false });
      if (!cancelled) {
        setDocs(d ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!seller) return;
    setError(null);
    setMessage(null);
    if (!businessName.trim()) return setError("Business name is required.");
    if (!phone.trim()) return setError("Phone number is required.");
    if (!email.trim()) return setError("Email is required.");

    setSaving(true);
    try {
      const { error: upErr } = await supabase
        .from("sellers")
        .update({
          business_name: businessName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          verification_status: "pending",
        })
        .eq("id", seller.id);
      if (upErr) throw upErr;

      let newDoc: DocRow | null = null;
      if (file) {
        const ext = file.name.split(".").pop() || "bin";
        const path = `${seller.id}/${Date.now()}-${docType}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("verification-documents")
          .upload(path, file, { upsert: false, contentType: file.type });
        if (uploadErr) throw uploadErr;
        const { data: inserted, error: insErr } = await supabase
          .from("verification_documents")
          .insert({
            seller_id: seller.id,
            doc_type: docType,
            status: "submitted",
            file_path: path,
          })
          .select("id, doc_type, status, file_path, created_at")
          .single();
        if (insErr) throw insErr;
        newDoc = inserted as DocRow;
      }

      setSeller({
        ...seller,
        business_name: businessName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        verification_status: "pending",
      });
      if (newDoc) setDocs((prev) => [newDoc as DocRow, ...prev]);
      setFile(null);
      setMessage("Submitted. We'll review your details shortly.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="min-h-screen bg-background p-8">
        <p className="text-sm text-muted-foreground">Seller profile not found.</p>
      </div>
    );
  }

  const status = seller.verification_status;

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Verification</h1>
          <Link to="/seller/dashboard" className="text-sm text-muted-foreground hover:underline">
            ← Dashboard
          </Link>
        </div>

        <div className="mt-4 rounded-md border bg-card p-4">
          <p className="text-sm">
            Status:{" "}
            <span
              className={
                status === "verified"
                  ? "font-medium text-green-600"
                  : status === "pending"
                    ? "font-medium text-amber-600"
                    : "font-medium text-muted-foreground"
              }
            >
              {status}
            </span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Submit your details below. Approval is manual for now.
          </p>
        </div>

        <form onSubmit={onSubmit} className="mt-6 space-y-4 rounded-md border bg-card p-4">
          <div>
            <label className="block text-sm font-medium">Business name</label>
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Phone number</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder="+234 ..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
            />
          </div>

          <div className="rounded-md border p-3">
            <p className="text-sm font-medium">Optional: upload NIN or CAC document</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value as "NIN" | "CAC")}
                className="rounded-md border bg-background px-2 py-1.5 text-sm"
              >
                <option value="NIN">NIN</option>
                <option value="CAC">CAC</option>
              </select>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
            </div>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}
          {message && <p className="text-sm text-green-600">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? "Submitting…" : "Submit for verification"}
          </button>
        </form>

        {docs.length > 0 && (
          <div className="mt-6 rounded-md border bg-card p-4">
            <h2 className="text-sm font-medium">Submitted documents</h2>
            <ul className="mt-2 divide-y">
              {docs.map((d) => (
                <li key={d.id} className="flex items-center justify-between py-2 text-sm">
                  <span>
                    {d.doc_type}{" "}
                    <span className="text-xs text-muted-foreground">
                      · {new Date(d.created_at).toLocaleDateString()}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{d.status}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
