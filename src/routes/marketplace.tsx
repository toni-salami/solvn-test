import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listMarketplaceProducts, type MarketplaceProduct } from "@/lib/marketplace.functions";
import { signProductImages, formatNaira } from "@/lib/product-images";
import { CartButton } from "@/components/cart/CartButton";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { StarRating } from "@/components/reviews/StarRating";



export const Route = createFileRoute("/marketplace")({
  head: () => ({
    meta: [
      { title: "Marketplace — Shop Nigerian sellers on solvn" },
      {
        name: "description",
        content:
          "Browse products from every active solvn storefront. Search by name and shop directly from Nigerian sellers.",
      },
      { property: "og:title", content: "Marketplace — Shop Nigerian sellers on solvn" },
      {
        property: "og:description",
        content: "Browse products from every active solvn storefront in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Marketplace,
});

type Card = MarketplaceProduct & { imageUrl: string | null };

function Marketplace() {
  const fetchProducts = useServerFn(listMarketplaceProducts);
  const [term, setTerm] = useState("");
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const res = await fetchProducts({ data: { q: query, page } });
      const withUrls: Card[] = await Promise.all(
        res.products.map(async (p) => {
          const urls = await signProductImages(p.images.slice(0, 1));
          return { ...p, imageUrl: urls[0] ?? null };
        }),
      );
      if (cancelled) return;
      setTotal(res.total);
      setItems((prev) => (page === 0 ? withUrls : [...prev, ...withUrls]));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [query, page, fetchProducts]);

  const hasMore = items.length < total;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/" className="text-lg font-semibold tracking-tight">
              solvn
            </Link>
            <CartButton />
          </div>

          <form
            className="flex w-full max-w-md gap-2 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              setPage(0);
              setQuery(term.trim());
            }}
          >
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search products…"
              aria-label="Search products"
              className="h-9 w-full flex-1 rounded-md border bg-background px-3 text-sm"
            />
            <button
              type="submit"
              className="h-9 shrink-0 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground"
            >
              Search
            </button>
          </form>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold tracking-tight">Marketplace</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Newest products from every active solvn storefront.
        </p>

        {loading && items.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <div className="mt-16 text-center">
            <h2 className="text-lg font-medium">
              {query ? `No products match “${query}”` : "No products yet"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {query
                ? "Try a different search term."
                : "Sellers haven't listed anything yet. Check back soon."}
            </p>
          </div>
        ) : (
          <>
            <ul className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {items.map((p) => (
                <li key={p.id} className="overflow-hidden rounded-md border bg-card">
                  <Link to="/store/$slug" params={{ slug: p.storefront_slug }} className="block">
                    <div className="aspect-square w-full bg-muted">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.title}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="p-3">
                      <h2 className="line-clamp-2 text-sm font-medium">{p.title}</h2>
                      <p className="mt-1 text-sm font-semibold">{formatNaira(p.price_ngn)}</p>
                      {p.rating_count > 0 && (
                        <span className="mt-1 flex items-center gap-1">
                          <StarRating value={p.rating_average} size={12} />
                          <span className="text-xs text-muted-foreground">
                            {p.rating_average.toFixed(1)} ({p.rating_count})
                          </span>
                        </span>
                      )}
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {p.business_name}
                      </p>
                    </div>

                  </Link>
                  <div className="px-3 pb-3">
                    <AddToCartButton
                      className="w-full"
                      item={{
                        productId: p.id,
                        sellerId: p.seller_id,
                        businessName: p.business_name,
                        storefrontSlug: p.storefront_slug,
                        title: p.title,
                        priceNgn: p.price_ngn,
                        imagePath: p.images[0] ?? null,
                      }}
                    />
                  </div>
                </li>

              ))}
            </ul>

            {hasMore && (
              <div className="mt-8 flex justify-center">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={loading}
                  className="rounded-md border px-5 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {loading ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
