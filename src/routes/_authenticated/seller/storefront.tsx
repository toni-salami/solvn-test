import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";

export const Route = createFileRoute("/_authenticated/seller/storefront")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Storefront setup · solvn" },
      { name: "description", content: "Set up your storefront name, URL, logo, and branding." },
      { property: "og:title", content: "Storefront setup · solvn" },
      { property: "og:description", content: "Configure your solvn storefront." },
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
  component: StorefrontSetup,
});

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

type Seller = {
  id: string;
  business_name: string;
  storefront_slug: string;
  description: string | null;
};

type Storefront = {
  id: string;
  seller_id: string;
  branding: { logo_path?: string; logo_url?: string; tagline?: string } | null;
  is_active: boolean;
};

function StorefrontSetup() {
  const [loading, setLoading] = useState(true);
  const [seller, setSeller] = useState<Seller | null>(null);
  const [storefront, setStorefront] = useState<Storefront | null>(null);
  const [activeProductCount, setActiveProductCount] = useState(0);

  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [tagline, setTagline] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(false);
  const [logoPath, setLogoPath] = useState<string | null>(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);

  const [slugCheck, setSlugCheck] = useState<
    { status: "idle" | "checking" | "ok" | "taken" | "invalid"; message?: string }
  >({ status: "idle" });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement | null>(null);

  // Load seller + storefront
  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;

      const { data: s, error: sErr } = await supabase
        .from("sellers")
        .select("id, business_name, storefront_slug, description")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (sErr || !s) {
        setError("Could not load your seller profile.");
        setLoading(false);
        return;
      }
      setSeller(s as Seller);
      setName(s.business_name);
      setSlug(s.storefront_slug);
      setDescription(s.description ?? "");

      const { data: sf } = await supabase
        .from("storefronts")
        .select("id, seller_id, branding, is_active")
        .eq("seller_id", s.id)
        .maybeSingle();
      if (sf) {
        setStorefront(sf as Storefront);
        const br = (sf.branding ?? {}) as Storefront["branding"];
        setTagline(br?.tagline ?? "");
        setIsActive(sf.is_active);
        if (br?.logo_path) {
          setLogoPath(br.logo_path);
          const { data: signed } = await supabase.storage
            .from("storefront-logos")
            .createSignedUrl(br.logo_path, 60 * 60);
          if (signed?.signedUrl) setLogoPreviewUrl(signed.signedUrl);
        }
      }

      const { count } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("seller_id", s.id)
        .eq("status", "active");
      setActiveProductCount(count ?? 0);

      setLoading(false);
    })();
  }, []);

  // Auto-suggest slug from name unless the user has edited slug manually
  useEffect(() => {
    if (!slugTouched) {
      const suggested = slugify(name);
      if (suggested) setSlug(suggested);
    }
  }, [name, slugTouched]);

  // Debounced slug uniqueness check
  useEffect(() => {
    if (!seller) return;
    if (!slug) {
      setSlugCheck({ status: "invalid", message: "URL is required." });
      return;
    }
    if (!SLUG_RE.test(slug)) {
      setSlugCheck({
        status: "invalid",
        message: "Use lowercase letters, numbers, and single hyphens only.",
      });
      return;
    }
    setSlugCheck({ status: "checking" });
    const handle = setTimeout(async () => {
      const { data, error: qErr } = await supabase
        .from("sellers")
        .select("id")
        .eq("storefront_slug", slug)
        .neq("id", seller.id)
        .maybeSingle();
      if (qErr) {
        setSlugCheck({ status: "invalid", message: "Could not check availability." });
        return;
      }
      if (data) {
        setSlugCheck({ status: "taken", message: "That URL is already taken." });
      } else {
        setSlugCheck({ status: "ok", message: "Available." });
      }
    }, 350);
    return () => clearTimeout(handle);
  }, [slug, seller]);

  const canActivate = activeProductCount > 0;
  const activationBlockedReason = useMemo(
    () =>
      canActivate
        ? null
        : "Add at least one active product before making your storefront public.",
    [canActivate],
  );

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !seller) return;
    setError(null);
    if (!file.type.startsWith("image/")) {
      setError("Logo must be an image file.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Logo must be under 3 MB.");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
      const path = `${seller.id}/logo-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("storefront-logos")
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (upErr) throw upErr;
      // Delete previous logo (best-effort)
      if (logoPath && logoPath !== path) {
        await supabase.storage.from("storefront-logos").remove([logoPath]);
      }
      setLogoPath(path);
      const { data: signed } = await supabase.storage
        .from("storefront-logos")
        .createSignedUrl(path, 60 * 60);
      setLogoPreviewUrl(signed?.signedUrl ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Logo upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!seller) return;
    setError(null);
    setSuccess(null);

    if (!name.trim()) return setError("Storefront name is required.");
    if (slugCheck.status !== "ok" && slug !== seller.storefront_slug) {
      return setError(slugCheck.message ?? "Please choose an available URL.");
    }
    if (isActive && !canActivate) {
      return setError(activationBlockedReason);
    }

    setSaving(true);
    try {
      // Update sellers
      const { error: upSellerErr } = await supabase
        .from("sellers")
        .update({
          business_name: name.trim(),
          storefront_slug: slug,
          description: description.trim() || null,
        })
        .eq("id", seller.id);
      if (upSellerErr) throw upSellerErr;

      // Upsert storefront
      const branding = {
        ...(logoPath ? { logo_path: logoPath } : {}),
        ...(tagline.trim() ? { tagline: tagline.trim() } : {}),
      };
      const { error: upSfErr } = await supabase
        .from("storefronts")
        .upsert(
          {
            seller_id: seller.id,
            branding,
            is_active: canActivate ? isActive : false,
          },
          { onConflict: "seller_id" },
        );
      if (upSfErr) throw upSfErr;

      setSeller({ ...seller, business_name: name.trim(), storefront_slug: slug, description });
      setSuccess("Storefront saved.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save storefront.");
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

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Storefront setup</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Configure how buyers see your store.
            </p>
          </div>
          <Link
            to="/seller/dashboard"
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Back
          </Link>
        </div>

        {seller && slug && (
          <div className="mb-4 rounded-md border bg-muted/40 p-3 text-xs text-muted-foreground">
            Public URL:{" "}
            <span className="font-mono text-foreground">/store/{slug}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium">
              Storefront name
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              required
              maxLength={80}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              This also updates your business name.
            </p>
          </div>

          <div>
            <label htmlFor="slug" className="block text-sm font-medium">
              Storefront URL
            </label>
            <div className="mt-1 flex items-center rounded-md border bg-background focus-within:ring-2 focus-within:ring-ring">
              <span className="px-3 py-2 text-sm text-muted-foreground">/store/</span>
              <input
                id="slug"
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value.toLowerCase());
                }}
                className="w-full bg-transparent py-2 pr-3 text-sm outline-none"
                required
                maxLength={60}
              />
            </div>
            <p
              className={`mt-1 text-xs ${
                slugCheck.status === "taken" || slugCheck.status === "invalid"
                  ? "text-destructive"
                  : slugCheck.status === "ok"
                    ? "text-green-600 dark:text-green-500"
                    : "text-muted-foreground"
              }`}
            >
              {slugCheck.status === "checking" && "Checking availability…"}
              {slugCheck.status === "ok" && slugCheck.message}
              {slugCheck.status === "taken" && slugCheck.message}
              {slugCheck.status === "invalid" && slugCheck.message}
              {slugCheck.status === "idle" && "Lowercase letters, numbers, and hyphens."}
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium">Logo</label>
            <div className="mt-2 flex items-center gap-4">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {logoPreviewUrl ? (
                  <img
                    src={logoPreviewUrl}
                    alt="Storefront logo"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">No logo</span>
                )}
              </div>
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="text-sm"
                  disabled={uploading}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  PNG, JPG, or SVG. Max 3 MB.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="tagline" className="block text-sm font-medium">
              Tagline
            </label>
            <input
              id="tagline"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={120}
              placeholder="A short line shown under your storefront name"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium">
              About your storefront
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="mt-1 min-h-24 w-full rounded-md border bg-background px-3 py-2 text-sm"
              maxLength={1000}
              placeholder="Tell buyers about your store."
            />
          </div>

          <div className="rounded-md border p-4">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={isActive}
                disabled={!canActivate}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mt-1 h-4 w-4"
              />
              <div>
                <div className="text-sm font-medium">Make storefront public</div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {canActivate
                    ? "Visitors can view your storefront at the public URL."
                    : activationBlockedReason}
                </p>
              </div>
            </label>
          </div>

          {error && (
            <div className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-green-500/40 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400">
              {success}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={
                saving ||
                uploading ||
                (slug !== seller?.storefront_slug && slugCheck.status !== "ok")
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save storefront"}
            </button>
            {storefront?.is_active && seller && (
              <Link
                to="/store/$slug"
                params={{ slug: seller.storefront_slug }}
                className="rounded-md border px-4 py-2 text-sm hover:bg-accent"
              >
                View public storefront
              </Link>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
