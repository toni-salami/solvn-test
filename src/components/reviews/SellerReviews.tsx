import { useEffect, useState } from "react";
import { StarRating } from "@/components/reviews/StarRating";
import { ReviewList } from "@/components/reviews/ReviewList";
import { loadSellerReviews, summarize, type Review } from "@/lib/reviews";

/** Public reviews section for a seller's storefront. */
export function SellerReviews({ sellerId }: { sellerId: string }) {
  const [reviews, setReviews] = useState<Review[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const rows = await loadSellerReviews(sellerId);
      if (!cancelled) setReviews(rows);
    })();
    return () => {
      cancelled = true;
    };
  }, [sellerId]);

  const summary = summarize((reviews ?? []).map((r) => r.rating));

  return (
    <section className="mt-10">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold">Reviews</h2>
        {summary.count > 0 && (
          <span className="flex items-center gap-2">
            <StarRating value={summary.average} size={16} />
            <span className="text-sm text-muted-foreground">
              {summary.average.toFixed(1)} · {summary.count} review{summary.count === 1 ? "" : "s"}
            </span>
          </span>
        )}
      </div>
      {reviews === null ? (
        <p className="text-sm text-muted-foreground">Loading reviews…</p>
      ) : (
        <ReviewList reviews={reviews} />
      )}
    </section>
  );
}
