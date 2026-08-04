import { supabase } from "@/integrations/supabase/client";

export type Review = {
  id: string;
  order_id: string;
  seller_id: string;
  buyer_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type RatingSummary = { average: number; count: number };

/** Public read: all reviews for a seller, newest first. */
export async function loadSellerReviews(sellerId: string): Promise<Review[]> {
  const { data } = await supabase
    .from("reviews")
    .select("id, order_id, seller_id, buyer_id, rating, comment, created_at")
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false });
  return (data ?? []) as Review[];
}

export function summarize(ratings: number[]): RatingSummary {
  if (ratings.length === 0) return { average: 0, count: 0 };
  return {
    average: ratings.reduce((a, b) => a + b, 0) / ratings.length,
    count: ratings.length,
  };
}

/** Public read: average rating per seller for a set of sellers. */
export async function loadSellerRatings(
  sellerIds: string[],
): Promise<Record<string, RatingSummary>> {
  const unique = [...new Set(sellerIds)].filter(Boolean);
  if (unique.length === 0) return {};
  const { data } = await supabase
    .from("reviews")
    .select("seller_id, rating")
    .in("seller_id", unique);
  const grouped: Record<string, number[]> = {};
  for (const row of data ?? []) {
    (grouped[row.seller_id] ??= []).push(row.rating);
  }
  const out: Record<string, RatingSummary> = {};
  for (const [id, ratings] of Object.entries(grouped)) out[id] = summarize(ratings);
  return out;
}

export function formatReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-NG", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
