import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

export const PAGE_SIZE = 24;

const inputSchema = z.object({
  q: z.string().trim().max(120).optional().default(""),
  page: z.number().int().min(0).max(500).optional().default(0),
});

export type MarketplaceProduct = {
  id: string;
  title: string;
  price_ngn: number;
  images: string[];
  business_name: string;
  storefront_slug: string;
};

export const listMarketplaceProducts = createServerFn({ method: "GET" })
  .validator((data: unknown) => inputSchema.parse(data ?? {}))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_PUBLISHABLE_KEY"]!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const from = data.page * PAGE_SIZE;
    let query = supabase
      .from("products")
      .select(
        "id, title, price_ngn, images, created_at, sellers!inner(business_name, storefront_slug, storefronts!inner(is_active))",
        { count: "exact" },
      )
      .eq("status", "active")
      .eq("sellers.storefronts.is_active", true);

    if (data.q) {
      query = query.ilike("title", `%${data.q.replace(/[%_]/g, (m) => `\\${m}`)}%`);
    }

    const { data: rows, count, error } = await query
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const products: MarketplaceProduct[] = (rows ?? []).map((r) => {
      const seller = r.sellers as unknown as { business_name: string; storefront_slug: string };
      return {
        id: r.id,
        title: r.title,
        price_ngn: r.price_ngn,
        images: (r.images ?? []) as string[],
        business_name: seller.business_name,
        storefront_slug: seller.storefront_slug,
      };
    });

    return { products, total: count ?? 0, page: data.page, pageSize: PAGE_SIZE };
  });
