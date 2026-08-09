import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { fetchUserRole } from "@/lib/user-role";
import { formatNaira } from "@/lib/product-images";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewForm } from "@/components/reviews/ReviewForm";
import { formatReviewDate, type Review } from "@/lib/reviews";

export const Route = createFileRoute("/_authenticated/buyer/orders")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Your orders · solvn" },
      { name: "description", content: "Track your solvn orders and leave reviews for sellers." },
      { property: "og:title", content: "Your orders · solvn" },
      {
        property: "og:description",
        content: "Track your solvn orders and leave reviews for sellers.",
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
  component: BuyerOrders,
});

type OrderRow = {
  id: string;
  status: string;
  total_ngn: number;
  created_at: string;
  seller_id: string;
  business_name: string;
};

function BuyerOrders() {
  const [buyerId, setBuyerId] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderRow[] | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});
  const [openForm, setOpenForm] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return;
      const { data: buyer } = await supabase
        .from("buyers")
        .select("id")
        .eq("user_id", auth.user.id)
        .maybeSingle();
      if (!buyer || cancelled) {
        if (!cancelled) setOrders([]);
        return;
      }
      const { data: rows } = await supabase
        .from("orders")
        .select("id, status, total_ngn, created_at, seller_id, sellers(business_name)")
        .eq("buyer_id", buyer.id)
        .order("created_at", { ascending: false });

      const mapped: OrderRow[] = (rows ?? []).map((r) => ({
        id: r.id,
        status: r.status,
        total_ngn: r.total_ngn,
        created_at: r.created_at,
        seller_id: r.seller_id,
        business_name:
          (r.sellers as unknown as { business_name: string } | null)?.business_name ?? "Seller",
      }));

      const orderIds = mapped.map((o) => o.id);
      let reviewMap: Record<string, Review> = {};
      if (orderIds.length > 0) {
        const { data: reviewRows } = await supabase
          .from("reviews")
          .select("id, order_id, seller_id, buyer_id, rating, comment, created_at")
          .in("order_id", orderIds);
        reviewMap = Object.fromEntries(
          (reviewRows ?? []).map((r) => [r.order_id, r as Review]),
        );
      }

      if (cancelled) return;
      setBuyerId(buyer.id);
      setOrders(mapped);
      setReviews(reviewMap);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold">Your orders</h1>
          <Link to="/buyer/home" className="rounded-md border px-3 py-1.5 text-sm">
            Back
          </Link>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          A minimal order list — the full order history arrives in a later phase.
        </p>

        {orders === null ? (
          <p className="mt-8 text-sm text-muted-foreground">Loading…</p>
        ) : orders.length === 0 ? (
          <div className="mt-12 rounded-md border bg-card p-8 text-center">
            <h2 className="text-lg font-medium">No orders yet</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Once you place an order it will show up here.
            </p>
          </div>
        ) : (
          <ul className="mt-6 space-y-4">
            {orders.map((o) => {
              const review = reviews[o.id];
              const canReview = o.status === "fulfilled" && !review;
              return (
                <li key={o.id} className="rounded-md border bg-card p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{o.business_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatReviewDate(o.created_at)} · Order {o.id.slice(0, 8)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold">{formatNaira(o.total_ngn)}</p>
                      <span className="text-xs capitalize text-muted-foreground">{o.status}</span>
                    </div>
                  </div>

                  {review ? (
                    <div className="mt-3 rounded-md border bg-muted/30 p-3">
                      <div className="flex items-center gap-2">
                        <StarRating value={review.rating} />
                        <span className="text-xs text-muted-foreground">Your review</span>
                      </div>
                      {review.comment && (
                        <p className="mt-2 whitespace-pre-line text-sm">{review.comment}</p>
                      )}
                    </div>
                  ) : canReview ? (
                    openForm === o.id && buyerId ? (
                      <ReviewForm
                        orderId={o.id}
                        sellerId={o.seller_id}
                        buyerId={buyerId}
                        onCancel={() => setOpenForm(null)}
                        onSubmitted={(r) => {
                          setReviews((prev) => ({ ...prev, [o.id]: r }));
                          setOpenForm(null);
                        }}
                      />
                    ) : (
                      <button
                        onClick={() => setOpenForm(o.id)}
                        className="mt-3 rounded-md border px-3 py-1.5 text-sm font-medium"
                      >
                        Leave a review
                      </button>
                    )
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
