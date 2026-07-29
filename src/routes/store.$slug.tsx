import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/store/$slug")({
  head: ({ params }) => ({
    meta: [
      { title: `${params.slug} · Solvn storefront` },
      { name: "description", content: `Shop from ${params.slug} on Solvn.` },
      { property: "og:title", content: `${params.slug} · Solvn` },
      { property: "og:description", content: `Shop from ${params.slug} on Solvn.` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PublicStorefront,
  notFoundComponent: Unavailable,
  errorComponent: Unavailable,
});

type Data = {
  seller: {
    id: string;
    business_name: string;
    description: string | null;
    storefront_slug: string;
    location_type: string;
    verification_status: string;
  };

  storefront: {
    id: string;
    is_active: boolean;
    branding: { logo_path?: string; tagline?: string } | null;
  };
  logoUrl: string | null;
  products: Array<{
    id: string;
    title: string;
    description: string | null;
    price_ngn: number;
    images: string[];
    stock_quantity: number;
  }>;
};

function PublicStorefront() {
  const { slug } = Route.useParams();
  const [state, setState] = useState<{ loading: boolean; data: Data | null; missing: boolean }>({
    loading: true,
    data: null,
    missing: false,
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: seller } = await supabase
        .from("sellers")
        .select("id, business_name, description, storefront_slug, location_type, verification_status")
        .eq("storefront_slug", slug)
        .maybeSingle();

      if (!seller) {
        if (!cancelled) setState({ loading: false, data: null, missing: true });
        return;
      }
      const { data: storefront } = await supabase
        .from("storefronts")
        .select("id, is_active, branding")
        .eq("seller_id", seller.id)
        .eq("is_active", true)
        .maybeSingle();
      if (!storefront) {
        if (!cancelled) setState({ loading: false, data: null, missing: true });
        return;
      }
      const branding = (storefront.branding ?? {}) as { logo_path?: string; tagline?: string };
      let logoUrl: string | null = null;
      if (branding.logo_path) {
        const { data: signed } = await supabase.storage
          .from("storefront-logos")
          .createSignedUrl(branding.logo_path, 60 * 60);
        logoUrl = signed?.signedUrl ?? null;
      }
      const { data: products } = await supabase
        .from("products")
        .select("id, title, description, price_ngn, images, stock_quantity")
        .eq("seller_id", seller.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (cancelled) return;
      setState({
        loading: false,
        missing: false,
        data: {
          seller,
          storefront: { ...storefront, branding },
          logoUrl,
          products: products ?? [],
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (state.loading) {
    return (
      <div className="min-h-screen bg-background px-4 py-10">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }
  if (state.missing || !state.data) return <Unavailable />;

  const { seller, storefront, logoUrl, products } = state.data;
  const tagline = storefront.branding?.tagline;
  const priceFmt = new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 0,
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-6 sm:px-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted sm:h-20 sm:w-20">
            {logoUrl ? (
              <img src={logoUrl} alt={`${seller.business_name} logo`} className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">Logo</span>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold sm:text-2xl">{seller.business_name}</h1>
            {tagline && <p className="mt-1 text-sm text-muted-foreground">{tagline}</p>}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        {seller.description && (
          <section className="mb-8 rounded-md border bg-card p-4">
            <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              About
            </h2>
            <p className="mt-2 whitespace-pre-line text-sm">{seller.description}</p>
          </section>
        )}

        <section>
          <h2 className="mb-4 text-lg font-semibold">Products</h2>
          {products.length === 0 ? (
            <p className="text-sm text-muted-foreground">No products listed yet.</p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-md border bg-card">
                  <div className="aspect-square w-full bg-muted">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.title} className="h-full w-full object-cover" />
                    ) : null}
                  </div>
                  <div className="p-3">
                    <h3 className="line-clamp-2 text-sm font-medium">{p.title}</h3>
                    <p className="mt-1 text-sm font-semibold">{priceFmt.format(p.price_ngn)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Unavailable() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This storefront isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          The storefront may have been renamed, unpublished, or never existed.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Silence unused import warning while keeping the import handy for future loader use.
void notFound;
