import { useState } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { StarRatingInput } from "@/components/reviews/StarRating";
import type { Review } from "@/lib/reviews";

const schema = z.object({
  rating: z.number().int().min(1, "Pick a star rating").max(5),
  comment: z.string().trim().max(1000, "Comment must be under 1000 characters"),
});

type Props = {
  orderId: string;
  sellerId: string;
  buyerId: string;
  onSubmitted: (review: Review) => void;
  onCancel: () => void;
};

export function ReviewForm({ orderId, sellerId, buyerId, onSubmitted, onCancel }: Props) {
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = schema.safeParse({ rating, comment });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSaving(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("reviews")
      .insert({
        order_id: orderId,
        seller_id: sellerId,
        buyer_id: buyerId,
        rating: parsed.data.rating,
        comment: parsed.data.comment || null,
      })
      .select("id, order_id, seller_id, buyer_id, rating, comment, created_at")
      .single();
    setSaving(false);
    if (insertError || !data) {
      setError(
        insertError?.code === "23505"
          ? "You've already reviewed this order."
          : "Couldn't save your review. Please try again.",
      );
      return;
    }
    onSubmitted(data as Review);
  }

  return (
    <form onSubmit={submit} className="mt-3 rounded-md border bg-muted/30 p-4">
      <label className="block text-sm font-medium">Your rating</label>
      <div className="mt-1">
        <StarRatingInput value={rating} onChange={setRating} disabled={saving} />
      </div>

      <label htmlFor={`comment-${orderId}`} className="mt-4 block text-sm font-medium">
        Comment <span className="font-normal text-muted-foreground">(optional)</span>
      </label>
      <textarea
        id={`comment-${orderId}`}
        value={comment}
        maxLength={1000}
        rows={3}
        onChange={(e) => setComment(e.target.value)}
        className="mt-1 w-full rounded-md border bg-background p-2 text-sm"
        placeholder="How was your order?"
      />

      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
        >
          {saving ? "Submitting…" : "Submit review"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-md border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
