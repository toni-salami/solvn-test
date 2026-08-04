import { StarRating } from "@/components/reviews/StarRating";
import { formatReviewDate, type Review } from "@/lib/reviews";

export function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">No reviews yet.</p>;
  }
  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="rounded-md border bg-card p-4">
          <div className="flex items-center gap-2">
            <StarRating value={r.rating} />
            <span className="text-xs text-muted-foreground">{formatReviewDate(r.created_at)}</span>
          </div>
          {r.comment && <p className="mt-2 whitespace-pre-line text-sm">{r.comment}</p>}
        </li>
      ))}
    </ul>
  );
}
