import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";
import { formatNaira, signProductImage } from "@/lib/product-images";

export const Route = createFileRoute("/_authenticated/seller/products/")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Products · Solvn" },
      { name: "description", content: "Manage the products in your Solvn storefront." },
      { property: "og:title", content: "Products · Solvn" },
      { property: "og:description", content: "Manage your Solvn product catalog." },
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
  component: ProductsList,
});

type ProductRow = {
  id: string;
  title: string;
  price_ngn: number;
  stock_quantity: number;
  status: string;
  images: string[];
};

const STATUS_STYLES: Record<string, string> = {
  active: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
  draft: "bg-muted text-muted-foreground",
  archived: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
};

function ProductsList() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) return;
      const { data: seller } = await supabase
        .from("sellers")
        .select("id")
        .eq("user_id", userRes.user.id)
        .maybeSingle();
      if (!seller) {
        setError("Could not load your seller profile.");
        setLoading(false);
        return;
      }
      const { data, error: pErr } = await supabase
        .from("products")
        .select("id, title, price_ngn, stock_quantity, status, images")
        .eq("seller_id", seller.id)
        .order("created_at", { ascending: false });
      if (pErr) {
        setError(pErr.message);
      } else {
        const rows = (data ?? []) as ProductRow[];
        setProducts(rows);
        // Sign first image per product for thumbnail
        const entries = await Promise.all(
          rows.map(async (p) => {
            const first = p.images?.[0];
            if (!first) return [p.id, ""] as const;
            const url = await signProductImage(first);
            return [p.id, url ?? ""] as const;
          }),
        );
        setThumbs(Object.fromEntries(entries.filter(([, u]) => u)));
      }
      setLoading(false);
    })();
  }, []);

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-semibold">Products</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your product catalog.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/seller/dashboard"
              className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
            >
              Back
            </Link>
            <Link
              to="/seller/products/new"
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              New product
            </Link>
          </div>
        </div>

        {error && (
          <div
            role="alert"
            className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : products.length === 0 ? (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t listed any products yet.
            </p>
            <Link
              to="/seller/products/new"
              className="mt-4 inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Create your first product
            </Link>
          </div>
        ) : (
          <ul className="divide-y rounded-lg border">
            {products.map((p) => (
              <li key={p.id}>
                <Link
                  to="/seller/products/$id"
                  params={{ id: p.id }}
                  className="flex items-center gap-4 p-4 hover:bg-accent/50"
                >
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                    {thumbs[p.id] ? (
                      <img
                        src={thumbs[p.id]}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px] text-muted-foreground">No image</span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatNaira(Number(p.price_ngn))} · Stock {p.stock_quantity}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
                      STATUS_STYLES[p.status] ?? STATUS_STYLES.draft
                    }`}
                  >
                    {p.status}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
