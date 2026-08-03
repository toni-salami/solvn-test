import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { Minus, Plus, ShoppingCart, Trash2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";
import { useCart } from "@/lib/cart";
import { formatNaira } from "@/lib/product-images";
import { useSignedImages } from "@/lib/use-signed-images";
import { Button } from "@/components/ui/button";


export const Route = createFileRoute("/_authenticated/buyer/cart")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your cart · Solvn" },
      {
        name: "description",
        content: "Review the products in your Solvn cart, grouped by seller, before checkout.",
      },
      { property: "og:title", content: "Your cart · Solvn" },
      {
        property: "og:description",
        content: "Review the products in your Solvn cart, grouped by seller, before checkout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const role = await fetchUserRole(data.user.id);
    if (role === "seller") throw redirect({ to: "/seller/dashboard" });
    if (role !== "buyer") throw redirect({ to: "/auth" });
  },
  component: CartPage,
});



function CartPage() {
  const { groups, items, total, count, setQuantity, removeItem } = useCart();
  const imageUrls = useSignedImages(items.map((i) => i.imagePath));

  return (
    <div className="min-h-screen bg-background p-6 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Your cart</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {count} item{count === 1 ? "" : "s"} across {groups.length} seller
              {groups.length === 1 ? "" : "s"}.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/marketplace">Continue shopping</Link>
          </Button>
        </div>

        {items.length === 0 ? (
          <div className="mt-8 rounded-lg border border-dashed p-10 text-center">
            <ShoppingCart className="mx-auto h-8 w-8 text-muted-foreground" />
            <p className="mt-4 text-sm font-medium">Your cart is empty</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the marketplace and add something you like.
            </p>
            <Button className="mt-5" asChild>
              <Link to="/marketplace">Browse marketplace</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 space-y-6">
              {groups.map((group) => (
                <section key={group.sellerId} className="rounded-lg border">
                  <header className="flex items-center justify-between border-b px-4 py-3">
                    <Link
                      to="/store/$slug"
                      params={{ slug: group.storefrontSlug }}
                      className="text-sm font-semibold hover:underline"
                    >
                      {group.businessName}
                    </Link>
                    <span className="text-sm text-muted-foreground">
                      {formatNaira(group.subtotal)}
                    </span>
                  </header>
                  <ul className="divide-y">
                    {group.items.map((item) => (
                      <li key={item.productId} className="flex items-center gap-3 p-4">
                        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-md border bg-muted">
                          {item.imagePath && imageUrls[item.imagePath] ? (
                            <img
                              src={imageUrls[item.imagePath]}
                              alt={item.title}
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{item.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatNaira(item.priceNgn)} each
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Decrease quantity of ${item.title}`}
                            onClick={() => setQuantity(item.productId, item.quantity - 1)}
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </Button>
                          <span className="w-8 text-center text-sm tabular-nums">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Increase quantity of ${item.title}`}
                            onClick={() => setQuantity(item.productId, item.quantity + 1)}
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            aria-label={`Remove ${item.title}`}
                            onClick={() => removeItem(item.productId)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-lg border p-4">
              <div>
                <p className="text-sm text-muted-foreground">Order total</p>
                <p className="text-xl font-semibold">{formatNaira(total)}</p>
              </div>
              <Button asChild>
                <Link to="/buyer/checkout">Checkout</Link>
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
